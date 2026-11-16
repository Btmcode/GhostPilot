#!/usr/bin/env python3
# ============================================================================
#  GhostPilot — python_game_bot_demo.py
#  Copyright (c) 2026 BTM Code — MIT License
#  https://btmcode.vercel.app
#  Açık kaynak. Telif bildirimini koruyun.
# ============================================================================
"""
GhostPilot — Python Oyun Botu Örneği
Daemon HTTP RPC üzerinden masaüstü penceresine arka planda tuş gönderir.
Kullanıcı kendi faresi/klavyesiyle aynı anda başka iş yapabilir!

Önce başlatın:  python3 ../ghostpilot_daemon.py
Sonra çalıştırın: python3 python_game_bot_demo.py
"""

import json
import time
import urllib.request

BASE = "http://127.0.0.1:17380/api/rpc"
TOKEN = os.environ.get("GHOSTPILOT_TOKEN", "")


def rpc(domain, method, params=None):
    body = json.dumps({"domain": domain, "method": method, "params": params or {}}).encode()
    req = urllib.request.Request(BASE, data=body,
                                 headers={"Content-Type": "application/json", "X-GhostPilot-Token": TOKEN})
    with urllib.request.urlopen(req, timeout=15) as r:
        data = json.loads(r.read().decode())
    if not data.get("ok"):
        raise RuntimeError(data.get("error"))
    return data["result"]


def main():
    print("Durum:", rpc("system", "status"))
    windows = rpc("desktop", "list_windows", {"limit": 20})
    for i, w in enumerate(windows):
        print(f"  [{i}] {w['title']}  (id={w['id']}, pid={w['pid']})")

    if not windows:
        print("Açık pencere bulunamadı. Bir oyun/uygulama açıp tekrar deneyin.")
        return

    # İlk pencereyi hedef al (gerçek kullanımda kullanıcı seçim yapar)
    target = windows[0]
    print(f"\nHedef: {target['title']}")
    print("Arka planda 'space' + 'up' gönderiliyor (fareniz/klavyeniz serbest)...")
    for key in ("space", "up", "space", "right"):
        rpc("desktop", "window_key", {"windowId": target["id"], "pid": target["pid"], "key": key, "mode": "press"})
        print(f"  → {key}")
        time.sleep(0.4)

    print("\nTamam! Acil durdurma: Alt+Shift+X veya rpc('system','emergency_stop')")


if __name__ == "__main__":
    main()
