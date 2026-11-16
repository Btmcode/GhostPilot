# GhostPilot — Uçtan Uca Testler

Gerçek Chromium üzerinde çalışan otomatik testler (Playwright).

## Kurulum

```bash
npm init -y
npm i playwright
npx playwright install --with-deps chromium
# Linux'ta başsız koşacaksanız:
sudo apt-get install -y xvfb
```

## Çalıştırma

```bash
# 1) Arayüz + dil + panel + güvenlik  (23 kontrol)
xvfb-run -a node tests/e2e-tarayici.mjs

# 2) Gizli veri sızıntı testi        (5 gizli alan)
xvfb-run -a node tests/e2e-gizlilik.mjs

# 3) Gerçek ajan döngüsü             (sahte LLM ile tıklama)
xvfb-run -a node tests/e2e-ajan.mjs
```

> Windows/macOS'ta `xvfb-run -a` gerekmez.

## Kapsam

| Test | Ne doğrular |
|---|---|
| `e2e-tarayici.mjs` | Eklenti yükleniyor mu, sürüm, panel açılışı, JS hatası yok, TR↔EN çeviri + kalıcılık, referans kartları, content script, mesaj kanalı, günlük maskeleme, misyon depolama, acil durdurma |
| `e2e-gizlilik.mjs` | Şifre / kart / CVV / TCKN / OTP değerlerinin DOM snapshot'ına **sızmadığını** canlı sayfada kanıtlar |
| `e2e-ajan.mjs` | Sahte OpenAI-uyumlu LLM sunucusu kurar, ajanı başlatır, ajanın **gerçekten tıkladığını** ve görev hafızasını diske yazdığını doğrular |

## Notlar

- Testler kendi yerel HTTP sunucularını (8899, 8900) açar ve kapatır.
- Profil klasörleri `profile*` altında; her koşuda silinir.
- `e2e-ajan.mjs` için internet/API anahtarı **gerekmez** — LLM taklit edilir.

## Test dosyaları

| Dosya | Ne test eder |
|---|---|
| `e2e-tarayici.mjs` | Panel UI, erişim kapısı, snapshot gizliliği, acil durdurma (23 test) |
| `e2e-gizlilik.mjs` | Hassas veri sızıntısı (TCKN/OTP/şifre/kart) |
| `e2e-ajan.mjs` | Gerçek tıklama, LLM döngüsü, görev hafızası |
| `e2e-bagis.mjs` | Bağış penceresi haftalık mantık (10 test) |
| `e2e-misyon.mjs` | Misyon planlama + `Misyon yok` regresyonu |
| `e2e-cift-kurulum.mjs` | İki GhostPilot kopyası → `different extension` kurtarma |
| `e2e-bagis-url.mjs` | Bağış bağlantılarının `btmcode` olduğunu doğrular |

**Çalıştırma:** `xvfb-run -a node tests/e2e-tarayici.mjs`
