# agentic-oss-contributor

The **agent itself**: a FastAPI service that triages your GitHub pull requests
using the Claude API. It does the work — calling Claude, running git,
resolving conflicts, posting comments — while you watch and approve through
the [agentic-oss-contributor-console](https://github.com/plind-junior/agentic-oss-contributor-console).

Stateless. Every request carries credentials via `X-GitHub-Token` and
`X-Anthropic-Key` headers (normally injected by the console). An optional
`.env` fallback is supported for cron / scripts.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET`  | `/api/me` | Validate credentials, return login + active model + threshold |
| `GET`  | `/api/prs` | Open PRs authored by the authenticated user |
| `POST` | `/api/prs/{owner}/{repo}/{number}/summary` | Claude-generated comment summary + action items + blocking concerns |
| `POST` | `/api/prs/{owner}/{repo}/{number}/resolve` | Clone + merge base into head; per-file Claude resolution with confidence scoring; auto-push if avg ≥ threshold, otherwise post the diff as a PR comment |

All endpoints require either request headers or `.env` fallback:

| Header | `.env` fallback |
| --- | --- |
| `X-GitHub-Token` | `GITHUB_TOKEN` |
| `X-Anthropic-Key` | `ANTHROPIC_API_KEY` |
| `X-Claude-Model` (optional) | `CLAUDE_MODEL` (defaults to `claude-opus-4-7`) |
| `X-Confidence-Threshold` (optional, 0..1) | `CONFIDENCE_THRESHOLD` (defaults to `0.85`) |

## Run

```bash
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # optional — only needed for headless use
uvicorn app.main:app --reload --port 8000
```

> **Python version.** `pydantic-core` does not currently ship wheels for
> Python 3.14. Use 3.12 (or 3.10–3.13).

## Conflict resolution behaviour

1. Clones (or re-uses) the repo under `WORKSPACE_DIR/{owner}__{repo}`.
2. Hard-resets to `origin/<head>`, then `git merge origin/<base> --no-ff --no-commit`.
3. For each conflicted file, sends the marker-laden contents to Claude. The
   model returns `{ resolved_content, confidence, reasoning }`. Files where
   conflict markers survive get clamped to confidence ≤ 0.2.
4. If average confidence ≥ `CONFIDENCE_THRESHOLD`: writes resolutions, commits,
   pushes back to the PR head branch (fast-forward — no `--force`).
5. Otherwise: aborts the merge and posts a Markdown comment to the PR with a
   per-file confidence table and the proposed unified diff in a `<details>`
   block.

Fork PRs are rejected — pushing to a fork's head branch would need that fork
owner's token.

## Layout

```
app/
  config.py            # pydantic-settings, .env (optional fallback)
  deps.py              # Credentials dependency from headers
  schemas.py           # response models
  github_client.py     # PyGithub wrappers (token threaded per-call)
  claude_client.py     # Anthropic SDK + prompt caching
  conflict_resolver.py # GitPython merge/resolve/push
  main.py              # FastAPI routes
requirements.txt
.env.example
```
