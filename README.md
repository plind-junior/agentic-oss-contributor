# agentic-oss-contributor

A FastAPI service that does two specific things to your open GitHub pull
requests using the Claude API:

1. **Summarize PR review comments.** Fetches every issue comment, review
   comment, and review on a PR, sends them to Claude, and returns a
   structured summary: a prose recap, a list of concrete action items, and
   a list of blocking concerns.
2. **Resolve merge conflicts.** Clones the repo, merges the PR's base
   branch into its head, asks Claude to rewrite each conflicted file, and
   either pushes the resolution back to the PR branch or posts the
   proposed diff as a PR comment — based on a confidence threshold.

It is the **backend agent**. A separate UI,
[agentic-oss-contributor-console](https://github.com/plind-junior/agentic-oss-contributor-console),
calls it. You can also call it directly with `curl` / cron.

The service is stateless. Each request carries credentials in
`X-GitHub-Token` and `X-Anthropic-Key` headers (the console injects these).
A `.env` fallback exists for headless use.

## What each endpoint actually does

### `GET /api/me`
Calls `GET /user` on GitHub to verify the token, then echoes the login,
the Claude model in effect, and the confidence threshold in effect.
Returns 401 if the GitHub token is bad.

### `GET /api/prs`
Returns every open PR authored by the authenticated user, across all repos
they have access to. Uses GitHub's search API
(`is:pr is:open author:@me`). Each entry includes title, repo, number,
URL, mergeable state, and review-decision.

### `POST /api/prs/{owner}/{repo}/{number}/summary`
1. Fetches the PR, all issue comments, all review comments, and all
   reviews via PyGithub.
2. Sends title + body + flattened comment thread to Claude with a system
   prompt asking for `{ summary, action_items[], blocking_concerns[] }`.
3. Prompt caching is enabled so re-runs against the same PR are cheap.
4. Returns the structured result. **It does not post anything back to
   GitHub** — this endpoint is read-only.

### `POST /api/prs/{owner}/{repo}/{number}/resolve`
The only endpoint that writes to GitHub. Step by step:

1. **Reject forks.** PRs from forks are rejected with 400 — pushing to a
   fork's head branch would need the fork owner's token.
2. **Clone or reuse** the repo under `WORKSPACE_DIR/{owner}__{repo}`
   (default `./workspace`). Uses the supplied `X-GitHub-Token` for auth.
3. **Hard-reset** the local checkout to `origin/<head_branch>`.
4. **Attempt the merge:** `git merge origin/<base_branch> --no-ff --no-commit`.
   If it merges cleanly with no conflicts, returns a no-op response.
5. **For each conflicted file**, sends the file contents (with conflict
   markers intact) to Claude. Claude returns
   `{ resolved_content, confidence: 0..1, reasoning }`. Files where
   conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) survive in the
   model's output get their confidence clamped to ≤ 0.2.
6. **Decide:** compute average confidence across files.
   - **If average ≥ threshold** (default 0.85): write the resolved
     content, `git add`, commit with a message describing the merge, and
     `git push` to the PR head branch. **No `--force`** — fast-forward
     only. PR is updated; reviewers see new commits.
   - **If average < threshold**: `git merge --abort`, then post a comment
     on the PR containing a per-file confidence table and the proposed
     unified diff inside a collapsed `<details>` block. The PR is **not**
     modified.

The response body tells you which branch it took, the per-file
confidences, and either the pushed commit SHA or the posted comment URL.

## Auth

Every endpoint requires both a GitHub token and an Anthropic API key.

| Header | `.env` fallback | Notes |
| --- | --- | --- |
| `X-GitHub-Token` | `GITHUB_TOKEN` | Needs `repo` scope to push and comment |
| `X-Anthropic-Key` | `ANTHROPIC_API_KEY` | |
| `X-Claude-Model` (optional) | `CLAUDE_MODEL` | Default `claude-opus-4-7` |
| `X-Confidence-Threshold` (optional, 0..1) | `CONFIDENCE_THRESHOLD` | Default `0.85` |

Headers win when both are present.

## Run

```bash
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # only needed for headless / cron use
uvicorn app.main:app --reload --port 8000
```

> **Python version.** `pydantic-core` does not currently ship wheels for
> Python 3.14. Use 3.12 (or 3.10–3.13).

CORS is preconfigured for `http://localhost:5173` so the console can call
it during local development.

## Deploy (free tier — Render)

A [`render.yaml`](render.yaml) is included. The service runs on Render's
free Python web service: 512 MB RAM, sleeps after 15 min idle (~30 s cold
start), ephemeral disk (the `workspace/` clone is rebuilt on first
`/resolve` after a restart). No credit card required.

Steps:

1. Push this repo to GitHub (already done if you used `git push`).
2. Sign in at <https://render.com> with your GitHub account.
3. **New + → Blueprint**, point it at this repo. Render reads
   `render.yaml` and creates the service automatically.
4. Wait for the first build to finish (~2 min). The service comes up at
   `https://agentic-oss-contributor.onrender.com` (the exact subdomain is
   shown on the dashboard).
5. Verify: `curl -H "X-GitHub-Token: ghp_..." -H "X-Anthropic-Key: sk-ant-..." \
   https://<your-subdomain>.onrender.com/api/me` should return your login.

**No env vars to set on the server** — credentials are passed per-request
in `X-GitHub-Token` and `X-Anthropic-Key` headers, exactly as the local
console already does. Point the console's "agent URL" setting at the
Render URL and it works the same as local.

**Cold-start note.** The first request after 15 min idle takes ~30 s to
wake up. Subsequent requests are fast.

**Disk note.** `WORKSPACE_DIR` is set to `/tmp/workspace` so clones land
on Render's writable tmp directory. They survive within an instance's
lifetime, not across redeploys or sleep cycles.

## Layout

```
app/
  config.py            # pydantic-settings, .env (optional fallback)
  deps.py              # Credentials dependency from headers
  schemas.py           # response models
  github_client.py     # PyGithub wrappers (token threaded per-call)
  claude_client.py     # Anthropic SDK + prompt caching
  conflict_resolver.py # GitPython clone/merge/resolve/push
  main.py              # FastAPI routes
requirements.txt
.env.example
```
