from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from github import GithubException

from . import claude_client, conflict_resolver, github_client
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
