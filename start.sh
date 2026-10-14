#!/usr/bin/env bash
# start.sh — one-command setup + launch for Data Analysis Studio.
#
# What it does, in order:
#   1. Creates a Python virtual environment and installs the backend deps.
#   2. Makes sure PostgreSQL is reachable and the database exists.
#   3. Installs frontend (npm) deps and builds the TypeScript into dist/.
#   4. If Rust + wasm-pack are installed, builds the WASM stats module too
#      (optional -- the app works without it, just falls back to TS).
#   5. Starts the FastAPI server, which serves both the API and the built
#      frontend, at http://localhost:8000
#
# Re-running this script is safe and fast -- it skips steps that are
# already done (existing venv, existing node_modules, existing db).
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "== Data Analysis Studio =="
echo

# ------------------------------------------------------------- Python
if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 not found. Install Python 3.10+ (https://www.python.org/downloads/) and re-run this script."
  exit 1
fi

if [ ! -d "$ROOT/backend/.venv" ]; then
  echo "-> creating Python virtual environment (backend/.venv)"
  python3 -m venv "$ROOT/backend/.venv"
fi
# shellcheck disable=SC1091
source "$ROOT/backend/.venv/bin/activate"

echo "-> installing Python dependencies (needs internet the first time)"
pip install -q --upgrade pip
pip install -q -r "$ROOT/backend/requirements.txt"

# ------------------------------------------------------------- PostgreSQL
: "${DATABASE_URL:=postgresql+psycopg2://$(whoami)@localhost:5432/data_analysis_studio}"
export DATABASE_URL
DB_NAME=$(python3 -c "import os,re; print(re.search(r'/([^/?]+)\$', os.environ['DATABASE_URL']).group(1))")

echo "-> using DATABASE_URL=$DATABASE_URL"
echo "   (override by exporting DATABASE_URL yourself before running this script)"

if command -v psql >/dev/null 2>&1; then
  if ! psql -h localhost -U "$(whoami)" -lqt 2>/dev/null | cut -d '|' -f1 | tr -d ' ' | grep -qx "$DB_NAME"; then
    echo "-> creating database '$DB_NAME'"
    createdb "$DB_NAME" 2>/dev/null || echo "   could not auto-create it -- if this fails on startup, run: createdb $DB_NAME"
  else
    echo "-> database '$DB_NAME' already exists"
  fi
else
  echo "!! psql not found on PATH -- assuming PostgreSQL is already running and reachable."
  echo "   If this is your first run and it fails to connect, create the database with: createdb $DB_NAME"
fi

# ------------------------------------------------------------- Frontend
if command -v npm >/dev/null 2>&1; then
  if [ ! -d "$ROOT/frontend/node_modules" ]; then
    echo "-> installing frontend dependencies (needs internet the first time)"
    (cd "$ROOT/frontend" && npm install --no-fund --no-audit)
  fi
  echo "-> building frontend"
  (cd "$ROOT/frontend" && npm run build)
else
  echo "!! npm not found -- skipping the frontend build, the UI will not be available."
  echo "   Install Node.js (https://nodejs.org) and re-run this script."
fi

# ------------------------------------------------------------- Rust/WASM (optional)
if command -v wasm-pack >/dev/null 2>&1; then
  if [ ! -d "$ROOT/frontend/src/wasm-pkg" ]; then
    echo "-> building the Rust/WASM stats module"
    (cd "$ROOT/wasm" && wasm-pack build --target web --out-dir ../frontend/src/wasm-pkg)
    if command -v npm >/dev/null 2>&1; then
      echo "-> rebuilding frontend to bundle the wasm module"
      (cd "$ROOT/frontend" && npm run build)
    fi
  else
    echo "-> Rust/WASM module already built"
  fi
else
  echo "i  wasm-pack not found -- live stats will use the TypeScript fallback (fully functional, just not"
  echo "   compiled Rust). To enable it: install Rust (https://rustup.rs) and wasm-pack"
  echo "   (https://rustwasm.github.io/wasm-pack/installer/), then re-run this script."
fi

# ------------------------------------------------------------- Launch
echo
echo "-> starting server at http://localhost:8000"
echo "   press Ctrl+C to stop"
echo
cd "$ROOT/backend"
exec uvicorn app:app --host 127.0.0.1 --port 8000
