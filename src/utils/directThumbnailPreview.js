const STORAGE_KEY = "image-preview-enabled";

const IMAGE_SELECTOR = "img.ant-image-img";
const CONTAINER_SELECTOR = ".ant-image";

const MAX_WIDTH_RATIO = 0.5;
const MAX_HEIGHT_RATIO = 0.72;
const MIN_SIZE = 120;

let previewEl = null;

// 状态机核心
let state = {
  img: null,
  src: null,
  visible: false,
};

// RAF 调度
let rafId = 0;

// ------------------------
// DOM INIT
// ------------------------

function createPreviewEl() {
  if (previewEl) return;

  previewEl = document.createElement("img");

  Object.assign(previewEl.style, {
    position: "fixed",
    zIndex: "99999",
    display: "none",
    opacity: "0",
    borderRadius: "14px",
    boxShadow: "0 18px 50px rgba(0,0,0,.2)",
    objectFit: "contain",
    pointerEvents: "none",
    transition: "opacity .15s ease",
    willChange: "transform,opacity",
  });

  previewEl.addEventListener("transitionend", () => {
    if (!state.visible) {
      previewEl.style.display = "none";
    }
  });

  document.body.appendChild(previewEl);
}

// ------------------------
// EVENT -> IMAGE RESOLVE
// ------------------------

function getImageFromEvent(event) {
  const path = event.composedPath?.();

  if (path?.length) {
    for (const el of path) {
      if (el instanceof Element && el.matches?.(IMAGE_SELECTOR)) {
        return el;
      }
    }
  }

  const target = event.target;
  if (!(target instanceof Element)) return null;

  return (
    target.matches(IMAGE_SELECTOR)
      ? target
      : target.closest(CONTAINER_SELECTOR)?.querySelector(IMAGE_SELECTOR)
  );
}

// ------------------------
// STATE MACHINE
// ------------------------

function setState(next) {
  state = { ...state, ...next };
  scheduleRender();
}

// ------------------------
// RAF RENDER PIPELINE
// ------------------------

function scheduleRender() {
  if (rafId) return;

  rafId = requestAnimationFrame(() => {
    rafId = 0;
    render();
  });
}

function render() {
  if (!previewEl || !state.img) return;

  const img = state.img;

  const rect = img.getBoundingClientRect();

  const naturalWidth = img.naturalWidth || rect.width || 200;
  const naturalHeight = img.naturalHeight || rect.height || 200;

  const maxWidth = window.innerWidth * MAX_WIDTH_RATIO;
  const maxHeight = window.innerHeight * MAX_HEIGHT_RATIO;

  const ratio = naturalWidth / naturalHeight || 1;

  let width = maxWidth;
  let height = width / ratio;

  if (height > maxHeight) {
    height = maxHeight;
    width = maxHeight * ratio;
  }

  width = Math.max(MIN_SIZE, Math.min(width, maxWidth));
  height = Math.max(MIN_SIZE, Math.min(height, maxHeight));

  // position
  let left = rect.right + 18;

  if (left + width + 12 > window.innerWidth && rect.left > width + 18) {
    left = rect.left - width - 18;
  }

  let top = rect.top + rect.height / 2 - height / 2;
  top = Math.max(12, Math.min(top, window.innerHeight - height - 12));

  // src sync
  const src =
    img.currentSrc ||
    img.src ||
    img.dataset.src ||
    img.getAttribute("data-src");

  if (!src) return;

  if (previewEl.src !== src) {
    previewEl.src = src;
  }

  previewEl.alt = img.alt || "";

  // apply layout
  const style = previewEl.style;

  style.display = "block";
  style.left = `${left}px`;
  style.top = `${top}px`;
  style.width = `${width}px`;
  style.height = `${height}px`;

  // visibility
  if (state.visible) {
    requestAnimationFrame(() => {
      if (state.visible) {
        previewEl.style.opacity = "1";
      }
    });
  }
}

// ------------------------
// ACTIONS
// ------------------------

function show(img) {
  if (!img) return;

  setState({
    img,
    visible: true,
  });
}

function hide() {
  setState({
    visible: false,
  });

  if (previewEl) {
    previewEl.style.opacity = "0";
  }
}

// ------------------------
// EVENTS
// ------------------------

function handleOver(e) {
  const img = getImageFromEvent(e);
  if (!img) return;

  show(img);
}

function handleOut(e) {
  const related = e.relatedTarget;

  // 关键：避免在同一 image container 内乱闪
  if (related && e.target?.closest?.(CONTAINER_SELECTOR)?.contains(related)) {
    return;
  }

  hide();
}

// scroll / resize 统一重排
function handleLayoutChange() {
  if (!state.img) return;
  scheduleRender();
}

function openRowPage(event) {
  if (event.button !== 1) return;
  const target = event.target;
  if (!(target instanceof Element)) return;

  const row = target.closest(".flex.flex-nowrap.items-center");
  if (!row) return;

  const link = row.querySelector('a[href^="/detail/"]');
  if (!link) return;

  window.open(link.href, "_blank");
}

// ------------------------
// BIND
// ------------------------

let bound = false;

function bindEvents() {
  if (bound) return;

  document.body.addEventListener("pointerover", handleOver);
  document.body.addEventListener("pointerout", handleOut);
  document.body.addEventListener("auxclick", openRowPage);

  window.addEventListener("scroll", handleLayoutChange, true);
  window.addEventListener("resize", handleLayoutChange);

  bound = true;
}

function cleanup() {
  hide();

  if (!bound) return;

  document.body.removeEventListener("pointerover", handleOver);
  document.body.removeEventListener("pointerout", handleOut);
  document.body.removeEventListener("auxclick", openRowPage);

  window.removeEventListener("scroll", handleLayoutChange, true);
  window.removeEventListener("resize", handleLayoutChange);

  bound = false;
}

// ------------------------
// PUBLIC API
// ------------------------

export function initDirectImagePreview() {
  if (localStorage.getItem(STORAGE_KEY) === "false") {
    cleanup();
    return;
  }

  createPreviewEl();
  bindEvents();
}

export function reinitDirectImagePreview() {
  cleanup();
  initDirectImagePreview();
}