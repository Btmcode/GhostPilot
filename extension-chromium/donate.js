/**
 * GhostPilot — donate.js
 * Copyright (c) 2026 BTM Code — MIT License
 * https://btmcode.vercel.app  ·  https://github.com/btmcode
 *
 * Bağış penceresi mantığı:
 *   - ilk kurulumda 1 kez
 *   - sonra haftada en fazla 1 kez
 *   - "sustur" / "bir daha gösterme" seçenekleri
 */

const DONATE = {
  url: "https://buymeacoffee.com/devcloudpy",
  repo: "https://github.com/btmcode",
  WEEK_MS: 7 * 24 * 60 * 60 * 1000
};

const api = typeof browser !== "undefined" ? browser : chrome;
const $ = (id) => document.getElementById(id);

// Arayüz metinleri (TR kaynak → EN karşılığı)
const DONATE_I18N = {
  en: {
    "GhostPilot'u beğendiniz mi?": "Enjoying GhostPilot?",
    "Tamamen ücretsiz, açık kaynak ve reklamsız. Telemetri yok, ücretli katman yok.":
      "Completely free, open source and ad-free. No telemetry, no paid tier.",
    "Bir kahve ısmarlar mısınız?": "Would you buy me a coffee?",
    "Her kahve, yeni özellikler ve hata düzeltmeleri için motivasyon oluyor.":
      "Every coffee fuels new features and bug fixes.",
    "☕ Buy me a coffee": "☕ Buy me a coffee",
    "Destek olmak istemiyor musunuz? Sorun değil — bunlar da değerli:":
      "Rather not donate? No problem — these help too:",
    "GitHub'da yıldız ver": "Star on GitHub",
    "Sonra hatırlat": "Remind me later",
    "Bir hafta gösterme": "Don't show for a week",
    "Bir daha gösterme": "Never show again",
    "© 2026 BTM Code · MIT lisansı · hiçbir telemetri yok":
      "© 2026 BTM Code · MIT licensed · zero telemetry",
    "Kapandı. Teşekkürler!": "Closed. Thank you!",
    "Bir hafta sonra tekrar soracağız.": "We'll ask again in a week.",
    "Bir daha göstermeyeceğiz. Teşekkürler!": "We won't show this again. Thank you!"
  }
};

let LANG = "tr";

async function loadLang() {
  try {
    const r = await api.storage.local.get("uiLang");
    return r.uiLang === "en" ? "en" : "tr";
  } catch (e) { return "tr"; }
}

function t(trText) {
  if (LANG === "tr") return trText;
  return DONATE_I18N.en[trText] || trText;
}

function applyLang() {
  document.documentElement.lang = LANG;
  // id'si olan başlık/paragraf ve span'ları çevir (kaynak TR)
  const map = [
    ["dTitle", "GhostPilot'u beğendiniz mi?"],
    ["dSub", "Tamamen ücretsiz, açık kaynak ve reklamsız. Telemetri yok, ücretli katman yok."],
    ["dAsk", "Bir kahve ısmarlar mısınız?"],
    ["dWhy", "Her kahve, yeni özellikler ve hata düzeltmeleri için motivasyon oluyor."],
    ["dDonate", "☕ Buy me a coffee"],
    ["dFreeTitle", "Destek olmak istemiyor musunuz? Sorun değil — bunlar da değerli:"],
    ["dStar", "GitHub'da yıldız ver"],
    ["dLater", "Sonra hatırlat"],
    ["dMuteWeek", "Bir hafta gösterme"],
    ["dMuteForever", "Bir daha gösterme"],
    ["dFoot", "© 2026 BTM Code · MIT lisansı · hiçbir telemetri yok"]
  ];
  for (const [id, src] of map) {
    const el = $(id);
    if (el) el.textContent = t(src);
  }
  document.title = LANG === "en" ? "GhostPilot · Support" : "GhostPilot · Destek";
}

function openExternal(url) {
  try {
    if (api.tabs && api.tabs.create) { api.tabs.create({ url }); return; }
  } catch (e) { /* düş */ }
  window.open(url, "_blank", "noopener");
}

async function markSeen(patch) {
  try {
    const cur = await api.storage.local.get("donate");
    const d = cur.donate || {};
    await api.storage.local.set({
      donate: { ...d, lastShownAt: Date.now(), ...patch }
    });
  } catch (e) { /* yoksay */ }
}

async function closeSelf() {
  // 1) En güvenilir: bu sekmenin kendisini kapat
  try {
    const tab = await api.tabs.getCurrent();
    if (tab && tab.id != null) {
      await api.tabs.remove(tab.id);
      return;
    }
  } catch (e) { /* düş */ }

  // 2) Popup penceresi olarak açıldıysa pencereyi kapat
  try {
    const w = await api.windows.getCurrent();
    await api.windows.remove(w.id);
    return;
  } catch (e) { /* düş */ }

  // 3) Son çare: script'in açtığı pencere
  try { window.close(); } catch (e) { /* düş */ }
}

// ---------------------------------------------------------------- olaylar
document.addEventListener("DOMContentLoaded", async () => {
  LANG = await loadLang();
  applyLang();

  $("btnDonate").addEventListener("click", async () => {
    openExternal(DONATE.url);
    await markSeen({ shownCount: ((await getCount()) + 1) });
    setTimeout(closeSelf, 350);
  });

  $("btnStar").addEventListener("click", async () => {
    openExternal(DONATE.repo);
    await markSeen({});
    setTimeout(closeSelf, 350);
  });

  // "Sonra hatırlat" → bir hafta ertele (sustur değil, sadece erteler)
  $("btnLater").addEventListener("click", async () => {
    await markSeen({ snoozeUntil: Date.now() + DONATE.WEEK_MS });
    closeSelf();
  });

  // Bir hafta gösterme → 7 gün boyunca hiç açılmaz
  $("btnMuteWeek").addEventListener("click", async () => {
    await markSeen({ mutedUntil: Date.now() + DONATE.WEEK_MS });
    closeSelf();
  });

  // Bir daha gösterme → kalıcı sustur
  $("btnMuteForever").addEventListener("click", async () => {
    await markSeen({ mutedForever: true });
    closeSelf();
  });

  $("btnClose").addEventListener("click", async () => {
    await markSeen({});
    closeSelf();
  });

  // Esc ile kapat
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { markSeen({}); closeSelf(); }
  });
});

async function getCount() {
  try {
    const r = await api.storage.local.get("donate");
    return (r.donate && r.donate.shownCount) || 0;
  } catch (e) { return 0; }
}
