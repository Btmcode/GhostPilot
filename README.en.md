<div align="center">

# 👻 GhostPilot

**Simultaneous AI Mouse/Keyboard & Desktop Bridge**

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/Türkçe-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="Türkçe"></a>
  <a href="README.en.md"><img src="https://img.shields.io/badge/English-f59e0b?style=for-the-badge&labelColor=f59e0b&logoColor=111111" alt="English"></a>
  <a href="README.zh.md"><img src="https://img.shields.io/badge/中文-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="中文"></a>
  <a href="README.ja.md"><img src="https://img.shields.io/badge/日本語-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="日本語"></a>
  <a href="README.ko.md"><img src="https://img.shields.io/badge/한국어-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="한국어"></a>
  <a href="README.vi.md"><img src="https://img.shields.io/badge/Tiếng%20Việt-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="Tiếng Việt"></a>
  <a href="README.de.md"><img src="https://img.shields.io/badge/Deutsch-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="Deutsch"></a>
  <a href="README.ms.md"><img src="https://img.shields.io/badge/Melayu-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="Melayu"></a>
</p>

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.8.2-green.svg)]()
[![Dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen.svg)]()
[![Telemetry](https://img.shields.io/badge/telemetry-none-success.svg)](SECURITY.md)
[![Buy Me a Coffee](https://img.shields.io/badge/%E2%98%95-Buy%20me%20a%20coffee-f59e0b?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/btmcode)

</div>

---

An ultra-light AI agent that drives your browser, web games and desktop windows with **virtual input** — without ever blocking your physical mouse or keyboard.

> **Developer:** [BTM Code](https://github.com/Btmcode) · [Website](https://btmcode.vercel.app) · [Blog](https://mnemark.blogspot.com)
>
> **Privacy first:** no telemetry · your keys stay in your browser · password fields are never read → [SECURITY.md](SECURITY.md)

---

## Why GhostPilot?

| Problem | How GhostPilot solves it |
|---|---|
| Automation tools hijack your real cursor | Uses **virtual/CDP input** — your mouse keeps working |
| Tools take over your open tabs | Runs in a **separate window** |
| Runs out of free tokens and stops | **Automatic provider failover** |
| Forgets the task on restart | **Persistent memory** — resumes from the last step |
| You must write 20 prompts | **Write one goal**, the agent plans and executes the whole chain |

## Highlights

| Feature | Description |
|---|---|
| 🎯 **Mission engine** | Write the big goal; the agent splits it into 4–10 steps, verifies each by looking at the page, and keeps going |
| 🗔 **Separate window** | Tasks run in a new window — your open tabs are untouched |
| 🔁 **Provider failover** | If tokens run out it switches provider automatically; the task never stops |
| 🧠 **Persistent memory** | Every step is saved to disk; even if the browser closes it resumes where it left off |
| 🖱️ **Ghost cursor** | Closed Shadow DOM + GPU compositing; works at the same time as your physical mouse |
| 🖥️ **Desktop bridge** | Windows `PostMessageW` · macOS `CGEventPostToPid` · Linux X11 MPX — a real second cursor |
| 🛑 **Emergency stop** | `Alt+Shift+X` — all AI input is cut instantly and held keys are released |
| 🔒 **Access gate** | Full / Read-only / Locked · timed permission · tab scope · audit log |

## Install

1. **Desktop bridge (optional):** `python3 native-bridge/ghostpilot_daemon.py` — zero dependencies, no `pip install`
2. **Chrome/Edge/Brave:** `chrome://extensions` → Developer mode → **Load unpacked** → `extension-chromium`
3. **Firefox:** `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** → `extension-firefox/manifest.json`
4. **Give it a task:** click the icon → write the goal → **▶ Start Task**

> One-command wizard: `python3 kur.py` · Windows `kur.bat` · Linux/macOS `./kur.sh`

## Free providers (no card needed)

| Provider | Free quota |
|---|---|
| Google Gemini | 20–500 requests/day |
| Groq | 30 req/min · 1,000/day |
| OpenRouter | `:free` models · 50/day |
| xKiro | 26 free models · 500K tokens/day |
| ModelScope | 2,000 calls/day |
| **Ollama / LM Studio** | **Unlimited · fully local · no key** |

## Security & privacy

| Item | Status |
|---|---|
| Telemetry / analytics | ❌ none |
| Developer-operated server | ❌ none |
| API keys | 🔒 `chrome.storage.local` only |
| Password / card / OTP fields | 🚫 never read |
| Desktop bridge | `127.0.0.1` + random 48-char token + `0600` perms |
| CORS | `chrome-extension://` / `moz-extension://` only |

Verify it yourself:

```bash
grep -rn "fetch(\|WebSocket(" extension-chromium/ native-bridge/
```

## Support the project

<div align="center">

[![Buy Me a Coffee](https://img.shields.io/badge/%E2%98%95_Buy_me_a_coffee-buymeacoffee.com%2Fbtmcode-f59e0b?style=for-the-badge&logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/btmcode)
[![GitHub](https://img.shields.io/badge/%E2%AD%90_Star-github.com%2FBtmcode-181717?style=for-the-badge&logo=github)](https://github.com/Btmcode/GhostPilot)

</div>

GhostPilot is completely free and open source. No ads, no telemetry, no paid tier.
If it saved you time, **[buy me a coffee](https://buymeacoffee.com/btmcode)** ☕

> 💡 The extension shows one polite support window on first install, then at most once a week. Hit **"Never show again"** and it will never appear.

## License

```
Copyright (c) 2026 BTM Code — MIT License
https://github.com/Btmcode  ·  https://btmcode.vercel.app  ·  https://mnemark.blogspot.com
```

Released under the MIT license: you may copy, modify and redistribute it. The only condition is to **preserve this copyright notice** (see [LICENSE](LICENSE), [COPYRIGHT](COPYRIGHT)).
No external libraries — nothing beyond the Python standard library.

> 📖 For the desktop bridge, MCP integration and the full 39-provider tables, see [README.md](README.md) (Turkish) and [README.en.md](README.en.md) (English).

---

*© 2026 BTM Code · MIT · [github.com/Btmcode/GhostPilot](https://github.com/Btmcode/GhostPilot)*