#!/usr/bin/env python3
# ============================================================================
#  GhostPilot — mcp_server.py
#  Copyright (c) 2026 BTM Code — MIT License
#  https://btmcode.vercel.app
#  Açık kaynak. Telif bildirimini koruyun.
# ============================================================================
"""
GhostPilot — MCP (Model Context Protocol) Sunucusu
Claude Desktop, Cursor, Windsurf, VS Code Copilot ve diğer MCP istemcileri için
JSON-RPC 2.0 / stdio köprüsü. Sıfır harici bağımlılık (sadece Python 3 stdlib).

Akış:  MCP İstemcisi (Claude/Cursor) --stdio--> mcp_server.py --HTTP--> ghostpilot_daemon.py (127.0.0.1:17380)
       Tarayıcı eklentisi bağlıysa masaüstü + tarayıcı araçları eşzamanlı çalışır.

Kurulum (Claude Desktop / Cursor config örneği):
  {
    "mcpServers": {
      "ghostpilot": {
        "command": "python3",
        "args": ["/tam/yol/ghostpilot/native-bridge/mcp_server.py"],
        "env": { "GHOSTPILOT_TOKEN": "${GHOSTPILOT_TOKEN}" }
      }
    }
  }
Önce daemon'u başlatın:  python3 native-bridge/ghostpilot_daemon.py
"""

import json
import os
import sys
import urllib.error
import urllib.request

DAEMON_URL = os.environ.get("GHOSTPILOT_DAEMON_URL", "http://127.0.0.1:17380/api/rpc")

def _token() -> str:
    """Token: ortam değişkeni → ~/.ghostpilot/token → boş."""
    env = os.environ.get("GHOSTPILOT_TOKEN", "").strip()
    if env:
        return env
    try:
        with open(os.path.join(os.path.expanduser("~"), ".ghostpilot", "token"), encoding="utf-8") as f:
            return f.read().strip()
    except Exception:
        return ""

TOKEN = _token()
PROTOCOL_VERSION = "2024-11-05"

TOOLS = [
    {
        "name": "ghostpilot_status",
        "description": "GhostPilot köprüsünün durumunu ve bağlı tarayıcı eklentisini gösterir.",
        "inputSchema": {"type": "object", "properties": {}},
    },
    {
        "name": "list_windows",
        "description": "Açık masaüstü pencerelerini listeler (arka plan kontrolü için hedef seçimi).",
        "inputSchema": {"type": "object", "properties": {"limit": {"type": "integer", "default": 30}}},
    },
    {
        "name": "window_click",
        "description": "Belirtilen pencereye fiziksel fareyi KULLANMADAN arka planda tıklar. Kullanıcı kendi faresini kullanmaya devam edebilir.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "windowId": {"type": "string"},
                "x": {"type": "integer"},
                "y": {"type": "integer"},
                "button": {"type": "string", "enum": ["left", "right"], "default": "left"},
                "pid": {"type": "integer", "default": 0},
            },
            "required": ["windowId", "x", "y"],
        },
    },
    {
        "name": "window_key",
        "description": "Belirtilen pencereye arka planda tuş/metin gönderir (oyun kontrolü için: space, up, down, left, right, w/a/s/d...).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "windowId": {"type": "string"},
                "key": {"type": "string", "default": ""},
                "text": {"type": "string", "default": ""},
                "mode": {"type": "string", "enum": ["press", "down", "up", "hold"], "default": "press"},
                "durationMs": {"type": "integer", "default": 350},
                "pid": {"type": "integer", "default": 0},
            },
            "required": ["windowId"],
        },
    },
    {
        "name": "window_capture",
        "description": "Pencereyi öne getirmeden sessizce ekran görüntüsü alır (base64 JPEG döner).",
        "inputSchema": {"type": "object", "properties": {"windowId": {"type": "string"}}, "required": ["windowId"]},
    },
    {
        "name": "browser_action",
        "description": "Bağlı tarayıcı eklentisine komut gönderir: move/click/key/type/screenshot/dom_snapshot/navigate vb. (Eklenti açık olmalı.)",
        "inputSchema": {
            "type": "object",
            "properties": {
                "action": {"type": "string"},
                "x": {"type": "number"},
                "y": {"type": "number"},
                "key": {"type": "string"},
                "text": {"type": "string"},
                "url": {"type": "string"},
            },
            "required": ["action"],
        },
    },
    {
        "name": "toggle_linux_mpx",
        "description": "Linux X11 üzerinde ikinci bağımsız donanım imleci (MPX) açar/kapatır.",
        "inputSchema": {"type": "object", "properties": {}},
    },
    {
        "name": "access_status",
        "description": "GhostPilot erişim durumunu gösterir (open / read_only / locked).",
        "inputSchema": {"type": "object", "properties": {}}
    },
    {
        "name": "set_access_mode",
        "description": "AI erişimini aç/kısıtla/kapat. mode: open | read_only | locked. minutes: süre (0=süresiz).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "mode": {"type": "string", "enum": ["open", "read_only", "locked"]},
                "minutes": {"type": "integer", "description": "Otomatik kilit için süre (dakika)"}
            },
            "required": ["mode"]
        }
    },
    {
        "name": "emergency_stop",
        "description": "TÜM AI girdisini anında durdurur ve basılı tuşları bırakır (Alt+Shift+X ile aynı).",
        "inputSchema": {"type": "object", "properties": {}},
    },
]


def call_daemon(domain: str, method: str, params: dict):
    body = json.dumps({"domain": domain, "method": method, "params": params}).encode("utf-8")
    req = urllib.request.Request(
        DAEMON_URL,
        data=body,
        headers={"Content-Type": "application/json", "X-GhostPilot-Token": TOKEN},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        # Köprü 400/401 döndürdüğünde gerçek nedeni (ör. erişim kilidi) ilet
        try:
            payload = json.loads(exc.read().decode("utf-8"))
            msg = payload.get("error") or f"Köprü hatası ({exc.code})"
        except Exception:
            msg = f"Köprü hatası ({exc.code})"
        raise RuntimeError(msg) from None
    except urllib.error.URLError as exc:
        raise RuntimeError(
            "Yerel köprü çalışmıyor. Başlatın: python3 kur.py start"
        ) from exc.reason
    if not data.get("ok"):
        raise RuntimeError(data.get("error", "Daemon hatası"))
    return data.get("result")


def handle_tool(name: str, args: dict):
    args = args or {}
    if name == "ghostpilot_status":
        return call_daemon("system", "status", {})
    if name == "list_windows":
        return call_daemon("desktop", "list_windows", args)
    if name == "window_click":
        return call_daemon("desktop", "window_click", args)
    if name == "window_key":
        return call_daemon("desktop", "window_key", args)
    if name == "window_capture":
        return call_daemon("desktop", "window_capture", args)
    if name == "access_status":
        return call_daemon("system", "access", {})
    if name == "set_access_mode":
        return call_daemon("system", "access_mode", {"mode": args.get("mode", "open"), "minutes": args.get("minutes", 0)})
    if name == "browser_action":
        return call_daemon("browser", "browser_action", args)
    if name == "toggle_linux_mpx":
        return call_daemon("desktop", "toggle_linux_mpx", {})
    if name == "emergency_stop":
        return call_daemon("system", "emergency_stop", {})
    raise ValueError(f"Bilinmeyen araç: {name}")


def send(obj: dict):
    sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def main():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
        except json.JSONDecodeError:
            continue
        method = req.get("method", "")
        req_id = req.get("id")
        params = req.get("params") or {}

        if method == "initialize":
            send({
                "jsonrpc": "2.0", "id": req_id,
                "result": {
                    "protocolVersion": PROTOCOL_VERSION,
                    "capabilities": {"tools": {}},
                    "serverInfo": {"name": "ghostpilot", "version": "1.0.0"},
                },
            })
        elif method == "notifications/initialized":
            continue
        elif method == "ping":
            send({"jsonrpc": "2.0", "id": req_id, "result": {}})
        elif method == "tools/list":
            send({"jsonrpc": "2.0", "id": req_id, "result": {"tools": TOOLS}})
        elif method == "tools/call":
            name = params.get("name", "")
            args = params.get("arguments") or {}
            try:
                result = handle_tool(name, args)
                text = result if isinstance(result, str) else json.dumps(result, ensure_ascii=False, indent=2)
                send({
                    "jsonrpc": "2.0", "id": req_id,
                    "result": {"content": [{"type": "text", "text": text}], "isError": False},
                })
            except Exception as exc:
                send({
                    "jsonrpc": "2.0", "id": req_id,
                    "result": {"content": [{"type": "text", "text": f"Hata: {exc}"}], "isError": True},
                })
        else:
            if req_id is not None:
                send({"jsonrpc": "2.0", "id": req_id, "error": {"code": -32601, "message": f"Method bulunamadı: {method}"}})


if __name__ == "__main__":
    main()
