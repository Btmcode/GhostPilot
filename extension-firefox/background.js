/**
 * GhostPilot — background.js
 * Copyright (c) 2026 BTM Code — MIT License
 * https://btmcode.vercel.app
 * https://github.com/  ·  Açık kaynak. Telif bildirimini koruyun.
 */
/**
 * GhostPilot — Hybrid Background Engine (Chromium MV3 & Firefox MV3)
 * - CDP Virtual Trusted Input (Chromium) + Synthetic Zero-Banner Input (Firefox & Silent Mode)
 * - Zero OS Mouse/Keyboard Interference (User & AI work simultaneously)
 * - WebSocket Bridge to Local Desktop & MCP Daemon (127.0.0.1:17380)
 * - Built-in Lightweight Autonomous AI Agent (Ollama, OpenAI, Gemini, OpenRouter, Claude)
 */

// Erişim kapısı (access.js) servis çalışanına yüklenir
try {
  if (typeof importScripts === "function") importScripts("access.js");
} catch (_) {}

const api = typeof browser !== "undefined" ? browser : chrome;
const HAS_DEBUGGER = typeof chrome !== "undefined" && !!chrome.debugger;
const HAS_IDENTITY = !!(api && api.identity && typeof api.identity.launchWebAuthFlow === "function");
const IDENTITY_WHY = HAS_IDENTITY ? "" :
  "Tarayıcı 'identity' API'sini sunmuyor. Çözüm: chrome://extensions → GhostPilot → Kaldır, " +
  "sonra paketi yeniden yükleyin (manifest'e 'identity' izni eklendi). Firefox için about:debugging'den yeniden yükleyin.";

const DEFAULT_CONFIG = {
  perfProfile: "balanced", // "eco" | "balanced" | "game"
  inputEngine: HAS_DEBUGGER ? "cdp" : "synthetic", // "cdp" | "synthetic"
  showGhostCursor: true,
  daemonUrl: "ws://127.0.0.1:17380/ws",
  daemonToken: "",              // boş = ~/.ghostpilot/token dosyasından okunur (sabit token YOK)
  autoConnectDaemon: true,
  webAiBridgeEnabled: true,
  protectedDomains: ["onlinebanking", "bank", "paypal.com"],
  aiProvider: "ollama", // Provider preset id (see AI_PROVIDERS below) or "custom"
  aiBaseUrl: "http://127.0.0.1:11434/v1",
  aiApiKey: "",
  aiModel: "qwen2.5:7b",
  aiUseVision: false,
  maxAgentSteps: 18,
  // ---- Erişim kontrolü (kullanıcı istediği an kapatabilir) ----
  accessMode: "open",          // "open" | "read_only" | "locked"
  accessExpiresAt: 0,          // 0 = süresiz; aksi halde epoch ms
  allowedTabIds: [],           // boş = tüm sekmeler
  killSwitchOnLock: true,      // kilitlenince çalışan görev + basılı tuşları kes
  confirmBeforeStart: false,   // her görevden önce panelde onay iste
  // ---- Otomatik anahtar (OAuth) ----
  googleClientId: "",          // tek seferlik OAuth istemci kimliği
  googleRefreshToken: "",
  googleTokenExpiry: 0,
  // ---- Kalıcı anahtar deposu: { openai: {...}, gemini: {...} } ----
  keyStore: {},
  // ---- Görev yürütme stratejisi ----
  // fresh_browser: görev için AYRI pencere açar, kullanıcının pencerelerine dokunmaz
  // reuse_tab:     mevcut sekmeyi kullanır
  taskMode: "fresh_browser",
  // Tersine mühendislik hafızası: adım adım kayıt diske yazılır
  journalEnabled: true,
  maxTokenBudget: 0,       // 0 = sınırsız; aksi halde toplam token bütçesi
  providerStats: {}        // sağlayıcı başına başarı/başarısızlık sayacı
};

// ============================================================================
//  GÖREV GÜNLÜĞÜ (JOURNAL) — kalıcı hafıza
//  Chrome servis çalışanı uykuya dalsa, tarayıcı kapansa ya da kredi bitse
//  bile görev kaldığı yerden devam eder.
// ============================================================================
const JOURNAL_KEY = "gp_journal";

async function journalLoad() {
  const cfg = await getConfig();
  return cfg[JOURNAL_KEY] || null;
}

async function journalSave(journal) {
  try {
    await saveConfig({ [JOURNAL_KEY]: journal });
  } catch (_) {}
}

async function journalStart(goal, tabId) {
  const j = {
    id: "task_" + Date.now().toString(36),
    goal,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: "running",          // running | paused | done | failed
    step: 0,
    tabId: tabId || null,
    windowId: null,
    history: [],                 // yapılan eylemler
    facts: [],                   // öğrenilen bilgiler (URL, başlık, bulgular)
    doneConditions: deriveDoneConditions(goal),   // tamamlanma koşulları
    provider: null,              // son kullanılan sağlayıcı
    tokensUsed: 0,
    switchCount: 0,              // kaç kez sağlayıcı değişti
    failureStreak: 0,            // üst üste başarısız adım
    blockedProviders: [],        // bu görevde tükenen sağlayıcılar
    summary: ""
  };
  await journalSave(j);
  return j;
}

async function journalPatch(patch) {
  const cur = (await journalLoad()) || {};
  const next = { ...cur, ...patch, updatedAt: Date.now() };
  await journalSave(next);
  return next;
}

async function journalClear() {
  await saveConfig({ [JOURNAL_KEY]: null });
}


// ============================================================================
// AI PROVIDER REGISTRY — Connect almost any AI: cloud APIs, local LLMs, gateways
// style: "openai" (Chat Completions) | "anthropic" (Messages) | "gemini" (generateContent)
//        | "cohere" (Chat) | "azure" (OpenAI w/ deployment + api-version)
// ============================================================================
const AI_PROVIDERS = {
  openai:     { name: "OpenAI",                style: "openai",    baseUrl: "https://api.openai.com/v1",                                   model: "gpt-4o-mini",               vision: true,  keyHint: "sk-...",                 keyRequired: true },
  anthropic:  { name: "Anthropic Claude",     style: "anthropic", baseUrl: "https://api.anthropic.com/v1",                                model: "claude-sonnet-4-5",         vision: true,  keyHint: "sk-ant-...",            keyRequired: true },
  gemini:     { name: "Google Gemini",         style: "gemini",    baseUrl: "https://generativelanguage.googleapis.com/v1beta",              model: "gemini-3.8-flash",          vision: true,  keyHint: "AIza...",               keyRequired: true },
  gemini_oa:  { name: "Google Gemini (OpenAI uyumlu)", style: "openai", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-3.8-flash",       vision: true,  keyHint: "AIza...",               keyRequired: true },
  ollama:     { name: "Ollama (Yerel)",        style: "openai",    baseUrl: "http://127.0.0.1:11434/v1",                                  model: "qwen2.5:7b",                vision: false, keyHint: "(boş bırakın)",         keyRequired: false },
  lmstudio:   { name: "LM Studio (Yerel)",     style: "openai",    baseUrl: "http://127.0.0.1:1234/v1",                                  model: "local-model",               vision: false, keyHint: "lm-studio",             keyRequired: false },
  llamacpp:   { name: "llama.cpp (Yerel)",     style: "openai",    baseUrl: "http://127.0.0.1:8080/v1",                                  model: "local-model",               vision: false, keyHint: "(boş bırakın)",         keyRequired: false },
  openrouter: { name: "OpenRouter",            style: "openai",    baseUrl: "https://openrouter.ai/api/v1",                              model: "openai/gpt-4o-mini",        vision: true,  keyHint: "sk-or-...",             keyRequired: true },
  groq:       { name: "Groq (Hızlı)",          style: "openai",    baseUrl: "https://api.groq.com/openai/v1",                            model: "llama-3.3-70b-versatile",   vision: false, keyHint: "gsk_...",               keyRequired: true },
  deepseek:   { name: "DeepSeek",              style: "openai",    baseUrl: "https://api.deepseek.com/v1",                               model: "deepseek-chat",             vision: false, keyHint: "sk-...",                 keyRequired: true },
  together:   { name: "Together AI",           style: "openai",    baseUrl: "https://api.together.xyz/v1",                               model: "meta-llama/Llama-3.3-70B-Instruct-Turbo", vision: false, keyHint: "tgp_...", keyRequired: true },
  mistral:    { name: "Mistral AI",            style: "openai",    baseUrl: "https://api.mistral.ai/v1",                                 model: "mistral-large-latest",      vision: true,  keyHint: "sk-...",                 keyRequired: true },
  cohere:     { name: "Cohere",                style: "cohere",    baseUrl: "https://api.cohere.ai/v2",                                  model: "command-r-plus",            vision: false, keyHint: "co-...",                 keyRequired: true },
  azure:      { name: "Azure OpenAI",          style: "azure",     baseUrl: "https://<resource>.openai.azure.com",                         model: "gpt-4o-mini",               vision: true,  keyHint: "Azure anahtarı",        keyRequired: true },
  xai:        { name: "xAI Grok",              style: "openai",    baseUrl: "https://api.x.ai/v1",                                     model: "grok-2-latest",             vision: true,  keyHint: "xai-...",               keyRequired: true },
  perplexity: { name: "Perplexity",            style: "openai",    baseUrl: "https://api.perplexity.ai",                                 model: "sonar",                     vision: false, keyHint: "pplx-...",              keyRequired: true },
  fireworks:  { name: "Fireworks AI",          style: "openai",    baseUrl: "https://api.fireworks.ai/inference/v1",                       model: "accounts/fireworks/models/llama-v3p3-70b-instruct", vision: false, keyHint: "fw-...", keyRequired: true },
  anyscale:   { name: "Anyscale",              style: "openai",    baseUrl: "https://api.anyscale.com/v1",                               model: "meta-llama/Llama-3.3-70B-Instruct", vision: false, keyHint: "sk-...", keyRequired: true },
  // ---------------- ÇİN YAPAY ZEKALARI (OpenAI uyumlu uç noktalar) ----------------
  qwen:       { name: "Qwen — Alibaba (DashScope)", style: "openai", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",       model: "qwen-plus",                 vision: true,  keyHint: "sk-... (DashScope)",     keyRequired: true, region: "cn" },
  qwen_intl:  { name: "Qwen — Uluslararası (Singapur)", style: "openai", baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1", model: "qwen-plus",             vision: true,  keyHint: "sk-... (DashScope intl)", keyRequired: true, region: "cn" },
  kimi:       { name: "Moonshot Kimi (Çin)",   style: "openai",    baseUrl: "https://api.moonshot.cn/v1",                                model: "moonshot-v1-8k",            vision: false, keyHint: "sk-... (Moonshot)",      keyRequired: true, region: "cn" },
  kimi_intl:  { name: "Moonshot Kimi (Global)", style: "openai",   baseUrl: "https://api.moonshot.ai/v1",                                model: "moonshot-v1-8k",            vision: false, keyHint: "sk-... (Moonshot)",      keyRequired: true, region: "cn" },
  zhipu:      { name: "Zhipu GLM / Z.ai",      style: "openai",    baseUrl: "https://open.bigmodel.cn/api/paas/v4",                      model: "glm-4-plus",                vision: true,  keyHint: "id.secret (BigModel)",   keyRequired: true, region: "cn" },
  zhipu_intl: { name: "Z.ai GLM (Uluslararası)", style: "openai",  baseUrl: "https://api.z.ai/api/paas/v4",                              model: "glm-4-plus",                vision: true,  keyHint: "Z.ai anahtarı",          keyRequired: true, region: "cn" },
  doubao:     { name: "Doubao — ByteDance (Volcengine)", style: "openai", baseUrl: "https://ark.cn-beijing.volces.com/api/v3",            model: "doubao-pro-32k",            vision: false, keyHint: "ARK API anahtarı",       keyRequired: true, region: "cn" },
  hunyuan:    { name: "Tencent Hunyuan",       style: "openai",    baseUrl: "https://api.hunyuan.cloud.tencent.com/v1",                  model: "hunyuan-standard",          vision: false, keyHint: "Tencent anahtarı",       keyRequired: true, region: "cn" },
  minimax:    { name: "MiniMax",               style: "openai",    baseUrl: "https://api.minimaxi.com/v1",                               model: "abab6.5s-chat",             vision: false, keyHint: "MiniMax anahtarı",       keyRequired: true, region: "cn" },
  minimax_intl:{ name: "MiniMax (Uluslararası)", style: "openai",  baseUrl: "https://api.minimax.io/v1",                                 model: "abab6.5s-chat",             vision: false, keyHint: "MiniMax anahtarı",       keyRequired: true, region: "cn" },
  ernie:      { name: "Baidu ERNIE (Qianfan)", style: "openai",    baseUrl: "https://qianfan.baidubce.com/v2",                           model: "ernie-4.5-8k-preview",      vision: false, keyHint: "Qianfan anahtarı",       keyRequired: true, region: "cn", maxTokensParam: "max_completion_tokens" },
  siliconflow:{ name: "SiliconFlow (200+ model)", style: "openai", baseUrl: "https://api.siliconflow.cn/v1",                             model: "deepseek-ai/DeepSeek-V3",   vision: false, keyHint: "sk-... (SiliconFlow)",   keyRequired: true, region: "cn" },
  siliconflow_intl:{ name: "SiliconFlow (Global)", style: "openai", baseUrl: "https://api.siliconflow.com/v1",                           model: "deepseek-ai/DeepSeek-V3",   vision: false, keyHint: "sk-... (SiliconFlow)",   keyRequired: true, region: "cn" },
  xkiro:      { name: "xKiro (çoklu model)",    style: "openai",    baseUrl: "https://api.xkiro.com/v1",                               model: "mistralai/mistral-medium-3.5", vision: true,  keyHint: "sk-xt-...",             keyRequired: true },
  xkiro_an:   { name: "xKiro (Claude biçimi)",  style: "anthropic", baseUrl: "https://api.xkiro.com",                                  model: "anthropic/claude-sonnet-4.6",  vision: true,  keyHint: "sk-xt-...",             keyRequired: true },
  modelscope: { name: "ModelScope (Ücretsiz kota)", style: "openai", baseUrl: "https://api-inference.modelscope.cn/v1",                   model: "Qwen/Qwen2.5-72B-Instruct", vision: false, keyHint: "ModelScope token",       keyRequired: true, region: "cn" },
  yi:         { name: "01.AI Yi (Lingyi)",     style: "openai",    baseUrl: "https://api.lingyiwanwu.com/v1",                            model: "yi-large",                  vision: false, keyHint: "Yi anahtarı",            keyRequired: true, region: "cn" },
  baichuan:   { name: "Baichuan",              style: "openai",    baseUrl: "https://api.baichuan-ai.com/v1",                            model: "Baichuan4",                 vision: false, keyHint: "Baichuan anahtarı",      keyRequired: true, region: "cn" },
  stepfun:    { name: "StepFun (阶跃星辰)",     style: "openai",    baseUrl: "https://api.stepfun.com/v1",                                model: "step-1-8k",                 vision: false, keyHint: "StepFun anahtarı",       keyRequired: true, region: "cn" },
  // ---------------- JAPON YAPAY ZEKALARI ----------------
  sakana:     { name: "Sakana Namazu (Japonya)", style: "openai",   baseUrl: "https://api.sakana.ai/v1",                                  model: "sakana-namazu",             vision: true,  keyHint: "Sakana API anahtarı",    keyRequired: true, region: "jp" },
  plamo:      { name: "PLaMo — Preferred Networks (Japonya)", style: "openai", baseUrl: "https://api.platform.preferredai.jp/v1",          model: "plamo-3.0-prime",           vision: false, keyHint: "PLAMO_API_KEY",          keyRequired: true, region: "jp" },
  sarashina:  { name: "Sarashina3 — SB Intuitions (Japonya)", style: "openai", baseUrl: "https://api.sarashina.ai/v1",                      model: "sarashina3-mini",           vision: false, keyHint: "Sarashina API anahtarı", keyRequired: true, region: "jp", maxTokensParam: "max_completion_tokens" },
  custom:     { name: "Özel (OpenAI uyumlu)",  style: "openai",    baseUrl: "",                                                          model: "",                        vision: false, keyHint: "API anahtarı",        keyRequired: false }
};

function resolveProvider(cfg) {
  const activeId = cfg.activeProvider || cfg.aiProvider || "custom";
  const entry = (cfg.keyStore && cfg.keyStore[activeId]) || null;
  const preset = AI_PROVIDERS[activeId] || AI_PROVIDERS.custom;
  // Öncelik: depodaki anahtar > eski tek-slot alan
  const storeKey = entry && entry.apiKey ? entry.apiKey : "";
  return {
    id: activeId,
    name: preset.name,
    style: preset.style,
    baseUrl: (entry && entry.baseUrl) || cfg.aiBaseUrl || preset.baseUrl || "",
    model: (entry && entry.model) || cfg.aiModel || preset.model || "",
    apiKey: storeKey || cfg.aiApiKey || "",
    vision: !!cfg.aiUseVision,
    keyRequired: !!preset.keyRequired,
    keyHint: preset.keyHint || "",
    region: preset.region || "global",
    maxTokensParam: preset.maxTokensParam || "max_tokens"
  };
}

// ---- Kalıcı anahtar deposu yardımcıları ----
async function saveProviderKey(providerId, patch) {
  const cfg = await getConfig();
  const store = { ...(cfg.keyStore || {}) };
  store[providerId] = { ...(store[providerId] || {}), ...patch, updatedAt: Date.now() };
  await saveConfig({ keyStore: store, activeProvider: providerId });
  return store[providerId];
}

async function getProviderKey(providerId) {
  const cfg = await getConfig();
  const entry = (cfg.keyStore || {})[providerId];
  if (!entry) return null;
  // Eski tek-slot alanla geriye dönük uyum
  if (!entry.apiKey && providerId === (cfg.activeProvider || cfg.aiProvider) && cfg.aiApiKey) {
    return { ...entry, apiKey: cfg.aiApiKey };
  }
  return entry;
}

async function clearProviderKey(providerId) {
  const cfg = await getConfig();
  const store = { ...(cfg.keyStore || {}) };
  delete store[providerId];
  await saveConfig({ keyStore: store });
  return true;
}

// Kayıtlı tüm anahtarların maskeli özeti (panel için)
async function listProviderKeys() {
  const cfg = await getConfig();
  const store = cfg.keyStore || {};
  const out = {};
  for (const id of Object.keys(AI_PROVIDERS)) {
    const e = store[id];
    if (!e) continue;
    // Yerel sağlayıcılar anahtarsızdır — yine de "bağlı" sayılır
    const isLocal = e.source === "local" || !AI_PROVIDERS[id].keyRequired;
    if (!e.apiKey && !isLocal) continue;
    const k = String(e.apiKey || "");
    out[id] = {
      hasKey: !!e.apiKey,
      local: !e.apiKey,
      preview: e.apiKey
        ? (k.length > 12 ? `${k.slice(0, 6)}…${k.slice(-4)}` : "••••")
        : "anahtar yok (yerel)",
      model: e.model || AI_PROVIDERS[id].model || "",
      savedAt: e.updatedAt || 0,
      source: e.source || "manual",
      expiresAt: e.expiresAt || 0
    };
  }
  return { activeProvider: cfg.activeProvider || cfg.aiProvider, keys: out };
}

// Runtime ephemeral state
const attachedTabs = new Map(); // tabId -> { idleTimer, heldCdpKeys: Set }
let daemonSocket = null;
let daemonStatus = { connected: false, os: null, mpxAvailable: false, lastPing: 0 };
let reconnectTimer = null;

let agentState = {
  running: false,
  goal: "",
  targetTabId: null,
  step: 0,
  logs: [],
  abort: false
};

const pendingDaemonRpc = new Map(); // reqId -> { resolve, reject, timer }
let rpcSeq = 1;

// Storage helper compatible with callback & promise APIs
function getConfig() {
  return new Promise((resolve) => {
    api.storage.local.get(DEFAULT_CONFIG, (items) => {
      resolve({ ...DEFAULT_CONFIG, ...(items || {}) });
    });
  });
}

function saveConfig(patch) {
  return new Promise((resolve) => {
    api.storage.local.set(patch, () => resolve(true));
  });
}

// Gizli bilgileri günlükten temizle (API anahtarı, token, uzun hex)
function redactSecrets(text) {
  return String(text == null ? "" : text)
    .replace(/\b(sk-[A-Za-z0-9_-]{8,}|sk-or-v1-[A-Za-z0-9]{8,}|sk-xt-[A-Za-z0-9]{8,}|gsk_[A-Za-z0-9]{8,}|AIza[0-9A-Za-z_-]{10,}|xai-[A-Za-z0-9]{8,}|co-[A-Za-z0-9]{8,}|pplx-[A-Za-z0-9]{8,})/g, "[ANAHTAR GİZLENDİ]")
    .replace(/\b([A-Za-z0-9_-]{32,})\b/g, "[GİZLİ]")
    .replace(/(key|token|authorization|api[-_]?key)\s*[:=]\s*\S+/gi, "$1: [GİZLENDİ]");
}

function pushLog(level, message) {
  const entry = { ts: Date.now(), level, message: redactSecrets(message) };
  agentState.logs.push(entry);
  if (agentState.logs.length > 80) agentState.logs.shift();
  broadcastUiState();
}

function broadcastUiState() {
  try {
    api.runtime.sendMessage({
      __target: "ghostpilot_panel",
      type: "STATE_UPDATE",
      daemonStatus,
      agentState: {
        running: agentState.running,
        goal: agentState.goal,
        targetTabId: agentState.targetTabId,
        step: agentState.step,
        logs: agentState.logs.slice(-30)
      }
    }, () => {
      void api.runtime.lastError;
    });
  } catch (_) {}
}

function isUrlProtected(url, protectedDomains) {
  if (!url) return true;
  if (url.startsWith("chrome://") || url.startsWith("edge://") || url.startsWith("about:") || url.startsWith("moz-extension://") || url.startsWith("chrome-extension://")) {
    return true;
  }
  const lower = url.toLowerCase();
  return (protectedDomains || []).some((d) => d && lower.includes(String(d).toLowerCase()));
}

// ============================================================================
// 0. ERİŞİM KAPISI — Kullanıcı istediği an AI erişimini keser/askıya alır
// ============================================================================
let accessAudit = []; // son 60 erişim kararı (denetim kaydı)

function logAccess(entry) {
  accessAudit.push({ ts: Date.now(), ...entry });
  if (accessAudit.length > 60) accessAudit.shift();
}

/** Her AI eyleminin geçtiği tek kapı. İzin yoksa hata fırlatır. */
async function guardAccess(kind, tabId = null) {
  const cfg = await getConfig();
  const res = checkAccess(cfg, { kind, tabId });
  if (!res.allowed) {
    logAccess({ kind, tabId, allowed: false, mode: res.mode, reason: res.reason });
    pushLog("warn", `🚫 Erişim engellendi: ${res.reason}`);
    throw new Error(`Erişim engellendi: ${res.reason}`);
  }
  logAccess({ kind, tabId, allowed: true, mode: res.mode });
  return res;
}

/** Erişim modunu değiştirir; kilitlenince çalışan her şeyi anında keser. */
async function setAccessMode(mode, options = {}) {
  if (!ACCESS_MODES.includes(mode)) throw new Error(`Geçersiz erişim modu: ${mode}`);

  const patch = { accessMode: mode };
  if (mode === "locked") {
    patch.accessExpiresAt = 0;
    if (Array.isArray(options.allowedTabIds)) patch.allowedTabIds = options.allowedTabIds.map(Number);
  } else if (options.minutes !== undefined) {
    const mins = Number(options.minutes) || 0;
    patch.accessExpiresAt = mins > 0 ? Date.now() + mins * 60000 : 0;
  }
  if (Array.isArray(options.allowedTabIds) && mode !== "locked") {
    patch.allowedTabIds = options.allowedTabIds.map(Number);
  }

  await saveConfig(patch);

  if (mode === "locked") {
    const cfg = await getConfig();
    if (cfg.killSwitchOnLock !== false) {
      await triggerEmergencyStop();
      pushLog("warn", "🔒 ERİŞİM KİLİTLENDİ — Tüm AI kontrolü kesildi (tuşlar bırakıldı, görev iptal).");
    }
    // Daemon'a da kilidi bildir (masaüstü RPC'leri reddetsin)
    if (daemonSocket && daemonSocket.readyState === WebSocket.OPEN) {
      try { daemonSocket.send(JSON.stringify({ type: "access_mode", mode: "locked" })); } catch (_) {}
    }
  } else {
    if (daemonSocket && daemonSocket.readyState === WebSocket.OPEN) {
      try { daemonSocket.send(JSON.stringify({ type: "access_mode", mode })); } catch (_) {}
    }
    pushLog("success", `🔓 Erişim modu: ${ACCESS_LEVELS[mode].label}${patch.accessExpiresAt ? ` (${formatRemaining(patch.accessExpiresAt - Date.now())})` : ""}`);
  }

  broadcastUiState();
  return { ok: true, mode, accessExpiresAt: patch.accessExpiresAt ?? (await getConfig()).accessExpiresAt };
}

/** Zamanlı izin/kilit kontrolü — alarm ile periyodik çağrılır. */
async function enforceAccessExpiry() {
  const cfg = await getConfig();
  if (cfg.accessMode !== "locked" && cfg.accessExpiresAt && Date.now() > cfg.accessExpiresAt) {
    pushLog("warn", "⏱️ Zamanlı AI erişimi sona erdi → otomatik kilitlendi.");
    await saveConfig({ accessMode: "locked", accessExpiresAt: 0 });
    await triggerEmergencyStop();
    broadcastUiState();
    return true;
  }
  return false;
}

/** Panel/dış araç için özet durum. */
async function getAccessState() {
  const cfg = await getConfig();
  const expiresAt = cfg.accessExpiresAt || 0;
  return {
    mode: cfg.accessMode,
    modeLabel: (ACCESS_LEVELS[cfg.accessMode] || ACCESS_LEVELS.open).label,
    expiresAt,
    remainingMs: expiresAt ? Math.max(0, expiresAt - Date.now()) : 0,
    remainingLabel: expiresAt ? formatRemaining(Math.max(0, expiresAt - Date.now())) : "süresiz",
    allowedTabIds: cfg.allowedTabIds || [],
    confirmBeforeStart: !!cfg.confirmBeforeStart,
    killSwitchOnLock: cfg.killSwitchOnLock !== false,
    audit: accessAudit.slice(-25)
  };
}

// ============================================================================
// 1. CDP VIRTUAL INPUT ENGINE (Trusted Browser Hardware-Like Events, 0 OS Mouse Hijack)
// ============================================================================
const CDP_KEY_DEFS = {
  Enter: { key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 },
  Tab: { key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 },
  Backspace: { key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8 },
  Escape: { key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 },
  Space: { key: " ", code: "Space", windowsVirtualKeyCode: 32 },
  " ": { key: " ", code: "Space", windowsVirtualKeyCode: 32 },
  ArrowUp: { key: "ArrowUp", code: "ArrowUp", windowsVirtualKeyCode: 38 },
  ArrowDown: { key: "ArrowDown", code: "ArrowDown", windowsVirtualKeyCode: 40 },
  ArrowLeft: { key: "ArrowLeft", code: "ArrowLeft", windowsVirtualKeyCode: 37 },
  ArrowRight: { key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 },
  Shift: { key: "Shift", code: "ShiftLeft", windowsVirtualKeyCode: 16 },
  Control: { key: "Control", code: "ControlLeft", windowsVirtualKeyCode: 17 },
  Alt: { key: "Alt", code: "AltLeft", windowsVirtualKeyCode: 18 }
};

function getCdpKeyDef(rawKey) {
  if (CDP_KEY_DEFS[rawKey]) return CDP_KEY_DEFS[rawKey];
  if (rawKey && rawKey.length === 1) {
    const u = rawKey.toUpperCase();
    const isAlpha = u >= "A" && u <= "Z";
    const isDigit = u >= "0" && u <= "9";
    return {
      key: rawKey,
      code: isAlpha ? `Key${u}` : isDigit ? `Digit${u}` : "",
      windowsVirtualKeyCode: u.charCodeAt(0),
      text: rawKey
    };
  }
  return { key: rawKey || "", code: rawKey || "", windowsVirtualKeyCode: 0 };
}

function cdpSend(tabId, method, params = {}) {
  return new Promise((resolve, reject) => {
    chrome.debugger.sendCommand({ tabId }, method, params, (res) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(res);
      }
    });
  });
}

async function ensureCdpAttached(tabId) {
  if (!HAS_DEBUGGER) throw new Error("CDP bu tarayıcıda desteklenmiyor (Sentetik mod kullanılır).");
  let entry = attachedTabs.get(tabId);
  if (!entry) {
    await new Promise((resolve, reject) => {
      chrome.debugger.attach({ tabId }, "1.3", () => {
        if (chrome.runtime.lastError) {
          const msg = chrome.runtime.lastError.message || "";
          if (msg.includes("Already attached")) resolve();
          else reject(new Error(msg));
        } else {
          resolve();
        }
      });
    });
    entry = { idleTimer: null, heldCdpKeys: new Set() };
    attachedTabs.set(tabId, entry);
    // Keep target tab virtually focused even while minimized or in background!
    try {
      await cdpSend(tabId, "Emulation.setFocusEmulationEnabled", { enabled: true });
    } catch (_) {}
  }

  clearTimeout(entry.idleTimer);
  entry.idleTimer = setTimeout(() => detachCdpTab(tabId), 60000);
  return entry;
}

async function detachCdpTab(tabId) {
  const entry = attachedTabs.get(tabId);
  if (!entry) return;
  clearTimeout(entry.idleTimer);
  attachedTabs.delete(tabId);
  if (HAS_DEBUGGER) {
    chrome.debugger.detach({ tabId }, () => void chrome.runtime.lastError);
  }
}

if (HAS_DEBUGGER) {
  chrome.debugger.onDetach.addListener((source) => {
    if (source.tabId) attachedTabs.delete(source.tabId);
  });
}

// Communicate with content.js (injects dynamically if tab was already open before install)
async function sendToContent(tabId, payload) {
  const msg = { __target: "ghostpilot_content", ...payload };
  try {
    return await new Promise((resolve, reject) => {
      api.tabs.sendMessage(tabId, msg, (res) => {
        if (api.runtime.lastError) reject(new Error(api.runtime.lastError.message));
        else resolve(res);
      });
    });
  } catch (_) {
    // Tab eklentiden önce açılmışsa content.js'i bir kez enjekte et
    try {
      await api.scripting.executeScript({
        target: { tabId },
        files: ["content.js"]
      });
    } catch (injErr) {
      throw friendlyTabError(tabId, injErr);
    }
    try {
      return await new Promise((resolve, reject) => {
        api.tabs.sendMessage(tabId, msg, (res) => {
          if (api.runtime.lastError) reject(new Error(api.runtime.lastError.message));
          else resolve(res);
        });
      });
    } catch (sendErr) {
      throw friendlyTabError(tabId, sendErr);
    }
  }
}

// ---- Arayüz dili (panelden gelir, varsayılan Türkçe) -----------------------
async function getUiLang() {
  try {
    const r = await chrome.storage.local.get("uiLang");
    return r.uiLang === "en" ? "en" : "tr";
  } catch (e) { return "tr"; }
}

// Plan/doğrulama metinlerinin dili
function langLine(lang) {
  return lang === "en"
    ? "LANGUAGE: write ALL titles, details and done-criteria in ENGLISH. The user's interface language is English."
    : "DİL: tüm başlık, ayrıntı ve tamamlanma ölçütlerini TÜRKÇE yaz.";
}

// Teknik Chrome hatalarını anlaşılır Türkçe mesaja çevir
function friendlyTabError(tabId, err) {
  const raw = String(err && err.message ? err.message : err);
  const e = new Error(raw);
  if (/Cannot access a chrome-extension:\/\/ URL of different extension/i.test(raw) ||
      /Cannot access contents of (the )?url "?(chrome|extension|moz-extension)/i.test(raw) ||
      /Cannot access (a )?(chrome|about|edge):/i.test(raw)) {
    e.message =
      `Hedef sekme başka bir eklentinin veya tarayıcının kendi sayfası (sekme #${tabId}) — ` +
      `Chrome buraya erişime izin vermez. Çözüm: normal bir web sitesi sekmesi açın ` +
      `(örn. https://www.blogger.com) ve görevi o sekmede başlatın.`;
    e.gpKind = "bad_target";
  } else if (/No tab with id/i.test(raw)) {
    e.message = `Sekme #${tabId} kapanmış. Görev durduruldu — yeniden başlatın.`;
    e.gpKind = "bad_target";
  } else if (/The extensions gallery cannot be scripted/i.test(raw)) {
    e.message = "Chrome Web Store sayfaları otomasyona kapalıdır. Farklı bir site kullanın.";
    e.gpKind = "bad_target";
  } else if (/Cannot access contents of url "file:/i.test(raw)) {
    e.message =
      "Yerel dosya (file://) adreslerine erişim için eklenti ayarlarından izin vermelisiniz: " +
      "chrome://extensions → GhostPilot → Ayrıntılar → \"Dosya URL'lerine erişime izin ver\".";
    e.gpKind = "bad_target";
  }
  return e;
}

// Erişilemeyen (tarayıcı içi / başka eklenti) adresler — Chrome bunlara script enjekte etmez
const RESTRICTED_PREFIXES = [
  "chrome://", "chrome-untrusted://", "edge://", "brave://", "opera://", "vivaldi://",
  "about:", "view-source:", "devtools://", "data:", "javascript:",
  "chrome-extension://", "extension://", "moz-extension://", "safari-extension://",
  "https://chrome.google.com/webstore", "https://chromewebstore.google.com",
  "https://microsoftedge.microsoft.com/addons", "https://addons.mozilla.org"
];

function isRestrictedUrl(url) {
  if (!url) return true;
  const u = String(url).toLowerCase();
  return RESTRICTED_PREFIXES.some((p) => u.startsWith(p));
}

// Sekme gerçekten kontrol edilebilir mi? Adres + yükleme durumu
function tabProblem(tab) {
  if (!tab) return "Hedef sekme bulunamadı (kapatılmış olabilir).";
  const u = tab.url || tab.pendingUrl || "";
  if (!u) return "Sekmenin adresi henüz belli değil (sayfa yükleniyor). 1 saniye bekleyip tekrar deneyin.";
  if (u.startsWith("chrome-extension://") || u.startsWith("moz-extension://") || u.startsWith("extension://")) {
    return `Hedef sekme bir tarayıcı eklentisinin kendi sayfası (${u.slice(0, 60)}…). ` +
           `Chrome güvenlik gereği başka eklentilerin sayfalarına izin vermez. ` +
           `Çözüm: normal bir web sitesi sekmesi açın (örn. https://www.blogger.com) ve görevi o sekmede başlatın.`;
  }
  if (isRestrictedUrl(u)) {
    return `Bu adres tarayıcı tarafından korunuyor (${u.slice(0, 60)}…) — otomasyona kapalı. Normal bir web sayfası kullanın.`;
  }
  if (tab.status === "loading" && !tab.url) {
    return "Sayfa hâlâ yükleniyor. Kısa bir bekleme sonrası tekrar deneyin.";
  }
  return "";
}

async function getActiveOrTargetTab(explicitTabId = null) {
  let tab;
  if (explicitTabId) {
    tab = await new Promise((resolve, reject) => {
      api.tabs.get(Number(explicitTabId), (t) => {
        if (api.runtime.lastError || !t) reject(new Error("Hedef sekme bulunamadı."));
        else resolve(t);
      });
    });
  } else {
    const tabs = await new Promise((resolve) =>
      api.tabs.query({ active: true, lastFocusedWindow: true }, (res) => resolve(res || []))
    );
    if (!tabs.length) throw new Error("Açık aktif sekme bulunamadı.");
    tab = tabs[0];
  }
  const problem = tabProblem(tab);
  if (problem) {
    const e = new Error(problem);
    e.gpKind = "bad_target";
    throw e;
  }
  return tab;
}

// Kontrol edilebilir bir web sekmesi bul (yeni sekme eklentisi / chrome:// değil)
async function findWebTab(excludeTabId = null) {
  const tabs = await new Promise((resolve) => api.tabs.query({}, (res) => resolve(res || [])));
  const usable = tabs.filter((t) => t.id && t.id !== excludeTabId && t.url && !isRestrictedUrl(t.url));
  if (!usable.length) return null;
  // Aktif olanı tercih et
  return usable.find((t) => t.active) || usable.find((t) => /^https?:/.test(t.url)) || usable[0];
}

// Bir URL'yi yeni sekmede açar ve o sekmeyi hedef yapar
async function openInNewTab(url) {
  const created = await new Promise((resolve) =>
    api.tabs.create({ url, active: true }, (t) => resolve(t))
  );
  if (!created || !created.id) throw new Error("Yeni sekme açılamadı.");
  // Yüklenmesini bekle (en fazla 12 sn)
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 300));
    const t = await new Promise((resolve) =>
      api.tabs.get(created.id, (x) => resolve(api.runtime.lastError ? null : x))
    );
    if (t && t.status === "complete" && t.url && !isRestrictedUrl(t.url)) return t;
  }
  return await new Promise((resolve) => api.tabs.get(created.id, (x) => resolve(x)));
}

// Unified Browser Action Executor (works simultaneously with user's physical mouse/keyboard!)
async function executeBrowserAction(act, cfgOverride = null) {
  const cfg = cfgOverride || (await getConfig());
  const overlay = cfg.perfProfile === "eco" ? false : !!cfg.showGhostCursor;

  // ERİŞİM KAPISI: okuma ve girdi eylemlerini ayır, izin yoksa hiç ilerleme
  const READ_ONLY_ACTIONS = new Set(["read", "snapshot", "screenshot", "get_text", "query", "list_tabs"]);
  const kind = READ_ONLY_ACTIONS.has(act.action) ? "browser_read" : "browser_input";
  await guardAccess(kind, act.tabId != null ? act.tabId : null);

  if (act.action === "open_tab" || act.action === "navigate") {
    if (act.action === "open_tab" || !act.tabId) {
      if (act.action === "open_tab") {
        const created = await new Promise((resolve) =>
          api.tabs.create({ url: act.url, active: !!act.active }, resolve)
        );
        return { ok: true, tabId: created.id, url: created.url };
      }
    }
    let targetUrl = String(act.url || "").trim();
    if (!targetUrl) throw new Error("navigate eylemi için 'url' alanı gerekli.");
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = (targetUrl.includes(".") && !targetUrl.includes(" "))
        ? "https://" + targetUrl.replace(/^\/+/, "")
        : `https://www.google.com/search?q=${encodeURIComponent(targetUrl)}`;
    }
    if (act.newTab !== false) {
      const created = await openInNewTab(targetUrl);
      if (!created || !created.id) throw new Error("Yeni sekme açılamadı.");
      return { ok: true, tabId: created.id, url: created.url || targetUrl, newTab: true };
    }
    const tab = await getActiveOrTargetTab(act.tabId);
    await new Promise((resolve) => api.tabs.update(tab.id, { url: targetUrl }, resolve));
    await new Promise((r) => setTimeout(r, 1200));
    return { ok: true, tabId: tab.id, url: targetUrl };
  }

  let tab;
  try {
    tab = await getActiveOrTargetTab(act.tabId);
  } catch (err) {
    if (err.gpKind === "bad_target") {
      // Hedef kullanılamıyorsa kontrol edilebilir bir web sekmesine geç
      const alt = await findWebTab();
      if (alt) {
        pushLog("info", `Hedef sekme kullanılamıyor → sekme #${alt.id} kullanılıyor (${String(alt.url).slice(0, 50)}…)`);
        tab = alt;
      } else {
        throw new Error(
          "Kontrol edilebilir bir web sekmesi yok. " +
          "Blogger gibi bir siteyi normal sekmede açın, sonra görevi başlatın. " +
          "(Yeni sekme sayfası ve chrome:// sayfaları otomasyona kapalıdır.)"
        );
      }
    } else throw err;
  }
  if (isUrlProtected(tab.url, cfg.protectedDomains)) {
    throw new Error(`Güvenlik Koruması: Bu adres kısıtlı (${tab.url}). Ayarlardan izin verebilirsiniz.`);
  }

  const useCdp = HAS_DEBUGGER && (act.engine || cfg.inputEngine) === "cdp";
  if (!useCdp) {
    return await sendToContent(tab.id, {
      type: "SYNTHETIC_ACTION",
      payload: { ...act, overlay }
    });
  }

  // CDP Hardware-Trusted Virtual Input Path (0 physical OS cursor movement!)
  const cdpEntry = await ensureCdpAttached(tab.id);
  let x = act.x;
  let y = act.y;

  // If action targets refId or CSS selector, ask content.js for exact viewport center
  if ((x == null || y == null) && (act.refId != null || act.selector)) {
    const resolved = await sendToContent(tab.id, {
      type: "SYNTHETIC_ACTION",
      payload: { action: "resolve_ref", refId: act.refId, selector: act.selector, overlay }
    });
    x = resolved.x;
    y = resolved.y;
  }

  x = Math.round(Number(x ?? 400));
  y = Math.round(Number(y ?? 300));

  switch (act.action) {
    case "move": {
      await cdpSend(tab.id, "Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x,
        y,
        pointerType: "mouse"
      });
      if (overlay) {
        sendToContent(tab.id, {
          type: "SYNTHETIC_ACTION",
          payload: { action: "cursor_preview", x, y, pulse: false, label: "AI", overlay: true }
        }).catch(() => {});
      }
      return { ok: true, x, y, engine: "cdp" };
    }

    case "click":
    case "right_click":
    case "double_click": {
      const button = act.action === "right_click" ? "right" : "left";
      const clickCount = act.action === "double_click" ? 2 : 1;

      await cdpSend(tab.id, "Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
      await cdpSend(tab.id, "Input.dispatchMouseEvent", {
        type: "mousePressed",
        x,
        y,
        button,
        buttons: button === "right" ? 2 : 1,
        clickCount
      });
      await cdpSend(tab.id, "Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x,
        y,
        button,
        buttons: 0,
        clickCount
      });

      if (act.action === "double_click") {
        await cdpSend(tab.id, "Input.dispatchMouseEvent", {
          type: "mousePressed",
          x,
          y,
          button: "left",
          buttons: 1,
          clickCount: 2
        });
        await cdpSend(tab.id, "Input.dispatchMouseEvent", {
          type: "mouseReleased",
          x,
          y,
          button: "left",
          buttons: 0,
          clickCount: 2
        });
      }

      if (overlay) {
        sendToContent(tab.id, {
          type: "SYNTHETIC_ACTION",
          payload: { action: "cursor_preview", x, y, pulse: true, label: "TIK", overlay: true }
        }).catch(() => {});
      }
      return { ok: true, x, y, engine: "cdp" };
    }

    case "drag": {
      const fx = Math.round(Number(act.fromX ?? x));
      const fy = Math.round(Number(act.fromY ?? y));
      const tx = Math.round(Number(act.toX ?? x));
      const ty = Math.round(Number(act.toY ?? y));
      const steps = Math.max(4, Math.min(25, Number(act.steps || 8)));

      await cdpSend(tab.id, "Input.dispatchMouseEvent", { type: "mouseMoved", x: fx, y: fy });
      await cdpSend(tab.id, "Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: fx,
        y: fy,
        button: "left",
        buttons: 1,
        clickCount: 1
      });
      for (let i = 1; i <= steps; i++) {
        const ix = Math.round(fx + ((tx - fx) * i) / steps);
        const iy = Math.round(fy + ((ty - fy) * i) / steps);
        await cdpSend(tab.id, "Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: ix,
          y: iy,
          button: "left",
          buttons: 1
        });
      }
      await cdpSend(tab.id, "Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: tx,
        y: ty,
        button: "left",
        buttons: 0,
        clickCount: 1
      });
      if (overlay) {
        sendToContent(tab.id, {
          type: "SYNTHETIC_ACTION",
          payload: { action: "cursor_preview", x: tx, y: ty, pulse: true, label: "BIRAK", overlay: true }
        }).catch(() => {});
      }
      return { ok: true, x: tx, y: ty, engine: "cdp" };
    }

    case "type": {
      if (act.refId != null || act.selector || (act.x != null && act.y != null)) {
        await cdpSend(tab.id, "Input.dispatchMouseEvent", {
          type: "mousePressed",
          x,
          y,
          button: "left",
          clickCount: 1
        });
        await cdpSend(tab.id, "Input.dispatchMouseEvent", {
          type: "mouseReleased",
          x,
          y,
          button: "left",
          clickCount: 1
        });
      }
      if (!act.append && act.clearFirst) {
        // Select all + Backspace inside target element
        await sendToContent(tab.id, {
          type: "SYNTHETIC_ACTION",
          payload: { action: "type", refId: act.refId, selector: act.selector, x, y, text: "", overlay }
        });
      }
      await cdpSend(tab.id, "Input.insertText", { text: String(act.text ?? "") });
      if (act.pressEnter) {
        const enterDef = getCdpKeyDef("Enter");
        await cdpSend(tab.id, "Input.dispatchKeyEvent", { type: "keyDown", ...enterDef });
        await cdpSend(tab.id, "Input.dispatchKeyEvent", { type: "keyUp", ...enterDef });
      }
      if (overlay) {
        sendToContent(tab.id, {
          type: "SYNTHETIC_ACTION",
          payload: { action: "cursor_preview", x, y, pulse: true, label: "YAZI", overlay: true }
        }).catch(() => {});
      }
      return { ok: true, x, y, engine: "cdp" };
    }

    case "key": {
      const def = getCdpKeyDef(act.key);
      const mode = act.mode || "press";
      if (mode === "down") {
        cdpEntry.heldCdpKeys.add(act.key);
        await cdpSend(tab.id, "Input.dispatchKeyEvent", { type: "keyDown", ...def });
      } else if (mode === "up") {
        cdpEntry.heldCdpKeys.delete(act.key);
        await cdpSend(tab.id, "Input.dispatchKeyEvent", { type: "keyUp", ...def });
      } else if (mode === "hold") {
        const dur = Math.min(15000, Math.max(30, Number(act.durationMs || 450)));
        cdpEntry.heldCdpKeys.add(act.key);
        await cdpSend(tab.id, "Input.dispatchKeyEvent", { type: "keyDown", ...def });
        setTimeout(() => {
          if (cdpEntry.heldCdpKeys.has(act.key)) {
            cdpEntry.heldCdpKeys.delete(act.key);
            cdpSend(tab.id, "Input.dispatchKeyEvent", { type: "keyUp", ...def }).catch(() => {});
          }
        }, dur);
      } else {
        await cdpSend(tab.id, "Input.dispatchKeyEvent", { type: "keyDown", ...def });
        await cdpSend(tab.id, "Input.dispatchKeyEvent", { type: "keyUp", ...def });
      }
      return { ok: true, key: act.key, mode, engine: "cdp" };
    }

    case "scroll": {
      await cdpSend(tab.id, "Input.dispatchMouseEvent", {
        type: "mouseWheel",
        x,
        y,
        deltaX: Number(act.deltaX || 0),
        deltaY: Number(act.deltaY ?? 360)
      });
      return { ok: true, engine: "cdp" };
    }

    case "wait": {
      await new Promise((r) => setTimeout(r, Math.min(10000, Math.max(0, Number(act.ms || 100)))));
      return { ok: true };
    }

    default:
      return await sendToContent(tab.id, {
        type: "SYNTHETIC_ACTION",
        payload: { ...act, overlay }
      });
  }
}

// Low-Overhead Screenshot Helper (WebP + Configurable Quality, works on background tabs via CDP!)
async function captureBrowserFrame(tabId = null, quality = 45, preferCanvas = true) {
  const cfg = await getConfig();
  const tab = await getActiveOrTargetTab(tabId);

  // Fast path for HTML5/2D Canvas games: grab downscaled WebP straight from canvas (<2ms)
  if (preferCanvas) {
    try {
      const cRes = await sendToContent(tab.id, {
        type: "CANVAS_FRAME",
        maxWidth: cfg.perfProfile === "game" ? 800 : 640,
        quality: quality / 100
      });
      if (cRes?.ok && cRes.frame?.dataUrl) {
        return { ok: true, tabId: tab.id, ...cRes.frame };
      }
    } catch (_) {}
  }

  // Background-capable CDP WebP capture (does NOT require tab to be visible on screen!)
  if (HAS_DEBUGGER && cfg.inputEngine === "cdp") {
    try {
      await ensureCdpAttached(tab.id);
      const shot = await cdpSend(tab.id, "Page.captureScreenshot", {
        format: "webp",
        quality: Math.max(15, Math.min(85, quality)),
        optimizeForSpeed: true
      });
      if (shot?.data) {
        return {
          ok: true,
          tabId: tab.id,
          dataUrl: `data:image/webp;base64,${shot.data}`,
          source: "cdp_webp"
        };
      }
    } catch (_) {}
  }

  // Standard fallback for active visible tab
  const dataUrl = await new Promise((resolve, reject) => {
    api.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: Math.max(20, quality) }, (url) => {
      if (api.runtime.lastError || !url) reject(new Error(api.runtime.lastError?.message || "Ekran görüntüsü alınamadı."));
      else resolve(url);
    });
  });
  return { ok: true, tabId: tab.id, dataUrl, source: "visible_tab" };
}

// Emergency Panic Stop: instantly releases all CDP + Synthetic + Desktop OS keys & stops AI loop
async function triggerEmergencyStop() {
  agentState.abort = true;
  agentState.running = false;
  pushLog("warn", "ACİL DURDURMA (Alt+Shift+X): Tüm sanal tuşlar ve AI görevleri durduruldu.");

  for (const [tabId, entry] of attachedTabs.entries()) {
    for (const rawKey of entry.heldCdpKeys) {
      const def = getCdpKeyDef(rawKey);
      cdpSend(tabId, "Input.dispatchKeyEvent", { type: "keyUp", ...def }).catch(() => {});
    }
    entry.heldCdpKeys.clear();
  }

  api.tabs.query({}, (tabs) => {
    for (const t of tabs || []) {
      if (t.id) {
        api.tabs.sendMessage(t.id, { __target: "ghostpilot_content", type: "EMERGENCY_STOP" }, () => {
          void api.runtime.lastError;
        });
      }
    }
  });

  if (daemonSocket && daemonSocket.readyState === WebSocket.OPEN) {
    daemonSocket.send(JSON.stringify({ type: "emergency_stop" }));
  }
  broadcastUiState();
}

// ============================================================================
// 2. DESKTOP OS & MCP WEBSOCKET BRIDGE (Connects to ghostpilot_daemon.py)
// ============================================================================
async function connectDaemon() {
  const cfg = await getConfig();
  if (!cfg.autoConnectDaemon) return;
  if (daemonSocket && (daemonSocket.readyState === WebSocket.OPEN || daemonSocket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  clearTimeout(reconnectTimer);
  const sep = cfg.daemonUrl.includes("?") ? "&" : "?";
  const wsUrl = `${cfg.daemonUrl}${sep}role=extension&token=${encodeURIComponent(cfg.daemonToken)}`;

  try {
    const ws = new WebSocket(wsUrl);
    daemonSocket = ws;

    ws.onopen = () => {
      daemonStatus.connected = true;
      daemonStatus.lastPing = Date.now();
      broadcastUiState();
      ws.send(JSON.stringify({ type: "hello", client: "ghostpilot_extension", version: "1.0.0" }));
    };

    ws.onmessage = async (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch (_) {
        return;
      }

      if (msg.type === "daemon_info") {
        daemonStatus.os = msg.os;
        daemonStatus.mpxAvailable = !!msg.mpxAvailable;
        broadcastUiState();
        return;
      }

      // Response to an extension->daemon desktop RPC call
      if (msg.type === "rpc_response" && msg.id && pendingDaemonRpc.has(msg.id)) {
        const p = pendingDaemonRpc.get(msg.id);
        clearTimeout(p.timer);
        pendingDaemonRpc.delete(msg.id);
        if (msg.ok === false) p.reject(new Error(msg.error || "Masaüstü köprü hatası"));
        else p.resolve(msg.result);
        return;
      }

      // Yerleşik tarayıcı OAuth akışı tamamlandığında kodu buraya iletir
      if (msg.type === "oauth_callback" && oauthPending) {
        const p = oauthPending;
        oauthPending = null;
        clearTimeout(p.timer);
        try { p.tabId && api.tabs.remove(p.tabId); } catch (_) {}
        if (msg.error) {
          p.reject(new Error(`Yetkilendirme reddedildi: ${msg.error}`));
        } else {
          p.resolve(msg);
        }
        return;
      }

      // Incoming command from MCP (Claude/Cursor) or External Python/Game Bot -> Browser!
      if (msg.type === "browser_rpc" && msg.id) {
        try {
          const result = await handleExternalBrowserRpc(msg.method, msg.params || {});
          ws.send(JSON.stringify({ type: "browser_rpc_response", id: msg.id, ok: true, result }));
        } catch (err) {
          ws.send(
            JSON.stringify({
              type: "browser_rpc_response",
              id: msg.id,
              ok: false,
              error: String(err.message || err)
            })
          );
        }
      }
    };

    ws.onclose = () => {
      daemonStatus.connected = false;
      daemonSocket = null;
      broadcastUiState();
      reconnectTimer = setTimeout(connectDaemon, 6000);
    };

    ws.onerror = () => {
      try { ws.close(); } catch (_) {}
    };
  } catch (_) {
    reconnectTimer = setTimeout(connectDaemon, 8000);
  }
}

const DESKTOP_READ_METHODS = new Set(["list_windows", "window_capture", "toggle_linux_mpx"]);

function callDesktopDaemon(method, params = {}, timeoutMs = 8000) {
  return new Promise(async (resolve, reject) => {
    // ERİŞİM KAPISI: masaüstü girdi metotları da kilitte reddedilir
    try {
      await guardAccess(DESKTOP_READ_METHODS.has(method) ? "desktop_read" : "desktop_input");
    } catch (err) {
      return reject(err);
    }
    if (!daemonSocket || daemonSocket.readyState !== WebSocket.OPEN) {
      return reject(new Error("Yerel Masaüstü Köprüsü (ghostpilot_daemon.py) bağlı değil."));
    }
    const id = `ext_${rpcSeq++}`;
    const timer = setTimeout(() => {
      pendingDaemonRpc.delete(id);
      reject(new Error(`Masaüstü komutu zaman aşımına uğradı: ${method}`));
    }, timeoutMs);

    pendingDaemonRpc.set(id, { resolve, reject, timer });
    daemonSocket.send(JSON.stringify({ type: "desktop_rpc", id, method, params }));
  });
}

async function handleExternalBrowserRpc(method, params) {
  switch (method) {
    case "list_tabs": {
      const tabs = await new Promise((resolve) => api.tabs.query({}, resolve));
      return (tabs || []).map((t) => ({
        id: t.id,
        active: t.active,
        title: t.title,
        url: t.url,
        windowId: t.windowId
      }));
    }
    case "snapshot": {
      const tab = await getActiveOrTargetTab(params.tabId);
      const res = await sendToContent(tab.id, { type: "SNAPSHOT", maxItems: params.maxItems || 90 });
      return { tabId: tab.id, ...res.snapshot };
    }
    case "screenshot": {
      return await captureBrowserFrame(params.tabId, params.quality || 45, params.preferCanvas !== false);
    }
    case "action": {
      return await executeBrowserAction(params);
    }
    case "batch": {
      const cfg = await getConfig();
      const results = [];
      for (const step of params.steps || []) {
        if (agentState.abort) break;
        results.push(await executeBrowserAction({ ...step, tabId: step.tabId ?? params.tabId }, cfg));
      }
      return { ok: true, count: results.length, results };
    }
    case "emergency_stop": {
      await triggerEmergencyStop();
      return { ok: true };
    }
    default:
      throw new Error(`Bilinmeyen browser RPC metodu: ${method}`);
  }
}

// ============================================================================
// 3. BUILT-IN LIGHTWEIGHT AUTONOMOUS AI AGENT (Ollama / OpenAI / Gemini / Claude)
// ============================================================================
const AGENT_SYSTEM_PROMPT = (uiLang) => `Sen GhostPilot otonom bilgisayar ve tarayıcı ajanısın. Kullanıcının fiziksel faresini veya klavyesini ASLA engellemeden sanal girdi ile çalışırsın.
Sana aktif sekmenin kompakt etkileşimli DOM listesi ([id] <etiket> "metin" @(x,y)) ve varsa masaüstü pencereleri verilecek.
Her adımda SADECE tek bir geçerli JSON nesnesi döndür (başka açıklama metni ekleme):
{
  "thought": "${uiLang === "en" ? "Short English thought (1 sentence)" : "Kısa Türkçe düşünce (1 cümle)"}",
  "action": "click" | "right_click" | "double_click" | "type" | "key" | "scroll" | "drag" | "navigate" | "wait" | "desktop_click" | "desktop_key" | "done",
  "refId": 5,
  "x": 420,
  "y": 310,
  "text": "yazılacak metin",
  "pressEnter": true,
  "key": "w",
  "mode": "press",
  "durationMs": 500,
  "deltaY": 350,
  "url": "https://...",
  "newTab": true,
  "windowId": "hedef_pencere_id_veya_baslik",
  "summary": "Görev bittiyse sonuç özeti"
}
ÖNEMLİ KURALLAR:
- Sekme bir eklenti sayfasıysa (chrome-extension://, chrome://, "Yeni Sekme") veya DOM listesi boşsa,
  ASLA tıklama denemesi; bunun yerine {"action":"navigate","url":"https://hedef-site.com","newTab":true} kullan.
- Bir siteye gitmek için tarayıcı arayüzüne (adres çubuğu, yeni sekme kutucukları) TIKLAMA.
  Sadece "navigate" eylemini kullan.
- Blog/panel gibi sitelerde giriş yapılmamışsa kullanıcıya "done" ile durumu bildir, zorla denemeye devam etme.`;

// Low-overhead fetch with exponential backoff for rate limits / transient 5xx
async function fetchWithRetry(url, options, { retries = 2, timeoutMs = 45000 } = {}) {
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const resp = await fetch(url, { ...options, signal: ctrl.signal });
      clearTimeout(timer);
      if (resp.ok || ![429, 500, 502, 503, 504].includes(resp.status) || attempt === retries) {
        return resp;
      }
      lastErr = new Error(`HTTP ${resp.status}`);
      await new Promise((r) => setTimeout(r, 600 * Math.pow(2, attempt)));
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 600 * Math.pow(2, attempt)));
    }
  }
  throw lastErr || new Error("Bağlantı kurulamadı.");
}

function imageParts(imageDataUrl) {
  const [meta, b64] = String(imageDataUrl || "").split(",");
  const mediaType = meta.includes("webp") ? "image/webp" : meta.includes("png") ? "image/png" : "image/jpeg";
  return { b64, mediaType };
}

// One unified call for every provider style. Returns raw text reply.
// Turns a failed provider response into an actionable Turkish message.
// Ücretsiz/kotasız alternatif önerisi (kullanıcıya tek satırda söylenir)
// Model adları zamana göre değişir (örn. gemini-2.0-flash → 404).
// Sırayla denenir; hiçbiri tutmazsa /models listesinden canlı keşif yapılır.
const MODEL_FALLBACKS = {
  gemini:  ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-2.5-flash"],
  gemini_oa: ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-2.5-flash"],
  openai:  ["gpt-5.1-mini", "gpt-5-mini", "gpt-4.1-mini", "gpt-4o-mini"],
  anthropic: ["claude-sonnet-4-6", "claude-sonnet-4-5", "claude-3-5-sonnet-latest", "claude-3-5-haiku-latest"],
  groq:    ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
  openrouter: ["google/gemini-3.8-flash:free", "meta-llama/llama-3.3-70b-instruct:free", "deepseek/deepseek-chat-v3:free"],
  // xKiro: ücretsiz katmandaki (access_tier=free) en güçlü modeller önce
  // Not: hepsi access_tier=free ve 128k+ bağlam — ajan görevleri için yeterli
  xkiro:   ["mistralai/mistral-medium-3.5", "cohere/command-a-plus", "mistralai/mistral-small-2603",
            "mistralai/mistral-large-2512", "cohere/command-a", "sensenova/sensenova-6.8-flash-lite",
            "mistralai/ministral-14b", "cohere/command-a-reasoning", "cohere/north-mini-code",
            "mistralai/ministral-8b", "stealth/big-pickle"],
  xkiro_an: ["anthropic/claude-sonnet-4.6", "anthropic/claude-opus-5.5"]
};

const FREE_ALTERNATIVES = {
  openai: "Gemini (ücretsiz kota) · Groq (ücretsiz) · OpenRouter (:free modeller)",
  anthropic: "Gemini (ücretsiz kota) · Groq (ücretsiz) · OpenRouter (:free modeller)",
  xai: "Gemini · Groq · OpenRouter (:free)",
  together: "Groq · SiliconFlow · OpenRouter (:free)",
  fireworks: "Groq · SiliconFlow · OpenRouter (:free)",
  perplexity: "Gemini · Groq · OpenRouter (:free)",
  anyscale: "Groq · SiliconFlow · Ollama (yerel)",
  deepseek: "ModelScope · SiliconFlow · Groq",
  qwen: "ModelScope (2000/gün) · SiliconFlow · Groq",
  kimi: "ModelScope · SiliconFlow",
  zhipu: "SiliconFlow · ModelScope",
  doubao: "SiliconFlow · ModelScope",
  ernie: "ModelScope · SiliconFlow",
  hunyuan: "SiliconFlow · ModelScope",
  minimax: "SiliconFlow · ModelScope",
  sakana: "PLaMo (ücretsiz plan) · Sarashina (ücretsiz beta)",
  plamo: "Sarashina (ücretsiz beta) · Ollama (yerel)",
  default: "Gemini · Groq · OpenRouter (:free) · Ollama (yerel, tamamen ücretsiz)"
};

async function providerError(p, resp) {
  const body = await safeErrText(resp);
  const low = body.toLowerCase();
  let text = "";
  let kind = "http";

  // --- Kota / kredi bitmesi: 429'un en yaygın nedeni (limit değil!) ---
  const noCredit =
    low.includes("insufficient_quota") ||
    low.includes("no credits") ||
    low.includes("exceeded your current quota") ||
    low.includes("billing") ||
    low.includes("payment required") ||
    low.includes("余额") ||
    low.includes("欠费");

  if (noCredit) {
    kind = "no_credit";
    text = `${p.name}: HESABINDA KREDİ KALMADI (anahtar doğru, sorun ödeme). ` +
      `Kredi ekleyin → ` + (p.id === "openai"
        ? "https://platform.openai.com/settings/organization/billing"
        : p.id === "anthropic"
          ? "https://console.anthropic.com/settings/billing"
          : "sağlayıcının faturalandırma sayfası") +
      ` · Ya da ÜCRETSİZ olarak devam edin: ${FREE_ALTERNATIVES[p.id] || FREE_ALTERNATIVES.default}`;
  } else if (resp.status === 429) {
    kind = "rate_limit";
    text = `${p.name}: istek limiti aşıldı (kısa süre bekleyip tekrar deneyin). ` +
      `Yoğun kullanımda ücretsiz kota hızla dolar. Alternatif: ${FREE_ALTERNATIVES[p.id] || FREE_ALTERNATIVES.default}`;
  } else {
    const hints = {
      401: "API anahtarı geçersiz veya eksik",
      402: "Ödeme gerekli — hesaba kredi yükleyin",
      403: "Bu anahtarın bu modele erişim yetkisi yok (bazı modeller onay ister)",
      404: "Base URL veya model adı hatalı (yerel sunucu çalışmıyor olabilir)",
      422: "Model adı sağlayıcıda bulunamadı",
      500: "Sağlayıcı tarafında geçici hata",
      502: "Sağlayıcı geçici olarak yanıt vermiyor",
      503: "Sağlayıcı şu anda meşgul / model yüklü değil"
    };
    // Context aşımı / model bulunamadı ayrımı
    if (low.includes("context_length") || low.includes("too many tokens")) {
      text = `${p.name}: Görev için gereken metin modelin bağlam sınırını aştı. Panelde "Maks. Adım"ı düşürün veya daha uzun bağlamlı model seçin.`;
    } else if (
      resp.status === 404 ||
      low.includes("model_not_found") ||
      low.includes("does not exist") ||
      low.includes("no longer available") ||
      low.includes("is not found") ||
      low.includes("not supported for generatecontent") ||
      low.includes("unknown model")
    ) {
      kind = "bad_model";
      // Sağlayıcının önerdiği yeni modeli hatadan çıkar (varsa)
      const sug =
        body.match(/use\s+(?:the\s+)?models?\/([a-z0-9.\-]+)/i) ||
        body.match(/use\s+([a-z0-9.\-]{3,})/i) ||
        body.match(/models\/([a-z0-9.\-]+)/i);
      const e0 = new Error("__bad_model__");
      e0.__gpHandled = true;
      e0.gpKind = "bad_model";
      e0.gpSuggested = sug ? sug[1] : "";
      e0.gpBadModel = p.model;
      e0.gpBody = body;
      throw e0;
    } else {
      const hint = hints[resp.status] ? ` → ${hints[resp.status]}` : "";
      text = `${p.name} API Hatası (${resp.status})${hint}${body ? ` — ${body}` : ""}`;
    }
  }

  const e = new Error(text);
  e.__gpHandled = true;
  e.gpKind = kind;
  return e;
}

function networkError(p, err) {
  const msg = String(err?.message || err);
  let text;
  if (/abort/i.test(msg)) text = `${p.name}: Bağlantı 45 saniyede yanıt vermedi (zaman aşımı).`;
  else if (/fetch failed|Failed to fetch|NetworkError|ENOTFOUND|ECONNREFUSED|parse URL/i.test(msg) && /127\.0\.0\.1|localhost/.test(p.baseUrl)) {
    text = `${p.name}: Yerel sunucuya ulaşılamadı (${p.baseUrl}). Ollama/LM Studio çalışıyor mu? "ollama serve" komutunu kontrol edin.`;
  } else if (/parse URL/i.test(msg)) {
    text = `${p.name}: Base URL geçersiz — tam adresi yazın (örn. https://api.openai.com/v1).`;
  } else {
    text = `${p.name}: Ağ hatası — ${msg}. Base URL'yi ve internet bağlantınızı kontrol edin.`;
  }
  const e = new Error(text);
  e.__gpHandled = true;
  return e;
}

async function queryLlm(cfg, userPrompt, imageDataUrl = null) {
  try {
    return await queryLlmInner(cfg, userPrompt, imageDataUrl);
  } catch (err) {
    if (err && err.__gpHandled) throw err;
    const wrapped = networkError(resolveProvider(cfg), err);
    wrapped.__gpHandled = true;
    throw wrapped;
  }
}

async function queryLlmInner(cfg, userPrompt, imageDataUrl = null, providerOverride = null) {
  const uiLang = await getUiLang();
  const AGENT_SYSTEM_PROMPT_TXT = AGENT_SYSTEM_PROMPT(uiLang);
  const p = providerOverride || resolveProvider(cfg);
  if (p.keyRequired && !p.apiKey) {
    throw new Error(`${p.name}: API anahtarı gerekli. Panel → AI & Performans bölümünden ekleyin.`);
  }
  if (!p.baseUrl) throw new Error(`${p.name}: Base URL boş. Panelden adresi girin.`);
  if (!p.model) throw new Error(`${p.name}: Model adı boş. Panelden model seçin veya yazın.`);

  const useImage = !!(imageDataUrl && p.vision);

  // ---- Anthropic (Messages API) ----
  if (p.style === "anthropic") {
    const content = [];
    if (useImage) {
      const { b64, mediaType } = imageParts(imageDataUrl);
      content.push({ type: "image", source: { type: "base64", media_type: mediaType, data: b64 } });
    }
    content.push({ type: "text", text: userPrompt });
    const resp = await fetchWithRetry(`${p.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": p.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: p.model,
        max_tokens: 450,
        system: AGENT_SYSTEM_PROMPT_TXT,
        messages: [{ role: "user", content }]
      })
    });
    if (!resp.ok) throw await providerError(p, resp);
    const data = await resp.json();
    return data.content?.[0]?.text || "{}";
  }

  // ---- Google Gemini (native generateContent) ----
  if (p.style === "gemini") {
    const parts = [{ text: `${AGENT_SYSTEM_PROMPT_TXT}\n\n${userPrompt}` }];
    if (useImage) {
      const { b64, mediaType } = imageParts(imageDataUrl);
      parts.push({ inline_data: { mime_type: mediaType, data: b64 } });
    }
    const resp = await fetchWithRetry(`${p.baseUrl}/models/${encodeURIComponent(String(p.model).replace(/^models\//, ""))}:generateContent?key=${encodeURIComponent(p.apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { temperature: 0.15, maxOutputTokens: 450 }
      })
    });
    if (!resp.ok) throw await providerError(p, resp);
    const data = await resp.json();
    return data.candidates?.[0]?.content?.parts?.map((x) => x.text || "").join("") || "{}";
  }

  // ---- Cohere (Chat API) ----
  if (p.style === "cohere") {
    const resp = await fetchWithRetry(`${p.baseUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.apiKey}` },
      body: JSON.stringify({
        model: p.model,
        temperature: 0.15,
        max_tokens: 450,
        system: AGENT_SYSTEM_PROMPT_TXT,
        messages: [{ role: "user", content: userPrompt }]
      })
    });
    if (!resp.ok) throw await providerError(p, resp);
    const data = await resp.json();
    return data.message?.content?.[0]?.text || data.text || "{}";
  }

  // ---- Azure OpenAI (deployment + api-version) ----
  if (p.style === "azure") {
    const url = `${p.baseUrl}/openai/deployments/${encodeURIComponent(p.model)}/chat/completions?api-version=2024-10-21`;
    const resp = await fetchWithRetry(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": p.apiKey },
      body: JSON.stringify({
        temperature: 0.15,
        max_tokens: 400,
        messages: [
          { role: "system", content: AGENT_SYSTEM_PROMPT_TXT },
          { role: "user", content: useImage ? [{ type: "text", text: userPrompt }, { type: "image_url", image_url: { url: imageDataUrl } }] : userPrompt }
        ]
      })
    });
    if (!resp.ok) throw await providerError(p, resp);
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || "{}";
  }

  // ---- OpenAI-compatible (OpenAI, Ollama, LM Studio, llama.cpp, OpenRouter, Groq, DeepSeek,
  //      Together, Mistral, xAI, Perplexity, Fireworks, Anyscale, Gemini-OpenAI, Custom...) ----
  const headers = { "Content-Type": "application/json" };
  if (p.apiKey) headers.Authorization = `Bearer ${p.apiKey}`;
  if (p.id === "openrouter") {
    headers["HTTP-Referer"] = "https://ghostpilot.local";
    headers["X-Title"] = "GhostPilot";
  }
  const userContent = useImage
    ? [{ type: "text", text: userPrompt }, { type: "image_url", image_url: { url: imageDataUrl } }]
    : userPrompt;

  const resp = await fetchWithRetry(`${p.baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: p.model,
      temperature: 0.15,
      [p.maxTokensParam]: 400,
      messages: [
        { role: "system", content: AGENT_SYSTEM_PROMPT_TXT },
        { role: "user", content: userContent }
      ]
    })
  });
  if (!resp.ok) throw await providerError(p, resp);
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "{}";
}

async function safeErrText(resp) {
  try {
    const t = await resp.text();
    return t.slice(0, 220).replace(/\s+/g, " ").trim();
  } catch (_) {
    return "";
  }
}

// ============================================================================
//  OTOMATİK SAĞLAYICI DEVRİ (Failover)
//  Token/kota biterse, anahtar geçersizse ya da model çalışmazsa:
//  sıradaki hazır sağlayıcıya geçer ve göreve KALDIĞI YERDEN devam eder.
// ============================================================================

// Devralma sırası: ücretsiz ve hızlı olanlar önce
const FAILOVER_ORDER = ["xkiro", "gemini", "groq", "openrouter", "modelscope", "ollama", "lmstudio", "llamacpp"];

// Bu hatalar sağlayıcı değiştirmeyi GEREKTİRİR (model hatası hariç)
const SWITCHABLE_KINDS = new Set(["no_credit", "rate_limit", "bad_model", "auth", "unavailable"]);

function isSwitchable(err) {
  if (!err) return false;
  const k = err.gpKind;
  if (k && SWITCHABLE_KINDS.has(k)) return true;
  const m = String(err.message || err).toLowerCase();
  return /kota|kredi|quota|429|402|401|403|timeout|zaman aşım|yanıt vermedi|overloaded|aşırı yük|bağlam sınırı|context_length|too many tokens|geçici olarak|meşgul|bağlantı kurulamadı/.test(m);
}

// Hangi sağlayıcılar kullanılabilir durumda? (anahtarı var / yerel çalışıyor)
async function availableProviders(exclude = []) {
  const cfg = await getConfig();
  const store = cfg.keyStore || {};
  const out = [];
  for (const id of FAILOVER_ORDER) {
    if (exclude.includes(id)) continue;
    const preset = AI_PROVIDERS[id];
    if (!preset) continue;
    const e = store[id];
    if (preset.keyRequired) {
      if (!e || !e.apiKey) continue;
      if (e.expiresAt && Date.now() > e.expiresAt) continue;   // süresi dolmuş
    }
    out.push(id);
  }
  // Yerel sunucular (anahtarsız) yalnızca GERÇEKTEN çalışıyorsa kullanılabilir
  const localIds = ["ollama", "lmstudio", "llamacpp"];
  if (out.some((id) => localIds.includes(id))) {
    let live = [];
    try {
      live = (await detectLocalServers()).map((x) => x.id);
    } catch (_) {}
    for (const id of localIds) {
      if (!live.includes(id)) {
        const i = out.indexOf(id);
        if (i !== -1) out.splice(i, 1);
      }
    }
  }
  return out;
}

// Sıradaki sağlayıcıyı seç ve aktif yap
async function switchProvider(excludeIds = []) {
  const cands = await availableProviders(excludeIds);
  if (!cands.length) return null;
  const next = cands[0];
  await saveConfig({ activeProvider: next, aiProvider: next });
  const cfg = await getConfig();
  const p = resolveProvider(cfg);
  pushLog("warn", `🔄 Sağlayıcı değişti → ${p.name} (${p.model || "varsayılan model"})`);
  return p;
}

// Sağlayıcıya özel kota/token kullanımını kaydet
async function recordProviderUsage(providerId, ok, errKind) {
  try {
    const cfg = await getConfig();
    const stats = { ...(cfg.providerStats || {}) };
    const st = stats[providerId] || { calls: 0, fails: 0, lastFail: 0, lastFailKind: "" };
    if (ok) {
      st.calls = (st.calls || 0) + 1;
      st.failureStreak = 0;
    } else {
      st.fails = (st.fails || 0) + 1;
      st.lastFail = Date.now();
      st.lastFailKind = errKind || "unknown";
      st.failureStreak = (st.failureStreak || 0) + 1;
    }
    stats[providerId] = st;
    await saveConfig({ providerStats: stats });
  } catch (_) {}
}

// ---- Model adı çözücü ---------------------------------------------------
// Amaç: kullanıcı hiçbir zaman "model artık yok" hatasıyla uğraşmasın.
// 1) Mevcut modeli dene. 2) 404/not-found ise bilinen zinciri dene.
// 3) O da olmazsa sağlayıcının /models listesinden canlı seç.
// 4) Bulunan modeli anahtar deposuna yaz → bir daha aramaya gerek kalmaz.
let modelCache = {};      // { providerId: {model, at} }

async function discoverModels(p) {
  try {
    const headers = {};
    let url;
    if (p.style === "gemini") {
      url = `${p.baseUrl}/models?key=${encodeURIComponent(p.apiKey)}&pageSize=200`;
    } else if (p.style === "anthropic") {
      url = `${p.baseUrl}/models?limit=100`;
      headers["x-api-key"] = p.apiKey;
      headers["anthropic-version"] = "2023-06-01";
      headers["anthropic-dangerous-direct-browser-access"] = "true";
    } else {
      url = `${p.baseUrl}/models`;
      if (p.apiKey) headers.Authorization = `Bearer ${p.apiKey}`;
    }
    const resp = await fetchWithRetry(url, { method: "GET", headers }, { retries: 0, timeoutMs: 12000 });
    if (!resp.ok) return [];
    const data = await resp.json();
    let list = (data.models || data.data || []).map((m) => (typeof m === "string" ? m : m.id || m.name || ""));
    if (p.style === "gemini") {
      list = list
        .map((n) => String(n).replace(/^models\//, ""))
        .filter((n) => /^gemini-|^gemma-/.test(n))
        .filter((n) => !/embedding|aqa|tts|live|image|vision-|native-audio|robotics|computer-use/i.test(n));
      // Yeni sürüm önce: 4 > 3.8 > 3.6 > 3.5 > 3.1 > 2.5
      const score = (n) => {
        const m = n.match(/gemini-(\d+)(?:\.(\d+))?/);
        if (!m) return 0;
        let v = Number(m[1]) * 100 + Number(m[2] || 0);
        if (/flash-lite/.test(n)) v -= 5;
        else if (/flash/.test(n)) v += 3;
        if (/pro/.test(n)) v += 2;
        if (/preview|exp/.test(n)) v -= 20;
        return v;
      };
      list.sort((a, b) => score(b) - score(a));
    } else {
      list = list.filter(Boolean);
    }
    return list.slice(0, 40);
  } catch (_) {
    return [];
  }
}

async function resolveModel(p, cfg, opts = {}) {
  const tried = [];
  const cached = modelCache[p.id];
  const bad = new Set((opts.skip || []).filter(Boolean));
  const chain = [
    ...(opts.prefer ? [opts.prefer] : []),
    p.model,
    ...(MODEL_FALLBACKS[p.id] || []),
    ...(cached ? [cached.model] : [])
  ].filter((m) => m && !bad.has(m));

  for (const m of [...new Set(chain)]) {
    tried.push(m);
    try {
      await queryLlmInner({ ...cfg, aiModel: m }, opts.prompt || 'Sadece şu JSON ile cevap ver: {"ok":true}', null, { ...p, model: m });
      modelCache[p.id] = { model: m, at: Date.now() };
      return { model: m, tried };
    } catch (err) {
      if (err.gpKind !== "bad_model") throw err;   // 404 değilse (kota/anahtar) zinciri sürdürmenin anlamı yok
    }
  }

  // Zincir tutmadı → canlı keşif
  const live = await discoverModels(p);
  for (const m of live.slice(0, 6)) {
    try {
      await queryLlmInner({ ...cfg, aiModel: m }, opts.prompt || 'Sadece şu JSON ile cevap ver: {"ok":true}', null, { ...p, model: m });
      modelCache[p.id] = { model: m, at: Date.now() };
      return { model: m, tried: [...tried, m], discovered: true };
    } catch (err) {
      if (err.gpKind !== "bad_model") throw err;
    }
  }
  return { model: "", tried, failed: true, available: live };
}

// Doğru modeli bul, kalıcı kaydet, kullanıcıya bildir
async function ensureModel(cfgOverride = null, skip = [], prefer = "") {
  const cfg = cfgOverride || (await getConfig());
  const p = resolveProvider(cfg);
  const res = await resolveModel(p, cfg, { prefer: prefer || p.model, skip });
  if (res.failed) {
    const e = new Error(
      `${p.name}: çalışan bir model bulunamadı. ` +
      (res.available.length ? `Hesabınızda mevcut modeller: ${res.available.slice(0, 8).join(", ")}` :
        "Anahtar geçerli mi ve sağlayıcı erişilebilir mi kontrol edin.") +
      ` (denenen: ${res.tried.slice(0, 6).join(", ")})`
    );
    e.__gpHandled = true;
    e.gpKind = "bad_model";
    throw e;
  }
  if (res.model !== p.model) {
    await saveProviderKey(p.id, { model: res.model });
    try { await saveConfig({ aiModel: res.model }); } catch (_) {}
  }
  return { ...res, changed: res.model !== p.model, provider: p.name };
}

// Verify provider + model with a tiny request (used by panel "Bağlantıyı Test Et")
async function testAiConnection(cfgOverride = null) {
  let cfg = cfgOverride ? { ...(await getConfig()), ...cfgOverride } : await getConfig();
  if (cfgOverride && cfgOverride.aiProvider) cfg.activeProvider = cfgOverride.aiProvider;
  let p = resolveProvider(cfg);
  const t0 = performance.now();
  let reply;
  try {
    reply = await queryLlm(cfg, 'Sadece şu JSON ile cevap ver: {"ok":true}', null);
  } catch (err) {
    // Model adı artık geçerli değilse: doğru modeli bul, kaydet, tekrar dene
    if (err && err.gpKind === "bad_model") {
      const fix = await ensureModel(cfg, [err.gpBadModel], err.gpSuggested);
      // Depo güncellendi → yapılandırmayı yeniden oku (eski anlık görüntü kullanılmaz)
      cfg = { ...(await getConfig()), ...(cfgOverride || {}), aiModel: fix.model };
      cfg.activeProvider = p.id;
      cfg.keyStore = {
        ...(cfg.keyStore || {}),
        [p.id]: { ...((cfg.keyStore || {})[p.id] || {}), model: fix.model, apiKey: p.apiKey, baseUrl: p.baseUrl }
      };
      p = resolveProvider(cfg);
      // ensureModel modeli zaten denedi ve çalıştı → tekrar istek atmaya gerek yok
      const ms = Math.round(performance.now() - t0);
      return {
        ok: true, provider: p.name, model: fix.model, latencyMs: ms,
        reply: '{"ok":true}',
        fixedModel: true, oldModel: err.gpBadModel || "",
        suggested: err.gpSuggested || "",
        note: `Model otomatik güncellendi → ${fix.model} (kalıcı olarak kaydedildi)`
      };
    }
    throw err;
  }
  const ms = Math.round(performance.now() - t0);
  return { ok: true, provider: p.name, model: p.model, latencyMs: ms, reply: String(reply).slice(0, 120) };
}

// List available models for OpenAI-compatible providers (GET /models)
async function listAiModels(cfgOverride = null) {
  const cfg = cfgOverride || (await getConfig());
  const p = resolveProvider(cfg);
  if (p.style === "gemini" || p.style === "anthropic") {
    const models = await discoverModels(p);
    if (!models.length) return { ok: false, models: [], note: `${p.name} model listesi alınamadı; modeli elle yazın.` };
    return { ok: true, models, note: `${models.length} model bulundu (en yeni önce).` };
  }
  if (p.style === "cohere") {
    return { ok: false, models: [], note: `${p.name} model listesi API üzerinden alınamıyor; modeli elle yazın.` };
  }
  const headers = {};
  if (p.apiKey) headers.Authorization = `Bearer ${p.apiKey}`;
  if (p.style === "azure") return { ok: false, models: [], note: "Azure'da model = deployment adı; elle yazın." };
  const resp = await fetchWithRetry(`${p.baseUrl}/models`, { method: "GET", headers }, { retries: 0, timeoutMs: 12000 });
  if (!resp.ok) throw new Error(`${p.name} model listesi alınamadı (${resp.status}).`);
  const data = await resp.json();
  const models = (data.data || data.models || []).map((m) => m.id || m.name).filter(Boolean).slice(0, 150);
  return { ok: true, models };
}

function parseJsonDecision(raw) {
  const cleaned = String(raw || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1) throw new Error("Model geçerli JSON üretmedi.");
  return JSON.parse(cleaned.slice(first, last + 1));
}

// ============================================================================
//  MİSYON MOTORU — kalıcı hedef + otonom görev listesi
//  "X ads geliri hedefle" gibi büyük hedefler için:
//   1) Plancı: hedefi adım listesine böler
//   2) Yürütücü: her adımı ajan olarak çalıştırır
//   3) Doğrulayıcı: adım gerçekten tamamlandı mı diye sayfaya bakar
//   4) Döngü: alarm ile kaldığı yerden sürer, ilerleme kaydedilir
// ============================================================================
const MISSION_KEY = "gp_mission";
const MISSION_ALARM = "gp_mission_tick";

async function missionLoad() {
  const cfg = await getConfig();
  return cfg[MISSION_KEY] || null;
}

async function missionSave(m) {
  await saveConfig({ [MISSION_KEY]: { ...m, updatedAt: Date.now() } });
  return m;
}

async function missionClear() {
  try { await api.alarms.clear(MISSION_ALARM); } catch (_) {}
  await saveConfig({ [MISSION_KEY]: null });
}

// ---- 1) PLANCI: hedefi ölçülebilir adımlara böl ----
async function missionPlan(objective, context = "") {
  const cfg = await getConfig();
  const prompt =
    `Sen kıdemli bir proje yöneticisisin. Aşağıdaki hedefi, bir tarayıcı ajanının ` +
    `sırayla yürütebileceği küçük ve SOMUT adımlara böl.\n\n` +
    `HEDEF: ${objective}\n${context ? `BAĞLAM: ${context}\n` : ""}\n` +
    `Kurallar:\n` +
    `- 4 ile 10 arasında adım üret, her biri tek oturumda yapılabilir olsun\n` +
    `- Her adım bir FİİL ile başlasın (Git, Tıkla, Doldur, Kontrol et, Oluştur)\n` +
    `- Her adıma "done" adında, sayfada kontrol edilebilir bir tamamlanma ölçütü yaz\n` +
    `- Bağımlılıkları sırala: önce erişim/giriş, sonra yapılandırma, en son ölçüm\n` +
    `- Gerçekçi ol; olmayacak adım üretme\n` +
    `${langLine(await getUiLang())}\n\n` +
    `SADECE şu JSON ile cevap ver:\n` +
    `{"title":"kısa başlık","metric":"başarı nasıl ölçülür","steps":[{"id":1,"title":"...","detail":"...","done":"..."}]}`;

  const raw = await queryLlm(cfg, prompt, null);
  let plan;
  try {
    plan = parseJsonDecision(raw);
  } catch (_) {
    plan = { title: objective.slice(0, 60), metric: "", steps: [{ id: 1, title: objective, detail: "", done: "" }] };
  }
  const steps = (plan.steps || []).slice(0, 12).map((st, i) => ({
    id: i + 1,
    title: String(st.title || `Adım ${i + 1}`).slice(0, 160),
    detail: String(st.detail || "").slice(0, 400),
    done: String(st.done || "").slice(0, 200),
    status: "todo",          // todo | doing | done | failed | skipped
    attempts: 0,
    notes: [],
    startedAt: 0,
    finishedAt: 0
  }));
  return { title: plan.title || objective.slice(0, 60), metric: plan.metric || "", steps };
}

// ---- 2) MİSYON BAŞLAT ----
async function missionStart(objective, opts = {}) {
  if (agentState.running) throw new Error("Zaten çalışan bir görev var. Önce durdurun.");
  pushLog("info", "🧭 Misyon planlanıyor…");
  const plan = await missionPlan(objective, opts.context || "");
  const mission = {
    id: "mis_" + Date.now().toString(36),
    objective,
    title: plan.title,
    metric: plan.metric,
    steps: plan.steps,
    currentStep: 0,
    status: "running",          // running | paused | done | failed
    createdAt: Date.now(),
    updatedAt: Date.now(),
    cycles: 0,
    progress: 0,
    lastRunAt: 0,
    log: [],
    autoContinue: opts.autoContinue !== false,
    intervalMinutes: Math.max(1, Number(opts.intervalMinutes || 3)),
    maxCycles: Math.max(1, Number(opts.maxCycles || 40))
  };
  await missionSave(mission);
  pushLog("success", `📋 Plan hazır: ${mission.steps.length} adım — "${mission.title}"`);
  mission.steps.forEach((st) => pushLog("step", `  ${st.id}. ${st.title}`));
  // İlk adımı hemen çalıştır
  missionRunNext().catch((e) => pushLog("error", `Misyon hatası: ${e.message || e}`));
  return mission;
}

// ---- 3) SIRADAKİ ADIMI ÇALIŞTIR ----
async function missionRunNext() {
  if (agentState.running) return { skipped: true, reason: "agent_busy" };
  const m = await missionLoad();
  if (!m) throw new Error("Misyon yok.");
  if (m.status !== "running") return { skipped: true, reason: m.status };

  const idx = m.steps.findIndex((st) => st.status === "todo" || st.status === "failed");
  if (idx === -1) {
    // Tüm adımlar bitti
    m.status = "done";
    m.progress = 100;
    await missionSave(m);
    pushLog("success", `🎉 Misyon tamamlandı: ${m.title}`);
    try { await api.alarms.clear(MISSION_ALARM); } catch (_) {}
    return { done: true };
  }

  const step = m.steps[idx];
  step.status = "doing";
  step.attempts = (step.attempts || 0) + 1;
  step.startedAt = Date.now();
  m.currentStep = idx;
  m.cycles = (m.cycles || 0) + 1;
  m.lastRunAt = Date.now();
  await missionSave(m);

  const total = m.steps.filter((x) => x.status === "done").length;
  m.progress = Math.round((total / m.steps.length) * 100);

  pushLog("info", `▶ Misyon adım ${step.id}/${m.steps.length}: ${step.title}`);

  // Adımı ajan görevi olarak çalıştır (ayrı pencere, hafıza, devralma)
  const goal =
    `MİSYON: ${m.objective}\n` +
    `ŞU ANKİ ADIM (${step.id}/${m.steps.length}): ${step.title}` +
    (step.detail ? `\nAYRINTI: ${step.detail}` : "") +
    (step.done ? `\nTAMAMLANMA ÖLÇÜTÜ: ${step.done}` : "") +
    `\n\nSadece bu adımı tamamla. Adım bitince "done" eylemiyle özet ver.`;

  try {
    await runAutonomousTask(goal, null, { taskMode: (await getConfig()).taskMode || "fresh_browser" });
  } catch (err) {
    pushLog("warn", `Adım ${step.id} çalıştırılamadı: ${err.message || err}`);
  }

  // ---- 4) DOĞRULAYICI: adım gerçekten tamamlandı mı? ----
  const verify = await missionVerify(m, step);
  const m2 = await missionLoad();
  const s2 = m2.steps.find((x) => x.id === step.id);
  if (verify.ok) {
    s2.status = "done";
    s2.finishedAt = Date.now();
    s2.notes.push(`✓ ${verify.reason}`);
    pushLog("success", `✓ Adım ${s2.id} tamamlandı — ${verify.reason}`);
  } else {
    s2.status = s2.attempts >= 3 ? "failed" : "todo";
    s2.notes.push(`✗ ${verify.reason}`);
    pushLog("warn", `✗ Adım ${s2.id} doğrulanamadı (${s2.attempts}. deneme): ${verify.reason}`);
  }
  const doneCount = m2.steps.filter((x) => x.status === "done").length;
  m2.progress = Math.round((doneCount / m2.steps.length) * 100);
  m2.log.push({
    at: Date.now(), step: s2.id, ok: verify.ok,
    title: s2.title, reason: verify.reason
  });
  if (m2.log.length > 80) m2.log.shift();

  // Tümü bittiyse
  if (m2.steps.every((x) => x.status === "done" || x.status === "skipped")) {
    m2.status = "done";
    m2.progress = 100;
    pushLog("success", `🎉 Misyon tamamlandı: ${m2.title}`);
    try { await api.alarms.clear(MISSION_ALARM); } catch (_) {}
  } else if (m2.cycles >= m2.maxCycles) {
    m2.status = "paused";
    pushLog("warn", `Döngü sınırına ulaşıldı (${m2.maxCycles}). Misyon duraklatıldı.`);
    try { await api.alarms.clear(MISSION_ALARM); } catch (_) {}
  } else if (m2.autoContinue) {
    // Kendiliğinden devam
    setTimeout(() => {
      missionRunNext().catch((e) => pushLog("error", `Misyon döngüsü: ${e.message || e}`));
    }, Math.max(1500, m2.intervalMinutes * 1000));
  }
  await missionSave(m2);
  broadcastUiState();
  return { step: s2.id, ok: verify.ok };
}

// ---- 4) DOĞRULAYICI ----
// Sayfaya bakıp adımın ölçütünü kontrol eder. Ölçüt yoksa ajanın raporuna güvenir.
async function missionVerify(mission, step) {
  if (!step.done) {
    return { ok: true, reason: "ölçüt tanımlı değil — ajan raporu kabul edildi" };
  }
  try {
    const tabId = agentState.targetTabId;
    if (!tabId) return { ok: true, reason: "sekme kapandı — ajan raporuna güvenildi" };
    const snap = await sendToContent(tabId, { type: "SNAPSHOT", maxItems: 60 });
    if (!snap || !snap.ok || !snap.snapshot) {
      return { ok: true, reason: "sayfa okunamadı — ajan raporuna güvenildi" };
    }
    const s = snap.snapshot;
    const pageText = `${s.url || ""} ${s.title || ""} ${(s.elements || []).map((e) => e.label).join(" ")}`.toLowerCase();
    // Ölçütteki anahtar kelimeler sayfada var mı?
    const words = String(step.done).toLowerCase()
      .replace(/[^a-z0-9ğüşıöç\s]/gi, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !["veya", "veya", "için", "olmalı", "gerek", "sayfa", "adres", "kontrol"].includes(w));
    const hit = words.filter((w) => pageText.includes(w));
    const ratio = words.length ? hit.length / words.length : 1;
    if (ratio >= 0.34) {
      return { ok: true, reason: `sayfada doğrulandı (${hit.slice(0, 3).join(", ")})` };
    }
    return { ok: false, reason: "ölçüt sayfada bulunamadı" };
  } catch (err) {
    return { ok: true, reason: `doğrulama atlandı (${String(err.message || err).slice(0, 60)})` };
  }
}

// ---- 5) DÖNGÜ: alarm ile kendiliğinden sür ----
async function missionTick() {
  const m = await missionLoad();
  if (!m || m.status !== "running") return;
  if (agentState.running) return;                    // şu an görev var, bekle
  if (Date.now() - (m.lastRunAt || 0) < (m.intervalMinutes || 3) * 60000 * 0.8) return;
  pushLog("info", "⏱ Misyon zamanlayıcısı — sıradaki adım başlıyor");
  missionRunNext().catch((e) => pushLog("error", `Misyon: ${e.message || e}`));
}

// ============================================================================
//  GÖREV PENCERESİ — kullanıcının sekmelerine dokunmadan ayrı pencere
// ============================================================================

// Görev metninden ilk URL'yi çıkar ("... https://x.com ..." veya "x.com")
function extractFirstUrl(goal) {
  const text = String(goal || "");
  const m = text.match(/https?:\/\/[^\s,;)]+/i);
  if (m) return m[0];
  // "ornek-site.com adresine git" gibi yazımlar
  const d = text.match(/\b((?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s,;)]*)?)\b/i);
  if (d && !/^(www\.)?$/.test(d[1])) {
    const host = d[1];
    if (/\.(com|net|org|io|dev|ai|co|tr|de|uk|jp|cn|blogspot|app|me|xyz|site|online|store)\b/i.test(host)) {
      return "https://" + host;
    }
  }
  return "";
}

// Görev için yeni pencere + sekme aç ve sayfanın yüklenmesini bekle
async function openTaskWindow(goal, firstUrl) {
  const startUrl = firstUrl || "about:blank";
  const created = await new Promise((resolve) =>
    api.windows.create({ url: startUrl, focused: true, type: "normal" }, (w) => resolve(w))
  );
  if (!created || !created.id) throw new Error("Görev penceresi açılamadı.");
  let tab = (created.tabs && created.tabs[0]) || null;
  const tabId = tab ? tab.id : null;

  // Sayfa hazır olana kadar bekle (en fazla 15 sn)
  if (tabId) {
    for (let i = 0; i < 50; i++) {
      await new Promise((r) => setTimeout(r, 300));
      const t = await new Promise((resolve) =>
        api.tabs.get(tabId, (x) => resolve(api.runtime.lastError ? null : x))
      );
      if (!t) break;
      if (t.status === "complete" && t.url && t.url !== "about:blank") { tab = t; break; }
      tab = t;
    }
  }
  // about:blank ise ilk adımda ajana yönlendirme bırak
  return { windowId: created.id, tab: tab || { id: tabId, windowId: created.id, url: startUrl } };
}

// Basit tamamlanma koşulu çıkarımı
function deriveDoneConditions(goal) {
  const g = String(goal || "").toLowerCase();
  const out = [];
  const url = extractFirstUrl(goal);
  if (/\b(aç|git|ziyaret|gir)\b/.test(g) && url) out.push(`adres açılmış olmalı: ${url}`);
  if (/giriş yap|login|oturum/.test(g)) out.push("giriş formu doldurulmuş veya giriş yapılmış olmalı");
  if (/kontrol et|bak|doğrula/.test(g)) out.push("sayfada istenen bilgi okunup özetlenmeli");
  if (/yaz|gönder|paylaş|oluştur/.test(g)) out.push("metin girilip gönderilmiş olmalı");
  return out;
}

async function runAutonomousTask(goal, explicitTabId = null, opts = {}) {
  if (agentState.running) throw new Error("Zaten çalışan bir görev var.");
  await guardAccess("agent", explicitTabId != null ? explicitTabId : null);
  const cfg = await getConfig();
  const taskMode = opts.taskMode || cfg.taskMode || "fresh_browser";

  // ---- 1) GÖREV PENCERESİ ----
  // fresh_browser: kullanıcının açık sekmelerine DOKUNMADAN ayrı pencere açar.
  let startTab;
  if (taskMode === "fresh_browser") {
    const firstUrl = extractFirstUrl(goal);
    const win = await openTaskWindow(goal, firstUrl);
    startTab = win.tab;
    pushLog("info", `🗔 Yeni görev penceresi açıldı (pencere #${win.windowId})`);
    if (firstUrl) pushLog("info", `🌐 Başlangıç adresi: ${firstUrl}`);
  } else {
    try {
      startTab = await getActiveOrTargetTab(explicitTabId);
    } catch (err) {
      if (err.gpKind !== "bad_target") throw err;
      const alt = await findWebTab();
      if (!alt) {
        throw new Error(
          "Kontrol edilebilir bir web sekmesi bulunamadı.\n" +
          "• Yeni sekme sayfası, chrome:// sayfaları ve diğer eklentilerin sayfaları otomasyona kapalıdır.\n" +
          "• Çözüm: görev modunu \"Yeni tarayıcı penceresi\" yapın."
        );
      }
      startTab = alt;
    }
  }

  // ---- 2) GÜNLÜK (kalıcı hafıza) ----
  let journal;
  if (opts.resume) {
    journal = await journalLoad();
    if (!journal) throw new Error("Devam edilecek kayıtlı görev bulunamadı.");
    journal = await journalPatch({ status: "running", tabId: startTab.id, windowId: startTab.windowId });
    pushLog("info", `↻ Görev devam ediyor — adım ${journal.step}'ten, ${journal.history.length} kayıtlı işlem`);
  } else {
    journal = await journalStart(goal, startTab.id);
    journal.windowId = startTab.windowId;
    await journalSave(journal);
  }

  agentState = {
    running: true,
    goal: journal.goal,
    targetTabId: startTab.id,
    step: journal.step || 0,
    logs: [],
    abort: false,
    journal
  };
  pushLog("info", `Görev başlatıldı: "${journal.goal}" (Sekme #${startTab.id})`);
  if (journal.doneConditions.length) {
    pushLog("info", `🎯 Tamamlanma koşulu: ${journal.doneConditions.join(" · ")}`);
  }

  const history = [...(journal.history || [])];
  const maxSteps = Math.max(1, Math.min(60, Number(cfg.maxAgentSteps || 18)));
  let navCount = 0;              // aynı adrese kaç kez gidildi
  let lastNavUrl = "";
  let emptyStreak = 0;           // üst üste boş sayfa
  let switchCount = journal.switchCount || 0;

  try {
    for (let step = (journal.step || 0) + 1; step <= maxSteps; step++) {
      if (agentState.abort) { await journalPatch({ status: "paused" }); break; }
      try {
        await guardAccess("agent", agentState.targetTabId);
      } catch (_) {
        await journalPatch({ status: "paused" });
        pushLog("warn", "Erişim kapatıldı — görev duraklatıldı (kaldığı yerden devam edebilir).");
        break;
      }
      agentState.step = step;
      await journalPatch({ step: step - 1, tabId: agentState.targetTabId });
      broadcastUiState();

      // ---- Sayfa durumunu oku ----
      let snapText = "Sekme DOM bilgisi alınamadı.";
      let hasCanvas = false;
      let currentUrl = "";
      try {
        const snapRes = await sendToContent(agentState.targetTabId, {
          type: "SNAPSHOT",
          maxItems: cfg.perfProfile === "eco" ? 55 : 85
        });
        if (snapRes && snapRes.ok && snapRes.snapshot) {
          const snap = snapRes.snapshot;
          hasCanvas = !!snap.hasGameCanvas;
          currentUrl = snap.url || "";
          const lines = (snap.elements || []).map(
            (e) => `[${e.id}] <${e.tag}${e.type ? `:${e.type}` : ""}> "${e.label || ""}" @(${e.x},${e.y})`
          );
          snapText = `URL: ${snap.url}\nBaşlık: ${snap.title}\nOyunTuvali: ${hasCanvas}\nElemanlar:\n${lines.join("\n")}`;
        }
      } catch (e) {
        const alt = await findWebTab(agentState.targetTabId);
        if (alt) {
          pushLog("warn", `Sekme otomasyona kapalı → sekme #${alt.id} kullanılıyor`);
          agentState.targetTabId = alt.id;
          try {
            const r2 = await sendToContent(alt.id, { type: "SNAPSHOT", maxItems: 85 });
            if (r2 && r2.ok && r2.snapshot) {
              const sn = r2.snapshot;
              hasCanvas = !!sn.hasGameCanvas;
              currentUrl = sn.url || "";
              snapText = `URL: ${sn.url}\nBaşlık: ${sn.title}\nElemanlar:\n` +
                (sn.elements || []).map((el) => `[${el.id}] <${el.tag}> "${el.label || ""}" @(${el.x},${el.y})`).join("\n");
            }
          } catch (_) {}
        }
        if (snapText === "Sekme DOM bilgisi alınamadı.") {
          snapText = `DOM okuma uyarısı: ${e.message}\n` +
            `NOT: Bu sekme otomasyona kapalı (yeni sekme / chrome:// / başka eklenti). ` +
            `Gitmek için {"action":"navigate","url":"https://...","newTab":false} kullan.`;
        }
      }

      // ---- Sonsuz döngü koruması ----
      const needNavigate = /DOM okuma uyarısı|Elemanlar:\s*(\n|$)/.test(snapText);
      if (needNavigate && !currentUrl) {
        emptyStreak++;
      } else {
        emptyStreak = 0;
      }
      if (emptyStreak >= 2 && journal.doneConditions.length === 0) {
        pushLog("warn", "Sayfa 2 adım üst üste boş geldi — görev güvenli şekilde durduruldu.");
        await journalPatch({ status: "paused" });
        break;
      }
      if (navCount >= 2 && lastNavUrl) {
        pushLog("warn", `Aynı adrese ${navCount} kez gidildi (${lastNavUrl}) — tekrar denenmeyecek.`);
      }

      // ---- Öğrenilen bilgileri güncelle ----
      if (currentUrl && !journal.facts.some((f) => f.type === "url" && f.value === currentUrl)) {
        journal.facts.push({ type: "url", value: currentUrl, at: step });
        if (journal.facts.length > 40) journal.facts.shift();
        await journalPatch({ facts: journal.facts });
      }

      let desktopText = "";
      if (daemonStatus.connected) {
        try {
          const wins = await callDesktopDaemon("list_windows", { limit: 12 }, 2500);
          desktopText = `\nAçık Masaüstü Pencereleri: ${JSON.stringify(wins)}`;
        } catch (_) {}
      }

      let frameUrl = null;
      if (cfg.perfProfile !== "eco" && (cfg.aiUseVision || hasCanvas)) {
        try {
          const shot = await captureBrowserFrame(agentState.targetTabId, 40, true);
          frameUrl = shot.dataUrl;
        } catch (_) {}
      }

      // ---- Prompt: hafıza + kural ----
      const factsText = journal.facts.slice(-8).map((f) => f.value).join("\n");
      const prompt =
        `HEDEF: ${journal.goal}\n` +
        `ADIM: ${step}/${maxSteps}  (kaldığı yerden devam ediyor)\n` +
        (journal.doneConditions.length ? `TAMAMLANMA KOŞULU: ${journal.doneConditions.join(" · ")}\n` : "") +
        (needNavigate
          ? `UYARI: Bu sekmede tıklanabilir öğe yok. Sadece {"action":"navigate","url":"https://...","newTab":false} kullan. ` +
            `İLK adımda hedef siteye gitmek dışında navigate KULLANMA.\n`
          : "") +
        (navCount >= 2 ? `UYARI: Aynı adrese zaten gidildi, tekrar navigate ETME. Mevcut sayfada ilerle.\n` : "") +
        `ÖĞRENİLENLER:\n${factsText || "Yok"}\n\n` +
        `ÖNCEKİ ADIMLAR: ${history.slice(-8).join(" -> ") || "Yok"}\n\n` +
        `${snapText}${desktopText}`;

      // ---- LLM çağrısı: hata → otomatik sağlayıcı devri ----
      let decision = null;
      let llmErr = null;
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const activeCfg = await getConfig();
          const rawReply = await queryLlm(activeCfg, prompt, frameUrl);
          await recordProviderUsage(resolveProvider(activeCfg).id, true);
          decision = parseJsonDecision(rawReply);
          await journalPatch({ failureStreak: 0, provider: resolveProvider(activeCfg).id });
          break;
        } catch (err) {
          llmErr = err;
          const activeCfg = await getConfig();
          const pid = resolveProvider(activeCfg).id;
          await recordProviderUsage(pid, false, err.gpKind || "error");

          if (!isSwitchable(err)) break;                    // gerçek bir hata, tekrar denenmez

          journal.blockedProviders = [...new Set([...(journal.blockedProviders || []), pid])];
          switchCount++;
          await journalPatch({
            blockedProviders: journal.blockedProviders,
            switchCount,
            failureStreak: (journal.failureStreak || 0) + 1
          });
          pushLog("warn", `⚠️ ${err.message || err}`);
          const nextP = await switchProvider(journal.blockedProviders);
          if (!nextP) {
            pushLog("error", "Kullanılabilir başka sağlayıcı yok. Panelden yeni bir anahtar ekleyin — görev kaydedildi, ekledikten sonra ▶ Devam Et'e basın.");
            await journalPatch({ status: "paused", summary: "Sağlayıcı kalmadı" });
            agentState.running = false;
            broadcastUiState();
            return;
          }
          pushLog("info", `↻ ${nextP.name} ile tekrar deneniyor… (görev kaldığı yerden sürüyor)`);
          await new Promise((r) => setTimeout(r, 800));
        }
      }

      if (!decision) {
        pushLog("error", `Hata: ${llmErr ? llmErr.message || llmErr : "yanıt alınamadı"}`);
        await journalPatch({ status: "paused" });
        break;
      }

      pushLog("step", `[Adım ${step}] ${decision.thought || decision.action}`);

      if (decision.action === "done") {
        const summary = decision.summary || "Görev başarıyla bitirildi.";
        pushLog("success", `Tamamlandı: ${summary}`);
        await journalPatch({ status: "done", summary, step });
        break;
      }

      // ---- Eylem ----
      if (decision.action === "desktop_click" || decision.action === "desktop_key") {
        const method = decision.action === "desktop_click" ? "window_click" : "window_key";
        await callDesktopDaemon(method, decision);
      } else {
        // Tekrar açma koruması: aynı adrese ikinci kez gidilmez
        if (decision.action === "navigate" && decision.url) {
          if (decision.url === lastNavUrl && navCount >= 1) {
            pushLog("warn", `Aynı adrese tekrar gitme isteği engellendi: ${decision.url}`);
            history.push(`navigate(BLOKLANDI:${decision.url})`);
            await new Promise((r) => setTimeout(r, 250));
            continue;
          }
          // Görev penceresi dışına sekme açmasın
          decision.newTab = false;
          lastNavUrl = decision.url;
          navCount++;
        }
        const res = await executeBrowserAction({ ...decision, tabId: agentState.targetTabId }, cfg);
        if (res && res.tabId) agentState.targetTabId = res.tabId;
      }

      history.push(`${decision.action}(${decision.refId ?? decision.key ?? decision.text ?? decision.url ?? ""})`);
      journal.history = history.slice(-60);
      await journalPatch({ history: journal.history, step });
      const tickDelay = cfg.perfProfile === "game" ? 120 : cfg.perfProfile === "eco" ? 650 : 350;
      await new Promise((r) => setTimeout(r, tickDelay));
    }

    if (agentState.step >= maxSteps) {
      pushLog("warn", `Adım sınırına ulaşıldı (${maxSteps}). Görev kaydedildi — "Devam Et" ile sürdürebilirsiniz.`);
      await journalPatch({ status: "paused" });
    }
  } catch (err) {
    pushLog("error", `Hata: ${err.message || err}`);
    await journalPatch({ status: "failed", summary: String(err.message || err) });
  } finally {
    agentState.running = false;
    broadcastUiState();
  }
}

// ============================================================================
// 4. MESSAGE & SHORTCUT LISTENERS
// ============================================================================
api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.__target === "ghostpilot_content" || msg.__target === "ghostpilot_panel") return false;

  if (msg.type === "PANIC_STOP") {
    triggerEmergencyStop().then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === "GET_STATE") {
    getConfig().then((config) => {
      sendResponse({
        ok: true,
        hasDebugger: HAS_DEBUGGER,
        config,
        daemonStatus,
        agentState: {
          running: agentState.running,
          goal: agentState.goal,
          targetTabId: agentState.targetTabId,
          step: agentState.step,
          logs: agentState.logs.slice(-30)
        }
      });
    });
    return true;
  }

  if (msg.type === "SAVE_CONFIG") {
    saveConfig(msg.patch || {}).then(() => {
      if ("daemonUrl" in (msg.patch || {}) || "autoConnectDaemon" in (msg.patch || {})) {
        if (daemonSocket) {
          try { daemonSocket.close(); } catch (_) {}
        }
        connectDaemon();
      }
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === "RECONNECT_DAEMON") {
    if (daemonSocket) {
      try { daemonSocket.close(); } catch (_) {}
    }
    connectDaemon().then(() => sendResponse({ ok: true }));
    return true;
  }

  // ---- MİSYON ----
  if (msg.type === "MISSION_START") {
    missionStart(msg.objective, msg.opts || {})
      .then((m) => {
        // Döngü alarmı (tarayıcı kapansa da devam eder)
        try { api.alarms.create(MISSION_ALARM, { periodInMinutes: 1 }); } catch (_) {}
        sendResponse({ ok: true, mission: m });
      })
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }

  if (msg.type === "MISSION_GET") {
    missionLoad()
      .then((m) => sendResponse({ ok: true, mission: m, running: agentState.running }))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }

  if (msg.type === "MISSION_RESUME") {
    (async () => {
      const m = await missionLoad();
      if (!m) throw new Error("Misyon yok.");
      m.status = "running";
      // Başarısız adımları tekrar denenebilir yap
      m.steps.forEach((st) => { if (st.status === "failed") { st.status = "todo"; st.attempts = 0; } });
      await missionSave(m);
      try { api.alarms.create(MISSION_ALARM, { periodInMinutes: 1 }); } catch (_) {}
      missionRunNext().catch((e) => pushLog("error", `Misyon: ${e.message || e}`));
      return { title: m.title };
    })()
      .then((r) => sendResponse({ ok: true, result: r }))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }

  if (msg.type === "MISSION_PAUSE") {
    (async () => {
      const m = await missionLoad();
      if (!m) throw new Error("Misyon yok.");
      m.status = "paused";
      await missionSave(m);
      try { await api.alarms.clear(MISSION_ALARM); } catch (_) {}
      if (agentState.running) triggerEmergencyStop();
      return true;
    })()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }

  if (msg.type === "MISSION_CLEAR") {
    missionClear()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }

  // Tek adımı elle çalıştır / adımı atla
  if (msg.type === "MISSION_STEP_RUN") {
    missionRunNext()
      .then((r) => sendResponse({ ok: true, result: r }))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }

  if (msg.type === "MISSION_STEP_SKIP") {
    (async () => {
      const m = await missionLoad();
      if (!m) throw new Error("Misyon yok.");
      const st = m.steps.find((x) => x.id === msg.stepId);
      if (st) { st.status = "skipped"; st.notes.push("kullanıcı atladı"); }
      const done = m.steps.filter((x) => x.status === "done").length;
      m.progress = Math.round((done / m.steps.length) * 100);
      await missionSave(m);
      return true;
    })()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }

  // Kayıtlı görev günlüğü
  if (msg.type === "GET_TASK") {
    journalLoad()
      .then((j) => sendResponse({ ok: true, task: j, running: agentState.running }))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }

  // Kaldığı yerden devam et
  if (msg.type === "RESUME_TASK") {
    (async () => {
      if (agentState.running) throw new Error("Zaten çalışan bir görev var.");
      const j = await journalLoad();
      if (!j) throw new Error("Devam edilecek görev yok.");
      // Sağlayıcı durumunu sıfırla ki tükenenler tekrar denenmesin
      await journalPatch({ status: "running", blockedProviders: msg.resetBlocks ? [] : (j.blockedProviders || []) });
      runAutonomousTask(j.goal, null, { resume: true });
      return { resumed: true, goal: j.goal, step: j.step };
    })()
      .then((r) => sendResponse({ ok: true, result: r }))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }

  // Görev kaydını sil
  if (msg.type === "CLEAR_TASK") {
    journalClear()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }

  // Kaç sağlayıcı hazır?
  if (msg.type === "LIST_READY_PROVIDERS") {
    availableProviders()
      .then((ids) => sendResponse({
        ok: true,
        providers: ids.map((id) => ({ id, name: AI_PROVIDERS[id].name, model: (AI_PROVIDERS[id] || {}).model || "" }))
      }))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }

  if (msg.type === "START_AGENT") {
    getConfig().then(async (cfg) => {
      if (cfg.confirmBeforeStart && !msg.confirmed) {
        sendResponse({ ok: false, needsConfirm: true, error: "Onay gerekli: AI'nın fare/klavyenizi kontrol etmesine izin veriyorsunuz." });
        return;
      }
      try {
        await guardAccess("agent", msg.tabId != null ? msg.tabId : null);
      } catch (err) {
        sendResponse({ ok: false, error: String(err.message || err) });
        return;
      }
      runAutonomousTask(msg.goal, msg.tabId, { taskMode: msg.taskMode, resume: !!msg.resume });
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === "TEST_BROWSER_ACTION") {
    executeBrowserAction(msg.command)
      .then((res) => sendResponse({ ok: true, result: res }))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }

  if (msg.type === "TEST_DESKTOP_ACTION") {
    callDesktopDaemon(msg.method, msg.params || {})
      .then((res) => sendResponse({ ok: true, result: res }))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }

  if (msg.type === "EXECUTE_FROM_WEB_AI") {
    const cmd = msg.command || {};
    executeBrowserAction(cmd)
      .then((res) => sendResponse({ ok: true, result: res }))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }

  if (msg.type === "SET_ACCESS_MODE") {
    setAccessMode(msg.mode, msg.options || {})
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }

  if (msg.type === "GET_ACCESS_STATE") {
    getAccessState().then((res) => sendResponse({ ok: true, result: res }));
    return true;
  }

  if (msg.type === "SET_ALLOWED_TABS") {
    const ids = Array.isArray(msg.tabIds) ? msg.tabIds.map(Number) : [];
    saveConfig({ allowedTabIds: ids }).then(() => {
      pushLog("info", ids.length ? `Sekme izin listesi: ${ids.length} sekme` : "Sekme izni: tüm sekmeler");
      broadcastUiState();
      sendResponse({ ok: true, allowedTabIds: ids });
    });
    return true;
  }

  if (msg.type === "SAVE_PROVIDER_KEY") {
    const id = msg.provider || msg.providerId;
    if (!id) { sendResponse({ ok: false, error: "Sağlayıcı belirtilmedi." }); return false; }
    saveProviderKey(id, msg.patch || {})
      .then(async (entry) => {
        // aktif sağlayıcıyla uyum için eski alanları da güncelle
        const preset = AI_PROVIDERS[id] || AI_PROVIDERS.custom;
        await saveConfig({
          aiProvider: id,
          aiBaseUrl: entry.baseUrl || preset.baseUrl || "",
          aiModel: entry.model || preset.model || "",
          aiApiKey: entry.apiKey || ""
        });
        pushLog("success", `🔑 ${preset.name} anahtarı kaydedildi (kalıcı).`);
        broadcastUiState();
        sendResponse({ ok: true, entry: { ...entry, apiKey: undefined } });
      })
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }

  if (msg.type === "GET_PROVIDER_KEYS") {
    listProviderKeys().then((res) => sendResponse({ ok: true, result: res }));
    return true;
  }

  if (msg.type === "CLEAR_PROVIDER_KEY") {
    clearProviderKey(msg.provider).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === "SET_ACTIVE_PROVIDER") {
    (async () => {
      const id = msg.provider;
      const preset = AI_PROVIDERS[id] || AI_PROVIDERS.custom;
      const cfg = await getConfig();
      const entry = (cfg.keyStore || {})[id] || {};
      await saveConfig({
        activeProvider: id,
        aiProvider: id,
        aiBaseUrl: entry.baseUrl || preset.baseUrl || "",
        aiModel: entry.model || preset.model || "",
        aiApiKey: entry.apiKey || ""
      });
      sendResponse({ ok: true, provider: id, name: preset.name });
    })();
    return true;
  }

  if (msg.type === "START_OAUTH") {
    runOAuthFlow(msg.provider)
      .then((res) => sendResponse({ ok: true, result: res }))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }

  if (msg.type === "GET_OAUTH_INFO") {
    getConfig().then((cfg) => sendResponse({
      ok: true,
      // Panel `result` içinden okuyor — iki biçimi de destekle
      result: {
        identityAvailable: HAS_IDENTITY,
        identityWhy: IDENTITY_WHY,
        browser: (typeof browser !== "undefined" ? "firefox" : "chromium"),
        providers: Object.keys(OAUTH_PROVIDERS),
        googleClientId: cfg.googleClientId || "",
        redirectUri: HAS_IDENTITY ? redirectUri() : ""
      },
      // geriye dönük uyumluluk
      identityAvailable: HAS_IDENTITY,
      identityWhy: IDENTITY_WHY,
      browser: (typeof browser !== "undefined" ? "firefox" : "chromium"),
      providers: Object.keys(OAUTH_PROVIDERS),
      googleClientId: cfg.googleClientId || "",
      redirectUri: HAS_IDENTITY ? redirectUri() : ""
    }));
    return true;
  }

  if (msg.type === "TEST_AI_CONNECTION") {
    testAiConnection(msg.configOverride)
      .then((res) => sendResponse({ ok: true, result: res }))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }

  if (msg.type === "LIST_AI_MODELS") {
    listAiModels(msg.configOverride)
      .then((res) => sendResponse({ ok: true, result: res }))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }

  return false;
});

// ============================================================================
//  YEREL SUNUCU ALGILAMA (Ollama / LM Studio / llama.cpp)
//  Kullanıcı hiçbir şey yapmadan bulunur; bağlanmak için onay yeter.
// ============================================================================
const LOCAL_SERVERS = [
  {
    id: "ollama",
    name: "Ollama",
    base: "http://127.0.0.1:11434",
    // Ollama'ya özel: /api/tags gerçek model listesini verir
    async probe() {
      const r = await fetchWithRetry("http://127.0.0.1:11434/api/tags", { method: "GET" }, { retries: 0, timeoutMs: 1800 });
      if (!r.ok) return null;
      const data = await r.json();
      const models = (data.models || []).map((m) => m.name || m.model).filter(Boolean);
      if (!models.length) return { models: [], note: "Ollama çalışıyor ama yüklü model yok." };
      return { models, version: data.version || "" };
    }
  },
  {
    id: "lmstudio",
    name: "LM Studio",
    base: "http://127.0.0.1:1234",
    async probe() {
      const r = await fetchWithRetry("http://127.0.0.1:1234/v1/models", { method: "GET" }, { retries: 0, timeoutMs: 1500 });
      if (!r.ok) return null;
      const data = await r.json();
      const models = (data.data || []).map((m) => m.id).filter(Boolean);
      return { models };
    }
  },
  {
    id: "llamacpp",
    name: "llama.cpp",
    base: "http://127.0.0.1:8080",
    async probe() {
      const r = await fetchWithRetry("http://127.0.0.1:8080/v1/models", { method: "GET" }, { retries: 0, timeoutMs: 1500 });
      if (!r.ok) return null;
      const data = await r.json();
      const models = (data.data || []).map((m) => m.id).filter(Boolean);
      return { models };
    }
  }
];

// Ollama model adlarından ajan için en uygununu seç (kod/araç kullanımı iyi olanlar önce)
function pickBestOllamaModel(models) {
  if (!models || !models.length) return "";
  const score = (n) => {
    const s = String(n).toLowerCase();
    let v = 0;
    if (/qwen2\.5|qwen3/.test(s)) v += 40;
    if (/llama3\.3|llama-3\.3|llama3\.1|llama-3\.1/.test(s)) v += 35;
    if (/deepseek/.test(s)) v += 30;
    if (/mistral|mixtral/.test(s)) v += 22;
    if (/gemma/.test(s)) v += 18;
    if (/phi/.test(s)) v += 12;
    if (/coder|instruct|chat/.test(s)) v += 10;
    if (/vision|llava/.test(s)) v += 6;
    const big = s.match(/(\d+)b/);
    if (big) v += Math.min(Number(big[1]), 24) / 8;   // hafif boyut bonusu (RAM dostu)
    if (/embed/.test(s)) v -= 100;                     // embedding modeli ajan olarak kullanılamaz
    return v;
  };
  return [...models].sort((a, b) => score(b) - score(a))[0];
}

// Tüm yerel sunucuları tara (paralel, hızlı)
async function detectLocalServers() {
  const results = await Promise.all(
    LOCAL_SERVERS.map(async (srv) => {
      try {
        const r = await srv.probe();
        return r === null ? null : { id: srv.id, name: srv.name, baseUrl: `${srv.base}/v1`, ...r };
      } catch (_) {
        return null;
      }
    })
  );
  return results.filter(Boolean);
}

// Panel: "Sekme aç" (görev başlatmadan web sekmesi hazırla)
api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  // Yerel sunucuları tara (panel ilk açılışta çağırır)
  if (msg && msg.type === "DETECT_LOCAL") {
    detectLocalServers()
      .then((found) => sendResponse({ ok: true, found }))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }

  // Ollama'ya (veya başka yerel sunucuya) bağlan — kullanıcı onayıyla
  if (msg && msg.type === "CONNECT_LOCAL") {
    (async () => {
      const found = await detectLocalServers();
      const srv = found.find((x) => x.id === msg.provider);
      if (!srv) throw new Error(`${msg.provider} çalışmıyor. Uygulamanın açık olduğundan emin olun.`);
      const model = msg.model || pickBestOllamaModel(srv.models) || "qwen2.5:7b";
      await saveProviderKey(srv.id, {
        apiKey: "",
        baseUrl: srv.baseUrl,
        model,
        source: "local"
      });
      await saveConfig({ activeProvider: srv.id, aiProvider: srv.id, aiModel: model, aiBaseUrl: srv.baseUrl });
      return { provider: srv.id, name: srv.name, model, baseUrl: srv.baseUrl, models: srv.models };
    })()
      .then((r) => sendResponse({ ok: true, result: r }))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }

  if (msg && msg.type === "OPEN_URL_TAB") {
    const url = String(msg.url || "").trim();
    if (!/^https?:\/\//i.test(url)) {
      sendResponse({ ok: false, error: "Geçerli bir http(s) adresi gerekli." });
      return false;
    }
    openInNewTab(url)
      .then((t) => sendResponse({ ok: true, tabId: t && t.id, url: t && t.url }))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }
  return false;
});

// Panel: "Modeli otomatik düzelt" / "Modelleri getir"
api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "ENSURE_MODEL") {
    ensureModel(msg.configOverride)
      .then((res) => sendResponse({ ok: true, result: res }))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }
  if (msg && msg.type === "DISCOVER_MODELS") {
    (async () => {
      const cfg = msg.configOverride ? { ...(await getConfig()), ...msg.configOverride } : await getConfig();
      const p = resolveProvider(cfg);
      const models = await discoverModels(p);
      return { ok: true, models, provider: p.name };
    })()
      .then((r) => sendResponse(r))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }
  return false;
});

if (api.commands && api.commands.onCommand) {
  api.commands.onCommand.addListener((command) => {
    if (command === "emergency-stop") {
      triggerEmergencyStop();
    } else if (command === "open-ghostpilot" && typeof chrome !== "undefined" && chrome.sidePanel) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs?.[0]?.windowId) {
          chrome.sidePanel.open({ windowId: tabs[0].windowId }).catch(() => {});
        }
      });
    }
  });
}

// Configure Chromium sidePanel open behavior + lightweight keepalive alarm
if (typeof chrome !== "undefined" && chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
}

if (api.alarms) {
  api.alarms.create("ghostpilot_keepalive", { periodInMinutes: 0.5 });
  // Yarım kalan misyon varsa döngüyü geri kur
  missionLoad().then((m) => {
    if (m && m.status === "running") {
      try { api.alarms.create(MISSION_ALARM, { periodInMinutes: 1 }); } catch (_) {}
      pushLog("info", "↻ Yarım kalan misyon bulundu — döngü yeniden kuruldu");
    }
  }).catch(() => {});
  api.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "ghostpilot_keepalive") {
      connectDaemon();
    }
    if (alarm.name === MISSION_ALARM) {
      missionTick().catch(() => {});
    }
  });
}

connectDaemon();

// ============================================================================
// OTOMATİK ANAHTAR ALMA — Tarayıcı içi OAuth (PKCE) akışı
// Not: Hiçbir sağlayıcı "kayıt olmadan anahtar" vermez (istismar koruması).
// Bu akış, hesabınız zaten varsa "tıkla-onayla-otomatik doldur" sağlar.
// API anahtarı ÜRETMEZ — erişim jetonu (access token, ~1 saat) alır ve otomatik yazar.
// ============================================================================
let oauthPending = null;

const OAUTH_PROVIDERS = {
  gemini: {
    name: "Google Gemini",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/generative-language.retriever",
    // Google, tarayıcı eklentileri için "installed app" istemcisini destekler.
    clientIdPlaceholder: "<GOOGLE_OAUTH_CLIENT_ID>",
    keyHint: "Erişim jetonu (ya29...) yalnızca ~1 saat geçerlidir",
    supportsRefresh: true
  },
  openrouter: {
    name: "OpenRouter",
    authUrl: "https://openrouter.ai/auth",
    tokenUrl: "https://openrouter.ai/api/v1/auth/keys",
    scope: "",
    clientIdPlaceholder: "",
    // OpenRouter PKCE akışı: kod -> kalıcı API anahtarı (sk-or-v1-...) üretir
    createsApiKey: true,
    keyHint: "Kalıcı OpenRouter anahtarı (sk-or-v1-...)",
    supportsRefresh: false
  }
};

function b64url(bytes) {
  let str = "";
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (const b of arr) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function pkcePair() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return { verifier, challenge: b64url(new Uint8Array(digest)) };
}

function redirectUri() {
  if (!HAS_IDENTITY) return "https://ghostpilot.invalid/callback";
  try {
    return api.identity.getRedirectURL("ghostpilot");
  } catch (_) {
    return "https://ghostpilot.invalid/callback";
  }
}

/** OAuth akışını başlatır, açar ve jetonu döndürür. */
async function runOAuthFlow(providerId) {
  const prov = OAUTH_PROVIDERS[providerId];
  if (!prov) throw new Error("Bu sağlayıcı için otomatik yetkilendirme tanımlı değil.");
  if (!HAS_IDENTITY) throw new Error(IDENTITY_WHY);

  const cfg = await getConfig();
  if (providerId === "gemini" && !cfg.googleClientId) {
    throw new Error(
      "Google için tek seferlik bir OAuth İstemci Kimliği gerekiyor. " +
      "console.cloud.google.com → APIs & Services → Credentials → Create OAuth client ID → " +
      "type 'Chrome Extension' → Extension ID'nizi yazın. Sonra panelde 'Google İstemci Kimliği' alanına yapıştırın. " +
      "(Bunun yerine API anahtarı da kullanabilirsiniz — 1 dakika sürer.)"
    );
  }

  const { verifier, challenge } = await pkcePair();
  const state = b64url(crypto.getRandomValues(new Uint8Array(16)));
  const redirect = redirectUri();

  let authUrl;
  if (providerId === "openrouter") {
    authUrl = `${prov.authUrl}?response_type=code&client_id=${encodeURIComponent(redirect)}` +
      `&redirect_uri=${encodeURIComponent(redirect)}&code_challenge=${challenge}` +
      `&code_challenge_method=S256&state=${state}`;
  } else {
    authUrl = `${prov.authUrl}?response_type=code&client_id=${encodeURIComponent(cfg.googleClientId)}` +
      `&redirect_uri=${encodeURIComponent(redirect)}&scope=${encodeURIComponent(prov.scope)}` +
      `&code_challenge=${challenge}&code_challenge_method=S256&state=${state}` +
      `&access_type=offline&prompt=consent`;
  }

  let res;
  try {
    res = await api.identity.launchWebAuthFlow({ url: authUrl, interactive: true });
  } catch (err) {
    throw new Error(`Yetkilendirme penceresi kapatıldı veya reddedildi (${String(err.message || err)}).`);
  }

  const url = new URL(res);
  const code = url.searchParams.get("code");
  const errParam = url.searchParams.get("error");
  if (errParam) throw new Error(`Yetkilendirme reddedildi: ${errParam}`);

  // OpenRouter geri dönüşünde parametre isimleri farklı olabilir (code / code+...)
  const authCode = code || url.searchParams.get("auth_code");
  if (!authCode) throw new Error("Yetkilendirme kodunu alamadık (redirect yanıtı beklenmedik).");

  if (providerId === "openrouter") {
    const resp = await fetchWithRetry(prov.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: authCode, code_verifier: verifier, code_challenge_method: "S256" })
    });
    if (!resp.ok) throw await providerError({ name: prov.name }, resp);
    const data = await resp.json();
    const key = data.key || data.api_key;
    if (!key) throw new Error("OpenRouter anahtarı döndürmedi. Yanıt: " + JSON.stringify(data).slice(0, 160));
    await saveProviderKey("openrouter", {
      apiKey: key,
      baseUrl: AI_PROVIDERS.openrouter.baseUrl,
      model: AI_PROVIDERS.openrouter.model,
      source: "oauth",
      expiresAt: 0
    });
    await saveConfig({ aiProvider: "openrouter", aiApiKey: key });
    return { ok: true, provider: prov.name, apiKey: key, permanent: true };
  }

  // Google: kod -> erişim jetonu
  const body = new URLSearchParams({
    code: authCode,
    client_id: cfg.googleClientId,
    redirect_uri: redirect,
    grant_type: "authorization_code",
    code_verifier: verifier
  });
  const resp = await fetchWithRetry(prov.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });
  if (!resp.ok) throw await providerError({ name: prov.name }, resp);
  const token = await resp.json();
  if (!token.access_token) throw new Error("Google erişim jetonu döndürmedi.");

  const expiry = token.expires_in ? Date.now() + token.expires_in * 1000 : 0;
  await saveProviderKey("gemini", {
    apiKey: token.access_token,
    baseUrl: AI_PROVIDERS.gemini.baseUrl,
    model: AI_PROVIDERS.gemini.model,
    source: "oauth",
    expiresAt: expiry,
    refreshToken: token.refresh_token || cfg.googleRefreshToken || ""
  });
  await saveConfig({
    aiProvider: "gemini",
    aiApiKey: token.access_token,
    googleTokenExpiry: expiry,
    googleRefreshToken: token.refresh_token || cfg.googleRefreshToken || ""
  });
  return {
    ok: true,
    provider: prov.name,
    apiKey: token.access_token,
    permanent: false,
    expiresIn: token.expires_in || 3600,
    note: "Erişim jetonu ~1 saat geçerli; süre bitince yeniden yetkilendirin."
  };
}

// ============================================================================
// KISAYOLLAR & ZAMANLAYICI — Erişimi anında kes / aç
// ============================================================================
async function quickToggleAccess() {
  const cfg = await getConfig();
  const next = cfg.accessMode === "locked" ? "open" : "locked";
  const res = await setAccessMode(next);
  const msg = next === "locked"
    ? "🔒 GhostPilot: AI erişimi KAPATILDI (Alt+Shift+X ile geri açabilirsiniz)."
    : "🔓 GhostPilot: AI erişimi AÇILDI.";
  pushLog(next === "locked" ? "warn" : "success", msg);
  try {
    api.notifications?.create({
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "GhostPilot",
      message: msg
    });
  } catch (_) {}
  return res;
}

try {
  api.commands.onCommand.addListener((command) => {
    if (command === "emergency-stop") {
      triggerEmergencyStop();
    } else if (command === "toggle-access") {
      quickToggleAccess();
    } else if (command === "open-ghostpilot") {
      try {
        if (api.sidePanel?.open) {
          api.windows.getCurrent((w) => api.sidePanel.open({ windowId: w.id }));
        } else if (api.sidebarAction?.open) {
          api.sidebarAction.open();
        }
      } catch (_) {}
    }
  });
} catch (_) {}

try {
  api.alarms.create("gp_access_expiry", { periodInMinutes: 0.5 });
  api.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "gp_access_expiry") enforceAccessExpiry();
  });
} catch (_) {}

try {
  api.runtime.onStartup?.addListener(() => {
    enforceAccessExpiry();
    getConfig().then((cfg) => {
      // Tarayıcı yeniden açıldığında kilitli kaldıysa daemon'a bildir
      if (cfg.accessMode === "locked" && daemonSocket && daemonSocket.readyState === WebSocket.OPEN) {
        try { daemonSocket.send(JSON.stringify({ type: "access_mode", mode: "locked" })); } catch (_) {}
      }
    });
  });
  api.runtime.onInstalled?.addListener((details) => {
    pushLog("info", "GhostPilot kuruldu. Erişim varsayılan olarak AÇIK; Alt+Shift+X ile her an kapatabilirsiniz.");
    // İlk kurulumda destek penceresini bir kez aç
    if (details && details.reason === "install") {
      scheduleDonatePopup({ firstTime: true });
    }
  });
} catch (_) {}

// ============================================================================
// DESTEK / BAĞIŞ PENCERESİ
//   - İlk kurulumda 1 kez açılır
//   - Sonrasında haftada en fazla 1 kez
//   - "Bir hafta gösterme" / "Bir daha gösterme" seçenekleri donate.html içinde
//   - Hiçbir veri toplanmaz; yalnızca yerel chrome.storage kullanılır
// ============================================================================
const DONATE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DONATE_ALARM = "gp_donate_reminder";

async function getDonateState() {
  try {
    const r = await api.storage.local.get("donate");
    return r.donate || {};
  } catch (e) {
    return {};
  }
}

async function setDonateState(patch) {
  try {
    const cur = await getDonateState();
    await api.storage.local.set({ donate: { ...cur, ...patch } });
  } catch (e) { /* yoksay */ }
}

/**
 * Bağış penceresinin gösterilip gösterilmeyeceğine karar verir.
 * Döner: { show: boolean, reason: string }
 */
async function shouldShowDonate() {
  const d = await getDonateState();
  if (d.mutedForever) return { show: false, reason: "muted_forever" };
  if (d.mutedUntil && Date.now() < d.mutedUntil) return { show: false, reason: "muted" };
  if (d.snoozeUntil && Date.now() < d.snoozeUntil) return { show: false, reason: "snoozed" };
  if (d.lastShownAt && Date.now() - d.lastShownAt < DONATE_WEEK_MS) {
    return { show: false, reason: "too_soon" };
  }
  return { show: true, reason: "due" };
}

async function openDonatePopup() {
  const url = api.runtime.getURL("donate.html");
  try {
    // Sekme olarak aç (pencere yönetimi izni gerektirmez, daha az rahatsız eder)
    await api.tabs.create({ url, active: true });
    return true;
  } catch (e) {
    try {
      await api.windows.create({ url, type: "popup", width: 480, height: 700 });
      return true;
    } catch (e2) {
      return false;
    }
  }
}

async function scheduleDonatePopup(opts = {}) {
  try {
    const verdict = await shouldShowDonate();
    if (!verdict.show && !opts.force) return false;
    const ok = await openDonatePopup();
    if (ok) {
      const d = await getDonateState();
      await setDonateState({
        lastShownAt: Date.now(),
        shownCount: (d.shownCount || 0) + 1,
        firstShownAt: d.firstShownAt || Date.now()
      });
    }
    return ok;
  } catch (e) {
    return false;
  }
}

// Haftalık hatırlatma alarmı (ilk kurulumdan 7 gün sonra başlar)
try {
  api.alarms.create(DONATE_ALARM, { periodInMinutes: 60 * 24 }); // günde 1 kez kontrol
  api.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== DONATE_ALARM) return;
    shouldShowDonate().then((v) => {
      if (v.show) scheduleDonatePopup();
    }).catch(() => {});
  });
} catch (_) {}

// Tarayıcı her açıldığında: süresi geçmişse göster
try {
  api.runtime.onStartup?.addListener(() => {
    shouldShowDonate().then((v) => {
      if (v.show) scheduleDonatePopup();
    }).catch(() => {});
  });
} catch (_) {}
