#!/usr/bin/env bash
# Start the FastAPI agent (port 8000) and the Vite console (port 5173) locally.
# Vite proxies /api -> 127.0.0.1:8000, so open http://localhost:5173 in a browser.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO"

# --- Backend: Python venv + deps ---
if [[ ! -d .venv ]]; then
  echo ">> creating .venv"
  python3.12 -m venv .venv 2>/dev/null || python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q -r requirements.txt

# --- Console: npm deps ---
if [[ ! -d console/node_modules ]]; then
  echo ">> installing console deps"
  ( cd console && npm install )
fi

# --- Run both, clean up children on exit ---
cleanup() { trap - INT TERM EXIT; kill 0 2>/dev/null || true; }
trap cleanup INT TERM EXIT

echo ">> backend: http://127.0.0.1:8000"
echo ">> console: http://localhost:5173"
echo

uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload &
( cd console && npm run dev ) &
wait
