# agentic-oss-contributor-console

Control surface for the [agentic-oss-contributor](https://github.com/plind-junior/agentic-oss-contributor)
agent. A React + MUI dashboard that lists your open GitHub PRs, summarizes new
review/issue comments with Claude, and runs auto-conflict-resolution with a
per-PR confidence display.

The console doesn't do any work itself — every action is delegated to the
agent running at `http://127.0.0.1:8000`. Credentials (GitHub PAT + Anthropic
API key) are entered in **Settings**, stored in this browser's `localStorage`,
and sent with every backend request as `X-GitHub-Token` / `X-Anthropic-Key`
headers. The agent stores nothing.

## Stack

- Vite + `@vitejs/plugin-react-swc`
- React 18 + TypeScript
- MUI v5 + Emotion — dark theme, JetBrains Mono, extended palette tokens
  (`status.*`, `surface.*`, `border.*`)
- TanStack Query + axios — `src/api/ApiUtils.ts` is a thin wrapper with an
  interceptor that injects credential headers from localStorage
- React Router v6 with a central `routes.tsx`

## Run

```bash
npm install
npm run dev     # http://localhost:5173
```

Vite proxies `/api/*` to `http://127.0.0.1:8000`, so start the
[agentic-oss-contributor](https://github.com/plind-junior/agentic-oss-contributor)
agent in another terminal first.

## Pages

- **Dashboard** (`/`) — your open PRs across all accessible repos, each with
  *Summarize comments* and *Resolve conflicts* actions. Empty state prompts to
  configure credentials when none are stored.
- **Settings** (`/settings`) — GitHub PAT, Anthropic key, optional model
  override, optional confidence-threshold slider. *Test connection* button
  pings `/api/me` with the form values without saving.

## Security note

`localStorage` is readable by any JS on the page. This is fine for a localhost
dev tool. If you ever serve this over a real domain, swap to HttpOnly cookies
+ CSRF before exposing it.

## Layout

```
src/
  api/                 # axios interceptor + TanStack Query wrappers
  components/
    layout/            # AppLayout + Sidebar
    prs/               # PRCard, PRStatusChip
    ErrorBoundary.tsx
  hooks/useCredentials.ts
  pages/               # DashboardPage, SettingsPage
  credentials.ts       # localStorage store with subscribe()
  theme.ts             # MUI dark theme
  routes.tsx, App.tsx, main.tsx, index.css
```
