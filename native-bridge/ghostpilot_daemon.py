#!/usr/bin/env python3
# ============================================================================
#  GhostPilot — ghostpilot_daemon.py
#  Copyright (c) 2026 BTM Code — MIT License
#  https://btmcode.vercel.app
#  Açık kaynak. Telif bildirimini koruyun.
# ============================================================================
"""
GhostPilot — Ultra-Lightweight Cross-Platform Desktop & Browser AI Bridge Daemon
- ZERO external pip dependencies (100% Python 3 Standard Library + OS ctypes)
- ~11 MB RAM footprint, 0% idle CPU
- Non-intrusive simultaneous OS input (User keeps full control of physical mouse & keyboard!):
    * Windows : Win32 PostMessageW background HWND input + PrintWindow background capture
    * macOS   : Quartz CoreGraphics CGEventPostToPid background PID input + screencapture -l
    * Linux   : X11 background window events (xdotool --window) + MPX Dual Hardware Cursor (xinput create-master)
- Built-in pure-asyncio WebSocket + HTTP JSON-RPC Server (127.0.0.1:17380)
- Bridges MCP (Claude Desktop, Cursor, Windsurf) <-> Browser Extension <-> Desktop OS/Games
"""

import argparse
import asyncio
import base64
import ctypes
import hashlib
import json
import os
import secrets
import platform
import shutil
import struct
import subprocess
import sys
import tempfile
import time
from urllib.parse import parse_qs, urlparse

HOST = "127.0.0.1"
DEFAULT_PORT = 17380
# Güvenlik: varsayılan token ASLA sabit değil. Üretilmezse rastgele üretilir
# ve yalnızca yerel kullanıcıya okunabilir dosyada saklanır.
def _load_or_create_token() -> str:
    env = os.environ.get("GHOSTPILOT_TOKEN")
    if env:
        return env
    cfg_dir = os.path.join(os.path.expanduser("~"), ".ghostpilot")
    cfg_file = os.path.join(cfg_dir, "token")
    try:
        os.makedirs(cfg_dir, mode=0o700, exist_ok=True)
        if os.path.exists(cfg_file):
            with open(cfg_file, "r", encoding="utf-8") as f:
                t = f.read().strip()
            if len(t) >= 24:
                return t
        t = secrets.token_hex(24)
        fd = os.open(cfg_file, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(t)
        return t
    except Exception:
        return secrets.token_hex(24)

DEFAULT_TOKEN = _load_or_create_token()
WS_MAGIC = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
OS_NAME = platform.system()  # "Windows" | "Linux" | "Darwin"


# ============================================================================
# CROSS-PLATFORM NON-INTRUSIVE DESKTOP CONTROLLER
# ============================================================================
class CrossPlatformDesktopController:
    def __init__(self):
        self.os_name = OS_NAME
        self.held_keys = []  # [(backend_info)] for instant emergency release
        self.linux_mpx_master_id = None
        self._init_os_backends()

    def _init_os_backends(self):
        self.win32 = None
        self.quartz = None
        if self.os_name == "Windows":
            try:
                self.user32 = ctypes.windll.user32
                self.gdi32 = ctypes.windll.gdi32
                self.win32 = True
            except Exception:
                self.win32 = False
        elif self.os_name == "Darwin":
            try:
                self.quartz = ctypes.CDLL(
                    "/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices"
                )
                self.quartz.CGEventCreateKeyboardEvent.argtypes = [ctypes.c_void_p, ctypes.c_uint16, ctypes.c_bool]
                self.quartz.CGEventCreateKeyboardEvent.restype = ctypes.c_void_p
                self.quartz.CGEventPostToPid.argtypes = [ctypes.c_int32, ctypes.c_void_p]
                self.quartz.CGEventPostToPid.restype = None
                self.cf = ctypes.CDLL("/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation")
                self.cf.CFRelease.argtypes = [ctypes.c_void_p]
            except Exception:
                self.quartz = None

    def has_mpx_support(self) -> bool:
        return self.os_name == "Linux" and bool(shutil.which("xinput")) and bool(os.environ.get("DISPLAY"))

    # ------------------------------------------------------------------------
    # 1. LIST OPEN DESKTOP WINDOWS
    # ------------------------------------------------------------------------
    def list_windows(self, limit: int = 30) -> list:
        windows = []
        if self.os_name == "Windows" and self.win32:
            WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)

            def callback(hwnd, _lparam):
                if len(windows) >= limit:
                    return False
                if self.user32.IsWindowVisible(hwnd):
                    length = self.user32.GetWindowTextLengthW(hwnd)
                    if length > 0:
                        buf = ctypes.create_unicode_buffer(length + 1)
                        self.user32.GetWindowTextW(hwnd, buf, length + 1)
                        title = buf.value.strip()
                        if title and title not in ("Program Manager", "Settings"):
                            pid = ctypes.c_ulong()
                            self.user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
                            windows.append({"id": str(hwnd), "pid": int(pid.value), "title": title})
                return True

            self.user32.EnumWindows(WNDENUMPROC(callback), 0)
            return windows

        if self.os_name == "Linux":
            if shutil.which("wmctrl"):
                out = subprocess.run(["wmctrl", "-lp"], capture_output=True, text=True, timeout=3)
                for line in out.stdout.splitlines()[:limit]:
                    parts = line.split(None, 4)
                    if len(parts) >= 5:
                        windows.append({"id": parts[0], "pid": int(parts[2] or 0), "title": parts[4].strip()})
                return windows
            if shutil.which("xdotool"):
                out = subprocess.run(
                    ["xdotool", "search", "--onlyvisible", "--name", ".+"],
                    capture_output=True,
                    text=True,
                    timeout=3,
                )
                for wid in out.stdout.splitlines()[:limit]:
                    name_out = subprocess.run(["xdotool", "getwindowname", wid], capture_output=True, text=True)
                    title = name_out.stdout.strip()
                    if title:
                        windows.append({"id": wid.strip(), "pid": 0, "title": title})
                return windows

        if self.os_name == "Darwin":
            script = (
                'tell application "System Events" to get {unix id, name} of '
                "(every process whose background only is false)"
            )
            out = subprocess.run(["osascript", "-e", script], capture_output=True, text=True, timeout=4)
            if out.returncode == 0 and out.stdout.strip():
                # AppleScript returns comma-separated pids then names
                items = [x.strip() for x in out.stdout.strip().split(",")]
                half = len(items) // 2
                for pid_s, name_s in zip(items[:half], items[half:]):
                    if pid_s.isdigit():
                        windows.append({"id": pid_s, "pid": int(pid_s), "title": name_s})
            return windows[:limit]

        return windows

    # ------------------------------------------------------------------------
    # 2. BACKGROUND WINDOW MOUSE CLICK (0 PHYSICAL MOUSE INTERFERENCE!)
    # ------------------------------------------------------------------------
    def window_click(self, window_id: str, x: int, y: int, button: str = "left", pid: int = 0) -> dict:
        x, y = int(x), int(y)
        if self.os_name == "Windows" and self.win32:
            hwnd = int(str(window_id), 0)
            lparam = ((y & 0xFFFF) << 16) | (x & 0xFFFF)
            WM_MOUSEMOVE = 0x0200
            if button == "right":
                DOWN, UP, MK = 0x0204, 0x0205, 0x0002
            else:
                DOWN, UP, MK = 0x0201, 0x0202, 0x0001
            self.user32.PostMessageW(hwnd, WM_MOUSEMOVE, 0, lparam)
            self.user32.PostMessageW(hwnd, DOWN, MK, lparam)
            self.user32.PostMessageW(hwnd, UP, 0, lparam)
            return {"ok": True, "backend": "win32_postmessage", "hwnd": hwnd, "x": x, "y": y}

        if self.os_name == "Linux" and shutil.which("xdotool"):
            btn_num = "3" if button == "right" else "1"
            # If MPX second master pointer is active, drive the GhostPilot virtual pointer directly!
            if self.linux_mpx_master_id:
                subprocess.run(
                    ["xdotool", "mousemove", "--window", str(window_id), str(x), str(y), "click", btn_num],
                    timeout=3,
                )
            else:
                # XSendEvent targeted to specific window ID without touching user's physical mouse!
                subprocess.run(
                    ["xdotool", "mousemove", "--window", str(window_id), str(x), str(y)],
                    timeout=3,
                )
                subprocess.run(
                    ["xdotool", "click", "--window", str(window_id), btn_num],
                    timeout=3,
                )
            return {"ok": True, "backend": "linux_x11_window", "windowId": window_id, "x": x, "y": y}

        if self.os_name == "Darwin":
            target_pid = int(pid or window_id or 0)
            # Use AppleScript System Events targeted to process by unix id (does not move physical cursor)
            script = (
                f'tell application "System Events" to tell (first process whose unix id is {target_pid}) '
                f"to click at {{{x}, {y}}}"
            )
            subprocess.run(["osascript", "-e", script], capture_output=True, timeout=3)
            return {"ok": True, "backend": "macos_process_event", "pid": target_pid, "x": x, "y": y}

        return {"ok": False, "error": f"{self.os_name} ortamında pencere tıklama aracı bulunamadı (Linux için xdotool önerilir)."}

    # ------------------------------------------------------------------------
    # 3. BACKGROUND WINDOW KEYBOARD / GAME INPUT (0 KEYBOARD FOCUS THEFT!)
    # ------------------------------------------------------------------------
    WIN_VK = {
        "enter": 0x0D, "return": 0x0D, "space": 0x20, " ": 0x20, "tab": 0x09,
        "escape": 0x1B, "esc": 0x1B, "backspace": 0x08, "up": 0x26, "down": 0x28,
        "left": 0x25, "right": 0x27, "shift": 0x10, "ctrl": 0x11, "alt": 0x12,
    }

    MAC_KEYCODES = {
        "a": 0, "s": 1, "d": 2, "f": 3, "h": 4, "g": 5, "z": 6, "x": 7, "c": 8, "v": 9,
        "b": 11, "q": 12, "w": 13, "e": 14, "r": 15, "y": 16, "t": 17, "1": 18, "2": 19,
        "3": 20, "4": 21, "space": 49, " ": 49, "enter": 36, "return": 36, "tab": 48,
        "escape": 53, "esc": 53, "left": 123, "right": 124, "down": 125, "up": 126,
    }

    def window_key(
        self,
        window_id: str,
        key: str,
        mode: str = "press",
        duration_ms: int = 350,
        pid: int = 0,
        text: str = "",
    ) -> dict:
        k_lower = (key or "").lower()

        if self.os_name == "Windows" and self.win32:
            hwnd = int(str(window_id), 0)
            WM_KEYDOWN, WM_KEYUP, WM_CHAR = 0x0100, 0x0101, 0x0102
            if text:
                for ch in text:
                    self.user32.PostMessageW(hwnd, WM_CHAR, ord(ch), 0)
                return {"ok": True, "backend": "win32_wm_char", "chars": len(text)}

            vk = self.WIN_VK.get(k_lower, ord(k_lower.upper()[0]) if len(k_lower) == 1 else 0x20)
            if mode in ("press", "down", "hold"):
                self.user32.PostMessageW(hwnd, WM_KEYDOWN, vk, 0)
                if mode == "down":
                    self.held_keys.append(("win32", hwnd, vk))
                elif mode == "hold":
                    time.sleep(min(5.0, max(0.03, duration_ms / 1000.0)))
                    self.user32.PostMessageW(hwnd, WM_KEYUP, vk, 0)
                else:
                    self.user32.PostMessageW(hwnd, WM_KEYUP, vk, 0)
            elif mode == "up":
                self.user32.PostMessageW(hwnd, WM_KEYUP, vk, 0)
            return {"ok": True, "backend": "win32_postmessage", "vk": vk, "mode": mode}

        if self.os_name == "Linux" and shutil.which("xdotool"):
            xkey = {"enter": "Return", "esc": "Escape", " ": "space", "space": "space"}.get(k_lower, key)
            if text:
                subprocess.run(["xdotool", "type", "--window", str(window_id), "--delay", "8", text], timeout=5)
                return {"ok": True, "backend": "linux_xdotool_type"}
            if mode == "down":
                subprocess.run(["xdotool", "keydown", "--window", str(window_id), xkey], timeout=3)
                self.held_keys.append(("linux", str(window_id), xkey))
            elif mode == "up":
                subprocess.run(["xdotool", "keyup", "--window", str(window_id), xkey], timeout=3)
            elif mode == "hold":
                subprocess.run(["xdotool", "keydown", "--window", str(window_id), xkey], timeout=3)
                time.sleep(min(5.0, max(0.03, duration_ms / 1000.0)))
                subprocess.run(["xdotool", "keyup", "--window", str(window_id), xkey], timeout=3)
            else:
                subprocess.run(["xdotool", "key", "--window", str(window_id), xkey], timeout=3)
            return {"ok": True, "backend": "linux_xdotool_window", "key": xkey, "mode": mode}

        if self.os_name == "Darwin" and self.quartz:
            target_pid = int(pid or window_id or 0)
            keycode = self.MAC_KEYCODES.get(k_lower, 49)
            if mode in ("press", "down", "hold"):
                ev_down = self.quartz.CGEventCreateKeyboardEvent(None, keycode, True)
                self.quartz.CGEventPostToPid(target_pid, ev_down)
                self.cf.CFRelease(ev_down)
                if mode == "down":
                    self.held_keys.append(("macos", target_pid, keycode))
                elif mode == "hold":
                    time.sleep(min(5.0, max(0.03, duration_ms / 1000.0)))
                    ev_up = self.quartz.CGEventCreateKeyboardEvent(None, keycode, False)
                    self.quartz.CGEventPostToPid(target_pid, ev_up)
                    self.cf.CFRelease(ev_up)
                else:
                    ev_up = self.quartz.CGEventCreateKeyboardEvent(None, keycode, False)
                    self.quartz.CGEventPostToPid(target_pid, ev_up)
                    self.cf.CFRelease(ev_up)
            elif mode == "up":
                ev_up = self.quartz.CGEventCreateKeyboardEvent(None, keycode, False)
                self.quartz.CGEventPostToPid(target_pid, ev_up)
                self.cf.CFRelease(ev_up)
            return {"ok": True, "backend": "macos_cgevent_post_to_pid", "pid": target_pid, "mode": mode}

        return {"ok": False, "error": f"{self.os_name} üzerinde arka plan tuş gönderimi için gerekli sistem aracı bulunamadı."}

    # ------------------------------------------------------------------------
    # 4. LINUX MPX TRUE SECOND HARDWARE CURSOR (Multi-Pointer X11)
    # ------------------------------------------------------------------------
    def toggle_linux_mpx(self) -> dict:
        if not self.has_mpx_support():
            return {
                "ok": False,
                "message": "Linux X11 + xinput bulunamadı. (Windows/macOS'ta arka plan pencere mesajlaşması otomatik aktiftir.)",
            }
        if self.linux_mpx_master_id:
            subprocess.run(["xinput", "remove-master", str(self.linux_mpx_master_id)], capture_output=True)
            self.linux_mpx_master_id = None
            return {"ok": True, "active": False, "message": "Linux 2. Donanım İmleci (GhostPilot MPX) kapatıldı."}

        subprocess.run(["xinput", "create-master", "GhostPilot"], capture_output=True, timeout=3)
        lst = subprocess.run(["xinput", "list"], capture_output=True, text=True, timeout=3)
        for line in lst.stdout.splitlines():
            if "GhostPilot pointer" in line and "id=" in line:
                part = line.split("id=")[1].split()[0]
                if part.isdigit():
                    self.linux_mpx_master_id = int(part)
                    break
        return {
            "ok": True,
            "active": True,
            "pointerId": self.linux_mpx_master_id,
            "message": f"Linux MPX 2. Bağımsız İmleç oluşturuldu (pointer id={self.linux_mpx_master_id})!",
        }

    # ------------------------------------------------------------------------
    # 5. SILENT WINDOW SCREENSHOT (Without bringing window to foreground!)
    # ------------------------------------------------------------------------
    def capture_window(self, window_id: str) -> dict:
        if self.os_name == "Darwin":
            with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
                tmp_path = tmp.name
            try:
                subprocess.run(["screencapture", "-l", str(window_id), "-x", "-t", "jpg", tmp_path], timeout=3)
                if os.path.exists(tmp_path) and os.path.getsize(tmp_path) > 0:
                    with open(tmp_path, "rb") as f:
                        b64 = base64.b64encode(f.read()).decode("ascii")
                    return {"ok": True, "mimeType": "image/jpeg", "dataBase64": b64}
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)

        if self.os_name == "Linux" and shutil.which("import"):
            with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
                tmp_path = tmp.name
            try:
                subprocess.run(["import", "-window", str(window_id), "-quality", "55", tmp_path], timeout=3)
                if os.path.exists(tmp_path) and os.path.getsize(tmp_path) > 0:
                    with open(tmp_path, "rb") as f:
                        b64 = base64.b64encode(f.read()).decode("ascii")
                    return {"ok": True, "mimeType": "image/jpeg", "dataBase64": b64}
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)

        return {"ok": False, "error": "Arka plan pencere görüntüsü bu sistemde ek araç gerektirir; tarayıcı sekmeleri için browser_screenshot kullanın."}

    def emergency_release_all(self):
        while self.held_keys:
            item = self.held_keys.pop()
            try:
                if item[0] == "win32":
                    self.user32.PostMessageW(item[1], 0x0101, item[2], 0)
                elif item[0] == "linux":
                    subprocess.run(["xdotool", "keyup", "--window", item[1], item[2]], timeout=2)
                elif item[0] == "macos" and self.quartz:
                    ev_up = self.quartz.CGEventCreateKeyboardEvent(None, item[2], False)
                    self.quartz.CGEventPostToPid(item[1], ev_up)
                    self.cf.CFRelease(ev_up)
            except Exception:
                pass
        return {"ok": True, "released": True}


# ============================================================================
# ZERO-DEPENDENCY ASYNCIO WEBSOCKET + HTTP RPC BRIDGE SERVER
# ============================================================================
class GhostPilotBridgeServer:
    # CORS: yalnızca tarayıcı eklentisi ve yerel panel kökenlerine izin ver
    @staticmethod
    def _cors_origin(headers) -> str:
        origin = (headers.get("origin") or "").strip()
        allowed = (
            origin.startswith("chrome-extension://")
            or origin.startswith("moz-extension://")
            or origin.startswith("safari-web-extension://")
            or origin in ("http://127.0.0.1:17380", "http://localhost:17380", "null", "")
        )
        return origin if allowed else "null"

    def __init__(self, host: str, port: int, token: str):
        # Erişim kapısı: "open" | "read_only" | "locked"
        # locked -> masaüstü/tarayıcı GİRDİ metotları tamamen reddedilir
        self.access_mode = os.environ.get("GHOSTPILOT_ACCESS", "open")
        self.access_expires_at = 0.0  # epoch saniye; 0 = süresiz
        self.host = host
        self.port = port
        self.token = token
        self.desktop = CrossPlatformDesktopController()
        self.extension_writer = None
        self.pending_browser_rpcs = {}  # id -> asyncio.Future
        self._seq = 1

    async def ws_send(self, writer: asyncio.StreamWriter, payload: dict):
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        length = len(raw)
        header = bytearray([0x81])  # FIN + text frame
        if length < 126:
            header.append(length)
        elif length < 65536:
            header.append(126)
            header.extend(struct.pack("!H", length))
        else:
            header.append(127)
            header.extend(struct.pack("!Q", length))
        writer.write(bytes(header) + raw)
        await writer.drain()

    async def ws_recv_frame(self, reader: asyncio.StreamReader):
        head = await reader.readexactly(2)
        opcode = head[0] & 0x0F
        masked = (head[1] & 0x80) != 0
        length = head[1] & 0x7F
        if length == 126:
            length = struct.unpack("!H", await reader.readexactly(2))[0]
        elif length == 127:
            length = struct.unpack("!Q", await reader.readexactly(8))[0]
        mask_key = await reader.readexactly(4) if masked else b""
        data = bytearray(await reader.readexactly(length))
        if masked:
            for i in range(length):
                data[i] ^= mask_key[i & 3]
        return opcode, bytes(data)

    async def call_browser(self, method: str, params: dict, timeout: float = 12.0):
        if not self.extension_writer:
            raise RuntimeError("GhostPilot tarayıcı eklentisi şu anda bağlı değil. Tarayıcıyı açıp eklentiyi etkinleştirin.")
        req_id = f"srv_{self._seq}"
        self._seq += 1
        loop = asyncio.get_running_loop()
        fut = loop.create_future()
        self.pending_browser_rpcs[req_id] = fut
        try:
            await self.ws_send(
                self.extension_writer,
                {"type": "browser_rpc", "id": req_id, "method": method, "params": params or {}},
            )
            return await asyncio.wait_for(fut, timeout=timeout)
        finally:
            self.pending_browser_rpcs.pop(req_id, None)

    # ---- Erişim kapısı ----
    READ_ONLY_METHODS = {"list_windows", "window_capture", "toggle_linux_mpx", "status"}
    INPUT_METHODS = {"window_click", "window_key", "browser_action"}

    def access_state(self):
        mode = self.access_mode
        if mode != "locked" and self.access_expires_at and time.time() > self.access_expires_at:
            mode = "locked"
            self.access_mode = "locked"
            self.access_expires_at = 0.0
        return mode

    def access_allows(self, domain, method):
        mode = self.access_state()
        if mode == "locked":
            return False, "Erişim kilitli: Kullanıcı AI kontrolünü kapattı (panel / Alt+Shift+X)."
        if mode == "read_only" and method not in self.READ_ONLY_METHODS:
            return False, "Sadece Okuma modu: girdi metotları kapalı."
        return True, ""

    def execute_desktop_method(self, method: str, params: dict):
        params = params or {}
        if method == "list_windows":
            return self.desktop.list_windows(int(params.get("limit", 30)))
        if method == "window_click":
            return self.desktop.window_click(
                window_id=params.get("windowId", "0"),
                x=params.get("x", 100),
                y=params.get("y", 100),
                button=params.get("button", "left"),
                pid=int(params.get("pid") or 0),
            )
        if method == "window_key":
            return self.desktop.window_key(
                window_id=params.get("windowId", "0"),
                key=params.get("key", ""),
                mode=params.get("mode", "press"),
                duration_ms=int(params.get("durationMs", 350)),
                pid=int(params.get("pid") or 0),
                text=params.get("text", ""),
            )
        if method == "window_capture":
            return self.desktop.capture_window(params.get("windowId", "0"))
        if method == "toggle_linux_mpx":
            return self.desktop.toggle_linux_mpx()
        if method == "emergency_stop":
            return self.desktop.emergency_release_all()
        raise ValueError(f"Bilinmeyen masaüstü metodu: {method}")

    async def dispatch_unified_rpc(self, domain: str, method: str, params: dict):
        allowed, why = self.access_allows(domain, method)
        if not allowed and not (domain == "system" and method in ("status", "access", "access_mode", "emergency_stop")):
            raise PermissionError(why)
        if domain == "system" and method == "access":
            return {"ok": True, "mode": self.access_state(),
                    "expiresAt": self.access_expires_at}
        if domain == "system" and method == "access_mode":
            mode = (params or {}).get("mode", "open")
            minutes = int((params or {}).get("minutes", 0) or 0)
            if mode not in ("open", "read_only", "locked"):
                raise ValueError("Geçersiz mod: open | read_only | locked")
            self.access_mode = mode
            self.access_expires_at = time.time() + minutes * 60 if (minutes and mode != "locked") else 0.0
            if mode == "locked":
                self.desktop.emergency_release_all()
            return {"ok": True, "mode": mode, "expiresAt": self.access_expires_at}
        if domain == "desktop":
            return await asyncio.to_thread(self.execute_desktop_method, method, params)
        if domain == "browser":
            return await self.call_browser(method, params)
        if domain == "system":
            if method == "status":
                return {
                    "ok": True,
                    "os": self.desktop.os_name,
                    "extensionConnected": self.extension_writer is not None,
                    "mpxAvailable": self.desktop.has_mpx_support(),
                    "mpxActive": self.desktop.linux_mpx_master_id is not None,
                }
            if method == "emergency_stop":
                self.desktop.emergency_release_all()
                if self.extension_writer:
                    try:
                        await self.call_browser("emergency_stop", {}, timeout=2.0)
                    except Exception:
                        pass
                return {"ok": True}
        raise ValueError(f"Bilinmeyen RPC alanı: {domain}.{method}")

    async def handle_http(self, method: str, path: str, headers: dict, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        content_len = int(headers.get("content-length", "0"))
        body_bytes = await reader.readexactly(content_len) if content_len > 0 else b""

        if method == "OPTIONS":
            resp = (
                "HTTP/1.1 204 No Content\r\n"
                "Access-Control-Allow-Origin: " + self._cors_origin(headers) + "\r\n"
                "Access-Control-Allow-Headers: Content-Type, Authorization, X-GhostPilot-Token\r\n"
                "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n\r\n"
            )
            writer.write(resp.encode("utf-8"))
            await writer.drain()
            return

        parsed = urlparse(path)
        qs = parse_qs(parsed.query)
        req_token = (
            headers.get("x-ghostpilot-token")
            or (qs.get("token", [None])[0])
            or headers.get("authorization", "").replace("Bearer ", "")
        )

        if parsed.path == "/health":
            payload = {
                "ok": True,
                "service": "ghostpilot_daemon",
                "os": self.desktop.os_name,
                "extensionConnected": self.extension_writer is not None,
            }
            await self._send_json_http(writer, 200, payload, headers)
            return

        if self.token and req_token != self.token:
            await self._send_json_http(writer, 401, {"ok": False, "error": "Yetkisiz token (X-GhostPilot-Token hatalı)."}, headers)
            return

        if parsed.path == "/api/rpc" and method == "POST":
            try:
                req = json.loads(body_bytes.decode("utf-8") or "{}")
                result = await self.dispatch_unified_rpc(
                    req.get("domain", "browser"),
                    req.get("method", ""),
                    req.get("params") or {},
                )
                await self._send_json_http(writer, 200, {"ok": True, "result": result}, headers)
            except Exception as exc:
                await self._send_json_http(writer, 400, {"ok": False, "error": str(exc)}, headers)
            return

        await self._send_json_http(writer, 404, {"ok": False, "error": "Endpoint bulunamadı."}, headers)

    async def _send_json_http(self, writer: asyncio.StreamWriter, status: int, data: dict, headers: dict | None = None):
        raw = json.dumps(data, ensure_ascii=False).encode("utf-8")
        reason = {200: "OK", 400: "Bad Request", 401: "Unauthorized", 404: "Not Found"}.get(status, "OK")
        head = (
            f"HTTP/1.1 {status} {reason}\r\n"
            "Content-Type: application/json; charset=utf-8\r\n"
            f"Content-Length: {len(raw)}\r\n"
            "Access-Control-Allow-Origin: " + self._cors_origin(headers or {}) + "\r\n"
            "Connection: close\r\n\r\n"
        ).encode("utf-8")
        writer.write(head + raw)
        await writer.drain()

    async def handle_ws(self, path: str, headers: dict, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        parsed = urlparse(path)
        qs = parse_qs(parsed.query)
        token = qs.get("token", [""])[0]
        role = qs.get("role", ["client"])[0]

        if self.token and token != self.token:
            await self._send_json_http(writer, 401, {"ok": False, "error": "Geçersiz token"}, headers)
            return

        ws_key = headers.get("sec-websocket-key", "")
        accept = base64.b64encode(hashlib.sha1((ws_key + WS_MAGIC).encode("ascii")).digest()).decode("ascii")
        handshake = (
            "HTTP/1.1 101 Switching Protocols\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            f"Sec-WebSocket-Accept: {accept}\r\n\r\n"
        )
        writer.write(handshake.encode("ascii"))
        await writer.drain()

        if role == "extension":
            self.extension_writer = writer
            await self.ws_send(
                writer,
                {
                    "type": "daemon_info",
                    "os": self.desktop.os_name,
                    "mpxAvailable": self.desktop.has_mpx_support(),
                },
            )

        try:
            while True:
                opcode, data = await self.ws_recv_frame(reader)
                if opcode == 0x8:  # Close
                    break
                if opcode == 0x9:  # Ping -> Pong
                    writer.write(b"\x8A\x00")
                    await writer.drain()
                    continue
                if opcode != 0x1:
                    continue

                msg = json.loads(data.decode("utf-8"))
                mtype = msg.get("type")

                if mtype == "emergency_stop":
                    self.desktop.emergency_release_all()
                elif mtype == "access_mode":
                    mode = msg.get("mode", "open")
                    if mode in ("open", "read_only", "locked"):
                        self.access_mode = mode
                        self.access_expires_at = 0.0
                        if mode == "locked":
                            self.desktop.emergency_release_all()
                elif mtype == "browser_rpc_response":
                    fut = self.pending_browser_rpcs.get(msg.get("id"))
                    if fut and not fut.done():
                        if msg.get("ok"):
                            fut.set_result(msg.get("result"))
                        else:
                            fut.set_exception(RuntimeError(msg.get("error", "Tarayıcı RPC hatası")))
                elif mtype == "desktop_rpc":
                    req_id = msg.get("id")
                    try:
                        res = await asyncio.to_thread(
                            self.execute_desktop_method, msg.get("method", ""), msg.get("params") or {}
                        )
                        await self.ws_send(writer, {"type": "rpc_response", "id": req_id, "ok": True, "result": res})
                    except Exception as exc:
                        await self.ws_send(
                            writer, {"type": "rpc_response", "id": req_id, "ok": False, "error": str(exc)}
                        )
                elif mtype == "unified_rpc":
                    req_id = msg.get("id")
                    try:
                        res = await self.dispatch_unified_rpc(
                            msg.get("domain", "browser"), msg.get("method", ""), msg.get("params") or {}
                        )
                        await self.ws_send(writer, {"type": "rpc_response", "id": req_id, "ok": True, "result": res})
                    except Exception as exc:
                        await self.ws_send(
                            writer, {"type": "rpc_response", "id": req_id, "ok": False, "error": str(exc)}
                        )
        except (asyncio.IncompleteReadError, ConnectionError):
            pass
        finally:
            if self.extension_writer is writer:
                self.extension_writer = None

    async def handle_connection(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        try:
            raw_head = await asyncio.wait_for(reader.readuntil(b"\r\n\r\n"), timeout=5.0)
            lines = raw_head.decode("latin-1").split("\r\n")
            req_line = lines[0].split()
            if len(req_line) < 2:
                return
            method, path = req_line[0], req_line[1]
            headers = {}
            for ln in lines[1:]:
                if ":" in ln:
                    k, v = ln.split(":", 1)
                    headers[k.strip().lower()] = v.strip()

            if headers.get("upgrade", "").lower() == "websocket":
                await self.handle_ws(path, headers, reader, writer)
            else:
                await self.handle_http(method, path, headers, reader, writer)
        except Exception:
            pass
        finally:
            try:
                writer.close()
                await writer.wait_closed()
            except Exception:
                pass


def run_native_messaging_loop(desktop: CrossPlatformDesktopController):
    """Chrome / Firefox Native Messaging stdio loop (4-byte little-endian length prefix)."""
    while True:
        raw_len = sys.stdin.buffer.read(4)
        if not raw_len or len(raw_len) < 4:
            break
        msg_len = struct.unpack("<I", raw_len)[0]
        payload = json.loads(sys.stdin.buffer.read(msg_len).decode("utf-8"))
        try:
            method = payload.get("method", "list_windows")
            params = payload.get("params") or {}
            if method == "list_windows":
                res = desktop.list_windows()
            elif method == "window_click":
                res = desktop.window_click(**params)
            elif method == "window_key":
                res = desktop.window_key(**params)
            elif method == "emergency_stop":
                res = desktop.emergency_release_all()
            else:
                res = {"ok": False, "error": f"Unknown method {method}"}
            out = json.dumps({"ok": True, "result": res}).encode("utf-8")
        except Exception as exc:
            out = json.dumps({"ok": False, "error": str(exc)}).encode("utf-8")
        sys.stdout.buffer.write(struct.pack("<I", len(out)) + out)
        sys.stdout.buffer.flush()


async def main_async(args):
    srv = GhostPilotBridgeServer(args.host, args.port, args.token)
    server = await asyncio.start_server(srv.handle_connection, args.host, args.port)
    print(f"[GhostPilot] Masaüstü & MCP Köprüsü aktif -> ws://{args.host}:{args.port}/ws (OS: {OS_NAME})")
    print(f"[GhostPilot] HTTP RPC -> http://{args.host}:{args.port}/api/rpc | Acil Durdurma Hazır")
    async with server:
        await server.serve_forever()


def main():
    parser = argparse.ArgumentParser(description="GhostPilot Cross-Platform Desktop & Browser Bridge")
    parser.add_argument("--host", default=HOST)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--token", default=DEFAULT_TOKEN)
    parser.add_argument("--native-messaging", action="store_true", help="Tarayıcı Native Messaging stdio modu")
    args, _ = parser.parse_known_args()

    # Chrome passes extension origin (chrome-extension://...) as positional arg in Native Messaging mode
    if args.native_messaging or any(a.startswith("chrome-extension://") or a.endswith(".json") for a in sys.argv[1:]):
        run_native_messaging_loop(CrossPlatformDesktopController())
        return

    try:
        asyncio.run(main_async(args))
    except KeyboardInterrupt:
        print("\n[GhostPilot] Kapatıldı.")


if __name__ == "__main__":
    main()
