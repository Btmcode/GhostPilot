/**
 * GhostPilot — panel.js
 * Copyright (c) 2026 BTM Code — MIT License
 * https://btmcode.vercel.app
 * https://github.com/  ·  Açık kaynak. Telif bildirimini koruyun.
 */
/**
 * GhostPilot Panel — sade akış:
 *   1) Sağlayıcı kartına dokun → 2) Giriş yap / anahtar gir → 3) Otomatik ve kalıcı kaydet
 */
(() => {
  const api = typeof browser !== "undefined" ? browser : chrome;
  const $ = (id) => document.getElementById(id);

  function sendBg(payload) {
    return new Promise((resolve) => {
      api.runtime.sendMessage(payload, (res) => {
        void api.runtime.lastError;
        resolve(res || { ok: false });
      });
    });
  }

  // ---------------------------------------------------------------- presets
  // SADECE ÜCRETSİZ / YEREL SAĞLAYICILAR (ücretli sağlayıcılar kaldırıldı)
  const PROVIDER_PRESETS = {
    gemini: { name: "Google Gemini", kind: "oauth", baseUrl: "https://generativelanguage.googleapis.com/v1beta", model: "gemini-3.8-flash", vision: true, keyHint: "AIza..." },
    gemini_oa: { name: "Gemini (OpenAI uyumlu)", kind: "manual", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-3.8-flash", vision: true, keyHint: "AIza..." },
    openrouter: { name: "OpenRouter", kind: "oauth", baseUrl: "https://openrouter.ai/api/v1", model: "google/gemini-3.8-flash:free", vision: true, keyHint: "sk-or-v1-..." },
    groq: { name: "Groq", kind: "manual", baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile", vision: false, keyHint: "gsk_..." },
    xkiro: { name: "xKiro", kind: "manual", baseUrl: "https://api.xkiro.com/v1", model: "mistralai/mistral-medium-3.5", vision: true, keyHint: "sk-xt-..." },
    modelscope: { name: "ModelScope", kind: "manual", baseUrl: "https://api-inference.modelscope.cn/v1", model: "Qwen/Qwen2.5-72B-Instruct", vision: false, keyHint: "ModelScope token" },
    ollama: { name: "Ollama (yerel)", kind: "none", baseUrl: "http://127.0.0.1:11434/v1", model: "qwen2.5:7b", vision: false, keyHint: "(anahtar gerekmez)" },
    lmstudio: { name: "LM Studio (yerel)", kind: "none", baseUrl: "http://127.0.0.1:1234/v1", model: "local-model", vision: false, keyHint: "(anahtar gerekmez)" },
    llamacpp: { name: "llama.cpp (yerel)", kind: "none", baseUrl: "http://127.0.0.1:8080/v1", model: "local-model", vision: false, keyHint: "(anahtar gerekmez)" },
    custom: { name: "Özel uç nokta", kind: "manual", baseUrl: "", model: "", vision: false, keyHint: "API anahtarı" }
  };;

  const PROVIDER_KEY_PAGES = {
    xkiro: "https://xkiro.com/register",
    openai: "https://platform.openai.com/api-keys",
    anthropic: "https://console.anthropic.com/settings/keys",
    gemini: "https://aistudio.google.com/apikey",
    gemini_oa: "https://aistudio.google.com/apikey",
    openrouter: "https://openrouter.ai/keys",
    groq: "https://console.groq.com/keys",
    deepseek: "https://platform.deepseek.com/api_keys",
    together: "https://api.together.xyz/settings/api-keys",
    mistral: "https://console.mistral.ai/api-keys",
    cohere: "https://dashboard.cohere.com/api-keys",
    azure: "https://portal.azure.com/#create/Microsoft.CognitiveServicesOpenAI",
    xai: "https://console.x.ai",
    perplexity: "https://www.perplexity.ai/settings/api",
    fireworks: "https://fireworks.ai/api-keys",
    anyscale: "https://app.endpoints.anyscale.com/credentials",
    qwen: "https://bailian.console.alibabacloud.com/",
    qwen_intl: "https://modelstudio.console.alibabacloud.com/",
    kimi: "https://platform.moonshot.cn/console/api-keys",
    kimi_intl: "https://platform.moonshot.ai/console/api-keys",
    zhipu: "https://open.bigmodel.cn/usercenter/apikeys",
    zhipu_intl: "https://z.ai/manage-apikey/apikey-list",
    doubao: "https://console.volcengine.com/ark",
    hunyuan: "https://console.cloud.tencent.com/hunyuan/api-key",
    minimax: "https://platform.minimaxi.com/user-center/basic-information/interface-key",
    minimax_intl: "https://platform.minimax.io/user-center/basic-information/interface-key",
    ernie: "https://console.bce.baidu.com/iam/#/iam/apikey/list",
    siliconflow: "https://cloud.siliconflow.cn/account/ak",
    siliconflow_intl: "https://cloud.siliconflow.com/account/ak",
    modelscope: "https://www.modelscope.cn/my/myaccesstoken",
    yi: "https://platform.lingyiwanwu.com/apikeys",
    baichuan: "https://platform.baichuan-ai.com/console/apikey",
    stepfun: "https://platform.stepfun.com/interface-key",
    sakana: "https://console.sakana.ai",
    plamo: "https://console.platform.preferredai.jp/",
    sarashina: "https://sarashina.ai",
    ollama: "https://ollama.com/download",
    lmstudio: "https://lmstudio.ai",
    llamacpp: "https://github.com/ggml-org/llama.cpp",
    custom: ""
  };

  const FREE_IDS = new Set(["gemini", "gemini_oa", "openrouter", "groq", "xkiro", "modelscope", "ollama", "lmstudio", "llamacpp"]);

  // ---------------------------------------------------------------- state
  let state = {
    provider: null,          // seçili sağlayıcı id
    keys: {},                // kayıtlı anahtarlar
    activeProvider: null,
    identityAvailable: false,
    googleClientId: ""
  };

  // ---------------------------------------------------------------- helpers
  function showResult(cls, text, actions) {
    const el = $("aiTestResult");
    el.className = `ai-test-result show ${cls}`;
    el.textContent = gpTr(text);
    if (Array.isArray(actions) && actions.length) {
      const row = document.createElement("div");
      row.className = "ai-test-actions";
      for (const a of actions) {
        const b = document.createElement("button");
        b.className = "btn-mini";
        b.textContent = gpTr(a.label);
        b.onclick = a.onClick;
        row.appendChild(b);
      }
      el.appendChild(row);
    }
  }

  function errorActionsFor(msg) {
    const m = String(msg || "");
    const acts = [];
    if (/KREDİ KALMADI|quota|billing|kredi/i.test(m)) {
      acts.push({
        label: "🎁 Ücretsiz Gemini'ye geç",
        onClick: () => { selectProvider("gemini"); }
      });
      acts.push({
        label: "🦙 Ollama (yerel, bedava)",
        onClick: () => { selectProvider("ollama"); }
      });
      const bill = {
        openai: "https://platform.openai.com/settings/organization/billing",
        anthropic: "https://console.anthropic.com/settings/billing",
        openrouter: "https://openrouter.ai/settings/credits"
      }[state.provider];
      if (bill) acts.push({ label: "💳 Kredi sayfası", onClick: () => api.tabs.create({ url: bill }) });
    } else if (/modeli bulunamadı|model_not_found|artık kullanılmıyor|no longer available|API Hatası \(404\)|bulunamadı/i.test(m)) {
      acts.push({ label: "🪄 Modeli otomatik düzelt", onClick: () => autoFixModel() });
      acts.push({ label: "📋 Modelleri getir", onClick: () => $("btnListModels").click() });
    }
    return acts;
  }

  // Kayıttan sonra modeli sessizce doğrula; geçersizse kendiliğinden düzelt
  async function checkModelAfterSave() {
    try {
      const r = await sendBg({ type: "ENSURE_MODEL" });
      if (r.ok && r.result && r.result.changed) {
        $("cfgAiModel").value = r.result.model;
        await refreshKeys();
        showResult("ok",
          `✓ Anahtar kaydedildi. Model otomatik güncellendi → <b>${r.result.model}</b> (artık kalıcı).`);
      }
    } catch (_) { /* sessiz: kayıt yine de başarılı */ }
  }

  // Model adı geçersizse doğru modeli bul, kaydet, formu güncelle
  async function autoFixModel() {
    showResult("info", "🪄 Çalışan model aranıyor… (birkaç saniye)");
    try {
      const r = await sendBg({ type: "ENSURE_MODEL" });
      if (!r.ok) throw new Error(r.error || "Model bulunamadı");
      const res = r.result;
      await refreshKeys();
      $("cfgAiModel").value = res.model;
      if (res.changed) {
        showResult("ok", `✓ Model otomatik düzeltildi: <b>${res.model}</b> — kalıcı olarak kaydedildi. Artık bu ayarla çalışacak.`);
      } else {
        showResult("ok", `✓ Model zaten doğru: <b>${res.model}</b>`);
      }
    } catch (err) {
      let msg = String(err.message || err);
      if (/bulunamadı/i.test(msg)) {
        msg = `${msg}<br><br>💡 <b>Öneri:</b> Anahtarınız geçerli mi kontrol edin veya ücretsiz bir sağlayıcıya geçin.`;
      }
      showResult("err", msg);
    }
  }

  function openUrl(url) {
    if (!url) return;
    try { api.tabs.create({ url }); } catch (_) { window.open(url, "_blank"); }
  }

  // ---------------------------------------------------------------- provider select
  function markCards() {
    document.querySelectorAll(".pcard").forEach((c) => {
      c.classList.toggle("selected", c.dataset.provider === state.provider);
      c.classList.toggle("connected", !!state.keys[c.dataset.provider]);
    });
  }

  // Kimlik API'si yoksa adım adım çözüm göster
  function showIdentityDiag(reason, redirect) {
    const box = $("identityDiag");
    box.style.display = "";
    box.innerHTML = `
      <div class="step-title">⚠️ Otomatik giriş çalışmıyor — nasıl düzelteceksiniz:</div>
      <ol>
        <li><b>chrome://extensions</b> açın</li>
        <li>GhostPilot kartında <b>Kaldır</b>'a basın</li>
        <li><b>Paketlenmiş öğe yükle</b> → <code>extension-chromium</code> klasörünü seçin</li>
        <li>Paneli kapatıp 👻 simgesine yeniden tıklayın</li>
      </ol>
      <div style="margin-top:6px;opacity:.8;font-size:10px">Sebep: ${reason || "identity API bulunamadı"}${redirect ? ` · redirect: ${redirect}` : ""}</div>
    `;
    const alt = document.createElement("button");
    alt.textContent = gpTr("🔑 Bunun yerine elle anahtar gireyim");
    alt.onclick = () => {
      const url = PROVIDER_KEY_PAGES[state.provider] || PROVIDER_KEY_PAGES.gemini;
      openUrl(url);
      showResult("info", "Anahtar sayfası açıldı. Anahtarı kopyalayıp aşağıdaki kutuya yapıştırın ve 💾 Kaydet'e basın — otomatik giriş olmadan da her şey çalışır.");
    };
    box.appendChild(alt);
  }

  async function selectProvider(id, opts = {}) {
    const preset = PROVIDER_PRESETS[id];
    if (!preset) return;
    state.provider = id;

    await sendBg({ type: "SET_ACTIVE_PROVIDER", provider: id });

    // form alanlarını doldur (depodaki değer varsa onu kullan)
    const saved = state.keys[id];
    $("cfgAiApiKey").value = "";
    $("cfgAiApiKey").placeholder = preset.keyHint || "Anahtar";
    $("cfgAiModel").value = (saved && saved.model) || preset.model || "";
    $("cfgAiBaseUrl").value = preset.baseUrl || "";
    $("cfgAiVision").checked = !!preset.vision;
    $("modelSelect").style.display = "none";

    // mod: oauth / manual / none
    const kind = preset.kind;
    $("oauthRow").style.display = kind === "oauth" ? "" : "none";
    $("googleClientRow").style.display = id === "gemini" ? "" : "none";
    $("manualRow").style.display = kind === "none" ? "none" : "";

    $("connectTitle").textContent = `${preset.name} bağlantısı`;
    $("connectHint").textContent =
      kind === "none"
        ? "Bu yerel sağlayıcı anahtar istemez. Uygulamanın açık olduğundan emin olun."
        : kind === "oauth"
          ? "Tek tıkla giriş yapın; anahtar otomatik kaydedilir."
          : "Anahtarınızı yapıştırın ve Kaydet'e basın — kalıcı saklanır.";

    if (kind === "oauth" && !state.identityAvailable) {
      $("btnOAuth").disabled = true;
      $("btnOAuth").textContent = gpTr("🔐 Otomatik giriş kullanılamıyor");
      showIdentityDiag("", "");
    }

    if (saved) {
      showResult("ok", `✓ Bu sağlayıcı için kayıtlı anahtar var (${saved.preview}). Kullanmak için "Bağlantıyı Test Et"e basın.`);
    } else {
      $("aiTestResult").className = "ai-test-result";
    }
    $("workProviderHint").textContent = `Aktif: ${preset.name}`;
    markCards();
    if (opts.autoOAuth && kind === "oauth") startOAuth();
  }

  document.querySelectorAll(".pcard").forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.dataset.provider;
      selectProvider(id);
      // Yerel sağlayıcı seçildiyse hemen durumunu tazele
      if (id === "ollama" || id === "lmstudio" || id === "llamacpp") checkLocalServers(true);
      if (id === "xkiro") loadXkiroFreeModels();
    });
  });

  $("btnRescanLocal")?.addEventListener("click", () => checkLocalServers(true));

  // ---------------------------------------------------------------- all providers list
  const groups = [
    { label: "☁️ Ücretsiz bulut", ids: ["gemini", "gemini_oa", "openrouter", "groq", "xkiro", "modelscope"] },
    { label: "💻 Yerel (bedava, veri dışarı çıkmaz)", ids: ["ollama", "lmstudio", "llamacpp"] },
    { label: "🔧 Diğer", ids: ["custom"] }
  ];

  function buildProviderSelect() {
    const sel = $("cfgAiProvider");
    sel.innerHTML = "";
    for (const g of groups) {
      const og = document.createElement("optgroup");
      og.label = g.label;
      for (const id of g.ids) {
        const o = document.createElement("option");
        o.value = id;
        o.textContent = PROVIDER_PRESETS[id].name + (FREE_IDS.has(id) ? " · ücretsiz" : "");
        og.appendChild(o);
      }
      sel.appendChild(og);
    }
  }

  $("btnShowAll").addEventListener("click", () => {
    const box = $("allProvidersBox");
    const open = box.style.display === "none";
    box.style.display = open ? "" : "none";
    $("btnShowAll").textContent = open
      ? "− Listeyi kapat"
      : "＋ Diğer sağlayıcılar (yerel · özel uç nokta)";
    if (open && state.provider) $("cfgAiProvider").value = state.provider;
  });

  $("providerSearch").addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase().trim();
    const sel = $("cfgAiProvider");
    sel.innerHTML = "";
    for (const g of groups) {
      const og = document.createElement("optgroup");
      og.label = g.label;
      let n = 0;
      for (const id of g.ids) {
        const p = PROVIDER_PRESETS[id];
        const hay = `${p.name} ${id} ${g.label}`.toLowerCase();
        if (q && !hay.includes(q)) continue;
        const o = document.createElement("option");
        o.value = id;
        o.textContent = p.name + (FREE_IDS.has(id) ? " · ücretsiz" : "");
        og.appendChild(o);
        n++;
      }
      if (n) sel.appendChild(og);
    }
  });

  $("btnPickFromList").addEventListener("click", () => {
    const id = $("cfgAiProvider").value;
    if (!id) return;
    selectProvider(id);
    $("allProvidersBox").style.display = "none";
    $("btnShowAll").textContent = gpTr("＋ Diğer sağlayıcılar (yerel · özel uç nokta)");
  });

  // ---------------------------------------------------------------- key save / clear
  async function saveKey() {
    const id = state.provider;
    if (!id) { showResult("err", "Önce bir sağlayıcı seçin."); return; }
    const key = $("cfgAiApiKey").value.trim();
    const preset = PROVIDER_PRESETS[id];
    if (preset.kind !== "none" && !key) {
      showResult("err", "Anahtar boş. Yapıştırın veya 🔑 Anahtarı nereden alacağım? bağlantısını kullanın.");
      return;
    }
    const btn = $("btnSaveKey");
    btn.disabled = true;
    btn.textContent = "⏳";

    const res = await sendBg({
      type: "SAVE_PROVIDER_KEY",
      provider: id,
      patch: {
        apiKey: key,
        model: $("cfgAiModel").value.trim() || preset.model,
        baseUrl: preset.baseUrl,
        source: "manual"
      }
    });

    btn.disabled = false;
    btn.textContent = gpTr("💾 Kaydet");
    if (res.ok) checkModelAfterSave();

    if (res.ok) {
      await refreshKeys();
      $("cfgAiApiKey").value = "";
      showResult("ok", `✓ ${preset.name} anahtarı kaydedildi — kalıcı olarak saklandı. "Bağlantıyı Test Et"e basın.`);
    } else {
      showResult("err", `❌ ${res.error || "Kaydedilemedi."}`);
    }
  }

  $("btnSaveKey").addEventListener("click", saveKey);
  $("cfgAiApiKey").addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveKey();
  });

  $("btnClearKey").addEventListener("click", async () => {
    if (!state.provider) return;
    if (!confirm(`${PROVIDER_PRESETS[state.provider].name} için kayıtlı anahtar silinsin mi?`)) return;
    await sendBg({ type: "CLEAR_PROVIDER_KEY", provider: state.provider });
    await refreshKeys();
    showResult("info", "Kayıtlı anahtar silindi.");
  });

  $("btnGetKey").addEventListener("click", () => {
    const url = PROVIDER_KEY_PAGES[state.provider];
    if (!url) { showResult("info", "Bu sağlayıcı için anahtar sayfası yok."); return; }
    openUrl(url);
    showResult("info", "Anahtar sayfası yeni sekmede açıldı. Anahtarı kopyalayıp buradaki kutuya yapıştırın.");
  });

  // ---------------------------------------------------------------- OAuth
  async function startOAuth() {
    const id = state.provider;
    const btn = $("btnOAuth");
    if (id === "gemini") {
      const cid = $("cfgGoogleClientId").value.trim();
      if (cid) await sendBg({ type: "SAVE_CONFIG", patch: { googleClientId: cid } });
    }
    btn.disabled = true;
    const old = btn.textContent;
    btn.textContent = gpTr("⏳ Giriş penceresi açılıyor…");
    showResult("info", "🔄 Tarayıcıda giriş penceresi açıldı — hesabınızla giriş yapıp izin verin.");

    const res = await sendBg({ type: "START_OAUTH", provider: id });
    btn.disabled = false;
    btn.textContent = old;

    if (res.ok && res.result) {
      const r = res.result;
      await refreshKeys();
      if (r.permanent) {
        showResult("ok", `✓ ${r.provider}: kalıcı anahtar alındı ve kaydedildi. "Bağlantıyı Test Et"e basın.`);
      } else {
        showResult("ok", `✓ ${r.provider}: erişim jetonu alındı (~${Math.round((r.expiresIn || 3600) / 60)} dk). Süre bitince aynı düğmeye tekrar basın.`);
      }
    } else {
      const msg = res.error || "Otomatik giriş başarısız.";
      showResult("err", `❌ ${msg}`, /İstemci Kimliği/i.test(msg) ? [] : errorActionsFor(msg));
    }
  }

  $("btnOAuth").addEventListener("click", startOAuth);
  $("cfgGoogleClientId").addEventListener("change", async () => {
    await sendBg({ type: "SAVE_CONFIG", patch: { googleClientId: $("cfgGoogleClientId").value.trim() } });
  });

  // ---------------------------------------------------------------- key list
  async function refreshKeys() {
    const res = await sendBg({ type: "GET_PROVIDER_KEYS" });
    if (!res.ok) return;
    state.keys = res.result.keys || {};
    state.activeProvider = res.result.activeProvider || null;

    const box = $("keyList");
    box.innerHTML = "";
    const ids = Object.keys(state.keys);
    if (!ids.length) {
      box.innerHTML = '<div class="empty">Bağlı hesap yok. Yukarıdan bir sağlayıcı seçin.</div>';
    } else {
      const head = document.createElement("div");
      head.className = "keylist-head";
      const wipe = document.createElement("button");
      wipe.textContent = `🗑 Hepsini sil (${ids.length})`;
      wipe.onclick = async () => {
        if (!confirm(`Kayıtlı ${ids.length} anahtarın TAMAMI silinsin mi?\n\nBu işlem geri alınamaz.`)) return;
        for (const id of ids) await sendBg({ type: "CLEAR_PROVIDER_KEY", provider: id });
        await refreshKeys();
        showResult("info", "Tüm anahtarlar silindi.");
      };
      head.appendChild(wipe);
      box.appendChild(head);
      for (const id of ids) {
        const k = state.keys[id];
        const preset = PROVIDER_PRESETS[id] || { name: id };
        const expired = k.expiresAt && Date.now() > k.expiresAt;
        const row = document.createElement("div");
        row.className = "keyitem" + (id === state.activeProvider ? " active" : "");

        const body = document.createElement("div");
        body.className = "ki-body";
        const name = document.createElement("div");
        name.className = "ki-name";
        name.textContent = preset.name;
        const meta = document.createElement("div");
        meta.className = "ki-meta";
        const when = k.savedAt ? new Date(k.savedAt).toLocaleDateString("tr-TR") : "";
        meta.textContent = `${k.preview} · ${k.model || ""}${when ? " · " + when : ""}${expired ? " · süresi doldu" : ""}${k.source === "oauth" ? " · otomatik" : ""}`;
        body.appendChild(name);
        body.appendChild(meta);
        row.appendChild(body);

        if (id === state.activeProvider) {
          const tag = document.createElement("span");
          tag.className = "tag-active";
          tag.textContent = gpTr("AKTİF");
          row.appendChild(tag);
        } else {
          const useBtn = document.createElement("button");
          useBtn.className = "use";
          useBtn.textContent = gpTr("Kullan");
          useBtn.onclick = () => selectProvider(id);
          row.appendChild(useBtn);
        }

        // 🗑 Sil — tek tık onay, ikinci tık siler
        const del = document.createElement("button");
        del.className = "del";
        del.title = k.local ? `${preset.name} bağlantısını kaldır` : `${preset.name} anahtarını sil`;
        del.textContent = "🗑";
        del.onclick = async (ev) => {
          ev.stopPropagation();
          if (!del.classList.contains("confirm")) {
            del.classList.add("confirm");
            del.textContent = gpTr("Silinsin mi?");
            setTimeout(() => {
              if (del.isConnected) { del.classList.remove("confirm"); del.textContent = "🗑"; }
            }, 4000);
            return;
          }
          await sendBg({ type: "CLEAR_PROVIDER_KEY", provider: id });
          await refreshKeys();
          showResult("info", k.local ? `${preset.name} bağlantısı kaldırıldı.` : `${preset.name} anahtarı silindi.`);
        };
        row.appendChild(del);

        box.appendChild(row);
      }
    }

    // aktif model rozeti
    const activeId = state.activeProvider;
    $("activeModelPill").textContent = activeId
      ? (PROVIDER_PRESETS[activeId] || { name: activeId }).name
      : "AI seçilmedi";
    $("activeModelPill").title = activeId ? `Aktif: ${PROVIDER_PRESETS[activeId]?.name}` : "Yapay zekâ seçilmedi";

    markCards();
  }

  // ---------------------------------------------------------------- xKiro ücretsiz modeller
  // API'ye ulaşılamazsa kullanılacak yedek liste (16 Kasım 2026 itibarıyla 26 ücretsiz model)
  const XKIRO_FREE_FALLBACK = [
    "cohere/command-a-plus", "cohere/command-a-reasoning", "cohere/command-a",
    "sensenova/sensenova-6.8-flash-lite", "mistralai/ministral-14b", "cohere/north-mini-code",
    "mistralai/mistral-large-2512", "mistralai/mistral-medium-3.5", "mistralai/mistral-small-2603",
    "mistralai/devstral-medium", "mistralai/codestral-2508", "mistralai/ministral-8b",
    "stealth/big-pickle", "cohere/command-r7b-12-2024", "cohere/command-r-08-2024",
    "mistralai/ministral-3b", "cohere/command-r-plus-08-2024", "cohere/command-a-translate",
    "cohere/tiny-aya-earth", "cohere/tiny-aya-global", "cohere/tiny-aya-fire",
    "cohere/tiny-aya-water", "cohere/aya-expanse-32b", "cohere/command-a-vision",
    "cohere/north-small-translate", "cohere/aya-vision-32b"
  ];

  let xkiroCache = null;
  async function loadXkiroFreeModels() {
    if (xkiroCache) { applyXkiroModels(xkiroCache); return; }
    try {
      const r = await fetch("https://api.xkiro.com/v1/models");
      if (!r.ok) return;
      const data = await r.json();
      const free = (data.data || [])
        .filter((m) => m.access_tier === "free" && m.modality !== "image")
        .map((m) => ({
          id: m.id,
          name: m.display_name || m.id,
          vision: !!(m.capabilities && m.capabilities.vision),
          tools: !!(m.capabilities && m.capabilities.tools),
          ctx: m.context_length || 0
        }))
        .sort((a, b) => (b.tools - a.tools) || (b.ctx - a.ctx));
      xkiroCache = free;
      applyXkiroModels(free);
    } catch (_) {
      // Ağ yoksa yedek liste
      xkiroCache = XKIRO_FREE_FALLBACK.map((id) => ({ id, name: id, vision: false, tools: true, ctx: 0 }));
      applyXkiroModels(xkiroCache, true);
    }
  }

  function applyXkiroModels(free, offline = false) {
    if (!free || !free.length) return;
    const sel = $("modelSelect");
    sel.innerHTML = "";
    const o0 = document.createElement("option");
    o0.value = "";
    o0.textContent = `— ${free.length} ücretsiz model —`;
    sel.appendChild(o0);
    for (const m of free) {
      const o = document.createElement("option");
      o.value = m.id;
      // 32k altı bağlam: ajan görevleri için yetersiz olabilir
      const short = m.ctx && m.ctx < 32000 ? " · ⚠️ kısa bağlam" : "";
      o.textContent = `${m.name}${m.vision ? " 👁" : ""}${m.tools ? " 🛠" : ""}${short}`;
      sel.appendChild(o);
    }
    sel.style.display = "";
    const good = free.filter((m) => !m.ctx || m.ctx >= 128000);
    showResult("info",
      `xKiro: <b>${free.length} ücretsiz model</b> (kredi gerektirmez)` +
      (offline ? " — çevrimdışı yedek liste" : "") + `.<br>` +
      `🤖 Ajan için en uygun: <b>mistralai/mistral-medium-3.5</b> · ` +
      `<b>cohere/command-a-plus</b> · <b>mistralai/mistral-small-2603</b>` +
      (good.length ? `<br><small>${good.length} model 128k+ bağlam sunuyor; küçük modeller (⚠️) uzun sayfalarda zorlanır.</small>` : ""));
  }

  // ---------------------------------------------------------------- Ollama / yerel algılama
  async function checkLocalServers(interactive = false) {
    const res = await sendBg({ type: "DETECT_LOCAL" });
    const found = (res.ok && res.result ? res.result.found : res.found) || [];
    const ollama = found.find((f) => f.id === "ollama");
    const banner = $("ollamaBanner");
    const hint = $("ollamaCardHint");
    const badge = $("ollamaCardBadge");

    if (ollama && ollama.models && ollama.models.length) {
      const best = pickBestLocalModel(ollama.models);
      banner.className = "ollama-banner";
      banner.style.display = "";
      banner.innerHTML = `
        <span class="ob-text">🦙 <b>Ollama bulundu</b> — ${ollama.models.length} model yüklü.
        Önerilen: <b>${best}</b></span>`;
      const yes = document.createElement("button");
      yes.textContent = gpTr("Bağlan");
      yes.onclick = () => connectLocal("ollama", best);
      banner.appendChild(yes);
      if (hint) hint.textContent = `${ollama.models.length} model hazır · bağlanmaya hazır`;
      if (badge) { badge.textContent = gpTr("HAZIR"); badge.className = "pcard-badge free"; }
    } else if (ollama) {
      banner.className = "ollama-banner missing";
      banner.style.display = "";
      banner.innerHTML = `<span class="ob-text">🦙 Ollama çalışıyor ama <b>yüklü model yok</b>.
        Terminalde <code>ollama pull qwen2.5:7b</code> çalıştırın.</span>`;
      if (hint) hint.textContent = gpTr("Çalışıyor · model yüklü değil");
    } else {
      // Diğer yerel sunucular
      const other = found.find((f) => f.id !== "ollama");
      if (other) {
        banner.className = "ollama-banner";
        banner.style.display = "";
        banner.innerHTML = `<span class="ob-text">🖥️ <b>${other.name} bulundu</b> — ${other.models.length} model.</span>`;
        const yes = document.createElement("button");
        yes.textContent = gpTr("Bağlan");
        yes.onclick = () => connectLocal(other.id, pickBestLocalModel(other.models));
        banner.appendChild(yes);
        if (hint) hint.textContent = `${other.name} hazır`;
      } else if (interactive) {
        banner.className = "ollama-banner missing";
        banner.style.display = "";
        banner.innerHTML = `<span class="ob-text">Ollama bulunamadı. Kurmak için
          <b>ollama.com/download</b> — kurulumdan sonra bu paneli yenileyin.</span>`;
        const how = document.createElement("button");
        how.className = "ghost";
        how.textContent = gpTr("İndir");
        how.onclick = () => openUrl("https://ollama.com/download");
        banner.appendChild(how);
      } else {
        banner.style.display = "none";
      }
    }
    return found;
  }

  function pickBestLocalModel(models) {
    if (!models || !models.length) return "";
    const score = (n) => {
      const t = String(n).toLowerCase();
      let v = 0;
      if (/qwen2\.5|qwen3/.test(t)) v += 40;
      if (/llama3\.3|llama-3\.3|llama3\.1/.test(t)) v += 35;
      if (/deepseek/.test(t)) v += 30;
      if (/mistral|mixtral/.test(t)) v += 22;
      if (/gemma/.test(t)) v += 18;
      if (/coder|instruct|chat/.test(t)) v += 10;
      const big = t.match(/(\d+)b/);
      if (big) v += Math.min(Number(big[1]), 24) / 8;
      if (/embed/.test(t)) v -= 100;
      return v;
    };
    return [...models].sort((a, b) => score(b) - score(a))[0];
  }

  async function connectLocal(provider, model) {
    showResult("info", "⏳ Yerel sunucuya bağlanılıyor…");
    const res = await sendBg({ type: "CONNECT_LOCAL", provider, model });
    if (!res.ok) {
      showResult("err", `❌ ${res.error || "Bağlanamadı"}`);
      return;
    }
    const r = res.result;
    await refreshKeys();
    await selectProvider(provider);
    $("cfgAiModel").value = r.model;
    showResult("ok",
      `✓ <b>${r.name}</b> bağlandı — model: <b>${r.model}</b><br>` +
      `Anahtar gerekmez, veri bilgisayarınızdan çıkmaz. Artık görev başlatabilirsiniz.`);
  }

  // ---------------------------------------------------------------- model list
  $("btnListModels").addEventListener("click", async () => {
    const btn = $("btnListModels");
    // xKiro: ücretsiz/ücretli ayrımıyla göster
    if (state.provider === "xkiro" || state.provider === "xkiro_an") {
      btn.disabled = true;
      showResult("info", "🔄 xKiro model kataloğu alınıyor…");
      try {
        const r = await fetch("https://api.xkiro.com/v1/models");
        const data = await r.json();
        const all = (data.data || []).filter((m) => m.modality !== "image");
        const sel = $("modelSelect");
        sel.innerHTML = "";
        const tiers = [
          ["free", "🟢 ÜCRETSİZ (kart istemez)"],
          ["premium", "🔵 Plan dahilinde"],
          ["paid", "⚪ Kredi ile"]
        ];
        let total = 0;
        for (const [tier, label] of tiers) {
          const list = all.filter((m) => m.access_tier === tier);
          if (!list.length) continue;
          const og = document.createElement("optgroup");
          og.label = `${label} — ${list.length} model`;
          for (const m of list.sort((a, b) => (b.context_length || 0) - (a.context_length || 0))) {
            const o = document.createElement("option");
            o.value = m.id;
            const c = m.capabilities || {};
            o.textContent = `${m.display_name || m.id}${c.vision ? " 👁" : ""}${c.tools ? " 🛠" : ""}`;
            og.appendChild(o);
            total++;
          }
          sel.appendChild(og);
        }
        sel.style.display = "";
        const freeCount = all.filter((m) => m.access_tier === "free").length;
        showResult("ok",
          `✓ ${total} model listelendi — <b>${freeCount}'i ücretsiz</b> (kredi gerektirmez). ` +
          `Seçtiğiniz model kutuya yazılır.`);
        btn.disabled = false;
        return;
      } catch (_) {
        btn.disabled = false;
      }
    }

    btn.disabled = true;
    showResult("info", "🔄 Modeller alınıyor…");
    const res = await sendBg({ type: "LIST_AI_MODELS" });
    btn.disabled = false;
    if (res.ok && res.result?.ok && res.result.models?.length) {
      const sel = $("modelSelect");
      sel.innerHTML = "";
      const o0 = document.createElement("option");
      o0.value = "";
      o0.textContent = `— ${res.result.models.length} model —`;
      sel.appendChild(o0);
      for (const m of res.result.models) {
        const o = document.createElement("option");
        o.value = m;
        o.textContent = m;
        sel.appendChild(o);
      }
      sel.style.display = "";
      showResult("ok", `✓ ${res.result.models.length} model listelendi. Seçin, otomatik yazılır.`);
    } else {
      showResult("err", `❌ ${res.error || res.result?.note || "Model listesi alınamadı."}`);
    }
  });

  $("modelSelect").addEventListener("change", async (e) => {
    const model = e.target.value;
    if (!model) return;
    $("cfgAiModel").value = model;
    // Yalnız kutuya yazmak yetmiyordu: model bir sonraki istekte
    // keyStore/aiModel'den okunuyor. Kalıcı kaydet.
    const res = await sendBg({ type: "SET_MODEL", provider: state.provider, model });
    if (res.ok) {
      modelBadge(model);
      showResult("ok", `🧠 Aktif model: <b>${model}</b> — kalıcı olarak kaydedildi.`);
    } else {
      showResult("err", `❌ Model kaydedilemedi: ${res.error || ""}`);
    }
  });

  // Panelde seçili modeli sürekli göster (kullanıcı hangi modelde olduğunu görsün)
  function modelBadge(model) {
    let el = $("modelActiveBadge");
    if (!el) {
      el = document.createElement("div");
      el.id = "modelActiveBadge";
      el.style.cssText =
        "margin:6px 0 0;font-size:11px;color:#f59e0b;font-weight:700;" +
        "display:flex;align-items:center;gap:6px";
      const host = $("modelSelect") && $("modelSelect").parentElement;
      if (host) host.appendChild(el);
    }
    el.textContent = "● aktif model: " + (model || "—");
  }

  // ---------------------------------------------------------------- test
  $("btnTestAi").addEventListener("click", async () => {
    const btn = $("btnTestAi");
    btn.disabled = true;
    btn.textContent = gpTr("⏳ Test ediliyor…");
    const preset = PROVIDER_PRESETS[state.provider] || {};
    const res = await sendBg({
      type: "TEST_AI_CONNECTION",
      configOverride: {
        aiProvider: state.provider,
        aiModel: $("cfgAiModel").value.trim() || preset.model,
        aiBaseUrl: preset.baseUrl,
        aiUseVision: $("cfgAiVision").checked
      }
    });
    btn.disabled = false;
    btn.textContent = gpTr("🔌 Bağlantıyı Test Et");
    if (res.ok && res.result) {
      const r = res.result;
      if (r.fixedModel) {
        $("cfgAiModel").value = r.model;
        await refreshKeys();
        showResult("ok",
          `🪄 Model adı artık geçerli değildi (<code>${r.oldModel || "eski model"}</code>) — ` +
          `<b>${r.model}</b> otomatik seçildi ve kalıcı olarak kaydedildi.<br>` +
          `✅ ${r.provider} · ${r.model} · ${r.latencyMs} ms — çalışıyor!`);
      } else {
        showResult("ok", `✅ ${r.provider} · ${r.model} · ${r.latencyMs} ms — çalışıyor!`);
      }
      modelBadge(r.model);
    } else {
      const msg = res.error || "Bağlantı kurulamadı.";
      showResult("err", `❌ ${msg}`, errorActionsFor(msg));
    }
  });

  $("btnApplyPreset").addEventListener("click", () => {
    if (!state.provider) return;
    const p = PROVIDER_PRESETS[state.provider];
    $("cfgAiModel").value = p.model || "";
    $("cfgAiBaseUrl").value = p.baseUrl || "";
    $("cfgAiVision").checked = !!p.vision;
    showResult("info", `${p.name} varsayılanları dolduruldu.`);
  });

  $("btnShowAllSettings").addEventListener("click", () => {
    $("cfgAiBaseUrl").style.display = "";
    $("cfgAiVision").parentElement.style.display = "";
    showResult("info", "Tüm alanlar görünür. Base URL ve Vision ayarını elle değiştirebilirsiniz.");
  });

  // ---------------------------------------------------------------- tabs
  function switchTab(name) {
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === "tab-" + name));
  }

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  // ---------------------------------------------------------------- access control
  const ACCESS_META = {
    open: { icon: "🔓", label: "AI erişimi: açık" },
    read_only: { icon: "👁️", label: "AI erişimi: sadece okuma" },
    locked: { icon: "🔒", label: "AI erişimi: kilitli" }
  };

  function renderAccess(st) {
    if (!st) return;
    const meta = ACCESS_META[st.mode] || ACCESS_META.open;
    $("txtAccess").textContent = meta.label + (st.remainingMs ? ` (${st.remainingLabel})` : "");
    const quick = $("btnLockQuick");
    quick.textContent = st.mode === "locked" ? "🔒" : "🔓";
    quick.title = st.mode === "locked" ? "Kilidi aç (Alt+Shift+L)" : "AI erişimini kilitle (Alt+Shift+L)";
    document.querySelectorAll("#accessModes button").forEach((b) => {
      b.classList.toggle("selected", b.dataset.mode === st.mode);
    });
    const lockBtn = $("btnLockNow");
    lockBtn.textContent = st.mode === "locked" ? "🔓 Aç" : "🔒 Kilitle";

    const ids = st.allowedTabIds || [];
    $("allowListInfo").textContent = ids.length
      ? `⚑ Yalnızca ${ids.length} sekme izinli: ${ids.map((i) => "#" + i).join(", ")}`
      : "⚑ Tüm sekmeler izinli.";

    const box = $("auditBox");
    box.innerHTML = "";
    (st.audit || []).slice().reverse().forEach((a) => {
      const d = document.createElement("div");
      d.className = `audit-row ${a.allowed ? "allow" : "deny"}`;
      const t = new Date(a.ts).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      d.textContent = `${t} ${a.allowed ? "✓" : "✕"} ${a.kind}${a.tabId ? " #" + a.tabId : ""}${a.reason ? " — " + a.reason : ""}`;
      box.appendChild(d);
    });
    if (!(st.audit || []).length) box.textContent = gpTr("Henüz kayıt yok.");
  }

  async function refreshAccess() {
    const res = await sendBg({ type: "GET_ACCESS_STATE" });
    if (res.ok) renderAccess(res.result);
  }

  async function applyAccess(mode) {
    const res = await sendBg({
      type: "SET_ACCESS_MODE",
      mode,
      options: { minutes: Number($("accessDuration").value || 0) }
    });
    if (res.ok) await refreshAccess();
    else appendLog("error", res.error || "Erişim değiştirilemedi.");
  }

  document.querySelectorAll("#accessModes button").forEach((b) => {
    b.addEventListener("click", () => applyAccess(b.dataset.mode));
  });

  $("btnLockQuick").addEventListener("click", async () => {
    const st = await sendBg({ type: "GET_ACCESS_STATE" });
    const next = st.ok && st.result.mode === "locked" ? "open" : "locked";
    await applyAccess(next);
    appendLog(next === "locked" ? "warn" : "success", next === "locked" ? "🔒 AI erişimi kapatıldı." : "🔓 AI erişimi açıldı.");
  });

  $("btnLockNow").addEventListener("click", async () => {
    const st = await sendBg({ type: "GET_ACCESS_STATE" });
    await applyAccess(st.ok && st.result.mode === "locked" ? "open" : "locked");
  });

  $("accessDuration").addEventListener("change", async () => {
    const st = await sendBg({ type: "GET_ACCESS_STATE" });
    if (st.ok && st.result.mode !== "locked") await applyAccess(st.result.mode);
  });

  $("cfgConfirmStart").addEventListener("change", async () => {
    await sendBg({ type: "SAVE_CONFIG", patch: { confirmBeforeStart: $("cfgConfirmStart").checked } });
  });
  $("cfgKillOnLock").addEventListener("change", async () => {
    await sendBg({ type: "SAVE_CONFIG", patch: { killSwitchOnLock: $("cfgKillOnLock").checked } });
  });
  $("btnOnlyThisTab").addEventListener("click", async () => {
    const tabs = await new Promise((r) => api.tabs.query({ active: true, currentWindow: true }, r));
    if (!tabs?.[0]?.id) return;
    await sendBg({ type: "SET_ALLOWED_TABS", tabIds: [tabs[0].id] });
    await refreshAccess();
    appendLog("info", `Yalnızca sekme #${tabs[0].id} izinli.`);
  });
  $("btnAllowAllTabs").addEventListener("click", async () => {
    await sendBg({ type: "SET_ALLOWED_TABS", tabIds: [] });
    await refreshAccess();
    appendLog("info", "Tüm sekmeler izinli.");
  });

  // ---------------------------------------------------------------- logs / daemon
  function appendLog(level, message) {
    const box = $("logBox");
    const line = document.createElement("div");
    line.className = `log-line ${level}`;
    line.textContent = `[${new Date().toLocaleTimeString("tr-TR")}] ${message}`;
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
    while (box.children.length > 120) box.removeChild(box.firstChild);
  }

  // ---- CANLI İZLEME: ajanın son eylemini şeritte göster ----
  function renderLivebar(agentState) {
    const bar = $("livebar");
    if (!bar) return;
    const running = !!agentState?.running;
    bar.classList.toggle("on", running);
    if (!running) return;

    const logs = agentState.logs || [];
    const last = logs.length ? logs[logs.length - 1] : null;
    const txt = $("liveText");
    if (txt && last) {
      txt.textContent = String(last.message || "").replace(/\s+/g, " ").slice(0, 110);
    }
    // Eylem türünü son satırdan çıkar
    const a = $("liveAction");
    if (a) {
      const m = String(last?.message || "");
      let tag = "ÇALIŞIYOR";
      if (/tıkla|click|TIK/i.test(m)) tag = "TIKLAMA";
      else if (/yaz|type|YAZI/i.test(m)) tag = "YAZMA";
      else if (/git|navigate|aç/i.test(m)) tag = "GEZİNME";
      else if (/oku|snapshot|read/i.test(m)) tag = "OKUMA";
      else if (/bekle|wait/i.test(m)) tag = "BEKLEME";
      else if (/doğrula|verify/i.test(m)) tag = "DOĞRULAMA";
      else if (/hata|error/i.test(m)) tag = "HATA";
      a.textContent = tag;
      a.style.color = tag === "HATA" ? "#fca5a5" : "";
      a.style.borderColor = tag === "HATA" ? "rgba(239,95,95,.5)" : "";
    }
  }

  // Durdurma çubuğu — görev/misyon çalışırken görünür
  function renderStopbar(agentState, mission) {
    const bar = $("stopbar");
    if (!bar) return;
    const agentOn = !!agentState?.running;
    const missionOn = mission && mission.status === "running";
    bar.classList.toggle("on", !!(agentOn || missionOn));
    const info = $("sbInfo");
    if (info) {
      if (agentOn) info.textContent = `Görev çalışıyor · adım ${agentState.step ?? 0} · ${(agentState.goal || "").slice(0, 60)}`;
      else if (missionOn) info.textContent = `Misyon çalışıyor · ${mission.title || ""}`;
    }
  }

  function renderState(daemonStatus, agentState) {
    renderLivebar(agentState);
    renderStopbar(agentState, state.mission);
    const on = !!daemonStatus?.connected;
    $("dotDaemon").className = `dot ${on ? "on" : "off"}`;
    $("txtDaemon").textContent = on
      ? `Masaüstü: bağlı${daemonStatus.os ? " (" + daemonStatus.os + ")" : ""}`
      : "Masaüstü: bekleniyor";

    if (agentState) {
      $("stepCounter").textContent = agentState.running
        ? `Adım ${agentState.step} çalışıyor`
        : "Boşta";
      if (Array.isArray(agentState.logs) && agentState.logs.length) {
        const box = $("logBox");
        box.innerHTML = "";
        for (const l of agentState.logs) {
          const d = document.createElement("div");
          d.className = `log-line ${l.level}`;
          d.textContent = `[${new Date(l.ts).toLocaleTimeString("tr-TR")}] ${l.message}`;
          box.appendChild(d);
        }
        box.scrollTop = box.scrollHeight;
      }
    }
  }

  // ---------------------------------------------------------------- work tab
  document.querySelectorAll("#perfSelector button").forEach((btn) => {
    btn.addEventListener("click", async () => {
      document.querySelectorAll("#perfSelector button").forEach((b) => b.classList.toggle("selected", b === btn));
      await sendBg({ type: "SAVE_CONFIG", patch: { perfProfile: btn.dataset.perf } });
      appendLog("info", `Performans modu: ${btn.textContent.trim()}`);
    });
  });

  // ---------------------------------------------------------------- MİSYON
  const STEP_ICONS = { todo: "○", doing: "◐", done: "●", failed: "✕", skipped: "—" };

  async function refreshMission() {
    const res = await sendBg({ type: "MISSION_GET" });
    const m = res.ok ? res.result?.mission : null;
    if (!m) {
      $("missionSetup").style.display = "";
      $("missionBoard").style.display = "none";
      return;
    }
    $("missionSetup").style.display = "none";
    $("missionBoard").style.display = "";
    $("mTitle").textContent = m.title || m.objective;
    $("mMetric").textContent = m.metric ? `📊 ${m.metric}` : "";
    const badge = $("mStatus");
    badge.className = "m-badge " + (m.status || "paused");
    badge.textContent = { running: "ÇALIŞIYOR", paused: "DURAKLATILDI", done: "TAMAMLANDI", failed: "HATA" }[m.status] || m.status;
    $("mBar").style.width = (m.progress || 0) + "%";
    const doneN = m.steps.filter((x) => x.status === "done").length;
    const failN = m.steps.filter((x) => x.status === "failed").length;
    $("mProgressText").textContent =
      `${doneN}/${m.steps.length} adım tamamlandı` +
      (failN ? ` · ${failN} başarısız` : "") +
      ` · ${m.cycles || 0} döngü` +
      (m.autoContinue ? " · oto-devam açık" : "");

    const box = $("mSteps");
    box.innerHTML = "";
    for (const st of m.steps) {
      const row = document.createElement("div");
      row.className = "m-step " + st.status;
      const ic = document.createElement("span");
      ic.className = "ic";
      ic.textContent = STEP_ICONS[st.status] || "○";
      const tt = document.createElement("div");
      tt.className = "tt";
      tt.innerHTML = `${escapeHtml(st.title)}` +
        (st.done ? `<small>✔ ölçüt: ${escapeHtml(st.done)}</small>` : "") +
        (st.attempts > 1 ? `<small>${st.attempts} deneme</small>` : "");
      row.appendChild(ic);
      row.appendChild(tt);
      if (st.status === "todo" || st.status === "failed") {
        const sk = document.createElement("button");
        sk.className = "skipbtn";
        sk.textContent = gpTr("atla");
        sk.title = "Bu adımı atla";
        sk.onclick = async () => {
          await sendBg({ type: "MISSION_STEP_SKIP", stepId: st.id });
          refreshMission();
        };
        row.appendChild(sk);
      }
      box.appendChild(row);
    }
    $("btnMissionResume").style.display = m.status === "running" ? "none" : "";
    $("btnMissionPause").style.display = m.status === "running" ? "" : "none";
  }

  $("btnMissionStart").addEventListener("click", async () => {
    const objective = $("missionInput").value.trim();
    if (!objective) { appendLog("warn", "Misyon hedefini yazın."); return; }
    const btn = $("btnMissionStart");
    btn.disabled = true;
    btn.textContent = gpTr("⏳ Plan oluşturuluyor…");
    const res = await sendBg({
      type: "MISSION_START",
      objective,
      opts: {
        autoContinue: $("mAutoContinue").checked,
        intervalMinutes: Number($("mInterval").value) || 3
      }
    });
    btn.disabled = false;
    btn.textContent = gpTr("🚀 Misyonu başlat (planı oluştur)");
    if (!res.ok) {
      appendLog("error", res.error || "Misyon başlatılamadı.");
      return;
    }
    const m = res.mission;
    appendLog("success", `🎯 Misyon kuruldu: "${m.title}" — ${m.steps.length} adım`);
    m.steps.forEach((st) => appendLog("step", `  ${st.id}. ${st.title}`));
    await refreshMission();
  });

  $("btnMissionResume").addEventListener("click", async () => {
    const res = await sendBg({ type: "MISSION_RESUME" });
    if (res.ok) appendLog("info", "▶ Misyon sürdürülüyor…");
    else appendLog("error", res.error || "Sürdürülemedi.");
    setTimeout(refreshMission, 800);
  });

  $("btnMissionPause").addEventListener("click", async () => {
    await sendBg({ type: "MISSION_PAUSE" });
    appendLog("info", "⏸ Misyon duraklatıldı. Kaldığı adım kaydedildi.");
    setTimeout(refreshMission, 500);
  });

  $("btnMissionClear").addEventListener("click", async () => {
    if (!confirm("Misyon ve tüm görev listesi silinsin mi?")) return;
    await sendBg({ type: "MISSION_CLEAR" });
    await refreshMission();
  });

  // Hızlı dil değiştirici (başlıkta) — etiket olarak hedef dili gösterir
  const LANG_LABEL = { tr: "EN", en: "TR" };
  function syncLangQuick() {
    const cur = (window.GP_LANG && window.GP_LANG.lang) || "tr";
    const b = $("btnLangQuick");
    if (b) {
      b.textContent = LANG_LABEL[cur];
      b.title = cur === "tr" ? "Switch to English" : "Türkçe'ye geç";
    }
  }
  $("btnLangQuick").addEventListener("click", async () => {
    if (!window.GP_LANG) return;
    await window.GP_LANG.setLang(window.GP_LANG.lang === "tr" ? "en" : "tr");
    syncLangQuick();
  });
  document.addEventListener("gp-lang-changed", syncLangQuick);
  syncLangQuick();

  // Hakkında: bağlantılar
  document.querySelectorAll("#aboutCard [data-url]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      openUrl(a.dataset.url);
    });
  });
  $("btnSupport").addEventListener("click", () => openUrl("https://buymeacoffee.com/btmcode"));

  $("btnMissionNew").addEventListener("click", () => {
    $("missionBoard").style.display = "none";
    $("missionSetup").style.display = "";
    $("missionInput").value = "";
    $("missionInput").focus();
  });

  // ---- Görev modu ----
  let taskMode = "fresh_browser";
  document.querySelectorAll("#taskModeSelector button").forEach((b) => {
    b.addEventListener("click", () => {
      document.querySelectorAll("#taskModeSelector button").forEach((x) => x.classList.remove("selected"));
      b.classList.add("selected");
      taskMode = b.dataset.mode;
      $("taskModeHint").textContent =
        taskMode === "fresh_browser"
          ? "Yeni pencere: mevcut sekmeleriniz karışmaz, ayrı pencere açılır."
          : "Mevcut sekme: şu an açık olan sekmede çalışır.";
    });
  });

  // ---- Görev hafızası ----
  async function refreshTask() {
    const res = await sendBg({ type: "GET_TASK" });
    const card = $("memoryCard");
    if (!res.ok || !res.result?.task) { card.style.display = "none"; return; }
    const j = res.result.task;
    card.style.display = "";
    const badge = {
      running: '<span class="badge run">ÇALIŞIYOR</span>',
      paused: '<span class="badge pause">DURAKLATILDI</span>',
      done: '<span class="badge done">TAMAMLANDI</span>',
      failed: '<span class="badge fail">HATA</span>'
    }[j.status] || "";
    const when = j.updatedAt ? new Date(j.updatedAt).toLocaleString("tr-TR") : "";
    const blocked = (j.blockedProviders || []).length;
    $("memSummary").innerHTML =
      `${badge}<span class="goal">${escapeHtml(j.goal)}</span>` +
      `<span class="meta">Adım ${j.step || 0} · ${(j.history || []).length} işlem · ` +
      `${(j.facts || []).length} not` +
      (blocked ? ` · ${blocked} sağlayıcı tükendi` : "") +
      (j.switchCount ? ` · ${j.switchCount} kez devraldı` : "") +
      (when ? ` · ${when}` : "") + `</span>` +
      (j.summary ? `<div class="meta" style="margin-top:4px;">📝 ${escapeHtml(j.summary)}</div>` : "");
    $("memStatus").textContent = res.result.running ? "çalışıyor" : "";
    $("memStatus").className = res.result.running ? "muted running" : "muted";
    $("btnResumeTask").style.display = (j.status === "done" || res.result.running) ? "none" : "";
    $("btnStartAgent").style.display = res.result.running ? "none" : "";
  }

  function escapeHtml(t) {
    return String(t || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  $("btnResumeTask").addEventListener("click", async () => {
    const btn = $("btnResumeTask");
    btn.disabled = true;
    btn.textContent = gpTr("⏳ Devam ediyor…");
    const res = await sendBg({ type: "RESUME_TASK", resetBlocks: true });
    btn.disabled = false;
    btn.textContent = gpTr("▶ Kaldığı yerden devam et");
    if (!res.ok) { appendLog("error", res.error || "Devam edilemedi."); }
    else {
      appendLog("info", `↻ "${res.result.goal}" görevi ${res.result.step}. adımdan sürüyor.`);
      switchTab("work");
    }
    setTimeout(refreshTask, 1200);
  });

  $("btnClearTask").addEventListener("click", async () => {
    if (!confirm("Kayıtlı görev hafızası silinsin mi?")) return;
    await sendBg({ type: "CLEAR_TASK" });
    await refreshTask();
    appendLog("info", "Görev hafızası silindi.");
  });

  $("btnStartAgent").addEventListener("click", async () => {
    const goal = $("goalInput").value.trim();
    if (!goal) { appendLog("warn", "Bir görev yazın."); return; }
    let res = await sendBg({ type: "START_AGENT", goal, taskMode });
    if (!res.ok && res.needsConfirm) {
      if (!confirm(`AI fare/klavyenizi kullanacak.\n\nGörev: "${goal}"\n\nAcil durdurma: Alt+Shift+X\n\nOnaylıyor musunuz?`)) {
        appendLog("info", "Görev iptal edildi.");
        return;
      }
      res = await sendBg({ type: "START_AGENT", goal, taskMode, confirmed: true });
    }
    if (res.ok) setTimeout(refreshTask, 1500);
    if (!res.ok) {
      appendLog("error", res.error || "Görev başlatılamadı.");
      const err = res.error || "";
      if (/KREDİ|kota|quota|429/i.test(err)) {
        showResult("err", `❌ ${err}`, errorActionsFor(err));
      } else if (/eklentisinin|otomasyona kapalı|kontrol edilebilir bir web sekmesi|chrome-extension/i.test(err)) {
        appendLog("warn", "İpucu: Görevi normal bir web sitesi sekmesinde başlatın (Blogger, Google vb.).");
        showResult("err", `❌ ${err}`, [{
          label: "🌐 blogger.com sekmesi aç ve başlat",
          onClick: async () => {
            await sendBg({ type: "OPEN_URL_TAB", url: "https://www.blogger.com/" });
            appendLog("info", "Blogger açıldı. Şimdi ▶ Görevi Başlat'a basın.");
          }
        }]);
      }
    }
  });

  $("btnTestGhost").addEventListener("click", async () => {
    appendLog("step", "Sanal imleç testi — kendi farenizi serbestçe oynatın!");
    const pts = [{ x: 240, y: 180 }, { x: 480, y: 220 }, { x: 380, y: 360 }, { x: 220, y: 310 }];
    for (const p of pts) {
      await sendBg({ type: "TEST_BROWSER_ACTION", command: { action: "move", x: p.x, y: p.y } });
      await new Promise((r) => setTimeout(r, 260));
    }
  });

  $("btnPanic").addEventListener("click", async () => {
    await sendBg({ type: "PANIC_STOP" });
    appendLog("warn", "■ ACİL DURDURMA: her şey durduruldu.");
  });

  $("btnReconnect").addEventListener("click", async () => {
    await sendBg({ type: "RECONNECT_DAEMON" });
    appendLog("info", "Masaüstü köprüsüne yeniden bağlanılıyor…");
  });

  $("btnListWindows").addEventListener("click", async () => {
    const res = await sendBg({ type: "TEST_DESKTOP_ACTION", method: "list_windows", params: { limit: 20 } });
    if (!res.ok) { appendLog("error", res.error || "Listelenemedi."); return; }
    const sel = $("windowSelect");
    sel.innerHTML = "";
    const wins = Array.isArray(res.result) ? res.result : res.result?.windows || [];
    if (!wins.length) { appendLog("warn", "Pencere bulunamadı."); return; }
    for (const w of wins) {
      const o = document.createElement("option");
      o.value = w.id || w.windowId || w.hwnd || "";
      o.textContent = w.title || w.name || `Pencere ${o.value}`;
      sel.appendChild(o);
    }
    appendLog("success", `${wins.length} pencere listelendi.`);
  });

  $("btnSendBgKey").addEventListener("click", async () => {
    const key = $("bgKeyInput").value.trim();
    const win = $("windowSelect").value;
    if (!key) return;
    const res = await sendBg({ type: "TEST_DESKTOP_ACTION", method: "window_key", params: { windowId: win, key, mode: "press" } });
    if (!res.ok) appendLog("error", res.error || "Gönderilemedi.");
    else appendLog("success", `"${key}" arka planda gönderildi.`);
  });

  $("btnToggleMpx").addEventListener("click", async () => {
    const res = await sendBg({ type: "TEST_DESKTOP_ACTION", method: "toggle_linux_mpx", params: {} });
    appendLog(res.ok ? "success" : "error", res.ok ? "Çift imleç değiştirildi." : res.error || "Desteklenmiyor.");
  });

  // ---------------------------------------------------------------- settings save
  $("btnSaveSettings").addEventListener("click", async () => {
    await sendBg({
      type: "SAVE_CONFIG",
      patch: {
        inputEngine: $("cfgInputEngine").value,
        showGhostCursor: $("cfgGhostCursor").checked,
        webAiBridgeEnabled: $("cfgWebAiBridge").checked,
        maxAgentSteps: Number($("cfgMaxSteps").value || 18),
        daemonUrl: $("cfgDaemonUrl").value.trim(),
        daemonToken: $("cfgDaemonToken").value.trim(),
        aiUseVision: $("cfgAiVision").checked
      }
    });
    const b = $("btnSaveSettings");
    b.textContent = gpTr("✓ Kaydedildi");
    setTimeout(() => (b.textContent = gpTr("✓ Kaydet")), 1300);
  });

  api.runtime.onMessage.addListener((msg) => {
    if (msg?.__target === "ghostpilot_panel" && msg.type === "STATE_UPDATE") {
      renderState(msg.daemonStatus, msg.agentState);
      refreshAccess();
    }
  });

  // ---------------------------------------------------------------- DURDUR
  // Tek tıkla: ajanı kes + misyonu duraklat + overlay'i temizle
  async function stopEverything() {
    const btn = $("btnStopTask");
    if (btn) { btn.disabled = true; btn.textContent = "Durduruluyor…"; }
    try {
      // 1) Ajanı hemen durdur (sanal tuşlar serbest bırakılır)
      await sendBg({ type: "PANIC_STOP" });
      // 2) Misyonu duraklat (varsa)
      const ms = await sendBg({ type: "MISSION_GET" });
      if (ms.ok && ms.mission && ms.mission.status === "running") {
        await sendBg({ type: "MISSION_PAUSE" });
      }
      // 3) Tüm sekmelerde overlay'i temizle (hayalet imleç kalmasın)
      await sendBg({ type: "OVERLAY_OFF_ALL" });
      showResult("info", "Görev durduruldu — sanal tuşlar bırakıldı, imleç temizlendi.");
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Görevi durdur"; }
      refreshStateSoon();
    }
  }

  function refreshStateSoon() {
    setTimeout(async () => {
      const st = await sendBg({ type: "GET_STATE" });
      if (st && st.ok) renderState(st.daemonStatus, st.agentState);
      const ms = await sendBg({ type: "MISSION_GET" });
      if (ms && ms.ok) { state.mission = ms.mission; renderStopbar(ms.running ? { running: true, step: 0, goal: "" } : null, ms.mission); }
    }, 250);
  }

  // ---------------------------------------------------------------- init
  async function init() {
    buildProviderSelect();

    // Durdurma çubuğu butonu
    const sb = $("btnStopTask");
    if (sb) sb.addEventListener("click", stopEverything);
    // Acil durdurma (■) da aynı işi yapsın
    const pan = $("btnPanic");
    if (pan) pan.addEventListener("click", stopEverything, true);

    // Aktif modeli backend'den oku ve rozeti doldur (panel yeniden açıldığında
    // kullanıcı hangi modelde olduğunu net görsün)
    try {
      const gm = await sendBg({ type: "GET_MODEL" });
      if (gm.ok && gm.result?.model) {
        $("cfgAiModel").value = gm.result.model;
        modelBadge(gm.result.model);
      }
    } catch (_) {}

    const info = await sendBg({ type: "GET_OAUTH_INFO" });
    if (info && info.ok) {
      const oi = info.result || info;   // sunucu iki biçimde de dönebilir
      state.identityAvailable = !!oi.identityAvailable;
      state.googleClientId = oi.googleClientId || "";
      $("cfgGoogleClientId").value = state.googleClientId;
      if (!state.identityAvailable) {
        $("btnOAuth").disabled = true;
        $("btnOAuth").textContent = gpTr("🔐 Otomatik giriş kullanılamıyor");
        showIdentityDiag(oi.identityWhy || "", oi.redirectUri || "");
      } else {
        $("identityDiag").style.display = "none";
      }
    }

    const res = await sendBg({ type: "GET_STATE" });
    const rs = (res && (res.result || res)) || {};
    if (rs.config) {
      const cfg = rs.config;
      $("cfgInputEngine").value = cfg.inputEngine || "balanced";
      $("cfgGhostCursor").checked = cfg.showGhostCursor !== false;
      $("cfgWebAiBridge").checked = cfg.webAiBridgeEnabled !== false;
      $("cfgMaxSteps").value = cfg.maxAgentSteps || 18;
      $("cfgDaemonUrl").value = cfg.daemonUrl || "ws://127.0.0.1:17380/ws";
      $("cfgDaemonToken").value = cfg.daemonToken || "";
      $("cfgConfirmStart").checked = !!cfg.confirmBeforeStart;
      $("cfgKillOnLock").checked = cfg.killSwitchOnLock !== false;
      $("txtEngine").textContent = cfg.inputEngine === "cdp" && res.hasDebugger
        ? "Girdi: CDP"
        : "Girdi: sentetik";
      document.querySelectorAll("#perfSelector button").forEach((b) => {
        b.classList.toggle("selected", b.dataset.perf === (cfg.perfProfile || "balanced"));
      });
      if (!res.hasDebugger) {
        const opt = $("cfgInputEngine").querySelector('option[value="cdp"]');
        if (opt) opt.disabled = true;
      }
      renderState(res.daemonStatus, res.agentState);
    }

    await refreshKeys();
    await refreshAccess();

    await refreshTask();
    await refreshMission();
    setInterval(() => { refreshTask(); refreshMission(); }, 4000);

    // Ollama / LM Studio / llama.cpp var mı? (kendiliğinden bağlanmaz, haber verir)
    checkLocalServers().catch(() => {});
    $("cardOllama").addEventListener("dblclick", () => checkLocalServers(true));

    // aktif sağlayıcıyı forma yansıt
    const active = state.activeProvider || Object.keys(state.keys)[0] || null;
    if (active) await selectProvider(active);
    else {
      $("connectTitle").textContent = gpTr("Bağlantı kur");
      $("connectHint").textContent = gpTr("Yukarıdan bir sağlayıcı kartına dokunun.");
      $("manualRow").style.display = "none";
      $("oauthRow").style.display = "none";
      $("activeModelPill").textContent = gpTr("AI seçilmedi");
    }
  }

  // Çoklu dil: kaydedilmiş dili uygula + açılışta çevir
  (async () => {
    try {
      if (window.GP_LANG) await window.GP_LANG.init();
    } catch (e) { /* dil motoru yoksa Türkçe kalır */ }
  })();

  init();
})();
