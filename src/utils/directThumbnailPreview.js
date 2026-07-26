/**
 * 直接图片预览模块
 *
 * 鼠标悬停在帖子列表缩略图上时，在旁边显示高清大图预览。
 */

const STORAGE_KEY = "image-preview-enabled";
const IMAGE_SELECTOR = "img.ant-image-img";
const LIST_IMAGE_SELECTOR = "table.table-fixed .ant-image";

let previewEl = null;
let observer = null;

// ============================================================
// 创建预览容器
// ============================================================

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
    backgroundColor: "#f5f5f5",
    transition: "opacity .15s ease",
  });

  previewEl.addEventListener("transitionend", () => {
    if (previewEl.style.opacity === "0") {
      previewEl.style.display = "none";
    }
  });

  document.body.appendChild(previewEl);
}

// ============================================================
// 显示 / 隐藏
// ============================================================

function showPreview(img) {
  if (!img || !img.src) return;

  const naturalWidth = img.naturalWidth || img.width || 200;
  const naturalHeight = img.naturalHeight || img.height || 200;
  const maxWidth = window.innerWidth * 0.5;
  const maxHeight = window.innerHeight * 0.72;
  const ratio = naturalWidth / naturalHeight || 1;

  let width = maxWidth;
  let height = width / ratio;
  if (height > maxHeight) {
    height = maxHeight;
    width = maxHeight * ratio;
  }
  width = Math.max(120, Math.min(width, maxWidth));
  height = Math.max(120, Math.min(height, maxHeight));

  const rect = img.getBoundingClientRect();
  let left = rect.right + 18;
  if (left + width + 12 > window.innerWidth && rect.left > width + 18) {
    left = rect.left - width - 18;
  }
  let top = rect.top + rect.height / 2 - height / 2;
  top = Math.max(12, Math.min(top, window.innerHeight - height - 12));

  // 先清空再设置，避免加载中显示上一张图
  previewEl.src = "";
  previewEl.src = img.src;
  Object.assign(previewEl.style, {
    display: "block",
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
  });

  requestAnimationFrame(() => {
    previewEl.style.opacity = "1";
  });
}

function hidePreview() {
  if (previewEl) {
    previewEl.style.opacity = "0";
  }
}

// ============================================================
// hover 事件绑定
// ============================================================

function findRowLink(el) {
  // 向上查找，找到缩略图所在的行级容器
  let current = el;
  while (current && current !== document.body) {
    if (current.matches?.("tr, [role='row'], .ant-table-row")) {
      break;
    }
    current = current.parentElement;
  }
  if (!current || current === document.body) return null;

  // 在行内查找详情链接
  const link = current.querySelector('a[href]');
  return link;
}

function bindContainer(container) {
  if (container._previewBound) return;
  container._previewBound = true;

  let overlay = null;

  container.addEventListener("mouseenter", () => {
    const img = container.querySelector(IMAGE_SELECTOR);
    if (img) showPreview(img);

    // 在缩略图上覆盖透明 <a>，让浏览器原生处理中键后台打开
    const link = findRowLink(container);
    if (link && link.href) {
      overlay = document.createElement("a");
      overlay.href = link.href;
      overlay.target = "_blank";
      overlay.rel = "noopener noreferrer";
      Object.assign(overlay.style, {
        position: "absolute",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        zIndex: "10",
        display: "block",
      });
      container.style.position = "relative";
      container.appendChild(overlay);
    }
  });

  container.addEventListener("mouseleave", () => {
    hidePreview();
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
  });
}

// ============================================================
// 扫描 + MutationObserver
// ============================================================

function bindAllContainers() {
  document.querySelectorAll(LIST_IMAGE_SELECTOR).forEach((el) => {
    if (!el._previewBound) bindContainer(el);
  });
}

function startObserver() {
  if (observer) return;
  observer = new MutationObserver(bindAllContainers);
  observer.observe(document.body, { childList: true, subtree: true });
}

function stopObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

// ============================================================
// 绑定 / 清理
// ============================================================

let bound = false;

function bindEvents() {
  if (bound) return;
  startObserver();
  bindAllContainers();
  bound = true;
}

function cleanup() {
  hidePreview();
  if (!bound) return;

  stopObserver();

  document.querySelectorAll(LIST_IMAGE_SELECTOR).forEach((el) => {
    if (el._previewBound) {
      el.replaceWith(el.cloneNode(true));
    }
  });

  bound = false;
}

// ============================================================
// 公开 API
// ============================================================

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
