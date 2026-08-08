/**
 * 直接图片预览模块
 *
 * 鼠标悬停在帖子列表缩略图上时，在旁边显示高清大图预览。
 */

const IMAGE_SELECTOR = "img.ant-image-img";
const LIST_IMAGE_SELECTOR = "table.table-fixed .ant-image, li.list-none .ant-image[role='button']";

import { createSharedPreviewEl, hideSharedPreview } from './sharedPreview.js'
import { loadBoolean } from './storage.js'

let observer = null;
let abortController = null;

// ============================================================
// 创建预览容器
// ============================================================

function createPreviewEl() {
  return createSharedPreviewEl()
}

// ============================================================
// 显示 / 隐藏
// ============================================================

function showPreview(img) {
  if (!img || !img.src) return;
  const preview = createSharedPreviewEl();

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
  const isTable = img.closest("table.table-fixed");

  let left, top;

  if (isTable) {
    left = rect.right + 18;
    top = rect.top + rect.height / 2 - height / 2;
    if (left + width + 12 > window.innerWidth) {
      left = rect.left - width - 18;
    }
  } else {
    left = rect.left + rect.width / 2 - width / 2;
    top = rect.bottom + 12;
    if (top + height + 12 > window.innerHeight && rect.top > height + 12) {
      top = rect.top - height - 12;
    }
    if (top + height + 12 > window.innerHeight && rect.top <= height + 12) {
      left = rect.right + 18;
      top = rect.top + rect.height / 2 - height / 2;
      if (left + width + 12 > window.innerWidth && rect.left > width + 18) {
        left = rect.left - width - 18;
      }
    }
  }

  left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
  top = Math.max(12, Math.min(top, window.innerHeight - height - 12));

  preview.src = "";
  preview.src = isTable ? img.src : img.src.replace(/-(\d+\.jpg)$/i, "jp-$1");
  Object.assign(preview.style, {
    display: "block",
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
  });

  requestAnimationFrame(() => {
    preview.style.opacity = "1";
  });
}

function hidePreview() {
  hideSharedPreview()
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
  const signal = abortController?.signal;

  container.addEventListener("mouseenter", () => {
    const img = container.querySelector(IMAGE_SELECTOR);
    if (img) showPreview(img);

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

      // 左键在 click 中阻止原生导航
      overlay.addEventListener("click", (e) => {
        if (e.button !== 1) e.preventDefault();
      });
      // 中键不做任何干预，让浏览器原生处理后台打开
    }
  }, { signal });

  container.addEventListener("mouseleave", () => {
    hidePreview();
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
  }, { signal });
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
  abortController = new AbortController();
  startObserver();
  bindAllContainers();
  bound = true;
}

function cleanup() {
  hidePreview();
  if (!bound) return;

  stopObserver();

  if (abortController) {
    abortController.abort();
    abortController = null;
  }

  document.querySelectorAll(LIST_IMAGE_SELECTOR).forEach((el) => {
    if (el._previewBound) {
      delete el._previewBound;
      // 移除可能残留的 overlay
      el.querySelectorAll('a[style*="z-index: 10"]').forEach((a) => a.remove());
    }
  });

  bound = false;
}

// ============================================================
// 公开 API
// ============================================================

export function initDirectImagePreview() {
  if (!loadBoolean('image-preview-enabled', true)) {
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
