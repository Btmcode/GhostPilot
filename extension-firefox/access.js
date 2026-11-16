/**
 * GhostPilot — access.js
 * Copyright (c) 2026 BTM Code — MIT License
 * https://btmcode.vercel.app
 * https://github.com/  ·  Açık kaynak. Telif bildirimini koruyun.
 */
/**
 * GhostPilot — Erişim Kapısı (Access Gate)
 * Kullanıcı istediği an TÜM yapay zekâ erişimini kesebilir:
 *   1) "open"        → AI serbest çalışır
 *   2) "read_only"   → AI sadece okur/analiz eder, Hiçbir tıklama/tuş gönderemez
 *   3) "locked"      → AI tamamen engelli (yerleşik ajan + MCP + daemon + Web AI köprüsü)
 * Ayrıca: zamanlı otomatik kilit (self-expiring grant), tek seferlik "onay iste" akışı,
 * sekme bazlı izin listesi ve tam denetim (audit) kaydı.
 *
 * Bu dosya hem background (importScripts) hem panel tarafından okunabilir.
 */

const ACCESS_LEVELS = {
  open: { label: "Tam Erişim", desc: "AI fare/klavye kontrolü serbest", rank: 2 },
  read_only: { label: "Sadece Okuma", desc: "AI ekran/DOM okur, müdahale edemez", rank: 1 },
  locked: { label: "Kilitli", desc: "AI erişimi tamamen kapalı", rank: 0 }
};

/**
 * Karar motoru — saf fonksiyon, test edilebilir.
 * @param {object} s            durum: {accessMode, accessExpiresAt, allowedTabIds}
 * @param {object} req          istek: {kind, tabId, domain}
 *   kind: "browser_input" | "browser_read" | "desktop_input" | "desktop_read" | "agent" | "config"
 * @returns {{allowed:boolean, reason:string, mode:string}}
 */
function checkAccess(s, req = {}) {
  const now = Date.now();
  let mode = s.accessMode || "open";
  let reason = "";

  // 1) Zamanlı izin süresi doldu mu? → otomatik kilitle (fail-closed)
  if (mode !== "locked" && s.accessExpiresAt && now > s.accessExpiresAt) {
    mode = "locked";
    reason = "Zamanlı erişim süresi doldu → otomatik kilitlendi.";
  }

  if (mode === "locked") {
    return { allowed: false, reason: reason || "Erişim kilitli (kullanıcı kapattı). Alt+Shift+X veya panelden açın.", mode };
  }

  const kind = req.kind || "browser_input";
  const isInput = kind === "browser_input" || kind === "desktop_input" || kind === "agent";

  // 2) Kilitli değilse bile: hangi sekme? Sekme izin listesi doluysa yalnızca o sekmeler
  if (req.tabId != null && Array.isArray(s.allowedTabIds) && s.allowedTabIds.length > 0) {
    if (!s.allowedTabIds.includes(Number(req.tabId))) {
      return { allowed: false, reason: `Sekme #${req.tabId} izin listesinde değil (yalnızca seçili sekmelere erişim açık).`, mode };
    }
  }

  // 3) Sadece-okuma modunda girdi (tıklama/tuş/sürükleme) yasak
  if (mode === "read_only" && isInput) {
    return { allowed: false, reason: "Sadece Okuma modu: AI girdi gönderemez (tıklama/tuş/sürükleme kapalı).", mode };
  }

  return { allowed: true, reason: "", mode };
}

/** Kalan süreyi insan diline çevirir. */
function formatRemaining(ms) {
  if (!ms || ms <= 0) return "süresiz";
  const totalMin = Math.ceil(ms / 60000);
  if (totalMin < 60) return `${totalMin} dk`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m ? `${h} sa ${m} dk` : `${h} sa`;
}

const ACCESS_MODES = ["open", "read_only", "locked"];
const ACCESS_DURATIONS = [0, 15, 30, 60, 240, 480]; // dakika; 0 = süresiz
