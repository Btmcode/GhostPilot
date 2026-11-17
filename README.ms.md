<div align="center">

# 👻 GhostPilot

**Tetikus/Papan Kekunci AI Serentak & Jambatan Desktop**

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/Türkçe-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="Türkçe"></a>
  <a href="README.en.md"><img src="https://img.shields.io/badge/English-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="English"></a>
  <a href="README.zh.md"><img src="https://img.shields.io/badge/中文-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="中文"></a>
  <a href="README.ja.md"><img src="https://img.shields.io/badge/日本語-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="日本語"></a>
  <a href="README.ko.md"><img src="https://img.shields.io/badge/한국어-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="한국어"></a>
  <a href="README.vi.md"><img src="https://img.shields.io/badge/Tiếng%20Việt-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="Tiếng Việt"></a>
  <a href="README.de.md"><img src="https://img.shields.io/badge/Deutsch-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="Deutsch"></a>
  <a href="README.ms.md"><img src="https://img.shields.io/badge/Melayu-f59e0b?style=for-the-badge&labelColor=f59e0b&logoColor=111111" alt="Melayu"></a>
</p>

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.8.2-green.svg)]()
[![Dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen.svg)]()
[![Telemetry](https://img.shields.io/badge/telemetry-none-success.svg)](SECURITY.md)
[![Buy Me a Coffee](https://img.shields.io/badge/%E2%98%95-Buy%20me%20a%20coffee-f59e0b?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/btmcode)

</div>

---

Ejen AI ultra-ringan yang mengawal pelayar, permainan web dan tetingkap desktop dengan **input maya** — **tanpa pernah menyekat** tetikus atau papan kekunci fizikal anda.

> **Pembangun:** [BTM Code](https://github.com/Btmcode) · [Laman web](https://btmcode.vercel.app) · [Blog](https://mnemark.blogspot.com)
>
> **Privasi dahulu:** tiada telemetri · kunci kekal dalam pelayar anda · medan kata laluan tidak pernah dibaca → [SECURITY.md](SECURITY.md)

---

## Mengapa GhostPilot?

| Masalah | Cara GhostPilot menyelesaikannya |
|---|---|
| Alat automasi merampas kursor sebenar anda | Guna **input maya/CDP** — tetikus anda terus berfungsi |
| Alat mengambil alih tab yang dibuka | Berjalan dalam **tetingkap berasingan** |
| Token percuma habis dan ia berhenti | **Peralihan pembekal automatik** |
| Lupa tugas apabila dimulakan semula | **Memori berterusan** — menyambung dari langkah terakhir |
| Anda perlu menulis 20 prom | **Tulis satu matlamat**, ejen merancang dan melaksanakan seluruh rantaian |

## Sorotan

| Ciri | Keterangan |
|---|---|
| 🎯 **Enjin misi** | Tulis matlamat besar; ejen memecahkannya kepada 4–10 langkah, mengesahkan setiap satu dengan melihat halaman dan terus berjalan |
| 🗔 **Tetingkap berasingan** | Tugas berjalan dalam tetingkap baharu — tab anda tidak disentuh |
| 🔁 **Peralihan pembekal** | Jika token habis ia bertukar pembekal secara automatik; tugas tidak berhenti |
| 🧠 **Memori berterusan** | Setiap langkah disimpan ke cakera; walaupun pelayar ditutup ia menyambung semula |
| 🖱️ **Kursor hantu** | Shadow DOM tertutup + komposisi GPU; berfungsi serentak dengan tetikus fizikal |
| 🖥️ **Jambatan desktop** | Windows `PostMessageW` · macOS `CGEventPostToPid` · Linux X11 MPX — kursor kedua sebenar |
| 🛑 **Henti kecemasan** | `Alt+Shift+X` — semua input AI dipotong serta-merta dan kekunci yang ditekan dilepaskan |
| 🔒 **Gerbang akses** | Penuh / Baca sahaja / Berkunci · kebenaran bermasa · skop tab · log audit |

## Pemasangan

1. **Jambatan desktop (pilihan):** `python3 native-bridge/ghostpilot_daemon.py` — sifar kebergantungan, tiada `pip install`
2. **Chrome/Edge/Brave:** `chrome://extensions` → Mod pembangun → **Muatkan sambungan tidak dibungkus** → `extension-chromium`
3. **Firefox:** `about:debugging#/runtime/this-firefox` → **Muatkan Add-on Sementara** → `extension-firefox/manifest.json`
4. **Beri tugasan:** klik ikon → tulis matlamat → **▶ Mula Tugasan**

> Wizard satu arahan: `python3 kur.py` · Windows `kur.bat` · Linux/macOS `./kur.sh`

## Pembekal percuma (tiada kad diperlukan)

| Pembekal | Kuota percuma |
|---|---|
| Google Gemini | 20–500 permintaan/hari |
| Groq | 30 permintaan/min · 1,000/hari |
| OpenRouter | model `:free` · 50/hari |
| xKiro | 26 model percuma · 500K token/hari |
| ModelScope | 2,000 panggilan/hari |
| **Ollama / LM Studio** | **Tanpa had · sepenuhnya setempat · tiada kunci** |

## Keselamatan & privasi

| Perkara | Status |
|---|---|
| Telemetri / analitik | ❌ tiada |
| Pelayan milik pembangun | ❌ tiada |
| Kunci API | 🔒 hanya `chrome.storage.local` |
| Medan kata laluan / kad / OTP | 🚫 tidak pernah dibaca |
| Jambatan desktop | `127.0.0.1` + token rawak 48 aksara + kebenaran `0600` |
| CORS | hanya `chrome-extension://` / `moz-extension://` |

Sahkan sendiri:

```bash
grep -rn "fetch(\|WebSocket(" extension-chromium/ native-bridge/
```

## Sokong projek

<div align="center">

[![Buy Me a Coffee](https://img.shields.io/badge/%E2%98%95_Buy_me_a_coffee-buymeacoffee.com%2Fbtmcode-f59e0b?style=for-the-badge&logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/btmcode)
[![GitHub](https://img.shields.io/badge/%E2%AD%90_Star-github.com%2FBtmcode-181717?style=for-the-badge&logo=github)](https://github.com/Btmcode/GhostPilot)

</div>

GhostPilot sepenuhnya percuma dan sumber terbuka. Tiada iklan, tiada telemetri, tiada peringkat berbayar.
Jika ia membantu anda, **[belikan saya kopi](https://buymeacoffee.com/btmcode)** ☕

> 💡 Sambungan memaparkan satu tetingkap sokongan yang sopan pada pemasangan pertama, kemudian paling banyak sekali seminggu. Tekan **"Jangan tunjukkan lagi"** dan ia tidak akan muncul lagi.

## Lesen

```
Copyright (c) 2026 BTM Code — MIT License
https://github.com/Btmcode  ·  https://btmcode.vercel.app  ·  https://mnemark.blogspot.com
```

Dikeluarkan di bawah lesen MIT: anda boleh menyalin, mengubah suai dan mengedarkannya semula. Satu-satunya syarat ialah **kekalkan notis hak cipta ini** (lihat [LICENSE](LICENSE), [COPYRIGHT](COPYRIGHT)).
Tiada pustaka luaran — tiada apa-apa selain pustaka standard Python.

> 📖 Untuk jambatan desktop, integrasi MCP dan jadual penuh 39 pembekal, lihat [README.md](README.md) (Turki) dan [README.en.md](README.en.md) (Inggeris).

---

*© 2026 BTM Code · MIT · [github.com/Btmcode/GhostPilot](https://github.com/Btmcode/GhostPilot)*