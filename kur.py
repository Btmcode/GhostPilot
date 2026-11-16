#!/usr/bin/env python3
# ============================================================================
#  GhostPilot — kur.py
#  Copyright (c) 2026 BTM Code — MIT License
#  https://btmcode.vercel.app
#  Açık kaynak. Telif bildirimini koruyun.
# ============================================================================
# -*- coding: utf-8 -*-
"""
GhostPilot — Tek Komut Kurulum Yöneticisi (kur.py)
==================================================
Sıfır bağımlılık. Python 3.8+ yeterli.

Kullanım:
  python3 kur.py                 # Durum + adım adım yönlendirme (kurulum sihirbazını açar)
  python3 kur.py start           # Masaüstü köprüsünü (daemon) arka planda başlat
  python3 kur.py stop            # Durdur
  python3 kur.py status          # Sağlık kontrolü (/health)
  python3 kur.py autostart       # Bilgisayar açılınca otomatik başlatmayı kur
  python3 kur.py noautostart     # Otomatik başlatmayı kaldır
  python3 kur.py native          # Native Messaging host'unu kaydet (isteğe bağlı)
  python3 kur.py token           # Yeni güvenlik token'ı üret ve yaz
  python3 kur.py reset           # Ayarları/kilidi sıfırla (erişim açık hâle gelir)

Windows:  kur.bat        |  Linux/macOS:  ./kur.sh
"""

import json
import os
import platform
import shutil
import socket
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.abspath(__file__))
DAEMON = os.path.join(ROOT, "native-bridge", "ghostpilot_daemon.py")
CONFIG_FILE = os.path.join(ROOT, "ghostpilot_kurulum.json")
GUIDE = os.path.join(ROOT, "KURULUM.html")
OS_NAME = platform.system()

C_OK, C_WARN, C_ERR, C_DIM, C_END = "\033[92m", "\033[93m", "\033[91m", "\033[2m", "\033[0m"
if OS_NAME == "Windows" and not os.environ.get("WT_SESSION"):
    C_OK = C_WARN = C_ERR = C_DIM = C_END = ""


def say(msg="", color=""):
    print(f"{color}{msg}{C_END}")


def title(text):
    say("\n" + "=" * 62, C_DIM)
    say(f"  {text}")
    say("=" * 62, C_DIM)


def load_config():
    default = {"token": secrets.token_hex(24), "port": 17380, "host": "127.0.0.1", "access": "open"}
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                default.update(json.load(f))
        except Exception:
            pass
    return default


def save_config(cfg):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)


def check_python():
    v = sys.version_info
    ok = v >= (3, 8)
    say(f"  Python {v.major}.{v.minor}.{v.micro} — {'uygun ✓' if ok else 'ÇOK ESKİ ✗ (3.8+ gerekli)'}",
        C_OK if ok else C_ERR)
    return ok


def port_free(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.4)
        return s.connect_ex(("127.0.0.1", port)) != 0


def health(port):
    import urllib.request
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/health", timeout=2) as r:
            return json.loads(r.read().decode("utf-8"))
    except Exception:
        return None


def start_daemon(cfg):
    if not port_free(cfg["port"]):
        say(f"  Köprü zaten çalışıyor (port {cfg['port']}).", C_WARN)
        return True
    env = dict(os.environ)
    env["GHOSTPILOT_TOKEN"] = cfg["token"]
    args = [sys.executable, DAEMON, "--port", str(cfg["port"]), "--host", cfg["host"]]

    if OS_NAME == "Windows":
        flags = 0x00000008 | 0x00000200  # DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP
        subprocess.Popen(args, env=env, creationflags=flags,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, close_fds=True)
    else:
        subprocess.Popen(args, env=env, stdout=subprocess.DEVNULL,
                         stderr=subprocess.DEVNULL, start_new_session=True)

    for _ in range(20):
        time.sleep(0.25)
        if health(cfg["port"]):
            say(f"  ✓ Köprü çalışıyor: http://127.0.0.1:{cfg['port']}", C_OK)
            return True
    say("  ✗ Köprü başlatılamadı. Elle deneyin:", C_ERR)
    say(f'    python3 "{DAEMON}" --port {cfg["port"]}', C_DIM)
    return False


def stop_daemon(cfg):
    if OS_NAME == "Windows":
        subprocess.run(["taskkill", "/F", "/FI", "IMAGENAME eq python.exe", "/FI",
                        "WINDOWTITLE eq GhostPilot*"], capture_output=True)
        say("  Windows'ta köprüyü durdurmak için: Görev Yöneticisi → python.exe → Görevi sonlandır.", C_WARN)
    else:
        subprocess.run(["pkill", "-f", "ghostpilot_daemon.py"], capture_output=True)
        say("  ✓ Köprü durduruldu.", C_OK)


# ---------------------------------------------------------------------------
# Otomatik başlatma (autostart)
# ---------------------------------------------------------------------------
def autostart_install(cfg):
    py = sys.executable
    if OS_NAME == "Windows":
        startup = os.path.join(os.environ.get("APPDATA", ""),
                               "Microsoft", "Windows", "Start Menu", "Programs", "Startup")
        os.makedirs(startup, exist_ok=True)
        vbs = os.path.join(startup, "GhostPilot.vbs")
        with open(vbs, "w", encoding="utf-8") as f:
            f.write('Set s = CreateObject("WScript.Shell")\r\n')
            f.write(f's.Run """{py}"" ""{DAEMON}"" --port {cfg["port"]}", 0, False\r\n')
        say(f"  ✓ Windows başlangıcına eklendi: {vbs}", C_OK)

    elif OS_NAME == "Darwin":
        plist_dir = os.path.expanduser("~/Library/LaunchAgents")
        os.makedirs(plist_dir, exist_ok=True)
        plist = os.path.join(plist_dir, "com.ghostpilot.daemon.plist")
        with open(plist, "w", encoding="utf-8") as f:
            f.write(f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.ghostpilot.daemon</string>
  <key>ProgramArguments</key><array>
    <string>{py}</string><string>{DAEMON}</string><string>--port</string><string>{cfg["port"]}</string>
  </array>
  <key>EnvironmentVariables</key><dict>
    <key>GHOSTPILOT_TOKEN</key><string>{cfg["token"]}</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
</dict></plist>
""")
        subprocess.run(["launchctl", "unload", plist], capture_output=True)
        subprocess.run(["launchctl", "load", plist], capture_output=True)
        say(f"  ✓ macOS LaunchAgent kuruldu: {plist}", C_OK)

    else:
        unit_dir = os.path.expanduser("~/.config/systemd/user")
        os.makedirs(unit_dir, exist_ok=True)
        unit = os.path.join(unit_dir, "ghostpilot.service")
        with open(unit, "w", encoding="utf-8") as f:
            f.write(f"""[Unit]
Description=GhostPilot Desktop Bridge
After=graphical-session.target

[Service]
Type=simple
ExecStart={py} {DAEMON} --port {cfg["port"]}
Environment=GHOSTPILOT_TOKEN={cfg["token"]}
Restart=on-failure

[Install]
WantedBy=default.target
""")
        r = subprocess.run(["systemctl", "--user", "enable", "--now", "ghostpilot.service"],
                           capture_output=True, text=True)
        if r.returncode == 0:
            say("  ✓ systemd kullanıcı servisi kuruldu ve başlatıldı.", C_OK)
        else:
            say("  systemd bulunamadı, ~/.config/autostart yöntemi kullanılıyor.", C_WARN)
            adir = os.path.expanduser("~/.config/autostart")
            os.makedirs(adir, exist_ok=True)
            with open(os.path.join(adir, "ghostpilot.desktop"), "w", encoding="utf-8") as f:
                f.write(f"""[Desktop Entry]
Type=Application
Name=GhostPilot Bridge
Exec={py} {DAEMON} --port {cfg["port"]}
X-GNOME-Autostart-enabled=true
""")
            say("  ✓ ~/.config/autostart/ghostpilot.desktop yazıldı.", C_OK)


def autostart_remove():
    removed = []
    if OS_NAME == "Windows":
        p = os.path.join(os.environ.get("APPDATA", ""), "Microsoft", "Windows",
                         "Start Menu", "Programs", "Startup", "GhostPilot.vbs")
        if os.path.exists(p):
            os.remove(p)
            removed.append(p)
    elif OS_NAME == "Darwin":
        p = os.path.expanduser("~/Library/LaunchAgents/com.ghostpilot.daemon.plist")
        if os.path.exists(p):
            subprocess.run(["launchctl", "unload", p], capture_output=True)
            os.remove(p)
            removed.append(p)
    else:
        subprocess.run(["systemctl", "--user", "disable", "--now", "ghostpilot.service"],
                       capture_output=True)
        for p in [os.path.expanduser("~/.config/systemd/user/ghostpilot.service"),
                  os.path.expanduser("~/.config/autostart/ghostpilot.desktop")]:
            if os.path.exists(p):
                os.remove(p)
                removed.append(p)
    say("  ✓ Otomatik başlatma kaldırıldı." if removed else "  Otomatik başlatma kaydı yok.", C_OK)


def native_messaging():
    script = os.path.join(ROOT, "native-bridge", "install_bridge.py")
    r = subprocess.run([sys.executable, script])
    return r.returncode == 0


def open_guide():
    if not os.path.exists(GUIDE):
        return
    try:
        if OS_NAME == "Windows":
            os.startfile(GUIDE)  # noqa
        elif OS_NAME == "Darwin":
            subprocess.Popen(["open", GUIDE])
        else:
            subprocess.Popen(["xdg-open", GUIDE], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass


def print_steps(cfg):
    title("GhostPilot — Sıradaki adımlar")
    say("  1. Tarayıcıda eklentiyi yükleyin:")
    say("     • Chrome/Edge/Brave/Opera → chrome://extensions → Geliştirici modu → 'Paketlenmemiş öğe yükle'",
        C_DIM)
    say(f"       → {os.path.join(ROOT, 'extension-chromium')}", C_DIM)
    say(f"     • Firefox → about:debugging → Bu Firefox → 'Geçici Eklenti Yükle' → {os.path.join(ROOT, 'extension-firefox', 'manifest.json')}",
        C_DIM)
    say("\n  2. Eklenti panelini açın → 'AI & Performans' → sağlayıcı seçin (OpenAI, Claude, Gemini, Qwen, Kimi, GLM...)")
    say("\n  3. Erişim kontrolü: panelin üstündeki 🔒 Kilitle veya Alt+Shift+X ile AI'yı anında kesin.")
    say(f"\n  4. Masaüstü köprüsü: {'çalışıyor ✓' if health(cfg['port']) else 'başlatın → python3 kur.py start'}",
        C_OK if health(cfg["port"]) else C_WARN)
    say(f"\n  Ayrıntılı rehber: {GUIDE}")
    say(f"  Güvenlik token'ı: {cfg['token']}", C_DIM)


def main():
    cfg = load_config()
    cmd = (sys.argv[1] if len(sys.argv) > 1 else "wizard").lower()

    title("GhostPilot Kurulum Yöneticisi v1.3")
    say(f"  Sistem: {OS_NAME} {platform.release()} · Klasör: {ROOT}", C_DIM)

    if cmd in ("wizard", "kur", "install", "setup"):
        check_python()
        say("\n  Adım 1/4 — Ortam kontrolü", C_OK)
        missing = [p for p in [DAEMON, os.path.join(ROOT, "extension-chromium", "manifest.json"),
                               os.path.join(ROOT, "extension-firefox", "manifest.json")] if not os.path.exists(p)]
        if missing:
            say(f"  ✗ Eksik dosyalar: {missing}", C_ERR)
            say("  ZIP arşivini eksiksiz çıkardığınızdan emin olun.", C_WARN)
            return 1
        say("  ✓ Tüm dosyalar yerinde.", C_OK)

        say("\n  Adım 2/4 — Yapılandırma", C_OK)
        save_config(cfg)
        say(f"  ✓ {CONFIG_FILE}", C_OK)
        say(f"    token={cfg['token']} · port={cfg['port']} · erişim={cfg['access']}", C_DIM)

        say("\n  Adım 3/4 — Masaüstü köprüsü (daemon)", C_OK)
        start_daemon(cfg)

        say("\n  Adım 4/4 — Tarayıcı eklentisi", C_OK)
        print_steps(cfg)

        if "--no-open" not in sys.argv:
            open_guide()
        return 0

    if cmd == "start":
        return 0 if start_daemon(cfg) else 1
    if cmd == "stop":
        stop_daemon(cfg)
        return 0
    if cmd == "status":
        title("Durum")
        h = health(cfg["port"])
        if h:
            say(f"  ✓ Köprü çalışıyor · OS: {h.get('os')} · Eklenti bağlı: {h.get('extensionConnected')}", C_OK)
        else:
            say("  ✗ Köprü çalışmıyor. → python3 kur.py start", C_WARN)
        import urllib.request
        try:
            req = urllib.request.Request(
                f"http://127.0.0.1:{cfg['port']}/api/rpc",
                data=json.dumps({"domain": "system", "method": "access"}).encode(),
                headers={"Content-Type": "application/json", "X-GhostPilot-Token": cfg["token"]},
                method="POST")
            with urllib.request.urlopen(req, timeout=2) as r:
                acc = json.loads(r.read().decode()).get("result", {})
            say(f"  Köprü erişim modu: {acc.get('mode', 'open')}", C_DIM)
        except Exception:
            pass
        return 0 if h else 1
    if cmd == "autostart":
        autostart_install(cfg)
        return 0
    if cmd == "noautostart":
        autostart_remove()
        return 0
    if cmd == "native":
        return 0 if native_messaging() else 1
    if cmd == "token":
        import secrets
        cfg["token"] = secrets.token_hex(16)
        save_config(cfg)
        say(f"  ✓ Yeni token: {cfg['token']}", C_OK)
        say("  Eklenti panelinde 'Masaüstü' sekmesindeki token alanına yazın.", C_WARN)
        say("  Köprüyü yeniden başlatın: python3 kur.py stop && python3 kur.py start", C_DIM)
        return 0
    if cmd == "reset":
        cfg["access"] = "open"
        save_config(cfg)
        say("  ✓ Kurulum ayarları sıfırlandı (erişim: open).", C_OK)
        return 0

    say(f"  Bilinmeyen komut: {cmd}", C_ERR)
    say("  Komutlar: wizard | start | stop | status | autostart | noautostart | native | token | reset", C_DIM)
    return 2


if __name__ == "__main__":
    sys.exit(main())
