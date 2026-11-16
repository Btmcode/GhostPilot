<div align="center">

# 👻 GhostPilot

**Eşzamanlı AI Fare/Klavye ve Masaüstü Köprüsü**

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/Türkçe-f59e0b?style=for-the-badge&labelColor=f59e0b&logoColor=111111" alt="Türkçe"></a>
  <a href="README.en.md"><img src="https://img.shields.io/badge/English-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="English"></a>
  <a href="README.zh.md"><img src="https://img.shields.io/badge/中文-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="中文"></a>
  <a href="README.ja.md"><img src="https://img.shields.io/badge/日本語-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="日本語"></a>
  <a href="README.ko.md"><img src="https://img.shields.io/badge/한국어-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="한국어"></a>
  <a href="README.vi.md"><img src="https://img.shields.io/badge/Tiếng%20Việt-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="Tiếng Việt"></a>
  <a href="README.de.md"><img src="https://img.shields.io/badge/Deutsch-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="Deutsch"></a>
  <a href="README.ms.md"><img src="https://img.shields.io/badge/Melayu-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="Melayu"></a>
</p>

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.6.1-green.svg)]()
[![Dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen.svg)]()
[![Telemetry](https://img.shields.io/badge/telemetry-none-success.svg)](SECURITY.md)
[![Buy Me a Coffee](https://img.shields.io/badge/%E2%98%95-Buy%20me%20a%20coffee-f59e0b?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/devcloudpy)

</div>

---

Fiziksel farenizi ve klavyenizi **engellemeden** tarayıcıyı, web oyunlarını ve masaüstü pencerelerini kontrol eden ultra hafif AI ajanı.

> **Geliştirici:** [BTM Code](https://github.com/Btmcode) · [Web](https://btmcode.vercel.app) · [Blog](https://mnemark.blogspot.com)
>
> **Gizlilik önce:** telemetri yok · anahtarlar yalnızca sizin tarayıcınızda · şifre alanları hiç okunmaz → [SECURITY.md](SECURITY.md)

---

## Neden GhostPilot?

| Sorun | GhostPilot nasıl çözer? |
|---|---|
| Otomasyon araçları gerçek imlecinizi ele geçirir | **Sanal/CDP girdi** kullanır — fareniz çalışmaya devam eder |
| Araçlar açık sekmelerinizi devralır | **Ayrı pencerede** çalışır |
| Ücretsiz token biter, durur | **Otomatik sağlayıcı devri** |
| Yeniden başlatınca görevi unutur | **Kalıcı hafıza** — kaldığı adımdan devam |
| 20 tane prompt yazmanız gerekir | **Tek hedef yazın**, ajan tüm zinciri planlar ve yürütür |

## Öne çıkanlar

| Özellik | Açıklama |
|---|---|
| 🎯 **Misyon motoru** | Büyük hedefi yazın; ajan 4–10 adıma böler, her adımı sayfaya bakarak doğrular ve durmadan sürdürür |
| 🗔 **Ayrı pencere** | Görevler yeni pencerede çalışır — açık sekmelerinize dokunulmaz |
| 🔁 **Sağlayıcı devri** | Token biterse otomatik başka sağlayıcıya geçer, görev durmaz |
| 🧠 **Kalıcı hafıza** | Her adım diske yazılır; tarayıcı kapansa bile kaldığı yerden sürer |
| 🖱️ **Hayalet imleç** | Kapalı Shadow DOM + GPU bileşimi; fiziksel farenizle aynı anda çalışır |
| 🖥️ **Masaüstü köprüsü** | Windows `PostMessageW` · macOS `CGEventPostToPid` · Linux X11 MPX — gerçek 2. imleç |
| 🛑 **Acil durdurma** | `Alt+Shift+X` — tüm AI girdisi anında kesilir, basılı tuşlar bırakılır |
| 🔒 **Erişim kapısı** | Tam / Okuma / Kilitli · zamanlı izin · sekme sınırı · denetim kaydı |

## Kurulum

1. **Masaüstü köprüsü (isteğe bağlı):** `python3 native-bridge/ghostpilot_daemon.py` — sıfır bağımlılık, `pip install` yok
2. **Chrome/Edge/Brave:** `chrome://extensions` → Geliştirici modu → **Paketlenmemiş yükle** → `extension-chromium`
3. **Firefox:** `about:debugging#/runtime/this-firefox` → **Geçici Eklenti Yükle** → `extension-firefox/manifest.json`
4. **Görev verin:** simgeye tıklayın → hedefi yazın → **▶ Görevi Başlat**

> Tek komutla sihirbaz: `python3 kur.py` · Windows `kur.bat` · Linux/macOS `./kur.sh`

## Ücretsiz sağlayıcılar (kart istemez)

| Sağlayıcı | Ücretsiz kota |
|---|---|
| Google Gemini | 20–500 istek/gün |
| Groq | 30 istek/dk · 1.000/gün |
| OpenRouter | `:free` modeller · 50/gün |
| xKiro | 26 ücretsiz model · 500K token/gün |
| ModelScope | 2.000 çağrı/gün |
| **Ollama / LM Studio** | **Sınırsız · tamamen yerel · anahtarsız** |

## Güvenlik ve gizlilik

| Konu | Durum |
|---|---|
| Telemetri / analitik | ❌ yok |
| Geliştiriciye ait sunucu | ❌ yok |
| API anahtarları | 🔒 yalnızca `chrome.storage.local` |
| Şifre / kart / OTP alanları | 🚫 hiç okunmaz |
| Masaüstü köprüsü | `127.0.0.1` + rastgele 48 karakter token + `0600` izin |
| CORS | yalnızca `chrome-extension://` / `moz-extension://` |

Kendiniz doğrulayın:

```bash
grep -rn "fetch(\|WebSocket(" extension-chromium/ native-bridge/
```

## Destek ol

<div align="center">

[![Buy Me a Coffee](https://img.shields.io/badge/%E2%98%95_Buy_me_a_coffee-buymeacoffee.com%2Fdevcloudpy-f59e0b?style=for-the-badge&logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/devcloudpy)
[![GitHub](https://img.shields.io/badge/%E2%AD%90_Star-github.com%2FBtmcode-181717?style=for-the-badge&logo=github)](https://github.com/Btmcode/GhostPilot)

</div>

GhostPilot tamamen ücretsiz ve açık kaynak. Reklam yok, telemetri yok, ücretli katman yok.
İşine yaradıysa **[bir kahve ısmarla](https://buymeacoffee.com/devcloudpy)** ☕

> 💡 Eklenti ilk kurulumda ve sonra haftada en fazla bir kez nazik bir destek penceresi gösterir. **"Bir daha gösterme"** derseniz bir daha hiç açılmaz.

## Lisans

```
Copyright (c) 2026 BTM Code — MIT License
https://github.com/Btmcode  ·  https://btmcode.vercel.app  ·  https://mnemark.blogspot.com
```

MIT lisansı altında açıktır: kopyalayabilir, değiştirebilir, dağıtabilirsiniz. Tek koşul **bu telif bildirimini korumak** (bkz. [LICENSE](LICENSE), [COPYRIGHT](COPYRIGHT)).
Hiçbir harici kütüphane kullanılmaz — Python standart kütüphanesi dışında bağımlılık yoktur.

> 📖 Masaüstü köprüsü, MCP entegrasyonu ve 39 AI sağlayıcısının ayrıntılı tabloları için [README.md](README.md) (Türkçe) ve [README.en.md](README.en.md) (İngilizce) sürümlerine bakın.

---

*© 2026 BTM Code · MIT · [github.com/Btmcode/GhostPilot](https://github.com/Btmcode/GhostPilot)*