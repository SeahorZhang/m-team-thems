const PANEL_ID = "mt-element-picker";
const HOVER_CLASS = "mt-picker-hover";

let active = false;
let panel = null;
let onCloseCallback = null;

function injectStyles() {
  if (document.getElementById("mt-picker-css")) return;
  const style = document.createElement("style");
  style.id = "mt-picker-css";
  style.textContent = `
    .${HOVER_CLASS} {
      outline: 2px solid #3b82f6 !important;
      outline-offset: 1px !important;
      cursor: crosshair !important;
    }
    #${PANEL_ID} {
      position: fixed;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      background: #1e293b;
      color: #e2e8f0;
      border-radius: 10px;
      padding: 10px 16px;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      z-index: 99999;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      max-width: 90vw;
      pointer-events: auto;
    }
    #${PANEL_ID} .picker-tag {
      background: #334155;
      padding: 2px 8px;
      border-radius: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 500px;
      font-family: monospace;
      font-size: 12px;
    }
    #${PANEL_ID} .picker-btn {
      background: #3b82f6;
      color: #fff;
      border: none;
      padding: 4px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
      white-space: nowrap;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #${PANEL_ID} .picker-btn:hover {
      background: #2563eb;
    }
    #${PANEL_ID} .picker-btn.copy-ok {
      background: #16a34a;
    }
    #${PANEL_ID} .picker-exit {
      background: #475569;
      color: #fff;
      border: none;
      padding: 4px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
      white-space: nowrap;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #${PANEL_ID} .picker-exit:hover {
      background: #64748b;
    }
  `;
  document.head.appendChild(style);
}

function getFullSelector(el) {
  const parts = [];
  let current = el;
  while (current && current !== document.body && parts.length < 6) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      parts.unshift(`#${current.id}`);
      break;
    }
    if (current.className && typeof current.className === "string") {
      const cls = current.className.trim().split(/\s+/)
        .filter(c => !c.match(/^(ant-|css-|plasmo-)/) && c.length < 30)
        .slice(0, 2)
        .map(c => `.${CSS.escape(c)}`)
        .join("");
      if (cls) selector += cls;
    }
    parts.unshift(selector);
    current = current.parentElement;
  }
  return parts.join(" > ");
}

function getElementInfo(el) {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const classes = (el.className && typeof el.className === "string")
    ? el.className.trim().split(/\s+/).filter(c => !c.match(/^(ant-|css-|plasmo-)/)).slice(0, 3).join(" ")
    : "";
  return { tag, id, classes };
}

function onMouseMove(e) {
  if (!active) return;
  const el = e.target;
  if (el.id === PANEL_ID || el.closest(`#${PANEL_ID}`)) return;

  document.querySelectorAll(`.${HOVER_CLASS}`).forEach(e => e.classList.remove(HOVER_CLASS));
  el.classList.add(HOVER_CLASS);

  const info = getElementInfo(el);
  const display = info.id || info.classes || info.tag;
  panel.querySelector(".picker-tag").textContent = display;
  panel.querySelector(".picker-tag").title = getFullSelector(el);
  panel.dataset.selector = getFullSelector(el);
}

function onClick(e) {
  if (!active) return;
  if (e.target.closest(`#${PANEL_ID}`)) return;
  e.preventDefault();
  e.stopPropagation();

  const selector = panel.dataset.selector;
  if (!selector) return;

  navigator.clipboard.writeText(selector).then(() => {
    const btn = panel.querySelector(".picker-btn");
    btn.textContent = "已复制";
    btn.classList.add("copy-ok");
    setTimeout(() => {
      btn.textContent = "复制选择器";
      btn.classList.remove("copy-ok");
    }, 1200);
  });
}

function onKeyDown(e) {
  if (!active) return;
  if (e.key === "Escape") {
    stop();
  }
}

function stop() {
  active = false;
  document.querySelectorAll(`.${HOVER_CLASS}`).forEach(e => e.classList.remove(HOVER_CLASS));
  if (panel) panel.style.display = "none";
  document.removeEventListener("mousemove", onMouseMove, true);
  document.removeEventListener("click", onClick, true);
  document.removeEventListener("keydown", onKeyDown, true);
  if (onCloseCallback) onCloseCallback();
}

function start(callback) {
  active = true;
  onCloseCallback = callback || null;
  injectStyles();

  if (!panel) {
    panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <span style="color:#94a3b8;font-size:11px">悬停选择，点击复制</span>
      <span class="picker-tag"></span>
      <button class="picker-btn">复制选择器</button>
      <button class="picker-exit">退出</button>
    `;
    panel.querySelector(".picker-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      const selector = panel.dataset.selector;
      if (!selector) return;
      navigator.clipboard.writeText(selector).then(() => {
        const btn = panel.querySelector(".picker-btn");
        btn.textContent = "已复制";
        btn.classList.add("copy-ok");
        setTimeout(() => {
          btn.textContent = "复制选择器";
          btn.classList.remove("copy-ok");
        }, 1200);
      });
    });
    panel.querySelector(".picker-exit").addEventListener("click", (e) => {
      e.stopPropagation();
      stop();
    });
    document.body.appendChild(panel);
  } else {
    panel.style.display = "flex";
  }

  document.addEventListener("mousemove", onMouseMove, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKeyDown, true);
}

function toggle(callback) {
  if (active) stop(); else start(callback);
  return active;
}

function isActive() { return active; }

export { toggle, isActive };
