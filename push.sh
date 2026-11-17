#!/bin/bash
# GhostPilot — GitHub push yardımcısı
# Token'ı komut satırından almaz; gizli olarak sorar ve KAYDETMEZ.
set -e
cd "$(dirname "$0")"
read -rsp "GitHub Personal Access Token (ghp_...): " TOKEN
echo
git push "https://Btmcode:${TOKEN}@github.com/Btmcode/GhostPilot.git" main:main
echo "✅ Push tamamlandı → https://github.com/Btmcode/GhostPilot"
