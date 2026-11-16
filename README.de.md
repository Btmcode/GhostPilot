<div align="center">

# 👻 GhostPilot

**Gleichzeitige KI-Maus/Tastatur & Desktop-Brücke**

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/Türkçe-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="Türkçe"></a>
  <a href="README.en.md"><img src="https://img.shields.io/badge/English-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="English"></a>
  <a href="README.zh.md"><img src="https://img.shields.io/badge/中文-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="中文"></a>
  <a href="README.ja.md"><img src="https://img.shields.io/badge/日本語-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="日本語"></a>
  <a href="README.ko.md"><img src="https://img.shields.io/badge/한국어-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="한국어"></a>
  <a href="README.vi.md"><img src="https://img.shields.io/badge/Tiếng%20Việt-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="Tiếng Việt"></a>
  <a href="README.de.md"><img src="https://img.shields.io/badge/Deutsch-f59e0b?style=for-the-badge&labelColor=f59e0b&logoColor=111111" alt="Deutsch"></a>
  <a href="README.ms.md"><img src="https://img.shields.io/badge/Melayu-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="Melayu"></a>
</p>

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.6.1-green.svg)]()
[![Dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen.svg)]()
[![Telemetry](https://img.shields.io/badge/telemetry-none-success.svg)](SECURITY.md)
[![Buy Me a Coffee](https://img.shields.io/badge/%E2%98%95-Buy%20me%20a%20coffee-f59e0b?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/devcloudpy)

</div>

---

Ein ultraleichter KI-Agent, der Browser, Webspiele und Desktop-Fenster mit **virtueller Eingabe** steuert — ohne deine physische Maus oder Tastatur **jemals zu blockieren**.

> **Entwickler:** [BTM Code](https://github.com/Btmcode) · [Website](https://btmcode.vercel.app) · [Blog](https://mnemark.blogspot.com)
>
> **Datenschutz zuerst:** keine Telemetrie · Schlüssel bleiben in deinem Browser · Passwortfelder werden nie gelesen → [SECURITY.md](SECURITY.md)

---

## Warum GhostPilot?

| Problem | Wie GhostPilot es löst |
|---|---|
| Automatisierungstools übernehmen deinen echten Cursor | Nutzt **virtuelle/CDP-Eingabe** — deine Maus funktioniert weiter |
| Tools übernehmen deine offenen Tabs | Läuft in einem **separaten Fenster** |
| Kostenlose Tokens sind aufgebraucht, es stoppt | **Automatischer Anbieterwechsel** |
| Vergisst die Aufgabe beim Neustart | **Persistenter Speicher** — setzt beim letzten Schritt fort |
| Du musst 20 Prompts schreiben | **Schreibe ein Ziel**, der Agent plant und führt die ganze Kette aus |

## Highlights

| Funktion | Beschreibung |
|---|---|
| 🎯 **Mission-Engine** | Schreibe das große Ziel; der Agent teilt es in 4–10 Schritte, prüft jeden durch Blick auf die Seite und macht weiter |
| 🗔 **Separates Fenster** | Aufgaben laufen in einem neuen Fenster — deine offenen Tabs bleiben unberührt |
| 🔁 **Anbieterwechsel** | Bei erschöpften Tokens wechselt er automatisch den Anbieter; die Aufgabe stoppt nie |
| 🧠 **Persistenter Speicher** | Jeder Schritt wird gespeichert; selbst nach Browser-Schließen geht es weiter |
| 🖱️ **Geistercursor** | Geschlossenes Shadow DOM + GPU-Compositing; läuft parallel zur physischen Maus |
| 🖥️ **Desktop-Brücke** | Windows `PostMessageW` · macOS `CGEventPostToPid` · Linux X11 MPX — ein echter zweiter Cursor |
| 🛑 **Not-Aus** | `Alt+Shift+X` — alle KI-Eingaben werden sofort gekappt, gehaltene Tasten freigegeben |
| 🔒 **Zugriffsschranke** | Voll / Nur Lesen / Gesperrt · zeitlich begrenzt · Tab-Umfang · Audit-Log |

## Installation

1. **Desktop-Brücke (optional):** `python3 native-bridge/ghostpilot_daemon.py` — keine Abhängigkeiten, kein `pip install`
2. **Chrome/Edge/Brave:** `chrome://extensions` → Entwicklermodus → **Entpackte Erweiterung laden** → `extension-chromium`
3. **Firefox:** `about:debugging#/runtime/this-firefox` → **Temporäres Add-on laden** → `extension-firefox/manifest.json`
4. **Aufgabe geben:** Symbol anklicken → Ziel eingeben → **▶ Aufgabe starten**

> Ein-Befehl-Assistent: `python3 kur.py` · Windows `kur.bat` · Linux/macOS `./kur.sh`

## Kostenlose Anbieter (keine Karte nötig)

| Anbieter | Kostenloses Kontingent |
|---|---|
| Google Gemini | 20–500 Anfragen/Tag |
| Groq | 30 Anfragen/Min · 1.000/Tag |
| OpenRouter | `:free`-Modelle · 50/Tag |
| xKiro | 26 kostenlose Modelle · 500K Tokens/Tag |
| ModelScope | 2.000 Aufrufe/Tag |
| **Ollama / LM Studio** | **Unbegrenzt · komplett lokal · kein Schlüssel** |

## Sicherheit & Datenschutz

| Punkt | Status |
|---|---|
| Telemetrie / Analyse | ❌ keine |
| Server des Entwicklers | ❌ keiner |
| API-Schlüssel | 🔒 nur `chrome.storage.local` |
| Passwort- / Karten- / OTP-Felder | 🚫 werden nie gelesen |
| Desktop-Brücke | `127.0.0.1` + zufälliges 48-Zeichen-Token + `0600`-Rechte |
| CORS | nur `chrome-extension://` / `moz-extension://` |

Selbst überprüfen:

```bash
grep -rn "fetch(\|WebSocket(" extension-chromium/ native-bridge/
```

## Projekt unterstützen

<div align="center">

[![Buy Me a Coffee](https://img.shields.io/badge/%E2%98%95_Buy_me_a_coffee-buymeacoffee.com%2Fdevcloudpy-f59e0b?style=for-the-badge&logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/devcloudpy)
[![GitHub](https://img.shields.io/badge/%E2%AD%90_Star-github.com%2FBtmcode-181717?style=for-the-badge&logo=github)](https://github.com/Btmcode/GhostPilot)

</div>

GhostPilot ist völlig kostenlos und Open Source. Keine Werbung, keine Telemetrie, keine Bezahlstufe.
Wenn es dir geholfen hat, **[spendier mir einen Kaffee](https://buymeacoffee.com/devcloudpy)** ☕

> 💡 Die Erweiterung zeigt bei der Erstinstallation und danach höchstens einmal pro Woche ein höfliches Support-Fenster. Mit **„Nicht mehr anzeigen“** erscheint es nie wieder.

## Lizenz

```
Copyright (c) 2026 BTM Code — MIT License
https://github.com/Btmcode  ·  https://btmcode.vercel.app  ·  https://mnemark.blogspot.com
```

Veröffentlicht unter der MIT-Lizenz: du darfst kopieren, ändern und weitergeben. Einzige Bedingung: **dieser Copyright-Hinweis bleibt erhalten** (siehe [LICENSE](LICENSE), [COPYRIGHT](COPYRIGHT)).
Keine externen Bibliotheken — nichts außer der Python-Standardbibliothek.

> 📖 Desktop-Brücke, MCP-Integration und die vollständigen Tabellen zu 39 Anbietern findest du in [README.md](README.md) (Türkisch) und [README.en.md](README.en.md) (Englisch).

---

*© 2026 BTM Code · MIT · [github.com/Btmcode/GhostPilot](https://github.com/Btmcode/GhostPilot)*