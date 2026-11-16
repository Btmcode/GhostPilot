/**
 * GhostPilot — content.js
 * Copyright (c) 2026 BTM Code — MIT License
 * https://btmcode.vercel.app
 * https://github.com/  ·  Açık kaynak. Telif bildirimini koruyun.
 */
/**
 * GhostPilot — Ultra-Low-Overhead Content Engine (Chromium & Firefox)
 * - 0 Idle CPU / 0 DOM pollution until activated
 * - WeakRef element registry (zero memory leaks on SPAs)
 * - GPU-composited Shadow DOM Ghost Cursor (pointer-events: none, contain: strict)
 * - Synthetic Pointer/Mouse/Keyboard/Canvas Game Engine (works without stealing OS cursor/focus)
 * - Optional Web AI Chat Bridge (ChatGPT, Claude, Gemini, DeepSeek)
 */
(() => {
  if (window.__GHOSTPILOT_LOADED__) return;
  window.__GHOSTPILOT_LOADED__ = true;

  const api = typeof browser !== "undefined" ? browser : chrome;

  // Ephemeral element map using WeakRef so detached SPA nodes get GC'd immediately
  const elementRegistry = new Map();
  let nextRefId = 1;

  // Virtual cursor & game input state (completely independent from user's physical mouse!)
  const virtualState = {
    x: Math.round(window.innerWidth / 2),
    y: Math.round(window.innerHeight / 2),
    buttons: 0,
    heldKeys: new Map(), // code -> { key, code, keyCode, timer }
    overlayEnabled: true,
    abortBatch: false
  };

  // Lazy Shadow DOM references
  let hostEl = null;
  let cursorEl = null;
  let rippleEl = null;
  let hudEl = null;
  let rafPending = false;
  let hideTimer = null;

  const KEY_MAP = {
    Enter: { key: "Enter", code: "Enter", keyCode: 13 },
    Escape: { key: "Escape", code: "Escape", keyCode: 27 },
    Space: { key: " ", code: "Space", keyCode: 32 },
    " ": { key: " ", code: "Space", keyCode: 32 },
    Tab: { key: "Tab", code: "Tab", keyCode: 9 },
    Backspace: { key: "Backspace", code: "Backspace", keyCode: 8 },
    Delete: { key: "Delete", code: "Delete", keyCode: 46 },
    ArrowUp: { key: "ArrowUp", code: "ArrowUp", keyCode: 38 },
    ArrowDown: { key: "ArrowDown", code: "ArrowDown", keyCode: 40 },
    ArrowLeft: { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37 },
    ArrowRight: { key: "ArrowRight", code: "ArrowRight", keyCode: 39 },
    Shift: { key: "Shift", code: "ShiftLeft", keyCode: 16 },
    Control: { key: "Control", code: "ControlLeft", keyCode: 17 },
    Alt: { key: "Alt", code: "AltLeft", keyCode: 18 }
  };

  function resolveKeyInfo(rawKey) {
    if (KEY_MAP[rawKey]) return KEY_MAP[rawKey];
    if (rawKey && rawKey.length === 1) {
      const upper = rawKey.toUpperCase();
      const isAlpha = upper >= "A" && upper <= "Z";
      const isDigit = upper >= "0" && upper <= "9";
      return {
        key: rawKey,
        code: isAlpha ? `Key${upper}` : isDigit ? `Digit${upper}` : rawKey,
        keyCode: upper.charCodeAt(0)
      };
    }
    return { key: rawKey || "Unidentified", code: rawKey || "Unidentified", keyCode: 0 };
  }

  // Lazy-create GPU-accelerated Ghost Overlay
  function ensureOverlay() {
    if (!virtualState.overlayEnabled) return false;
    if (hostEl && document.documentElement.contains(hostEl)) return true;

    hostEl = document.createElement("div");
    hostEl.id = "__gp_shadow_host__";
    hostEl.style.cssText =
      "position:fixed;inset:0;pointer-events:none;z-index:2147483647;contain:strict;overflow:hidden;";

    const shadow = hostEl.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = `
      :host { all: initial; }
      .gp-cursor {
        position: fixed;
        top: 0; left: 0;
        width: 22px; height: 22px;
        pointer-events: none;
        will-change: transform, opacity;
        transition: opacity 0.25s ease;
        opacity: 0;
        filter: drop-shadow(0 2px 6px rgba(0, 240, 200, 0.55));
      }
      .gp-badge {
        position: absolute;
        left: 16px; top: 14px;
        background: rgba(10, 15, 28, 0.88);
        color: #00f0c8;
        border: 1px solid rgba(0, 240, 200, 0.45);
        border-radius: 5px;
        padding: 1px 5px;
        font: 600 10px/14px system-ui, sans-serif;
        white-space: nowrap;
        letter-spacing: 0.3px;
      }
      .gp-ripple {
        position: fixed;
        top: 0; left: 0;
        width: 28px; height: 28px;
        margin-left: -14px; margin-top: -14px;
        border-radius: 50%;
        border: 2px solid #00f0c8;
        pointer-events: none;
        opacity: 0;
        will-change: transform, opacity;
      }
      .gp-ripple.active {
        animation: gp-pulse 0.36s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      @keyframes gp-pulse {
        0% { opacity: 0.95; transform: translate3d(var(--rx), var(--ry), 0) scale(0.35); }
        100% { opacity: 0; transform: translate3d(var(--rx), var(--ry), 0) scale(1.55); }
      }
      .gp-hud {
        position: fixed;
        bottom: 12px; right: 12px;
        background: rgba(10, 15, 28, 0.84);
        border: 1px solid rgba(139, 92, 246, 0.45);
        color: #e2e8f0;
        font: 600 11px/16px ui-monospace, monospace;
        padding: 4px 8px;
        border-radius: 6px;
        pointer-events: none;
        display: none;
      }
    `;

    cursorEl = document.createElement("div");
    cursorEl.className = "gp-cursor";
    cursorEl.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M4 2L20 11.5L12.2 13.4L8.5 21L4 2Z" fill="#00F0C8" stroke="#090D16" stroke-width="1.8" stroke-linejoin="round"/>
      </svg>
      <span class="gp-badge">AI</span>
    `;

    rippleEl = document.createElement("div");
    rippleEl.className = "gp-ripple";

    hudEl = document.createElement("div");
    hudEl.className = "gp-hud";

    shadow.append(style, rippleEl, cursorEl, hudEl);
    (document.documentElement || document.body).appendChild(hostEl);
    return true;
  }

  function renderGhostCursor(pulse = false, label = "AI") {
    if (!virtualState.overlayEnabled) return;
    if (!ensureOverlay()) return;

    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        if (!cursorEl) return;
        cursorEl.style.opacity = "1";
        cursorEl.style.transform = `translate3d(${virtualState.x}px, ${virtualState.y}px, 0)`;
        const badge = cursorEl.querySelector(".gp-badge");
        if (badge && badge.textContent !== label) badge.textContent = label;
      });
    }

    if (pulse && rippleEl) {
      rippleEl.style.setProperty("--rx", `${virtualState.x}px`);
      rippleEl.style.setProperty("--ry", `${virtualState.y}px`);
      rippleEl.classList.remove("active");
      void rippleEl.offsetWidth;
      rippleEl.classList.add("active");
    }

    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (cursorEl && virtualState.heldKeys.size === 0) {
        cursorEl.style.opacity = "0.28";
      }
    }, 3500);
  }

  function updateKeyHud() {
    if (!virtualState.overlayEnabled || !hudEl) return;
    if (virtualState.heldKeys.size === 0) {
      hudEl.style.display = "none";
      return;
    }
    const keys = Array.from(virtualState.heldKeys.keys()).join(" + ");
    hudEl.textContent = `AI Tuş: [${keys}]`;
    hudEl.style.display = "block";
  }

  // Resolve target coordinates or element by refId / CSS selector / (x,y)
  function resolveTarget(params) {
    let el = null;
    let x = typeof params.x === "number" ? params.x : virtualState.x;
    let y = typeof params.y === "number" ? params.y : virtualState.y;

    if (params.refId != null) {
      const ref = elementRegistry.get(Number(params.refId));
      el = ref ? ref.deref() : null;
    } else if (params.selector) {
      el = document.querySelector(params.selector);
    }

    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        x = Math.round(rect.left + rect.width / 2);
        y = Math.round(rect.top + rect.height / 2);
      }
    } else if (typeof params.x === "number" && typeof params.y === "number") {
      el = document.elementFromPoint(x, y) || document.body;
    } else {
      el = document.elementFromPoint(x, y) || document.activeElement || document.body;
    }

    return { el: el || document.body, x, y };
  }

  // Dispatch realistic synthetic mouse + pointer events without moving OS mouse
  function dispatchSyntheticMouse(type, x, y, button = 0, buttons = 0, targetEl = null) {
    const el = targetEl || document.elementFromPoint(x, y) || document.body;
    const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : { left: 0, top: 0 };
    const common = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      clientX: x,
      clientY: y,
      screenX: x + (window.screenX || 0),
      screenY: y + (window.screenY || 0),
      button,
      buttons
    };

    const pointerTypeMap = {
      mousemove: "pointermove",
      mousedown: "pointerdown",
      mouseup: "pointerup"
    };

    if (pointerTypeMap[type] && typeof PointerEvent !== "undefined") {
      el.dispatchEvent(
        new PointerEvent(pointerTypeMap[type], {
          ...common,
          pointerId: 42, // Dedicated virtual pointer ID separate from primary mouse (1)
          pointerType: "mouse",
          isPrimary: false,
          pressure: buttons ? 0.5 : 0
        })
      );
    }

    const mouseEvt = new MouseEvent(type, common);
    // Provide offsetX/offsetY for HTML5 Canvas games that read offset coordinates
    try {
      Object.defineProperty(mouseEvt, "offsetX", { get: () => x - rect.left });
      Object.defineProperty(mouseEvt, "offsetY", { get: () => y - rect.top });
    } catch (_) {}
    el.dispatchEvent(mouseEvt);
    return el;
  }

  function dispatchSyntheticKey(type, rawKey, targetEl = null, modifiers = {}) {
    const info = resolveKeyInfo(rawKey);
    const el =
      targetEl ||
      document.querySelector("canvas") ||
      document.activeElement ||
      document.body;

    const evt = new KeyboardEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      key: info.key,
      code: info.code,
      keyCode: info.keyCode,
      which: info.keyCode,
      shiftKey: !!modifiers.shift,
      ctrlKey: !!modifiers.ctrl,
      altKey: !!modifiers.alt,
      metaKey: !!modifiers.meta,
      repeat: !!modifiers.repeat
    });

    el.dispatchEvent(evt);
    // Many HTML5/WebGL games bind key listeners on window or document
    if (el !== document && el !== window && el.tagName === "CANVAS") {
      window.dispatchEvent(evt);
    }
  }

  // Native value setter for React / Vue / Angular inputs without stealing OS clipboard
  function setElementText(el, text, append = false, pressEnter = false) {
    if (!el) return false;
    const nextVal = append ? (el.value || el.textContent || "") + text : text;

    if (el.isContentEditable) {
      el.textContent = nextVal;
      el.dispatchEvent(new InputEvent("input", { bubbles: true, data: text, inputType: "insertText" }));
    } else if ("value" in el) {
      const proto =
        el instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
      const desc = Object.getOwnPropertyDescriptor(proto, "value");
      if (desc && desc.set) {
        desc.set.call(el, nextVal);
      } else {
        el.value = nextVal;
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      for (const ch of text) {
        dispatchSyntheticKey("keydown", ch, el);
        dispatchSyntheticKey("keyup", ch, el);
      }
    }

    if (pressEnter) {
      dispatchSyntheticKey("keydown", "Enter", el);
      dispatchSyntheticKey("keyup", "Enter", el);
      if (el.form && typeof el.form.requestSubmit === "function") {
        try { el.form.requestSubmit(); } catch (_) {}
      }
    }
    return true;
  }

  function holdVirtualKey(rawKey, durationMs = 500) {
    const info = resolveKeyInfo(rawKey);
    releaseVirtualKey(rawKey);

    const target = document.querySelector("canvas") || document.activeElement || document.body;
    dispatchSyntheticKey("keydown", rawKey, target, { repeat: false });

    const interval = setInterval(() => {
      dispatchSyntheticKey("keydown", rawKey, target, { repeat: true });
    }, 33); // ~30Hz repeat pulse for browser games

    const timeout = durationMs > 0
      ? setTimeout(() => releaseVirtualKey(rawKey), Math.min(durationMs, 30000))
      : null;

    virtualState.heldKeys.set(info.code, { rawKey, interval, timeout, target });
    updateKeyHud();
  }

  function releaseVirtualKey(rawKey) {
    const info = resolveKeyInfo(rawKey);
    const entry = virtualState.heldKeys.get(info.code);
    if (!entry) return;
    clearInterval(entry.interval);
    if (entry.timeout) clearTimeout(entry.timeout);
    virtualState.heldKeys.delete(info.code);
    dispatchSyntheticKey("keyup", entry.rawKey, entry.target);
    updateKeyHud();
  }

  function emergencyReleaseAll() {
    virtualState.abortBatch = true;
    for (const [code, entry] of virtualState.heldKeys.entries()) {
      clearInterval(entry.interval);
      if (entry.timeout) clearTimeout(entry.timeout);
      dispatchSyntheticKey("keyup", entry.rawKey, entry.target);
      virtualState.heldKeys.delete(code);
    }
    if (virtualState.buttons !== 0) {
      dispatchSyntheticMouse("mouseup", virtualState.x, virtualState.y, 0, 0);
      virtualState.buttons = 0;
    }
    updateKeyHud();
    renderGhostCursor(false, "DURDURULDU");
  }

  // Ultra-fast (<2ms) Compact DOM & Game Snapshot for low-RAM AI agents
  function collectCompactSnapshot(maxItems = 85) {
    elementRegistry.clear();
    nextRefId = 1;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const items = [];

    const interactiveTags = new Set(["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA", "CANVAS", "SUMMARY"]);
    const interactiveRoles = new Set(["button", "link", "textbox", "checkbox", "menuitem", "tab", "switch", "option"]);

    const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_ELEMENT);
    let node = walker.currentNode;

    while (node && items.length < maxItems) {
      if (node.id !== "__gp_shadow_host__") {
        const tag = node.tagName;
        const role = node.getAttribute ? node.getAttribute("role") : null;
        const isInteractive =
          interactiveTags.has(tag) ||
          (role && interactiveRoles.has(role)) ||
          node.isContentEditable ||
          (node.onclick != null) ||
          (node.tabIndex >= 0 && tag !== "DIV" && tag !== "SPAN");

        if (isInteractive) {
          const rect = node.getBoundingClientRect();
          if (
            rect.width >= 6 &&
            rect.height >= 6 &&
            rect.bottom >= -40 &&
            rect.top <= vh + 80 &&
            rect.right >= 0 &&
            rect.left <= vw
          ) {
            const style = window.getComputedStyle(node);
            if (style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity) > 0.05) {
              const id = nextRefId++;
              elementRegistry.set(id, new WeakRef(node));

              // GİZLİLİK: hassas alanlarda DEĞER okunmaz (şifre/kart/OTP/token)
              const sensitive = isSensitiveField(node);
              const safeValue = sensitive ? "" : (node.value || "");
              // Etiket her zaman değerden ÖNCE gelir: ajan alanı tanır ama
              // kullanıcının yazdığı metni görmez.
              const label = (
                node.getAttribute("aria-label") ||
                node.placeholder ||
                node.title ||
                node.getAttribute("name") ||
                node.id ||
                node.innerText ||
                safeValue ||
                ""
              )
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 64);

              items.push({
                id,
                tag: tag.toLowerCase(),
                type: node.type || role || undefined,
                label: label || undefined,
                sensitive: sensitive || undefined,
                x: Math.round(rect.left + rect.width / 2),
                y: Math.round(rect.top + rect.height / 2),
                w: Math.round(rect.width),
                h: Math.round(rect.height)
              });
            }
          }
        }
      }
      node = walker.nextNode();
    }

    const canvases = document.querySelectorAll("canvas");
    return {
      url: location.href,
      title: document.title,
      viewport: { w: vw, h: vh, scrollY: Math.round(window.scrollY) },
      hasGameCanvas: canvases.length > 0,
      elements: items
    };
  }

  // Fast direct HTML5 Canvas capture for WebGL/2D games (avoids full-tab capture overhead when possible)
  function capturePrimaryCanvas(maxWidth = 640, quality = 0.5) {
    const canvases = Array.from(document.querySelectorAll("canvas"));
    if (!canvases.length) return null;
    canvases.sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight);
    const main = canvases[0];
    if (!main || main.width === 0 || main.height === 0) return null;

    try {
      const scale = Math.min(1, maxWidth / main.width);
      const outW = Math.max(1, Math.round(main.width * scale));
      const outH = Math.max(1, Math.round(main.height * scale));
      const off = document.createElement("canvas");
      off.width = outW;
      off.height = outH;
      const ctx = off.getContext("2d", { alpha: false });
      ctx.drawImage(main, 0, 0, outW, outH);
      return {
        dataUrl: off.toDataURL("image/webp", quality),
        width: outW,
        height: outH,
        source: "canvas_direct"
      };
    } catch (_) {
      // Tainted or non-preserveDrawingBuffer WebGL falls back to background captureVisibleTab / CDP
      return null;
    }
  }

  async function executeSingleAction(act) {
    if (typeof act.overlay === "boolean") {
      virtualState.overlayEnabled = act.overlay;
      if (!act.overlay && hostEl) hostEl.remove();
    }

    switch (act.action) {
      case "cursor_preview": {
        if (typeof act.x === "number") virtualState.x = act.x;
        if (typeof act.y === "number") virtualState.y = act.y;
        renderGhostCursor(!!act.pulse, act.label || "AI");
        return { ok: true, x: virtualState.x, y: virtualState.y };
      }

      case "resolve_ref": {
        const { x, y, el } = resolveTarget(act);
        virtualState.x = x;
        virtualState.y = y;
        renderGhostCursor(false, "AI");
        return { ok: true, x, y, tag: el?.tagName?.toLowerCase() };
      }

      case "move": {
        const { x, y, el } = resolveTarget(act);
        virtualState.x = x;
        virtualState.y = y;
        dispatchSyntheticMouse("mousemove", x, y, 0, virtualState.buttons, el);
        renderGhostCursor(false, "AI");
        return { ok: true, x, y };
      }

      case "click":
      case "right_click":
      case "double_click": {
        const { x, y, el } = resolveTarget(act);
        virtualState.x = x;
        virtualState.y = y;
        const btn = act.action === "right_click" ? 2 : 0;
        const mask = act.action === "right_click" ? 2 : 1;

        dispatchSyntheticMouse("mousemove", x, y, 0, 0, el);
        dispatchSyntheticMouse("mousedown", x, y, btn, mask, el);
        dispatchSyntheticMouse("mouseup", x, y, btn, 0, el);

        if (act.action === "right_click") {
          dispatchSyntheticMouse("contextmenu", x, y, 2, 0, el);
        } else {
          dispatchSyntheticMouse("click", x, y, 0, 0, el);
          if (act.action === "double_click") {
            dispatchSyntheticMouse("mousedown", x, y, 0, 1, el);
            dispatchSyntheticMouse("mouseup", x, y, 0, 0, el);
            dispatchSyntheticMouse("click", x, y, 0, 0, el);
            dispatchSyntheticMouse("dblclick", x, y, 0, 0, el);
          }
          // Trigger native link/button activation if synthetic click wasn't handled by canvas
          if (typeof el.click === "function" && (el.tagName === "A" || el.tagName === "BUTTON")) {
            try { el.click(); } catch (_) {}
          }
        }
        renderGhostCursor(true, act.action === "right_click" ? "SAĞ TIK" : "TIK");
        return { ok: true, x, y, tag: el.tagName?.toLowerCase() };
      }

      case "drag": {
        const start = resolveTarget({ x: act.fromX ?? virtualState.x, y: act.fromY ?? virtualState.y });
        const steps = Math.max(3, Math.min(30, act.steps || 8));
        dispatchSyntheticMouse("mousemove", start.x, start.y, 0, 0, start.el);
        dispatchSyntheticMouse("mousedown", start.x, start.y, 0, 1, start.el);
        virtualState.buttons = 1;

        for (let i = 1; i <= steps; i++) {
          const ix = Math.round(start.x + ((act.toX - start.x) * i) / steps);
          const iy = Math.round(start.y + ((act.toY - start.y) * i) / steps);
          virtualState.x = ix;
          virtualState.y = iy;
          dispatchSyntheticMouse("mousemove", ix, iy, 0, 1);
          renderGhostCursor(false, "SÜRÜKLE");
          await new Promise((r) => setTimeout(r, 12));
        }

        dispatchSyntheticMouse("mouseup", act.toX, act.toY, 0, 0);
        virtualState.buttons = 0;
        renderGhostCursor(true, "BIRAK");
        return { ok: true, x: act.toX, y: act.toY };
      }

      case "type": {
        const { el, x, y } = resolveTarget(act);
        virtualState.x = x;
        virtualState.y = y;
        setElementText(el, String(act.text ?? ""), !!act.append, !!act.pressEnter);
        renderGhostCursor(true, "YAZI");
        return { ok: true, x, y };
      }

      case "key": {
        const mode = act.mode || "press"; // press | down | up | hold
        if (mode === "hold") {
          holdVirtualKey(act.key, act.durationMs || 600);
        } else if (mode === "down") {
          holdVirtualKey(act.key, 0);
        } else if (mode === "up") {
          releaseVirtualKey(act.key);
        } else {
          dispatchSyntheticKey("keydown", act.key, null, act.modifiers);
          dispatchSyntheticKey("keyup", act.key, null, act.modifiers);
        }
        return { ok: true, key: act.key, mode };
      }

      case "scroll": {
        const dx = Number(act.deltaX || 0);
        const dy = Number(act.deltaY ?? 360);
        const { el, x, y } = resolveTarget(act);
        el.dispatchEvent(
          new WheelEvent("wheel", {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
            deltaX: dx,
            deltaY: dy
          })
        );
        window.scrollBy({ left: dx, top: dy, behavior: "instant" });
        renderGhostCursor(false, "KAYDIR");
        return { ok: true, scrollY: Math.round(window.scrollY) };
      }

      case "wait": {
        await new Promise((r) => setTimeout(r, Math.min(10000, Math.max(0, Number(act.ms || 100)))));
        return { ok: true };
      }

      case "emergency_stop": {
        emergencyReleaseAll();
        return { ok: true, stopped: true };
      }

      default:
        return { ok: false, error: `Bilinmeyen content aksiyonu: ${act.action}` };
    }
  }

  // Message router from Background Service Worker
  api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || msg.__target !== "ghostpilot_content") return false;

    if (msg.type === "SNAPSHOT") {
      sendResponse({ ok: true, snapshot: collectCompactSnapshot(msg.maxItems || 85) });
      return false;
    }

    if (msg.type === "CANVAS_FRAME") {
      sendResponse({ ok: true, frame: capturePrimaryCanvas(msg.maxWidth || 640, msg.quality || 0.5) });
      return false;
    }

    if (msg.type === "EMERGENCY_STOP") {
      emergencyReleaseAll();
      sendResponse({ ok: true });
      return false;
    }

    if (msg.type === "SYNTHETIC_ACTION") {
      executeSingleAction(msg.payload)
        .then((res) => sendResponse(res))
        .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
      return true;
    }

    if (msg.type === "SYNTHETIC_BATCH") {
      (async () => {
        virtualState.abortBatch = false;
        const results = [];
        for (const step of msg.steps || []) {
          if (virtualState.abortBatch) break;
          results.push(await executeSingleAction(step));
        }
        sendResponse({ ok: true, results, aborted: virtualState.abortBatch });
      })();
      return true;
    }

    return false;
  });

  // Physical Emergency Kill-Switch inside any page: Alt + Shift + X
  window.addEventListener(
    "keydown",
    (e) => {
      if (e.altKey && e.shiftKey && (e.code === "KeyX" || e.key === "X" || e.key === "x")) {
        emergencyReleaseAll();
        try {
          api.runtime.sendMessage({ type: "PANIC_STOP" });
        } catch (_) {}
      }
    },
    { passive: true }
  );

  // Optional lightweight Web AI Chat Bridge (activates ONLY on AI chat hosts when user enables it)
  const AI_CHAT_HOSTS = ["chatgpt.com", "claude.ai", "gemini.google.com", "chat.deepseek.com", "aistudio.google.com"];
  if (AI_CHAT_HOSTS.some((h) => location.hostname === h || location.hostname.endsWith(`.${h}`))) {
    api.storage.local.get(["webAiBridgeEnabled"], (cfg) => {
      if (!cfg || !cfg.webAiBridgeEnabled) return;
      const seenBlocks = new WeakSet();
      const scanCodeBlocks = () => {
        const blocks = document.querySelectorAll("pre code");
        for (const codeEl of blocks) {
          if (seenBlocks.has(codeEl)) continue;
          const raw = (codeEl.textContent || "").trim();
          if (!raw.startsWith("{") || !raw.includes('"ghostpilot"')) continue;
          seenBlocks.add(codeEl);

          const btn = document.createElement("button");
          btn.textContent = "⚡ GhostPilot ile Uygula";
          btn.style.cssText =
            "margin-top:6px;padding:4px 10px;border-radius:6px;border:1px solid #00f0c8;background:#0b1324;color:#00f0c8;font:600 12px system-ui;cursor:pointer;display:inline-block;";
          btn.onclick = () => {
            try {
              const parsed = JSON.parse(raw);
              api.runtime.sendMessage({ type: "EXECUTE_FROM_WEB_AI", command: parsed }, (res) => {
                btn.textContent = res?.ok ? "✓ Uygulandı" : "✗ Hata";
              });
            } catch (_) {
              btn.textContent = "✗ Geçersiz JSON";
            }
          };
          codeEl.parentElement?.insertAdjacentElement("afterend", btn);
        }
      };
      setInterval(scanCodeBlocks, 2500);
    });
  }
})();
// ============================================================================
//  GİZLİLİK KORUMASI
//  Hassas alanların DEĞERİ asla okunmaz ve AI'ya gönderilmez:
//  şifreler, kart numaraları, CVV, OTP/2FA, API anahtarları, TCKN/SSN.
//  Sadece etiket/placeholder metni okunur ki ajan alanı tanıyabilsin.
// ============================================================================
function isSensitiveField(el) {
  if (!el) return false;
  const type = String(el.type || "").toLowerCase();
  if (type === "password") return true;
  const hay = [
    el.name, el.id, el.placeholder,
    el.getAttribute && el.getAttribute("autocomplete"),
    el.getAttribute && el.getAttribute("aria-label"),
    el.getAttribute && el.getAttribute("data-testid")
  ].filter(Boolean).join(" ").toLowerCase();
  return /(password|passwd|passphrase|sifre|şifre|parola|token|secret|api[-_ ]?key|apikey|access[-_ ]?key|credit[-_ ]?card|card[-_ ]?number|cardnumber|cvv2?|cvc|iban|tckn|ssn|social[-_ ]?security|otp|2fa|mfa|verification[-_ ]?code|pin[-_ ]?code)/.test(hay);
}

