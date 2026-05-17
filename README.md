# agentic-oss-contributor

Monorepo for the agentic OSS-contributor toolkit:

- **Backend** (this repo root) — a stateless FastAPI service that uses the
  Claude API to (a) summarize PR review threads and (b) auto-resolve merge
  conflicts on PRs you author.
- **[`console/`](console/)** — a React + Vite dashboard that signs into
  GitHub via OAuth, lists your PRs &amp; issues from the
  [das-github-mirror](https://mirror.gittensor.io), and drives the backend's
  per-PR actions with an `auto-push | manual review` toggle.

The two run as separate processes locally but share one repo so they can
evolve together.

## Quick start

Two terminals.

**Backend** (FastAPI on `:8000`):

```bash
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env       # then fill in GITHUB_OAUTH_CLIENT_ID/SECRET
uvicorn app.main:app --reload --port 8000
```

> Python 3.12 — `pydantic-core` doesn't ship wheels for 3.14 yet.

**Console** (Vite on `:5173`):

```bash
cd console
npm install
npm run dev
```

Vite proxies `/api/*` to `127.0.0.1:8000`, so start the backend first.
Open <http://localhost:5173> and click **Continue with GitHub**.

### One-time GitHub OAuth setup

The console's sign-in button calls `/api/auth/github/login`, which 302s to
GitHub. For that to work the backend needs OAuth credentials:

1. Register an OAuth App at <https://github.com/settings/applications/new>
   - Homepage URL: `http://localhost:5173`
   - Authorization callback URL: `http://localhost:8000/api/auth/github/callback`
2. Put the client id / secret in `.env`:
   ```
   GITHUB_OAUTH_CLIENT_ID=Iv1.xxxxxxxx
   GITHUB_OAUTH_CLIENT_SECRET=xxxxxxxxxxxxxxxx
   ```
3. Restart the backend.

The Anthropic API key is optional and is set per-browser in the console's
**Settings** page (sent per-request as `X-Anthropic-Key`). Without it, AI
features (comment summary, conflict resolution) are disabled but you can
still browse PRs &amp; issues from the mirror.

## Backend API reference

The backend is stateless. Each request carries credentials in
`X-GitHub-Token` and `X-Anthropic-Key` headers (the console injects these
automatically after OAuth sign-in). A `.env` fallback exists for headless /
cron use.

### `GET /api/auth/github/login`
302 to GitHub's OAuth authorize URL. Used by the console's sign-in button.

### `GET /api/auth/github/callback`
Exchanges the OAuth code for an access token, then 302s the browser to
`{FRONTEND_URL}/auth/callback#access_token=…`. The console reads the
fragment and stores the token in `localStorage`.

### `GET /api/me`
Calls `GET /user` on GitHub to verify the token; echoes login, Claude
model, confidence threshold. 401 if the token is bad.

### `GET /api/prs`
Open PRs authored by the authenticated user (`is:pr is:open author:@me`).
*Note:* the console currently sources its lists from das-github-mirror
instead; this route stays available for headless use.

### `POST /api/prs/{owner}/{repo}/{number}/summary`
Fetches the PR, all issue and review comments, sends them to Claude with
prompt caching, returns `{ summary, action_items[], blocking_concerns[] }`.
Read-only — does not post anything back to GitHub.

### `POST /api/prs/{owner}/{repo}/{number}/resolve?push={true|false}`
The only endpoint that writes to GitHub.

1. Rejects PRs from forks (400).
2. Clones / hard-resets the repo into `WORKSPACE_DIR/{owner}__{repo}`.
3. `git merge origin/<base> --no-ff --no-commit`. Clean merge → no-op
   response.
4. For each conflicted file, sends contents (with markers intact) to
   Claude; receives `{ resolved_content, confidence, reasoning }`.
   Confidence is clamped to ≤ 0.2 if conflict markers survive.
5. Decides:
   - `push=true` (default) **and** avg confidence ≥ threshold: write,
     `git add`, commit, fast-forward push.
   - `push=false` **or** avg confidence below threshold: `git merge --abort`,
     post a PR comment with a per-file confidence table and the diff in a
     collapsed `<details>` block.

Response body includes the per-file confidences and either the pushed
commit SHA or the posted comment URL.

## Auth

| Header | `.env` fallback | Notes |
| --- | --- | --- |
| `X-GitHub-Token` | `GITHUB_TOKEN` | Needs `repo` scope to push & comment |
| `X-Anthropic-Key` | `ANTHROPIC_API_KEY` | Optional — only required for AI endpoints |
| `X-Claude-Model` (optional) | `CLAUDE_MODEL` | Default `claude-opus-4-7` |
| `X-Confidence-Threshold` (0..1, optional) | `CONFIDENCE_THRESHOLD` | Default `0.85` |

Headers win when both are present. The console acquires the GitHub token
via OAuth (so users never paste a PAT).

## Deploy (free tier — Render)

A [`render.yaml`](render.yaml) is included for the **backend**. Render's
free Python web service: 512 MB RAM, sleeps after 15 min idle (~30 s cold
start), ephemeral disk (the `workspace/` clone is rebuilt on first
`/resolve` after a restart). No credit card required.

1. Push this repo to GitHub.
2. <https://render.com> → **New + → Blueprint**, point it at this repo.
3. After deploy, set `GITHUB_OAUTH_CLIENT_ID` &amp; `GITHUB_OAUTH_CLIENT_SECRET`
   in the Render dashboard, plus `FRONTEND_URL=https://your-console.example`
   and `BACKEND_URL=https://your-backend.onrender.com`.
4. Update the OAuth App's callback URL on GitHub to match the Render URL.

The **console** deploys as any Vite static site (Netlify, Vercel, Render
static, GitHub Pages). Set `VITE_API_BASE_URL` if it should hit a
non-same-origin backend.

## Layout

```
.
├── app/                    # FastAPI backend
│   ├── main.py             # routes (incl. OAuth login/callback)
│   ├── deps.py             # X-* header → Credentials dependency
│   ├── config.py           # pydantic-settings, .env loading
│   ├── github_client.py    # PyGithub wrappers
│   ├── claude_client.py    # Anthropic SDK + prompt caching
│   ├── conflict_resolver.py# GitPython clone/merge/resolve/push
│   └── schemas.py
├── console/                # React + Vite + MUI dashboard
│   ├── src/api/            # axios + TanStack Query, GitHub + Mirror clients
│   ├── src/components/     # layout/, prs/, issues/, ConnectGitHub gate
│   ├── src/pages/          # DashboardPage, SettingsPage, AuthCallbackPage
│   ├── src/credentials.ts  # localStorage store + headers builder
│   └── src/theme.ts        # MUI dark theme, JetBrains Mono
├── requirements.txt
├── render.yaml
└── .env.example
```
