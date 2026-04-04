#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
exec uvicorn app.main:app --host 127.0.0.1 --port 8000
