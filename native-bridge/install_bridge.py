#!/usr/bin/env python3
# ============================================================================
#  GhostPilot — install_bridge.py
#  Copyright (c) 2026 BTM Code — MIT License
#  https://btmcode.vercel.app
#  Açık kaynak. Telif bildirimini koruyun.
# ============================================================================
"""
GhostPilot — Native Messaging Köprü Kurulumu (tek tık)
Tarayıcı eklentisinin masaüstü daemon ile Native Messaging üzerinden konuşabilmesi
için gerekli host manifestlerini ve çalıştırıcı sarmalayıcıları yazar.

Kullanım:
    python3 install_bridge.py [--extension-id <id>] [--token <token>]

Not: Varsayılan kurulumda eklenti, daemon'a WebSocket (127.0.0.1:17380) ile de
bağlanır; Native Messaging bu dosyanın yazdığı manifest üzerinden alternatif
güvenli kanaldır. Her iki yol da aynı daemon'u kullanır.
"""

import argparse
import json
import os
import platform
import stat
import sys

HOST_NAME = "com.ghostpilot.bridge"
OS_NAME = platform.system()


def write_json(path: str, data: dict):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  ✓ {path}")


def make_wrapper(daemon_path: str, token: str) -> str:
    """Çalıştırıcı sarmalayıcı oluşturur, yolunu döner."""
    here = os.path.dirname(os.path.abspath(__file__))
    if OS_NAME == "Windows":
        wrapper = os.path.join(here, "ghostpilot_bridge.bat")
        with open(wrapper, "w", encoding="utf-8") as f:
            f.write("@echo off\r\n")
            f.write(f'set "GHOSTPILOT_TOKEN={token}"\r\n')
            f.write(f'"{sys.executable}" "{daemon_path}" --native-messaging\r\n')
        return wrapper
    wrapper = os.path.join(here, "ghostpilot_bridge.sh")
    with open(wrapper, "w", encoding="utf-8") as f:
        f.write("#!/bin/sh\n")
        f.write(f'export GHOSTPILOT_TOKEN="{token}"\n')
        f.write(f'exec "{sys.executable}" "{daemon_path}" --native-messaging\n')
    os.chmod(wrapper, os.stat(wrapper).st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
    return wrapper


def main():
    ap = argparse.ArgumentParser(description="GhostPilot Native Messaging kurulumu")
    ap.add_argument("--extension-id", default="*",
                    help="Eklenti ID'si (geliştirici modu için '*' kabul edilir)")
    ap.add_argument("--token", default=os.environ.get("GHOSTPILOT_TOKEN", ""))
    args = ap.parse_args()

    daemon_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "ghostpilot_daemon.py"))
    token = (args.token or "").strip()
    if not token:
        try:
            with open(os.path.join(os.path.expanduser("~"), ".ghostpilot", "token"), encoding="utf-8") as f:
                token = f.read().strip()
        except Exception:
            token = ""
    if not token:
        import secrets
        token = secrets.token_hex(24)
        cfg_dir = os.path.join(os.path.expanduser("~"), ".ghostpilot")
        os.makedirs(cfg_dir, mode=0o700, exist_ok=True)
        fd = os.open(os.path.join(cfg_dir, "token"), os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(token)
    args.token = token
    wrapper = make_wrapper(daemon_path, token)

    if args.extension_id == "*":
        allowed = ["chrome-extension://*/"]
    else:
        allowed = [f"chrome-extension://{args.extension_id}/"]

    manifest = {
        "name": HOST_NAME,
        "description": "GhostPilot Cross-Platform Desktop & Browser AI Bridge",
        "path": wrapper,
        "type": "stdio",
        "allowed_origins": allowed,
    }
    ff_manifest = {
        "name": HOST_NAME,
        "description": "GhostPilot Cross-Platform Desktop & Browser AI Bridge",
        "path": wrapper,
        "type": "stdio",
        "allowed_extensions": [args.extension_id] if args.extension_id != "*" else ["ghostpilot@example.com"],
    }

    home = os.path.expanduser("~")
    print(f"[GhostPilot] OS: {OS_NAME} — Native Messaging hostları yazılıyor...")

    if OS_NAME == "Windows":
        appdata = os.environ.get("APPDATA", os.path.join(home, "AppData", "Roaming"))
        for browser in ("Google\\Chrome", "Chromium", "Microsoft\\Edge", "BraveSoftware\\Brave-Browser", "Opera Software\\Opera Stable"):
            write_json(os.path.join(appdata, browser, "NativeMessagingHosts", f"{HOST_NAME}.json"), manifest)
        write_json(os.path.join(appdata, "Mozilla", "Firefox", "NativeMessagingHosts", f"{HOST_NAME}.json"), ff_manifest)
    elif OS_NAME == "Darwin":
        for sub in ("Google/Chrome", "Chromium", "Microsoft Edge", "BraveSoftware/Brave-Browser", "com.operasoftware.Opera"):
            write_json(os.path.join(home, "Library", "Application Support", sub, "NativeMessagingHosts", f"{HOST_NAME}.json"), manifest)
        write_json(os.path.join(home, "Library", "Application Support", "Mozilla", "Firefox", "NativeMessagingHosts", f"{HOST_NAME}.json"), ff_manifest)
    else:  # Linux
        for sub in (".config/google-chrome", ".config/chromium", ".config/microsoft-edge", ".config/BraveSoftware/Brave-Browser", ".config/opera"):
            write_json(os.path.join(home, sub, "NativeMessagingHosts", f"{HOST_NAME}.json"), manifest)
        write_json(os.path.join(home, ".mozilla", "native-messaging-hosts", f"{HOST_NAME}.json"), ff_manifest)

    print("\n[GhostPilot] Kurulum tamam! Şimdi daemon'u başlatın:")
    print(f"  python3 \"{daemon_path}\"")
    print("Ve tarayıcıda eklenti panelinden 'Yeniden Bağlan' butonuna basın.")


if __name__ == "__main__":
    main()
