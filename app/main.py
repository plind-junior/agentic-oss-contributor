import secrets
import time
from typing import Optional
from urllib.parse import urlencode

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from github import GithubException

from . import claude_client, conflict_resolver, github_client
from .config import settings
from .deps import Credentials, get_credentials
from .schemas import CommentSummary, ConflictResolution, PullRequestSummary

app = FastAPI(title="agentic-oss-contributor", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- GitHub OAuth (web flow) ----------
# In-memory CSRF state store. Fine for a single-process dev backend; would
# need a real session store (Redis, signed cookies) for any multi-worker
# deployment.
_OAUTH_STATE_TTL_SECONDS = 600
_oauth_states: dict[str, float] = {}


def _prune_oauth_states() -> None:
    now = time.time()
    expired = [s for s, ts in _oauth_states.items() if now - ts > _OAUTH_STATE_TTL_SECONDS]
    for s in expired:
        _oauth_states.pop(s, None)


def _oauth_callback_url() -> str:
    return f"{settings.backend_url.rstrip('/')}/api/auth/github/callback"


@app.get("/api/auth/github/login")
def github_oauth_login() -> RedirectResponse:
    if not settings.github_oauth_client_id:
        raise HTTPException(
            500,
            "GitHub OAuth is not configured. Set GITHUB_OAUTH_CLIENT_ID and "
            "GITHUB_OAUTH_CLIENT_SECRET in the backend .env, then restart.",
        )
    _prune_oauth_states()
    state = secrets.token_urlsafe(24)
    _oauth_states[state] = time.time()
    params = {
        "client_id": settings.github_oauth_client_id,
        "redirect_uri": _oauth_callback_url(),
        "scope": settings.github_oauth_scope,
        "state": state,
        "allow_signup": "false",
    }
    return RedirectResponse(
        url=f"https://github.com/login/oauth/authorize?{urlencode(params)}",
        status_code=302,
    )


@app.get("/api/auth/github/callback")
async def github_oauth_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
) -> RedirectResponse:
    if error:
        return _redirect_to_frontend_error(error_description or error)
    if not code or not state:
        return _redirect_to_frontend_error("Missing code or state in OAuth callback.")
    _prune_oauth_states()
    if state not in _oauth_states:
        return _redirect_to_frontend_error("Invalid or expired OAuth state.")
    _oauth_states.pop(state, None)
    if not settings.github_oauth_client_id or not settings.github_oauth_client_secret:
        return _redirect_to_frontend_error("Server is missing OAuth client credentials.")

    async with httpx.AsyncClient(timeout=15) as client:
        token_resp = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": settings.github_oauth_client_id,
                "client_secret": settings.github_oauth_client_secret,
                "code": code,
                "redirect_uri": _oauth_callback_url(),
            },
        )
    if token_resp.status_code != 200:
        return _redirect_to_frontend_error(
            f"GitHub token exchange failed: {token_resp.status_code}"
        )
    body = token_resp.json()
    token = body.get("access_token")
    if not token:
        return _redirect_to_frontend_error(
            body.get("error_description")
            or body.get("error")
            or "GitHub did not return an access token."
        )

    # Pass the token to the SPA via URL fragment so it never hits a server log
    # or referrer header. The frontend reads it from window.location.hash on
    # /auth/callback and stores it client-side.
    return RedirectResponse(
        url=f"{settings.frontend_url.rstrip('/')}/auth/callback#access_token={token}",
        status_code=302,
    )


def _redirect_to_frontend_error(message: str) -> RedirectResponse:
    params = urlencode({"error": message})
    return RedirectResponse(
        url=f"{settings.frontend_url.rstrip('/')}/auth/callback?{params}",
        status_code=302,
    )


@app.get("/api/me")
def me(creds: Credentials = Depends(get_credentials)) -> dict:
    try:
        login = github_client.current_login(creds.github_token)
    except GithubException as e:
        raise HTTPException(
            status_code=401 if e.status in (401, 403) else 502,
            detail=f"GitHub auth failed ({e.status}): {e.data.get('message', e) if isinstance(e.data, dict) else e}",
        )
    return {
        "login": login,
        "model": creds.claude_model,
        "confidence_threshold": creds.confidence_threshold,
    }


@app.get("/api/prs", response_model=list[PullRequestSummary])
def list_prs(creds: Credentials = Depends(get_credentials)) -> list[dict]:
    try:
        return github_client.list_my_open_prs(creds.github_token)
    except GithubException as e:
        raise HTTPException(
            status_code=401 if e.status in (401, 403) else 502,
            detail=f"GitHub error ({e.status}): {e.data.get('message', e) if isinstance(e.data, dict) else e}",
        )


@app.post(
    "/api/prs/{owner}/{repo}/{number}/summary", response_model=CommentSummary
)
def summarize(
    owner: str, repo: str, number: int,
    creds: Credentials = Depends(get_credentials),
) -> dict:
    pr = github_client.fetch_pr(creds.github_token, owner, repo, number)
    comments = github_client.fetch_all_comments(creds.github_token, owner, repo, number)
    try:
        result = claude_client.summarize_comments(creds, pr.title, pr.body or "", comments)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Claude summarization failed: {e}")
    return {
        "pr": f"{owner}/{repo}#{number}",
        "comment_count": len(comments),
        "summary": result.get("summary", ""),
        "action_items": result.get("action_items", []),
        "blocking_concerns": result.get("blocking_concerns", []),
    }


@app.post(
    "/api/prs/{owner}/{repo}/{number}/resolve", response_model=ConflictResolution
)
def resolve(
    owner: str, repo: str, number: int,
    creds: Credentials = Depends(get_credentials),
) -> dict:
    try:
        return conflict_resolver.resolve_pr_conflicts(creds, owner, repo, number)
    except conflict_resolver.ConflictResolverError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")
