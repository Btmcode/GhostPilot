<div align="center">

# 👻 GhostPilot

**Simultaneous AI Mouse/Keyboard & Desktop Bridge**
*Eşzamanlı AI Fare/Klavye ve Masaüstü Köprüsü*

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.6.1-green.svg)]()
[![Dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen.svg)]()
[![Telemetry](https://img.shields.io/badge/telemetry-none-success.svg)](SECURITY.md)
[![Buy Me a Coffee](https://img.shields.io/badge/%E2%98%95-Buy%20me%20a%20coffee-f59e0b?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/devcloudpy)

[🇹🇷 Türkçe](README.md) · **🇬🇧 English**

</div>

---

**Simultaneous AI Mouse/Keyboard & Desktop Bridge** — an ultra-light AI agent that drives
your browser, web games and desktop windows using **virtual input**, without ever blocking
your physical mouse or keyboard.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.6.1-green.svg)]()
[![Dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen.svg)]()

> **Developer:** [BTM Code](https://github.com/Btmcode) · [Website](https://btmcode.vercel.app) · [Blog](https://mnemark.blogspot.com)
>
> **Privacy first:** no telemetry · your keys stay in your browser · password fields are never read
> Details: [**SECURITY.md**](SECURITY.md)

---

## Why GhostPilot?

| Problem | How GhostPilot solves it |
|---|---|
| Automation tools hijack your real cursor | Uses **virtual/CDP input** — your mouse keeps working |
| Tools take over your current tabs | Runs in a **separate window** |
| Runs out of free tokens and stops | **Automatic provider failover** |
| Forgets the task on restart | **Persistent memory** — resumes from the last step |
| You must write 20 prompts | **Write one goal**, the agent plans and executes the whole chain |

---

## 🌐 Multi-language

GhostPilot ships with **Turkish** and **English** interfaces.

Switch anytime: **Settings → ℹ️ About → 🌐 Language**
The AI agent also plans and reports in the language you pick.

Add another language in three steps:
1. Copy the `en` block in `extension-chromium/i18n.js`
2. Translate the values (keys are the Turkish source strings)
3. Add a button: `<button data-lang-btn="de">🇩🇪 Deutsch</button>`

---

## 🚀 Install

1. Clone or unzip `GhostPilot_Paketi.zip`
2. Open `chrome://extensions` → enable **Developer mode**
3. **Load unpacked** → select `extension-chromium/`
4. Click the GhostPilot icon → pick a provider → paste a free API key

Firefox: `about:debugging` → **Load Temporary Add-on** → `extension-firefox/manifest.json`

Optional desktop bridge (for Windows/Linux desktop apps):
```bash
python kur.py
```

---

## 🔌 Free providers (no credit card)

| Provider | Free tier |
|---|---|
| Google Gemini | 20–500 requests/day |
| Groq | 30 req/min · 1,000/day |
| OpenRouter | `:free` models · 50/day |
| xKiro | 26 free models · 500K tokens/day |
| ModelScope | 2,000 calls/day |
| **Ollama / LM Studio** | **Unlimited · fully local · no key** |

---

## 🔐 Security & privacy

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

The only endpoints you will find are the AI provider you chose and `127.0.0.1`.

Full audit guide: [**SECURITY.md**](SECURITY.md)

---

## 💖 Support the project

<div align="center">

[![Buy Me a Coffee](https://img.shields.io/badge/%E2%98%95_Buy_me_a_coffee-buymeacoffee.com%2Fdevcloudpy-f59e0b?style=for-the-badge&logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/devcloudpy)
[![GitHub](https://img.shields.io/badge/%E2%AD%90_Star-github.com%2FBtmcode-181717?style=for-the-badge&logo=github)](https://github.com/Btmcode/GhostPilot)

</div>

GhostPilot is completely free and open source. No ads, no telemetry, no paid tier.
If it saved you time, **[buy me a coffee](https://buymeacoffee.com/devcloudpy)** ☕ — it genuinely helps.

> 💡 The extension shows one polite support window on first install, then at most once a week.
> Hit **"Never show again"** and it will never appear.

## 📄 License & copyright

```
Copyright (c) 2026 BTM Code — MIT License
https://github.com/Btmcode  ·  https://btmcode.vercel.app  ·  https://mnemark.blogspot.com
```

Released under the MIT license: you may copy, modify and redistribute it.
The only condition is to **preserve this copyright notice**
(see [LICENSE](LICENSE) and [COPYRIGHT](COPYRIGHT)).

No external libraries — nothing beyond the Python standard library.

### Contributing

- 🐛 Bugs / security reports: [github.com/Btmcode](https://github.com/Btmcode)
- 📝 Blog: [mnemark.blogspot.com](https://mnemark.blogspot.com)
- ☕ Support: [buymeacoffee.com/devcloudpy](https://buymeacoffee.com/devcloudpy)
