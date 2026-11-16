#!/usr/bin/env bash
# GhostPilot — Linux / macOS kurulum başlatıcı
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY="$(command -v python3 || command -v python)"
if [ -z "$PY" ]; then
  echo "✗ Python 3 bulunamadı. Kurun:  sudo apt install python3   |   brew install python3"
  exit 1
fi
exec "$PY" "$DIR/kur.py" "$@"
