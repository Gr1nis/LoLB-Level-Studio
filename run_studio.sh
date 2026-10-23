#!/usr/bin/env bash
# LoLB Level Studio - Quick Launcher
# Starts python3 server.py and opens http://localhost:8080 in default browser

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

PORT="${PORT:-8080}"
echo "🐼 Запуск LoLB Level Studio на порту $PORT..."

# Open browser in background after server binds
(
  sleep 1
  URL="http://localhost:${PORT}"
  if command -v open >/dev/null 2>&1; then
    open "$URL"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL"
  fi
) &

exec python3 "$SCRIPT_DIR/server.py" "$PORT"
