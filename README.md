# agentic-oss-contributor

A Claude-powered agent that summarizes PR comments and auto-resolves
merge conflicts on the GitHub pull requests you author — with a React
dashboard to drive it.

This is a monorepo:

- **[`app/`](app/)** — stateless FastAPI backend. Calls the Claude and
  GitHub APIs, runs `git`, pushes resolutions, posts PR comments.
- **[`console/`](console/)** — React + Vite + MUI dashboard. Signs in via
  GitHub OAuth, lists your PRs (live from GitHub + cached from
  [das-github-mirror](https://mirror.gittensor.io)), and triggers
  per-PR actions.

The two run as separate processes locally but share one repo so they can
evolve together.

## What it does

| Action | Endpoint | Writes to GitHub? |
| --- | --- | --- |
| Verify credentials | `GET /api/me` | no |
| List your open PRs | `GET /api/prs` | no |
| Summarize PR review thread (summary + action items + blocking concerns) | `POST /api/prs/.../summary` | no |
| Resolve merge conflicts (clone → merge → Claude per-file → fast-forward push *or* post diff as comment) | `POST /api/prs/.../resolve` | **yes** |

Stateless: credentials flow through request headers, nothing persisted
on the server. The console handles GitHub OAuth and stores its token in
the browser's `localStorage`.

## Quick start

```bash
./dev.sh
```

[dev.sh](dev.sh) creates `.venv` if missing, installs Python +
npm deps, then starts uvicorn (`:8000`) and Vite (`:5173`) in the same
terminal. Ctrl+C kills both. Open <http://localhost:5173>.

> **Python version.** Use 3.10–3.13. `pydantic-core` does not ship
> wheels for 3.14 yet. The script tries `python3.12` first, falls back
> to `python3`.

### Manual run (two terminals)

**Backend:**
```bash
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env       # fill in OAuth client id/secret
uvicorn app.main:app --reload --port 8000
```

**Console:**
```bash
cd console
npm install
npm run dev
```

Vite proxies `/api/*` to `127.0.0.1:8000`, so start the backend first.

## One-time GitHub OAuth setup

The console's **Continue with GitHub** button calls
`/api/auth/github/login`, which 302s to GitHub. The backend needs OAuth
credentials for this to work:

1. Register an OAuth App at <https://github.com/settings/applications/new>
   - Homepage URL: `http://localhost:5173`
   - Authorization callback URL: `http://localhost:8000/api/auth/github/callback`
2. Put the client id / secret in `.env`:
   ```
   GITHUB_OAUTH_CLIENT_ID=Iv1.xxxxxxxx
   GITHUB_OAUTH_CLIENT_SECRET=xxxxxxxxxxxxxxxx
   ```
3. Restart the backend.

The Anthropic API key is set per-browser on the console's **Settings**
page and sent per-request as `X-Anthropic-Key`. Without it, you can
still browse PRs but the AI actions (summary, resolve) are disabled.

## API reference

The backend is stateless — every request carries credentials in headers
(the console injects these after OAuth) with a `.env` fallback for
headless / cron use.

### `GET /api/auth/github/login`
302 to GitHub's OAuth authorize URL. Used by the console's sign-in button.

### `GET /api/auth/github/callback`
Exchanges the OAuth code for an access token, then 302s the browser to
`{FRONTEND_URL}/auth/callback#access_token=…`. The console reads the
fragment and stores the token.

### `GET /api/me`
Calls `GET /user` on GitHub to verify the token; echoes login, Claude
model, confidence threshold. 401 on a bad token.

### `GET /api/prs`
Open PRs authored by the authenticated user (`is:pr is:open author:@me`).
The console sources its main list from das-github-mirror instead; this
route remains for headless use.

### `POST /api/prs/{owner}/{repo}/{number}/summary`
Fetches the PR, all issue comments, all review comments, and all
reviews. Sends them to Claude with prompt caching. Returns
`{ summary, action_items[], blocking_concerns[] }`. **Read-only.**

### `POST /api/prs/{owner}/{repo}/{number}/resolve`
The only endpoint that writes to GitHub. Step by step:

1. Fork PRs are rejected (400) — pushing to a fork's head branch would
   need the fork owner's token.
2. Clone or reuse the repo under `WORKSPACE_DIR/{owner}__{repo}`.
3. Hard-reset to `origin/<head>`, then
   `git merge origin/<base> --no-ff --no-commit`. Clean merge ⇒ no-op
   response.
4. For each conflicted file, send contents (with markers intact) to
   Claude. Returns `{ resolved_content, confidence, reasoning }`.
   Confidence is clamped to ≤ 0.2 if conflict markers survive in the
   model's output.
5. Average confidence ≥ `CONFIDENCE_THRESHOLD` (default 0.85) ⇒ write,
   commit, fast-forward push (no `--force`). Below threshold ⇒
   `git merge --abort`, post a PR comment with a per-file confidence
   table and the diff inside a collapsed `<details>` block.

Response includes the per-file confidences and either the pushed commit
SHA or the posted comment URL.

## Auth

| Header | `.env` fallback | Notes |
| --- | --- | --- |
| `X-GitHub-Token` | `GITHUB_TOKEN` | Needs `repo` scope to push & comment |
| `X-Anthropic-Key` | `ANTHROPIC_API_KEY` | Optional — only required for AI endpoints |
| `X-Claude-Model` (optional) | `CLAUDE_MODEL` | Default `claude-opus-4-7` |
| `X-Confidence-Threshold` (0..1, optional) | `CONFIDENCE_THRESHOLD` | Default `0.85` |

Headers win when both are present. The console acquires the GitHub
token via OAuth — users never paste a PAT.

CORS allows `http://localhost:5173` only (see [app/main.py:13](app/main.py#L13)).
Hosting the console elsewhere requires adding that origin.

## Deploy

The backend needs a real container — `git clone`, `git merge`, and
`git push` can take minutes per call, which rules out serverless/edge
platforms (Netlify Functions, Vercel, Cloudflare Workers all timeout).

The repo contains a [netlify.toml](netlify.toml) stub from earlier
experimentation; it's not a working deploy target for the backend.
Recommended free / cheap container hosts:

- **Koyeb** — free hobby tier, no card, sleeps after 1 hr idle.
- **Hugging Face Spaces (Docker SDK)** — free, no card, no sleep,
  public by default.
- **Fly.io** — generous free credit, card required for verification.
- **Render** — free Python web service (card on file required now).

Whichever host you choose, set on the deployed backend:
- `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_CLIENT_SECRET`
- `FRONTEND_URL=https://your-console.example`
- `BACKEND_URL=https://your-backend.example`
- Update the GitHub OAuth App's callback URL to the deployed backend.

The **console** is a static Vite build (`npm run build` in `console/`)
and deploys cleanly to Netlify, Vercel, Render Static, or GitHub Pages.
Set `VITE_API_BASE_URL` if it should hit a non-same-origin backend.

## Layout

```
.
├── app/                      # FastAPI backend
│   ├── main.py               # routes (incl. OAuth login/callback)
│   ├── deps.py               # X-* headers → Credentials dependency
│   ├── config.py             # pydantic-settings, .env loading
│   ├── github_client.py      # PyGithub wrappers
│   ├── claude_client.py      # Anthropic SDK + prompt caching
│   ├── conflict_resolver.py  # GitPython clone/merge/resolve/push
│   └── schemas.py            # response models
├── console/                  # React + Vite + MUI dashboard
│   ├── src/api/              # axios + TanStack Query clients
│   ├── src/components/       # layout/, prs/, issues/, ConnectGitHub
│   ├── src/pages/            # Dashboard, Settings, AuthCallback
│   ├── src/credentials.ts    # localStorage store + headers builder
│   └── src/theme.ts          # MUI dark theme
├── dev.sh                    # one-command local boot
├── requirements.txt
├── netlify.toml              # placeholder, not a working deploy target
└── .env.example
```
