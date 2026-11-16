/**
 * GhostPilot — i18n.js
 * Copyright (c) 2026 BTM Code — MIT License
 * https://btmcode.vercel.app  ·  https://github.com/btmcode
 *
 * Çoklu dil / Multi-language (TR + EN)
 * Anahtar = Türkçe metnin kendisi. En yoksa Türkçe gösterilir.
 */

const GP_I18N = {
"en": {
"Masaüstü: bekleniyor": "Desktop: waiting",
"Girdi: hazır": "Input: ready",
"AI erişimi: açık": "AI access: on",
"AI erişimi: kapalı": "AI access: off",
"🤖 Yapay Zekâ": "🤖 AI",
"▶ Görev": "▶ Task",
"⚙ Ayarlar": "⚙ Settings",
"1. Hangi yapay zekâyı kullanacaksınız?": "1. Which AI will you use?",
"Karta dokunun → giriş penceresi açılır → anahtar otomatik kaydedilir.": "Tap a card → a sign-in window opens → the key is saved automatically.",
"Ücretsiz · kart istemez": "Free · no card needed",
"ÜCRETSİZ": "FREE",
":free modeller · tek anahtar": ":free models · one key",
"Çok hızlı · ücretsiz kota": "Very fast · free quota",
"69 model · 26'sı ücretsiz": "69 models · 26 free",
"Günde 2000 çağrı bedava": "2,000 calls/day free",
"Anahtar yok · veri dışarı çıkmaz": "No key · data never leaves",
"YEREL": "LOCAL",
"Masaüstü uygulaması · anahtarsız": "Desktop app · keyless",
"🔄 Yerel sunucuları yeniden tara (Ollama · LM Studio · llama.cpp)": "🔄 Rescan local servers (Ollama · LM Studio · llama.cpp)",
"＋ Diğer 33 sağlayıcıyı göster (Çin · Japonya · yerel · özel)": "＋ Show 33 more providers (China · Japan · local · custom)",
"Bu sağlayıcıyı kullan": "Use this provider",
"2. Bağlı hesaplarınız": "2. Your connected accounts",
"Her anahtar ayrı ayrı ve kalıcı saklanır. İstediğiniz an geçiş yapın.": "Every key is stored separately and permanently. Switch whenever you like.",
"Henüz bağlı hesap yok. Yukarıdan bir sağlayıcı seçin.": "No connected account yet. Pick a provider above.",
"Bağlantı kur": "Connect",
"Bir sağlayıcı seçin.": "Select a provider.",
"🔐 Tarayıcıda giriş yap ve bağlan": "🔐 Sign in with a browser and connect",
"Google OAuth İstemci Kimliği": "Google OAuth Client ID",
"(tek seferlik)": "(one-time)",
"console.cloud.google.com → Credentials → Create OAuth client ID → Chrome Extension. Bununla uğraşmak istemezseniz aşağıdan": "console.cloud.google.com → Credentials → Create OAuth client ID → Chrome Extension. If you'd rather skip this, use",
"API anahtarı girebilirsiniz.": "an API key below.",
"API Anahtarı": "API Key",
"💾 Kaydet": "💾 Save",
"🔑 Anahtarı nereden alacağım?": "🔑 Where do I get a key?",
"🗑 Kayıtlı anahtarı sil": "🗑 Delete saved key",
"Model": "Model",
"🔌 Bağlantıyı Test Et": "🔌 Test Connection",
"🎯 Misyon (kalıcı hedef)": "🎯 Mission (persistent goal)",
"Büyük hedefi yazın — ajan kendi görev listesini kurar ve durmadan yürütür.": "Write the big goal — the agent builds its own task list and runs without stopping.",
"Kendiliğinden devam et": "Continue on its own",
"Ara (dk)": "Interval (min)",
"🚀 Misyonu başlat (planı oluştur)": "🚀 Start mission (build the plan)",
"Ajan hedefi 4-10 adıma böler, her adımı çalıştırır, sayfaya bakıp doğrular. Token biterse sağlayıcı değiştirir; tarayıcı kapansa bile kaldığı yerden sürer.": "The agent splits the goal into 4–10 steps, executes each one and verifies it by looking at the page. If tokens run out it switches provider; even if the browser closes it resumes where it left off.",
"▶ Sürdür": "▶ Resume",
"⏸ Duraklat": "⏸ Pause",
"＋ Yeni misyon": "＋ New mission",
"Ne yapmasını istiyorsunuz?": "What should it do?",
"Yapay zekâ seçilmedi.": "No AI selected.",
"🌱 Ekonomik": "🌱 Eco",
"⚡ Dengeli": "⚡ Balanced",
"🎮 Oyun": "🎮 Gaming",
"Nerede çalışsın?": "Where should it run?",
"🗔 Yeni pencere": "🗔 New window",
"📑 Mevcut sekme": "📑 Current tab",
"Yeni pencere: mevcut sekmeleriniz karışmaz, ayrı pencere açılır.": "New window: your open tabs are untouched, a separate window is used.",
"▶ Görevi Başlat": "▶ Start Task",
"🧠 Görev hafızası": "🧠 Task memory",
"▶ Kaldığı yerden devam et": "▶ Resume from where it stopped",
"Ajan her adımı diske kaydeder. Token biterse otomatik sağlayıcı değiştirir; tarayıcı kansa bile buradan devam edersiniz.": "The agent saves every step to disk. If tokens run out it switches provider automatically; even if the browser closes you can resume from here.",
"Canlı kayıt": "Live log",
"Boşta": "Idle",
"Masaüstü köprüsü": "Desktop bridge",
"Yeniden bağlan": "Reconnect",
"🪟 Pencereleri listele": "🪟 List windows",
"🖱️ Çift imleç": "🖱️ Dual cursor",
"Gönder": "Send",
"AI erişim kontrolü": "AI access control",
"Yapay zekâ ne yapabilir? İstediğiniz an kesin.": "What may the AI do? Cut it at any moment.",
"🔓 Tam": "🔓 Full",
"👁️ Okuma": "👁️ Read-only",
"🔒 Kilitli": "🔒 Locked",
"Süre yok": "No limit",
"15 dakika": "15 minutes",
"30 dakika": "30 minutes",
"1 saat": "1 hour",
"4 saat": "4 hours",
"8 saat": "8 hours",
"🔒 Kilitle": "🔒 Lock",
"Her görevden önce onay iste": "Ask for approval before every task",
"Kilitlenince görevi ve basılı tuşları kes": "When locked, cut the task and any held keys",
"Sadece bu sekme": "This tab only",
"Tüm sekmeler": "All tabs",
"Son erişim kayıtları": "Recent access log",
"Davranış": "Behavior",
"Girdi motoru": "Input engine",
"CDP — sanal donanım (Chrome/Edge)": "CDP — virtual hardware (Chrome/Edge)",
"Sessiz sentetik (tüm tarayıcılar)": "Silent synthetic (all browsers)",
"Hayalet imleci göster": "Show ghost cursor",
"Web AI sohbet köprüsü (ChatGPT/Claude sayfalarında 👻)": "Web AI chat bridge (👻 on ChatGPT/Claude pages)",
"Maks. adım": "Max steps",
"✓ Kaydet": "✓ Save",
"Gelişmiş": "Advanced",
"⚡ Seçili sağlayıcının varsayılanlarını doldur": "⚡ Fill in defaults for the selected provider",
"⚙️ Tüm sağlayıcı ayarlarını göster": "⚙️ Show all provider settings",
"ℹ️ Hakkında": "ℹ️ About",
"Geliştirici": "Developer",
"Lisans": "License",
"MIT (açık kaynak)": "MIT (open source)",
"Kaynak kodu": "Source code",
"Bağlantılar": "Links",
"☕ Destek ol — buymeacoffee.com/devcloudpy": "☕ Buy me a coffee — buymeacoffee.com/devcloudpy",
"© 2026 BTM Code. MIT lisansı altında paylaşılmıştır; telif bildirimi korunduğu sürece kopyalayabilir, değiştirebilir ve dağıtabilirsiniz.": "© 2026 BTM Code. Released under the MIT license; you may copy, modify and redistribute as long as this notice is preserved.",
"Gizlilik:": "Privacy:",
"hiçbir telemetri yok · anahtarlarınız yalnızca bu tarayıcıda · şifre alanları hiç okunmaz.": "no telemetry at all · your keys stay in this browser only · password fields are never read.",
"Dil": "Language",
"Türkçe": "Turkish",
"English": "English",
"AI erişimini kilitle (Alt+Shift+L)": "Lock AI access (Alt+Shift+L)",
"Kilidi aç (Alt+Shift+L)": "Unlock (Alt+Shift+L)",
"Acil durdurma (Alt+Shift+X)": "Emergency stop (Alt+Shift+X)",
"AI seçilmedi": "No AI selected",
"AKTİF": "ACTIVE",
"Anahtar boş. Yapıştırın veya 🔑 Anahtarı nereden alacağım? bağlantısını kullanın.": "Key is empty. Paste it, or use the 🔑 Where do I get a key? link.",
"Anahtar gerekmez, veri bilgisayarınızdan çıkmaz. Artık görev başlatabilirsiniz.": "No key needed, data never leaves your computer. You can start a task now.",
"Anahtar sayfası yeni sekmede açıldı. Anahtarı kopyalayıp buradaki kutuya yapıştırın.": "The key page opened in a new tab. Copy the key and paste it into the box here.",
"Anahtarınızı yapıştırın ve Kaydet'e basın — kalıcı saklanır.": "Paste your key and press Save — it is stored permanently.",
"Bağlan": "Connect",
"Bağlantı kurulamadı.": "Could not connect.",
"Bir görev yazın.": "Write a task.",
"Blogger açıldı. Şimdi ▶ Görevi Başlat'a basın.": "Blogger opened. Now press ▶ Start Task.",
"Bu adımı atla": "Skip this step",
"Bu sağlayıcı için anahtar sayfası yok.": "There is no key page for this provider.",
"Bu yerel sağlayıcı anahtar istemez. Uygulamanın açık olduğundan emin olun.": "This local provider needs no key. Make sure the app is running.",
"Erişim değiştirilemedi.": "Could not change access.",
"Gönderilemedi.": "Could not send.",
"Görev başlatılamadı.": "Could not start the task.",
"Görev hafızası silindi.": "Task memory deleted.",
"Görev iptal edildi.": "Task cancelled.",
"HATA": "ERROR",
"Henüz kayıt yok.": "No log entries yet.",
"Kayıtlı anahtar silindi.": "Saved key deleted.",
"Kayıtlı görev hafızası silinsin mi?": "Delete the saved task memory?",
"Masaüstü köprüsüne yeniden bağlanılıyor…": "Reconnecting to the desktop bridge…",
"Mevcut sekme: şu an açık olan sekmede çalışır.": "Current tab: runs in the tab that is open right now.",
"Misyon başlatılamadı.": "Could not start the mission.",
"Misyon hedefini yazın.": "Write the mission goal.",
"Misyon ve tüm görev listesi silinsin mi?": "Delete the mission and its whole task list?",
"Model bulunamadı": "No model found",
"Otomatik giriş başarısız.": "Automatic sign-in failed.",
"Pencere bulunamadı.": "No window found.",
"Sanal imleç testi — kendi farenizi serbestçe oynatın!": "Virtual cursor test — move your own mouse freely!",
"Seçtiğiniz model kutuya yazılır.": "The model you pick is written into the box.",
"Sürdürülemedi.": "Could not resume.",
"Tek tıkla giriş yapın; anahtar otomatik kaydedilir.": "Sign in with one click; the key is saved automatically.",
"Tüm alanlar görünür. Base URL ve Vision ayarını elle değiştirebilirsiniz.": "All fields are visible. You can edit Base URL and the Vision setting by hand.",
"Tüm anahtarlar silindi.": "All keys deleted.",
"Tüm sekmeler izinli.": "All tabs allowed.",
"Yapay zekâ seçilmedi": "No AI selected",
"Yukarıdan bir sağlayıcı kartına dokunun.": "Tap a provider card above.",
"identity API bulunamadı": "identity API not available",
"· oto-devam açık": "· auto-continue on",
"· ücretsiz": "· free",
"· ⚠️ kısa bağlam": "· ⚠️ short context",
"ÇALIŞIYOR": "RUNNING",
"Çalışıyor · model yüklü değil": "Running · model not loaded",
"Çift imleç değiştirildi.": "Dual cursor toggled.",
"Önce bir sağlayıcı seçin.": "Select a provider first.",
"Özel uç nokta": "Custom endpoint",
"çalışıyor": "running",
"İndir": "Download",
"İpucu: Görevi normal bir web sitesi sekmesinde başlatın (Blogger, Google vb.).": "Tip: start the task on an ordinary website tab (Blogger, Google, etc.).",
"— çevrimdışı yedek liste": "— offline fallback list",
"⏳ Giriş penceresi açılıyor…": "⏳ Sign-in window opening…",
"⏳ Plan oluşturuluyor…": "⏳ Building the plan…",
"⏳ Yerel sunucuya bağlanılıyor…": "⏳ Connecting to the local server…",
"⏸ Misyon duraklatıldı. Kaldığı adım kaydedildi.": "⏸ Mission paused. The current step was saved.",
"■ ACİL DURDURMA: her şey durduruldu.": "■ EMERGENCY STOP: everything stopped.",
"☁️ Ücretsiz bulut": "☁️ Free cloud",
"⚑ Tüm sekmeler izinli.": "⚑ All tabs allowed.",
"⚪ Kredi ile": "⚪ With credit",
"＋ Diğer sağlayıcılar (yerel · özel uç nokta)": "＋ Other providers (local · custom endpoint)",
"🌐 blogger.com sekmesi aç ve başlat": "🌐 Open a blogger.com tab and start",
"🎁 Ücretsiz Gemini'ye geç": "🎁 Switch to free Gemini",
"💳 Kredi sayfası": "💳 Credit page",
"💻 Yerel (bedava, veri dışarı çıkmaz)": "💻 Local (free, data never leaves)",
"🔄 Modeller alınıyor…": "🔄 Fetching models…",
"🔄 Tarayıcıda giriş penceresi açıldı — hesabınızla giriş yapıp izin verin.": "🔄 Sign-in window opened — sign in and grant permission.",
"🔄 xKiro model kataloğu alınıyor…": "🔄 Fetching the xKiro model catalogue…",
"🔐 Otomatik giriş kullanılamıyor": "🔐 Automatic sign-in unavailable",
"🔒 AI erişimi kapatıldı.": "🔒 AI access turned off.",
"🔓 AI erişimi açıldı.": "🔓 AI access turned on.",
"Başla": "Start",
"Duraklat": "Pause",
"Sil": "Delete",
"Tamam": "OK",
"İptal": "Cancel",
"Kapat": "Close",
"Görev": "Task",
"Görev tamamlandı": "Task completed",
"Görev başarısız": "Task failed",
"Adım": "Step",
"Bekliyor": "Waiting",
"Devam ediyor": "In progress",
"Tamamlandı": "Completed",
"Başarısız": "Failed",
"Atlandı": "Skipped",
" · oto-devam açık": " · auto-continue on",
" · ücretsiz": " · free",
" · ⚠️ kısa bağlam": " · ⚠️ short context",
" — çevrimdışı yedek liste": " — offline fallback list",
"▶ Misyon sürdürülüyor…": "▶ Mission resuming…",
"🔓 Aç": "🔓 On",
"🔧 Diğer": "🔧 Other",
"🟢 ÜCRETSİZ (kart istemez)": "🟢 FREE (no card needed)",
"🪄 Modeli otomatik düzelt": "🪄 Fix the model automatically",
"🪄 Çalışan model aranıyor… (birkaç saniye)": "🪄 Looking for a working model… (a few seconds)",
"✓ Bu sağlayıcı için kayıtlı anahtar var. Kullanmak için Bağlan'a basın.": "✓ A key is already saved for this provider. Press Connect to use it.",
"✓ Anahtar kaydedildi — kalıcı olarak saklandı.": "✓ Key saved — stored permanently.",
"✓ Kalıcı anahtar alındı ve kaydedildi.": "✓ Permanent key received and saved.",
"Görev durduruldu.": "Task stopped.",
"Misyon tamamlandı 🎉": "Mission complete 🎉",
"Adım atlandı.": "Step skipped.",
"Bağlantı başarılı.": "Connection successful.",
"Bağlantı başarısız.": "Connection failed.",
"Model listesi alındı.": "Model list fetched.",
"Pencereler alındı.": "Windows fetched.",
"Kaydedildi.": "Saved.",
"Silindi.": "Deleted."
},
"en_placeholder": {
"🔍 Ara: qwen, kimi, japon, glm, deepseek…": "🔍 Search: qwen, kimi, japanese, glm, deepseek…",
"Anahtarınızı yapıştırın": "Paste your key",
"model adı": "model name",
"…apps.googleusercontent.com": "…apps.googleusercontent.com",
"Tuş/metin (örn: space)": "Key/text (e.g. space)",
"Örn: Bu oyunda Başla'ya tıkla ve Space ile zıpla": "e.g. Click Start in this game and jump with Space",
"Örn: https://site-adresim.com adresine git, hesabıma bağlan, panelime gir, tema ayarlarını düzenle ve reklam geliri üretecek şekilde yapılandır. Hedef: ayda 100 dolar gelir.": "e.g. Go to https://my-site.com, sign in to my account, open my dashboard, adjust the theme settings and configure it to generate ad revenue. Goal: $100/month income.",
"https://…": "https://…"
},
"en_title": {
"AI erişimini kilitle/aç (Alt+Shift+L)": "Lock/unlock AI access (Alt+Shift+L)",
"Acil durdurma (Alt+Shift+X)": "Emergency stop (Alt+Shift+X)",
"Sağlayıcıdan modelleri çek": "Fetch models from the provider",
"Misyonu sil": "Delete the mission",
"En düşük kaynak kullanımı": "Lowest resource usage",
"Dengeli (önerilen)": "Balanced (recommended)",
"60 Hz tuş tutma, web oyunları": "60 Hz key hold, web games",
"Kendi açık sekmelerinize dokunmaz": "Does not touch your open tabs",
"Zaten açık olan sekmeyi kullanır": "Uses the already-open tab",
"Fiziksel farenizi oynatırken sanal imleci izleyin": "Watch the virtual cursor while moving your real mouse",
"Kayıtlı görevi sil": "Delete the saved task",
"Linux X11: ikinci bağımsız imleç": "Linux X11: second independent cursor"
}
};

const GP_LANG = (() => {
  const DICT = GP_I18N.en;
  const PH = GP_I18N.en_placeholder;
  const TI = GP_I18N.en_title;
  let lang = "tr";

  const norm = (s) => s.replace(/\s+/g, " ").trim();

  function tr(text) {
    if (lang === "tr" || !text) return text;
    const key = norm(text);
    return DICT[key] || text;
  }

  function translateNode(node) {
    // İlk görüşte orijinal metni sakla: TR'ye dönüşte birebir geri yüklenir
    if (node.__gpSrc === undefined) node.__gpSrc = node.nodeValue;
    const raw = node.__gpSrc;
    if (!raw || !raw.trim()) return;

    if (lang === "tr") {
      if (node.nodeValue !== raw) node.nodeValue = raw;
      return;
    }
    const hit = DICT[norm(raw)];
    if (!hit) return;
    const lead = raw.match(/^\s*/)[0];
    const trail = raw.match(/\s*$/)[0];
    const next = lead + hit + trail;
    if (node.nodeValue !== next) node.nodeValue = next;
  }

  function translateAttrs(root) {
    root.querySelectorAll("[placeholder],[title]").forEach((el) => {
      for (const attr of ["placeholder", "title"]) {
        if (!el.hasAttribute(attr)) continue;
        const val = el.getAttribute(attr);
        if (el.dataset["i18nBackup" + attr] === undefined) {
          el.dataset["i18nBackup" + attr] = val;
        }
        const src = el.dataset["i18nBackup" + attr];
        const dict = attr === "placeholder" ? PH : TI;
        el.setAttribute(attr, lang === "tr" ? src : (dict[norm(src)] || src));
      }
    });
  }

  function walk(root) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let n;
    while ((n = w.nextNode())) translateNode(n);
  }

  function apply(root) {
    const scope = root || document.body;
    if (!scope) return;
    translateAttrs(scope);
    walk(scope);
    document.documentElement.lang = lang;
  }

  let observer = null;
  function startObserver() {
    if (observer) observer.disconnect();
    observer = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === "characterData") translateNode(m.target);
        else m.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) translateNode(node);
          else if (node.nodeType === Node.ELEMENT_NODE) apply(node);
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  async function setLang(next) {
    lang = next === "en" ? "en" : "tr";
    try {
      const cur = await chrome.storage.local.get("uiLang");
      if (cur.uiLang !== lang) await chrome.storage.local.set({ uiLang: lang });
    } catch (e) { /* yoksay */ }
    document.querySelectorAll("[data-lang-btn]").forEach((b) => {
      b.classList.toggle("active", b.dataset.langBtn === lang);
    });
    apply();
    startObserver();
    document.dispatchEvent(new CustomEvent("gp-lang-changed", { detail: { lang } }));
  }

  async function init() {
    let saved = "tr";
    try {
      const r = await chrome.storage.local.get("uiLang");
      saved = r.uiLang || (navigator.language || "").startsWith("en") ? (r.uiLang || "tr") : "tr";
      // sadece kayıtlı değer varsa ona uy; ilk açılışta Türkçe
      if (r.uiLang) saved = r.uiLang;
    } catch (e) { saved = "tr"; }
    document.querySelectorAll("[data-lang-btn]").forEach((b) => {
      b.addEventListener("click", () => setLang(b.dataset.langBtn));
    });
    await setLang(saved);
  }

  return { tr, apply, setLang, init, get lang() { return lang; } };
})();

window.gpTr = GP_LANG.tr;
window.GP_LANG = GP_LANG;
