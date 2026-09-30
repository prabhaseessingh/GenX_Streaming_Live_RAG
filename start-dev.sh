#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "[GenX] Checking backend setup..."
if [[ ! -f backend/.env ]]; then
  cp backend/.env.example backend/.env
  echo "[GenX] Created backend/.env from backend/.env.example. Add GROQ_API_KEY if needed."
fi

PYTHON_BIN="${PYTHON_BIN:-python3}"
if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  PYTHON_BIN="python"
fi
if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "[GenX] Python 3 is required."
  exit 1
fi

if [[ ! -x backend/.venv/bin/python ]]; then
  echo "[GenX] Creating backend virtual environment..."
  "$PYTHON_BIN" -m venv backend/.venv
  backend/.venv/bin/python -m pip install -r backend/requirements.txt
else
  echo "[GenX] Backend virtual environment already exists."
fi

if [[ ! -d frontend/node_modules ]]; then
  echo "[GenX] Installing frontend packages..."
  npm --prefix frontend install
else
  echo "[GenX] Frontend packages already installed."
fi

cleanup() {
  kill "${BACKEND_PID:-}" "${FRONTEND_PID:-}" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

echo "[GenX] Backend:  http://127.0.0.1:8000"
echo "[GenX] Frontend: http://127.0.0.1:3000"

(
  cd backend
  .venv/bin/python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
) &
BACKEND_PID=$!

(
  cd frontend
  npm run dev
) &
FRONTEND_PID=$!

wait

