# 🔐 GÜVENLİK

GhostPilot açık kaynak olarak paylaşılmak üzere tasarlanmıştır. Bu belge, **hangi verinin nereye gittiğini** ve **geliştiricinin hiçbir bilgiye erişmediğini** açıklar.

---

## Özet: Geliştirici hiçbir bilginize erişemez

| Konu | Durum |
|---|---|
| Telemetri / analytics | ❌ **Yok** — hiçbir izleme kodu yok |
| Uzak sunucu | ❌ **Yok** — geliştiriciye ait sunucu yok |
| API anahtarlarınız | 🔒 Yalnızca **kendi tarayıcınızın** `chrome.storage.local` alanında |
| Şifreleriniz | 🚫 **Hiç okunmaz** (aşağıya bakın) |
| Tarama geçmişiniz | ❌ Kaydedilmez, gönderilmez |
| Kaynak kod | ✅ Tamamı açık, denetlenebilir |

**Doğrulama:** `extension-chromium/` ve `native-bridge/` içindeki tüm dosyalarda ağ isteklerini arayın:

```bash
grep -rn "fetch(\|XMLHttpRequest\|WebSocket(" extension-chromium/ native-bridge/
```

Bulacağınız tek adresler: seçtiğiniz AI sağlayıcısının API'si ve `127.0.0.1` (kendi bilgisayarınız).

---

## 1. API anahtarları nerede saklanır?

```
chrome.storage.local  (yalnızca sizin tarayıcınız, diskte şifreli)
  └── keyStore: { gemini: { apiKey: "AIza..." }, xkiro: { apiKey: "sk-xt-..." } }
```

- Sunucuya **gönderilmez**
- Diğer eklentiler okuyamaz (Chrome izolasyonu)
- Web sayfaları okuyamaz (`web_accessible_resources` tanımlı değil)
- `~/.ghostpilot/token` dosyası **0600** izniyle, sadece sizin kullanıcınıza okunur

**Anahtarınızı silmek için:** Panel → Yapay Zekâ → Bağlı hesaplarınız → 🗑

### Günlüklerde maskeleme

Ajan günlüklerine yazılan her mesaj otomatik maskelenir:

```
"Anahtar kaydedildi: sk-or-v1-abcdef..."  →  "Anahtar kaydedildi: [ANAHTAR GİZLENDİ]"
```

Desen: `sk-*`, `gsk_*`, `AIza*`, `xai-*`, `sk-or-v1-*`, 32+ karakterlik hex dizileri, `token:`/`key:` alanları.

---

## 2. Şifreleriniz ve form verileriniz

Ajan sayfayı okurken **hassas alanların değerini okumaz**. Yalnızca etiketi görür (alanı tanıyabilmesi için).

**Hiç okunmayan alanlar:**
- `type="password"` (her zaman)
- Adı/etiketi şunları içeren alanlar: `password`, `şifre`, `parola`, `token`, `secret`, `api key`, `card number`, `cvv`, `cvc`, `iban`, `tckn`, `ssn`, `otp`, `2fa`, `mfa`, `pin code`

**Örnek:**

| Alan | AI'nın gördüğü |
|---|---|
| `<input type="password" placeholder="Şifreniz">` | `[12] <input:password> "Şifreniz"` — **değer yok** |
| `<input name="cvv">` | `[13] <input> "cvv"` — **değer yok** |
| `<input name="email">` | değer okunur (hassas değil) |

Doğrulama: `extension-chromium/content.js` → `isSensitiveField()`

> ⚠️ **Yine de:** Ajan şifre alanına *yazabilir* (siz söylerseniz). Şifrenizi görev metnine yazmayın — ajan onu günlüklere kaydeder. Girişleri kendiniz yapıp **▶ Sürdür** demeniz en güvenlisidir.

---

## 3. Masaüstü köprüsü (daemon) güvenliği

Yerel Python köprüsü `127.0.0.1:17380` üzerinde çalışır — **dışarıdan erişilemez**.

| Koruma | Değer |
|---|---|
| Dinleme adresi | `127.0.0.1` (yalnızca localhost) |
| Kimlik doğrulama | Rastgele 48 karakterlik token |
| Token saklama | `~/.ghostpilot/token`, izin `600` |
| Varsayılan token | ❌ **Yok** — ilk çalıştırmada rastgele üretilir |
| CORS | Yalnızca `chrome-extension://`, `moz-extension://` kökenleri |

**Token yenileme:**
```bash
python kur.py token
```

> Önceki sürümlerde sabit `ghostpilot-local` token'ı vardı. `kur.py` çalıştırıldığında bu otomatik olarak güçlü rastgele token'a yükseltilir.

---

## 4. İzinler — neden isteniyor?

| İzin | Neden | Kaldırılabilir mi? |
|---|---|---|
| `identity` | OAuth ile anahtar alma | ✅ elle anahtar girerseniz |
| `windows` | Görev için ayrı pencere | ✅ "mevcut sekme" modunda |
| `tabs` `scripting` | Sayfayı okuyup tıklama | ❌ temel işlev |
| `storage` | Anahtar/görev hafızası | ❌ |
| `debugger` | CDP ile donanım düzeyi girdi | ✅ panelden "sentetik" seçin |
| `<all_urls>` | Herhangi bir sitede çalışabilme | ⚠️ site listesiyle daraltılabilir |
| `nativeMessaging` | Masaüstü köprüsü | ✅ kullanmıyorsanız |

**Korumalı siteler** (varsayılan olarak dokunulmaz): `onlinebanking`, `bank`, `paypal.com` → Ayarlar'dan düzenlenebilir.

---

## 5. Ajanın yetkileri ve sınırları

| Yapabilir | Yapamaz |
|---|---|
| Sekmede gezinme, tıklama, yazma | Şifre/kart alanlarının değerini okuma |
| Ayrı pencerede çalışma | Chrome Web Store'u kontrol etme |
| Masaüstü penceresine sentetik tıklama | Fiziksel farenizi ele geçirme |
| Ekran görüntüsü (yalnızca hedef sekme) | Tüm ekranı kaydetme |
| — | Arka planda çalışmaya devam etme (siz durdurursanız) |

**Acil durdurma:** `Alt+Shift+X` — tüm görevleri, basılı tuşları ve masaüstü girdisini anında keser.

---

## 6. Açık kaynak paylaşımı — kontrol listesi

Paylaşmadan önce bu depoda **hiçbir kişisel veri yok**. Doğrulamak için:

```bash
# API anahtarı / token araması
grep -rInE "(sk-[A-Za-z0-9]{16,}|AIza[0-9A-Za-z_-]{20,}|gsk_[A-Za-z0-9]{20,}|xai-[A-Za-z0-9]{20,})" .

# Kişisel yol araması
grep -rInE "(C:\\\\Users\\\\[a-zA-Z]+|/home/[a-z]+/|/Users/[a-z]+/)" .

# Kişisel URL araması
grep -rIn "mnemark\|btmcode" . --include="*.js" --include="*.html"
```

Beklenen sonuç: yalnızca `COPYRIGHT` ve `LICENSE` dosyalarındaki geliştirici bilgileri.

**Paket üretirken hariç tutulacaklar:**
```
*.log  *.db  .env*  node_modules/  __pycache__/  ghostpilot_kurulum.json  ~/.ghostpilot/
```

---

## 7. Güvenlik açığı bildirimi

Bir açık bulduysanız lütfen herkese açık issue açmadan önce ulaşın:

- Web: https://btmcode.vercel.app
- Blog: https://mnemark.blogspot.com

48 saat içinde yanıt verilir.

---

**Son güncelleme:** 16 Kasım 2026 · Sürüm 1.6.0
**Telif:** © 2026 BTM Code — MIT Lisansı
