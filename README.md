<div align="center">

# 👻 GhostPilot

**Eşzamanlı AI Fare/Klavye ve Masaüstü Köprüsü**
*Simultaneous AI Mouse/Keyboard & Desktop Bridge*

[![Lisans](https://img.shields.io/badge/lisans-MIT-blue.svg)](LICENSE)
[![Sürüm](https://img.shields.io/badge/s%C3%BCr%C3%BCm-1.6.1-green.svg)]()
[![Bağımlılık](https://img.shields.io/badge/ba%C4%9F%C4%B1ml%C4%B1l%C4%B1k-s%C4%B1f%C4%B1r-brightgreen.svg)]()
[![Telemetri](https://img.shields.io/badge/telemetri-yok-success.svg)](SECURITY.md)
[![Buy Me a Coffee](https://img.shields.io/badge/%E2%98%95-Buy%20me%20a%20coffee-f59e0b?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/devcloudpy)

**🇹🇷 Türkçe** · [🇬🇧 English](README.en.md)

</div>

---

**Eşzamanlı AI Fare/Klavye ve Masaüstü Köprüsü** — fiziksel farenizi ve klavyenizi engellemeden
tarayıcıyı, web oyunlarını ve masaüstü pencerelerini kontrol eden ultra hafif AI ajanı.

> **Geliştirici:** [BTM Code](https://github.com/Btmcode) · [Blog](https://mnemark.blogspot.com) · [☕ Destek ol](https://buymeacoffee.com/devcloudpy)
>
> **Gizlilik önce:** telemetri yok · anahtarlar yalnızca sizin tarayıcınızda · şifre alanları hiç okunmaz.
> Ayrıntı: [**SECURITY.md**](SECURITY.md)

---

## Nasıl Çalışır? (Eşzamanlılık Mimarisi)

| Katman | Teknik | Neden çakışma olmaz? |
|---|---|---|
| **Tarayıcı girdisi** | Chromium'da CDP sanal donanım girdisi (`Input.dispatchMouseEvent`), Firefox'ta sentetik `PointerEvent` (`pointerId: 42`, `isPrimary: false`) | Fiziksel fareye dokunulmaz; AI ayrı bir sanal işaretçi kullanır |
| **Hayalet İmleç** | Kapalı Shadow DOM + GPU bileşimi (`transform: translate3d`, `pointer-events: none`) | Sayfa tıklamalarını engellemez, layout'a dokunmaz |
| **Windows masaüstü** | Win32 `PostMessageW` + `PrintWindow` (ctypes) | Mesaj doğrudan pencereye gider, fare hareket etmez |
| **macOS masaüstü** | `CGEventPostToPid` (CoreGraphics) + `screencapture -l` | Olay PID'e gider, imleç kıpırdamaz |
| **Linux masaüstü** | X11 `xdotool --window` + MPX `xinput create-master` | Gerçek 2. donanım imleci; iki fare aynı anda çalışır |
| **Acil durdurma** | `Alt+Shift+X` | Tüm AI girdisi anında kesilir, basılı tuşlar bırakılır |

---

## Kurulum (5 Dakika)

### 1. Masaüstü köprüsünü (daemon) başlatın
Sıfır bağımlılık — sadece Python 3 gerekir, `pip install` yok.

```bash
cd ghostpilot
python3 native-bridge/ghostpilot_daemon.py
# → ws://127.0.0.1:17380/ws ve http://127.0.0.1:17380/api/rpc aktif
```

### 2. Tarayıcı eklentisini yükleyin
- **Chrome/Edge/Brave/Opera:** `chrome://extensions` → Geliştirici modu → **Paketlenmemiş yükle** → `extension-chromium` klasörü
- **Firefox:** `about:debugging#/runtime/this-firefox` → **Geçici Eklenti Yükle** → `extension-firefox/manifest.json`

### 3. Görev verin
Eklenti simgesine tıklayın → görev yazın → **▶ Görevi Başlat**. Kendi farenizle başka sekmelerde gezinebilirsiniz.

### 4. (İsteğe bağlı) MCP ile Claude/Cursor'a bağlayın
`native-bridge/mcp_server.py` dosyasını MCP istemcinizin yapılandırmasına ekleyin (örnek `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "ghostpilot": {
      "command": "python3",
      "args": ["/tam/yol/ghostpilot/native-bridge/mcp_server.py"],
      "env": { "GHOSTPILOT_TOKEN": "<~/.ghostpilot/token içeriği>" }
    }
  }
}
```

### 5. (İsteğe bağlı) Native Messaging kurulumu
```bash
python3 native-bridge/install_bridge.py
```

---

## 🔒 Erişimi İstediğiniz An Kapatma (Access Gate)

Yapay zekâ kontrolü **dört ayrı yerden** kesilebilir; hepsi anında etkilidir ve basılı kalan sanal tuşları serbest bırakır.

| Yöntem | Etki |
|---|---|
| `Alt+Shift+X` | **Acil durdurma** — çalışan görev + tüm sanal tuşlar + masaüstü basılı tuşlar kesilir |
| `Alt+Shift+L` | Erişimi kilitle / aç (tek tuş, bildirim gösterir) |
| Panel → **🔒 Kilitle** | Tek tıkla tam kilit (aç düğmesine dönüşür) |
| Panel → **Kilitli** pili | Kalıcı kilit: tarayıcı + masaüstü köprüsü + MCP aynı anda |

### Üç erişim seviyesi

| Seviye | AI ne yapabilir? |
|---|---|
| 🔓 **Tam** | Okur + tıklar + yazar + tuş basar (tarayıcı ve masaüstü) |
| 👁️ **Okuma** | Ekranı/DOM'u okur ve analiz eder, **hiçbir girdi gönderemez** |
| 🔒 **Kilitli** | Hiçbir şey — yerleşik ajan, MCP, daemon, Web AI köprüsü dahil tüm yollar kapalı |

### Ek koruma katmanları
- **⏱️ Zamanlı izin** — 15 dk / 30 dk / 1 sa / 4 sa / 8 sa. Süre bitince **otomatik kilit** (30 saniyelik alarm denetimi).
- **⚑ Sekme sınırı** — "Sadece bu sekmeye izin ver": izin listesi dışındaki her sekmede AI engellenir.
- **✅ Görev onayı** — "Her görevden önce onay iste" açıksa onay penceresi olmadan hiçbir görev başlamaz.
- **📜 Denetim kaydı** — son 60 erişim kararı (izin/ret + gerekçe) panelde listelenir.
- **🧱 Fail-closed** — mod okunamazsa veya süre dolmuşsa erişim **kapalı** kabul edilir.

### Yerel köprü de aynı kilide uyar
`access.js` mantığı `ghostpilot_daemon.py` içinde de uygulanır:
```bash
# Kilitle (MCP / HTTP / WebSocket üzerinden gelen tüm girdiler reddedilir)
curl -H "X-GhostPilot-Token: $(cat ~/.ghostpilot/token)" -X POST http://127.0.0.1:17380/api/rpc \
  -d '{"domain":"system","method":"access_mode","params":{"mode":"locked"}}'
# Durum
curl ... -d '{"domain":"system","method":"access"}'
```
MCP araçları: `set_access_mode` (`mode`: `open|read_only|locked`, `minutes`) ve `access_status`.

---

## ⚡ Adım Adım Kurulum (Tek Komut)

```bash
python3 kur.py          # sihirbaz: ortam kontrolü → köprü → tarayıcı adımları
```
- **Windows:** `kur.bat` dosyasına çift tıklayın
- **Linux/macOS:** `./kur.sh`
- **macOS (çift tık):** `kurulum_baslat.command`

Görsel rehber: **`KURULUM.html`** — OS ve tarayıcı sekmeleri, adım adım ekran görüntüsü tarifleri, sorun giderme tablosu.

| Komut | Ne yapar |
|---|---|
| `python kur.py start / stop / status` | Köprüyü başlat / durdur / durum + erişim modu |
| `python kur.py autostart / noautostart` | Bilgisayar açılışında otomatik başlatma (Windows Startup · macOS LaunchAgent · Linux systemd) |
| `python kur.py native` | Native Messaging host kaydı |
| `python kur.py token` | Yeni güvenlik token'ı üretir |
| `python kur.py reset` | Ayarları sıfırlar |

## Performans Modları

| Mod | Ekran görüntüsü | DOM taraması | Kullanım |
|---|---|---|---|
| 🌱 **Eco** | Yok | Minimal | En düşük RAM/CPU, form doldurma |
| ⚡ **Dengeli** (varsayılan) | İsteğe bağlı | Kompakt | Genel web görevleri |
| 🎮 **Oyun** | Canvas/WebP hızlı | Hızlı | 60 Hz tuş tutma, web oyunları |

## Dahili AI Ayarları (Panel → AI & Performans)
**19 hazır sağlayıcı** — listeden seçtiğinizde Base URL, model ve Vision desteği otomatik dolar; sadece API anahtarınızı girip **🔌 Bağlantıyı Test Et**'e basın. **📋 Modeller** butonu OpenAI-uyumlu sağlayıcılardan model listesini çeker.

| Kategori | Sağlayıcılar |
|---|---|
| ☁️ Bulut | OpenAI, Anthropic Claude, Google Gemini (native + OpenAI uyumlu), OpenRouter, Groq, DeepSeek, Together AI, Mistral AI, Cohere, Azure OpenAI, xAI Grok, Perplexity, Fireworks AI, Anyscale |
| 💻 Yerel (ücretsiz, gizli) | Ollama, LM Studio, llama.cpp |
| 🔧 Diğer | Herhangi bir OpenAI uyumlu uç nokta (kendi sunucunuz, proxy, vLLM, LocalAI, OneAPI...) |

Teknik olarak 4 farklı API biçimi desteklenir: **OpenAI Chat Completions**, **Anthropic Messages**, **Google Gemini generateContent** ve **Cohere Chat** — Azure ayrıca deployment + `api-version` şemasıyla çalışır. Tüm isteklerde 45 sn zaman aşımı, 429/5xx için otomatik yeniden deneme (exponential backoff) ve hata gövdesi Türkçe mesajla raporlanır.

> **💳 "429 — no credits remaining" hatası:** anahtarınız doğru, hesabınızda **bakiye yok**. Kredi yükleyin veya panelde çıkan **🎁 Ücretsiz Gemini'ye geç** / **🦙 Ollama** düğmeleriyle tek tıkla ücretsiz sağlayıcıya geçin. (Not: ChatGPT Plus aboneliği API kredisi vermez.)

> **🤖 Otomatik anahtar:** Paneldeki mor **🔐 Hesabımla otomatik bağlan** düğmesi (Gemini / OpenRouter) tarayıcı içi OAuth + PKCE akışıyla hesabınızdan jeton alır ve kutuya **kendiliğinden yazar** — kopyala-yapıştır yok. Not: hiçbir sağlayıcı hesap/ödeme olmadan jeton vermez; bu bir güvenlik önlemidir. Tamamen anahtarsız çalışmak için Ollama kullanın.

> **Anahtar nereden alınır?** Ayrıntılı rehber: **`API_ANAHTARI_REHBERI.html`** — 39 sağlayıcının resmî anahtar sayfası, ücretsiz seçenekler, adım adım talimatlar. Panelde sağlayıcıyı seçtikten sonra **🔑 Anahtar al** düğmesi doğrudan o sayfayı açar.

> **Arama:** Paneldeki 🔍 sağlayıcı arama kutusuna `qwen`, `japon`, `çin`, `glm`, `kimi` gibi bir kelime yazın — liste anında filtrelenir. **Qwen** iki varyantla listede: `Qwen — Alibaba DashScope` ve `Qwen — Uluslararası (Singapur)`.

> **İpucu:** OpenRouter tek anahtarla GPT, Claude, Gemini, Llama, Qwen ve Mistral dahil 300+ modele erişim verir — birden çok AI denemek isteyenler için en pratik yol.


## Çoklu AI Sağlayıcı Mimarisi (Teknik)

Panelden seçilen sağlayıcı, `background.js` içindeki `AI_PROVIDERS` kayıt defterinden çözümlenir ve 4 farklı API biçiminden birine yönlenir:

| Biçim (`style`) | Kullanan sağlayıcılar | İstek yolu |
|---|---|---|
| `openai` | OpenAI, OpenRouter, Groq, DeepSeek, Together, Mistral, xAI, Perplexity, Fireworks, Anyscale, Ollama, LM Studio, llama.cpp, Gemini-OpenAI | `POST {base}/chat/completions` |
| `anthropic` | Anthropic Claude | `POST {base}/messages` + `x-api-key` |
| `gemini` | Google Gemini (native) | `POST {base}/models/{model}:generateContent?key=` |
| `cohere` | Cohere | `POST {base}/chat` |
| `azure` | Azure OpenAI | `POST {base}/openai/deployments/{deployment}/chat/completions?api-version=` |

- **Kendi sağlayıcınızı eklemek:** `AI_PROVIDERS` nesnesine tek satır ekleyin (id, ad, style, baseUrl, model, vision, keyHint). Panel açılır listesine de aynı id'yi `<option>` olarak ekleyin — başka kod değişikliği gerekmez.
- **Bağlantı testi:** Panel → 🔌 Bağlantıyı Test Et — gerçek bir mini istek atar ve gecikmeyi (ms) gösterir.
- **Model listesi:** 📋 Modeller — OpenAI uyumlu uç noktalarda `GET /models` ile 60'a kadar modeli listeler, seçtiğiniz model otomatik yazılır.
- **Dayanıklılık:** 45 sn zaman aşımı, 429/5xx için üstel geri çekilmeli otomatik yeniden deneme (2 kez), hata gövdesi + Türkçe çözüm ipucu.
- **Vision:** Sadece `vision: true` sağlayıcılarda ekran görüntüsü modele gönderilir; diğerlerinde görsel atlanır (token ve RAM tasarrufu).
- **Gizlilik:** Yerel sağlayıcılarda (Ollama / LM Studio / llama.cpp) hiçbir veri dışarı çıkmaz. API anahtarları yalnızca `chrome.storage.local` içinde tutulur.

## 🇨🇳 Çin Yapay Zekaları (Hazır Presetler)

| Sağlayıcı | Base URL | Model örneği | Not |
|---|---|---|---|
| **Qwen** — Alibaba DashScope | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` | Uluslararası: `dashscope-intl.aliyuncs.com` |
| **Kimi** — Moonshot | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` | Global: `api.moonshot.ai` |
| **GLM** — Zhipu / Z.ai | `https://open.bigmodel.cn/api/paas/v4` | `glm-4-plus` | Global: `api.z.ai` |
| **Doubao** — ByteDance Volcengine | `https://ark.cn-beijing.volces.com/api/v3` | `doubao-pro-32k` | Model = endpoint id olabilir |
| **Hunyuan** — Tencent | `https://api.hunyuan.cloud.tencent.com/v1` | `hunyuan-standard` | |
| **MiniMax** | `https://api.minimaxi.com/v1` | `abab6.5s-chat` | Global: `api.minimax.io` |
| **ERNIE** — Baidu Qianfan | `https://qianfan.baidubce.com/v2` | `ernie-4.5-8k-preview` | `max_completion_tokens` kullanır (otomatik) |
| **SiliconFlow** | `https://api.siliconflow.cn/v1` | `deepseek-ai/DeepSeek-V3` | 200+ model, ücretsiz kotlar |
| **ModelScope** | `https://api-inference.modelscope.cn/v1` | `Qwen/Qwen2.5-72B-Instruct` | Ücretsiz deneme kotası |
| **DeepSeek** | `https://api.deepseek.com/v1` | `deepseek-chat` | En düşük token maliyeti |
| **01.AI Yi** | `https://api.lingyiwanwu.com/v1` | `yi-large` | |
| **Baichuan** | `https://api.baichuan-ai.com/v1` | `Baichuan4` | |
| **StepFun** | `https://api.stepfun.com/v1` | `step-1-8k` | |

Çin dışından kullanıyorsanız **uluslararası uç noktaları** (Qwen intl, Kimi Global, Z.ai, MiniMax intl, SiliconFlow Global) seçin — daha düşük gecikme ve daha iyi erişilebilirlik sağlar. Tümü OpenAI uyumlu olduğu için Vision, model listesi ve bağlantı testi aynı şekilde çalışır.

## 🇯🇵 Japon Yapay Zekaları (Hazır Presetler)

| Sağlayıcı | Base URL | Model | Not |
|---|---|---|---|
| **Sakana Namazu** | `https://api.sakana.ai/v1` | `sakana-namazu` | Japonca + iş kültürü odaklı; Vision destekli; OpenAI **ve** Anthropic Messages uyumlu |
| **PLaMo 3.0 Prime** | `https://api.platform.preferredai.jp/v1` | `plamo-3.0-prime` | Preferred Networks, tamamen sıfırdan geliştirilmiş; 256K bağlam; `reasoning_effort` desteği |
| **Sarashina3** | `https://api.sarashina.ai/v1` | `sarashina3-mini` | SB Intuitions (SoftBank); ücretsiz beta; `max_completion_tokens` kullanır (otomatik) |

**Japonca için ipucu:** Bu üç model de Japonca tokenizasyonunda verimli olduğu için aynı görevde daha az token harcar. Sakana Namazu `console.sakana.ai`, PLaMo `console.platform.preferredai.jp`, Sarashina `sarashina.ai` üzerinden anahtar alır. Diğer Japon modelleri (NTT tsuzumi, NEC cotomi, Rakuten AI, ELYZA) kurumsal/özel anlaşmayla sunuluyor — uç noktanız varsa **Özel (OpenAI uyumlu)** seçeneğiyle bağlayabilirsiniz.

Yerel çalıştırma: `plamo-3-translate` ve `sarashina2.2` serisi GGUF/safetensors olarak açık; llama.cpp veya LM Studio ile `http://127.0.0.1:8080/v1` üzerinden ekleyebilirsiniz.

## Web AI Chat Köprüsü
ChatGPT / Claude / Gemini web sohbetlerinde sayfada bir **👻 GhostPilot** butonu belirir; tıklayınca sohbetteki talimat AI tarafından aktif sekmede çalıştırılır.

## Güvenlik
- Daemon yalnızca `127.0.0.1` üzerinde dinler, token korumalıdır (`GHOSTPILOT_TOKEN`).
- `Alt+Shift+X` her zaman çalışır. Şüphedeyseniz önce onu deneyin.

## Dosya Yapısı
```
GhostPilot/
├── BASLA.txt                  # 1 sayfalık hızlı başlangıç
├── GHOSTPILOT_REHBER.html     # 📘 TEK REHBER (kurulum+AI+anahtar+erişim+sorun)
├── kur.bat / kur.sh / kurulum_baslat.command   # kurulum başlatıcıları
├── kur.py                     # kurulum yöneticisi (start/stop/status/autostart)
├── extension-chromium/        # Chrome, Edge, Brave, Opera
│   ├── access.js              # erişim kapısı (kilit/süre/sekme/denetim)
│   ├── background.js          # CDP girdi + AI motoru + OAuth + anahtar deposu
│   ├── content.js             # hayalet imleç + sentetik girdi
│   └── panel.html/css/js      # sade 3 sekmeli arayüz
├── extension-firefox/         # Firefox kopyası
├── native-bridge/             # Python daemon + MCP sunucusu
└── README.md
```

> **Hızlı başlangıç:** ZIP'i çıkarın → `kur.bat` → `chrome://extensions` → `GHOSTPILOT_REHBER.html`
---

## 🌐 Çoklu dil / Multi-language

Arayüz **Türkçe** ve **İngilizce** olarak gelir. Ajan da seçtiğiniz dilde plan yapar.

Değiştirmek için: **Ayarlar → ℹ️ Hakkında → 🌐 Dil**

Yeni dil eklemek 3 adım: `i18n.js` içindeki `en` bloğunu kopyala → değerleri çevir →
`<button data-lang-btn="de">🇩🇪 Deutsch</button>` ekle.

---

## 🔐 Güvenlik ve gizlilik

| Konu | Durum |
|---|---|
| Telemetri / analytics | ❌ yok |
| Geliştiriciye ait sunucu | ❌ yok |
| API anahtarları | 🔒 yalnızca `chrome.storage.local` |
| Şifre / kart / OTP alanları | 🚫 hiç okunmaz |
| Masaüstü köprüsü | `127.0.0.1` + rastgele 48 karakter token + `0600` izin |
| CORS | yalnızca `chrome-extension://` / `moz-extension://` |

Tam denetim rehberi: [**SECURITY.md**](SECURITY.md)

Kendiniz doğrulayın:

```bash
grep -rn "fetch(\|WebSocket(" extension-chromium/ native-bridge/
```

Bulacağınız tek adresler: seçtiğiniz AI sağlayıcısı + `127.0.0.1`.

---

## 📄 Lisans ve telif

```
Copyright (c) 2026 BTM Code — MIT License
https://github.com/Btmcode  ·  https://btmcode.vercel.app  ·  https://mnemark.blogspot.com
```

MIT lisansı altında açık kaynaktır: kopyalayabilir, değiştirebilir, dağıtabilirsiniz.
Tek koşul: **bu telif bildirimini korumak** (bkz. [LICENSE](LICENSE), [COPYRIGHT](COPYRIGHT)).

Hiçbir harici kütüphane kullanılmaz — Python standart kütüphanesi dışında bağımlılık yoktur.

### 💖 Destek ol / Support

<div align="center">

[![Buy Me a Coffee](https://img.shields.io/badge/%E2%98%95_Buy_me_a_coffee-buymeacoffee.com%2Fdevcloudpy-f59e0b?style=for-the-badge&logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/devcloudpy)
[![GitHub](https://img.shields.io/badge/%E2%AD%90_Star-github.com%2FBtmcode-181717?style=for-the-badge&logo=github)](https://github.com/Btmcode/GhostPilot)

</div>

GhostPilot tamamen ücretsiz ve açık kaynak. Reklam yok, telemetri yok, ücretli katman yok.
İşine yaradıysa **[bir kahve ısmarla](https://buymeacoffee.com/devcloudpy)** ☕ — motivasyon oluyor.

> 💡 Eklenti ilk kurulumda ve sonra haftada en fazla bir kez nazik bir destek penceresi gösterir.
> **"Bir daha gösterme"** derseniz bir daha hiç açılmaz.

### Katkı

- 🐛 Hata / güvenlik bildirimi: [github.com/Btmcode](https://github.com/Btmcode)
- 🌐 Çeviri ekle: `extension-chromium/i18n.js` (3 adım)
- 📝 Blog: [mnemark.blogspot.com](https://mnemark.blogspot.com)
