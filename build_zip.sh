#!/bin/bash
# GhostPilot paket üretici — yalnız çalışması için GEREKLİ dosyalar
set -e
OUT="GhostPilot_Paketi.zip"
rm -f "$OUT"
zip -rq "$OUT" \
  extension-chromium \
  extension-firefox \
  native-bridge \
  kur.py \
  README.md README.en.md README.zh.md README.ja.md README.ko.md README.vi.md README.de.md README.ms.md \
  LICENSE COPYRIGHT \
  -x "*__pycache__*" "*.pyc" "*.log" "*.DS_Store" "*/.*"
echo "✓ $OUT — $(du -h "$OUT" | cut -f1) — $(unzip -l "$OUT" | tail -1 | awk '{print $2}') dosya"
