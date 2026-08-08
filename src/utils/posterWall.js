/**
 * 海报墙模式
 *
 * 将帖子列表转换为海报墙/网格布局，支持悬停大图预览和点击打开详情。
 */

// storage keys inlined to avoid extra module

import { createSharedPreviewEl, hideSharedPreview, removeSharedPreview } from './sharedPreview.js'
import { loadBoolean } from './storage.js'
import { SVG_STAR, SVG_DOWNLOAD, SVG_CHECK } from './icons.js'

let wallContainer = null;
let observer = null;
let abortController = null;
let lastTableRowsSignature = null;
let originalTableDisplay = null;
let originalTheadDisplay = null;

// ============================================================
// 检查海报墙是否启用
// ============================================================

export function isPosterWallEnabled() {
  return loadBoolean('poster-wall-enabled', true);
}

// ============================================================
// 预览元素（独立于 directThumbnailPreview 的实例）
// ============================================================

function createPreviewEl() {
  return createSharedPreviewEl()
}

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
  let left = rect.right + 18;
  let top = rect.top + rect.height / 2 - height / 2;

  if (left + width + 12 > window.innerWidth) {
    left = rect.left - width - 18;
  }
  left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
  top = Math.max(12, Math.min(top, window.innerHeight - height - 12));

  preview.src = "";
  preview.src = img.src;
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

function getReadableTextColor(color) {
  if (!color) return "#fff";

  const normalized = String(color).trim();
  const hexMatch = normalized.match(/^#([0-9a-f]{3,8})$/i);
  const rgbMatch = normalized.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);

  let r = 255;
  let g = 255;
  let b = 255;

  if (hexMatch) {
    const hex = hexMatch[1];
    const fullHex = hex.length === 3 ? hex.split("").map((ch) => ch + ch).join("") : hex;
    r = parseInt(fullHex.slice(0, 2), 16);
    g = parseInt(fullHex.slice(2, 4), 16);
    b = parseInt(fullHex.slice(4, 6), 16);
  } else if (rgbMatch) {
    r = Number(rgbMatch[1]);
    g = Number(rgbMatch[2]);
    b = Number(rgbMatch[3]);
  }

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.7 ? "#111" : "#fff";
}

// ============================================================
// 从表格行提取数据
// ============================================================

function extractRowData(tr) {
  const img = tr.querySelector("img.ant-image-img");
  if (!img || !img.src) return null;

  const link = tr.querySelector(
    'a[href^="/detail"], a[href^="/showcaseDetail"]',
  );
  const href = link ? link.href : null;
  const title = link ? link.textContent.trim() : "";

  // 做种数：第5个 td（索引4），下载数：第6个 td（索引5），大小：第4个 td（索引3）
  const tds = tr.querySelectorAll("td");
  let seeders = "";
  let leechers = "";
  let size = "";
  if (tds.length >= 4) {
    const sizeDiv = tds[3].querySelector("div");
    if (sizeDiv) size = sizeDiv.textContent.trim();
  }
  if (tds.length >= 5) {
    const seederSpan = tds[4].querySelector("span.align-middle:last-child");
    if (seederSpan) seeders = seederSpan.textContent.trim();
  }
  if (tds.length >= 6) {
    const leecherSpan = tds[5].querySelector("span.align-middle:last-child");
    if (leecherSpan) leechers = leecherSpan.textContent.trim();
  }

  // 折扣标签 + 倒计时 + 其他 ant-tag
  let badge = "";
  let badgeExpiry = "";
  let badgeColor = "";
  const tagMeta = [];
  const firstTd = tds[0];
  if (firstTd) {
    const tagEls = firstTd.querySelectorAll(".ant-tag");
    tagEls.forEach((tag) => {
      const text = tag.textContent.trim();
      const titleAttr = tag.getAttribute("title") || "";
      const style = tag.getAttribute("style") || "";
      const computedStyle = typeof window !== "undefined" ? window.getComputedStyle(tag) : null;
      const backgroundColor =
        (computedStyle && computedStyle.backgroundColor && computedStyle.backgroundColor !== "rgba(0, 0, 0, 0)")
          ? computedStyle.backgroundColor
          : (style.match(/background(?:-color)?:\s*([^;]+)/i)?.[1] || "").trim();
      const textColor =
        (computedStyle && computedStyle.color)
          ? computedStyle.color
          : (style.match(/color:\s*([^;]+)/i)?.[1] || "").trim();

      const isPromotionTag =
        /background-color:\s*rgb\(21\s*,\s*180\s*,\s*0\)/.test(style) ||
        /background-color:\s*rgb\(82\s*,\s*196\s*,\s*26\)/.test(style) ||
        /background-color:\s*#52c41a/i.test(style) ||
        /background-color:\s*#15b400/i.test(style) ||
        (backgroundColor && /rgba?\(21,\s*180,\s*0/.test(backgroundColor));

      if (isPromotionTag && !badge) {
        badge = text;
        badgeExpiry = titleAttr;
        badgeColor = backgroundColor;
      }

      if (text && !isPromotionTag) {
        tagMeta.push({
          text,
          title: titleAttr,
          backgroundColor,
          textColor: textColor || (backgroundColor ? getReadableTextColor(backgroundColor) : ""),
        });
      }
    });
  }

  // 下载进度
  let progress = -1;
  const progressEl = tr.querySelector(".ant-progress");
  if (progressEl) {
    const val = progressEl.getAttribute("aria-valuenow");
    if (val != null) progress = parseInt(val, 10);
  }

  // 收藏状态
  let isFav = false;
  const favStar = tr.querySelector(".anticon-star");
  if (favStar) {
    const style = favStar.getAttribute("style") || "";
    isFav = style.includes("gold");
  }

  // 是否置顶
  const isSticky =
    tr.classList.contains("bg-sticky_normal") ||
    tr.className.includes("sticky");

  return {
    imgSrc: img.src,
    href,
    title,
    seeders,
    leechers,
    size,
    badge,
    badgeExpiry,
    badgeColor,
    tagMeta,
    isSticky,
    progress,
    isFav,
    tr,
  };
}

// ============================================================
// 创建海报卡片
// ============================================================

// SVG icons moved to src/utils/icons.js

function createTagChip(tag) {
  const item = document.createElement("span");
  item.className = "mt-poster-tag mt-poster-tag-popup-item";
  item.textContent = tag.text;
  if (tag.title) item.title = tag.title;
  if (tag.backgroundColor) {
    item.style.backgroundColor = tag.backgroundColor;
  }
  if (tag.textColor) {
    item.style.color = tag.textColor;
  }
  return item;
}

function layoutPosterCardTags(card) {
  const tagData = card._posterTagData;
  if (!tagData) return;

  const { tagRow, overflow, popup, extraTags } = tagData;
  if (!extraTags.length) {
    overflow.style.display = "none";
    popup.innerHTML = "";
    popup.classList.remove("is-visible");
    return;
  }

  extraTags.forEach(({ element }) => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });

  const visibleTags = [];
  const hiddenTags = [];

  extraTags.forEach(({ element, tag }) => {
    tagRow.insertBefore(element, overflow);
    if (tagRow.scrollWidth > tagRow.clientWidth) {
      tagRow.removeChild(element);
      hiddenTags.push(tag);
    } else {
      visibleTags.push({ element, tag });
    }
  });

  if (hiddenTags.length) {
    overflow.style.display = "inline-flex";
    overflow.textContent = hiddenTags.length > 1 ? `更多 +${hiddenTags.length}` : "更多";
    tagRow.appendChild(overflow);

    while (tagRow.scrollWidth > tagRow.clientWidth && visibleTags.length) {
      const lastVisible = visibleTags.pop();
      if (!lastVisible) break;
      tagRow.removeChild(lastVisible.element);
      hiddenTags.unshift(lastVisible.tag);
    }
  } else {
    overflow.style.display = "none";
  }

  popup.innerHTML = "";
  hiddenTags.forEach((tag) => {
    if (!tag.text) return;
    const item = createTagChip(tag);
    popup.appendChild(item);
  });
}

function createPosterCard(data) {
  const card = document.createElement("div");
  card.className = "mt-poster-card";
  if (data.href) card.dataset.href = data.href;

  // 图片
  const img = document.createElement("img");
  img.src = data.imgSrc;
  img.alt = data.title;
  img.loading = "lazy";
  card.appendChild(img);

  // 底部信息栏
  const info = document.createElement("div");
  info.className = "mt-poster-info";

  // 标题
  const titleRow = document.createElement("div");
  titleRow.className = "mt-poster-title";
  const titleSpan = document.createElement("span");
  titleSpan.className = "mt-poster-title-text";
  titleSpan.textContent = data.title;
  titleSpan.title = data.title;
  titleRow.appendChild(titleSpan);

  // 标签
  const tagRow = document.createElement("div");
  tagRow.className = "mt-poster-tag-row";

  if (data.isSticky) {
    const stickyTag = document.createElement("span");
    stickyTag.className = "mt-poster-tag mt-poster-tag-sticky";
    stickyTag.textContent = "置顶";
    tagRow.appendChild(stickyTag);
  }

  if (data.badge) {
    const badgeTag = document.createElement("span");
    badgeTag.className = "mt-poster-tag mt-poster-tag-badge";
    badgeTag.textContent = data.badge;
    if (data.badgeExpiry) badgeTag.title = data.badgeExpiry;
    if (data.badgeColor) {
      badgeTag.style.backgroundColor = data.badgeColor;
      badgeTag.style.color = getReadableTextColor(data.badgeColor);
    }
    tagRow.appendChild(badgeTag);
  }

  if (Array.isArray(data.tagMeta) && data.tagMeta.length) {
    const overflow = document.createElement("button");
    overflow.className = "mt-poster-tag mt-poster-tag-more";
    overflow.type = "button";
    overflow.title = "查看更多标签";
    overflow.style.display = "none";
    tagRow.appendChild(overflow);

    const popup = document.createElement("div");
    popup.className = "mt-poster-tag-popup";
    document.body.appendChild(popup);

    const extraTags = [];
    data.tagMeta.forEach((tag) => {
      if (!tag.text) return;
      const element = createTagChip(tag);
      tagRow.appendChild(element);
      extraTags.push({ element, tag });
    });

    card._posterTagData = { tagRow, overflow, popup, extraTags };

    let popupTimeout = null;

    const showPopup = () => {
      clearTimeout(popupTimeout);
      const rect = overflow.getBoundingClientRect();
      popup.style.left = `${Math.min(rect.left, window.innerWidth - 220)}px`;
      popup.style.top = `${Math.max(rect.top - 8, 8)}px`;
      popup.classList.add("is-visible");

      requestAnimationFrame(() => {
        const popupHeight = popup.offsetHeight || 0;
        const top = Math.max(rect.top - popupHeight - 8, 8);
        popup.style.top = `${top}px`;
      });
    };

    const hidePopup = () => {
      clearTimeout(popupTimeout);
      popupTimeout = setTimeout(() => {
        popup.classList.remove("is-visible");
      }, 80);
    };

    overflow.addEventListener("mouseenter", showPopup);
    overflow.addEventListener("mouseleave", hidePopup);
    overflow.addEventListener("focus", showPopup);
    overflow.addEventListener("blur", hidePopup);
    popup.addEventListener("mouseenter", showPopup);
    popup.addEventListener("mouseleave", hidePopup);
  }

  // 标题行：标题 + 完成标识
  if (data.progress >= 100) {
    const checkIcon = document.createElement("span");
    checkIcon.className = "mt-poster-complete-icon";
    checkIcon.innerHTML = SVG_CHECK;
    checkIcon.title = "下载完成";
    titleRow.appendChild(checkIcon);
  }

  // 数据行：大小 + 做种/下载 + 收藏/下载按钮
  const metaRow = document.createElement("div");
  metaRow.className = "mt-poster-meta";

  if (data.size) {
    const sizeEl = document.createElement("span");
    sizeEl.className = "mt-poster-size";
    sizeEl.textContent = data.size;
    metaRow.appendChild(sizeEl);
  }

  if (data.seeders) {
    const seedersEl = document.createElement("span");
    seedersEl.className = "mt-poster-seeders";
    seedersEl.textContent = `↑${data.seeders}`;
    metaRow.appendChild(seedersEl);
  }

  if (data.leechers) {
    const leechersEl = document.createElement("span");
    leechersEl.className = "mt-poster-leechers";
    leechersEl.textContent = `↓${data.leechers}`;
    metaRow.appendChild(leechersEl);
  }

  // 操作按钮组
  const actions = document.createElement("span");
  actions.className = "mt-poster-actions";

  // 收藏按钮
  const favBtn = document.createElement("span");
  favBtn.className =
    "mt-poster-action" + (data.isFav ? " mt-poster-action--fav-active" : "");
  favBtn.innerHTML = SVG_STAR;
  favBtn.title = data.isFav ? "已收藏" : "收藏";
  favBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!data.tr) return;
    const starBtn = data.tr.querySelector(".anticon-star");
    if (starBtn) {
      const btn = starBtn.closest("button") || starBtn;
      btn.click();
      data.isFav = !data.isFav;
      favBtn.classList.toggle("mt-poster-action--fav-active", data.isFav);
      favBtn.title = data.isFav ? "已收藏" : "收藏";
    }
  });
  actions.appendChild(favBtn);

  // 下载按钮
  const dlBtn = document.createElement("span");
  dlBtn.className = "mt-poster-action";
  dlBtn.innerHTML = SVG_DOWNLOAD;
  dlBtn.title = "下载";
  dlBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!data.tr) return;
    const buttons = data.tr.querySelectorAll("td:last-child button");
    if (buttons.length >= 2) {
      buttons[1].click();
    } else {
      const idMatch = (data.href || "").match(
        /\/(detail|showcaseDetail)\/(\w+)/,
      );
      if (idMatch) window.open(`/dl/${idMatch[2]}`, "_blank");
    }
  });
  actions.appendChild(dlBtn);

  metaRow.appendChild(actions);

  info.appendChild(tagRow);
  info.appendChild(titleRow);
  info.appendChild(metaRow);
  card.appendChild(info);

  // 如果有链接，添加一个透明的覆盖链接，让浏览器处理中键（中键由浏览器原生打开后台标签）
  if (data.href) {
    card.style.position = card.style.position || 'relative';

    // 确保操作按钮在覆盖链接之上
    actions.style.position = 'relative';
    actions.style.zIndex = '2';

    const overlayLink = document.createElement('a');
    overlayLink.className = 'mt-poster-overlay-link';
    overlayLink.href = data.href;
    overlayLink.target = '_blank';
    overlayLink.rel = 'noopener noreferrer';
    Object.assign(overlayLink.style, {
      position: 'absolute',
      inset: '0',
      display: 'block',
      opacity: '0',
      zIndex: '1',
    });
    card.appendChild(overlayLink);
  }

  // 下载进度条
  if (data.progress >= 0) {
    const barWrap = document.createElement("div");
    barWrap.className = "mt-poster-progress";
    const bar = document.createElement("div");
    bar.className = "mt-poster-progress-bar";
    bar.style.width = `${data.progress}%`;
    bar.style.backgroundColor = data.progress >= 100 ? "#52c41a" : "#1890ff";
    barWrap.appendChild(bar);
    card.appendChild(barWrap);

    if (data.progress >= 100) {
      card.classList.add("mt-poster-complete");
    }
  }

  return card;
}

// ============================================================
// 绑定卡片交互
// ============================================================

function bindCard(card) {
  if (card._posterBound) return;
  card._posterBound = true;

  const signal = abortController?.signal;

  card.addEventListener(
    "mouseenter",
    () => {
      // 悬停显示大图（尊重图片预览开关）
      if (loadBoolean('image-preview-enabled', true)) {
        const img = card.querySelector("img");
        if (img) showPreview(img);
      }
    },
    { signal },
  );

  card.addEventListener(
    "mouseleave",
    () => {
      hidePreview();
    },
    { signal },
  );

  card.addEventListener(
    "click",
    (e) => {
      const href = card.dataset.href;
      if (!href) return;
      if (e.button === 0) {
        e.preventDefault();
        window.open(href, "_blank", "noopener,noreferrer");
      }
    },
    { signal },
  );

  card.addEventListener(
    "mousedown",
    (e) => {
      const href = card.dataset.href;
      if (!href) return;
      // 当我们使用覆盖的 anchor 时，不需要拦截中键，保留默认浏览器行为
      // 只阻止右键（可选）
      if (e.button === 2) {
        e.preventDefault();
      }
    },
    { signal },
  );
}

// ============================================================
// 应用海报墙
// ============================================================

function getTableRowsSignature(table) {
  if (!table) return "";

  const rows = Array.from(table.querySelectorAll("tbody tr"));
  return rows
    .map((tr) => {
      const data = extractRowData(tr);
      if (!data) return "";

      return [
        data.href || "",
        data.imgSrc || "",
        data.title || "",
        data.seeders || "",
        data.leechers || "",
        data.size || "",
        data.badge || "",
        data.badgeExpiry || "",
        data.badgeColor || "",
        data.isSticky ? "1" : "0",
        data.progress,
        data.isFav ? "1" : "0",
      ].join("::");
    })
    .join("||");
}

function rememberTableVisibility(table) {
  if (!table) return;

  if (originalTableDisplay === null) {
    originalTableDisplay = table.style.display || "";
  }

  const spinWrap = table.closest(".ant-spin") || document.querySelector(".ant-spin");
  if (spinWrap) {
    const thead = spinWrap.querySelector("thead");
    if (thead && originalTheadDisplay === null) {
      originalTheadDisplay = thead.style.display || "";
    }
  }
}

function restoreTableVisibility() {
  const table = document.querySelector("table.table-fixed");
  if (table) {
    table.style.display = originalTableDisplay ?? "";
  }

  const spinWrap = document.querySelector(".ant-spin");
  if (spinWrap) {
    const thead = spinWrap.querySelector("thead");
    if (thead) {
      thead.style.display = originalTheadDisplay ?? "";
    }
  }
}

function applyPosterWall() {
  const table = document.querySelector("table.table-fixed");
  if (!table) return;

  const rowsSignature = getTableRowsSignature(table);
  if (wallContainer && rowsSignature === lastTableRowsSignature) {
    return;
  }

  // 清理可能残留的旧海报墙（SPA 路由切换后 DOM 重建）
  const existingWall = document.querySelector(".mt-poster-wall");
  if (existingWall) {
    existingWall.remove();
    wallContainer = null;
  }

  const container = table.closest(".ant-spin-container") || table.parentElement;
  if (!container) return;

  rememberTableVisibility(table);

  // 避免重复
  if (container.querySelector(".mt-poster-wall")) return;

  // 隐藏原表格
  table.style.display = "none";

  // 隐藏 thead（如果在容器外还有其他表头元素）
  const spinWrap = container.closest(".ant-spin");
  if (spinWrap) {
    const thead = spinWrap.querySelector("thead");
    if (thead) thead.style.display = "none";
  }

  // 创建网格容器
  wallContainer = document.createElement("div");
  wallContainer.className = "mt-poster-wall";

  // 提取所有行数据
  const rows = table.querySelectorAll("tbody tr");
  const fragment = document.createDocumentFragment();

  rows.forEach((tr) => {
    const data = extractRowData(tr);
    if (!data) return;
    const card = createPosterCard(data);
    bindCard(card);
    fragment.appendChild(card);
  });

  wallContainer.appendChild(fragment);
  container.appendChild(wallContainer);
  lastTableRowsSignature = rowsSignature;

  requestAnimationFrame(() => {
    wallContainer.querySelectorAll(".mt-poster-card").forEach((card) => {
      layoutPosterCardTags(card);
    });
  });

  createPreviewEl();
}

// ============================================================
// 移除海报墙
// ============================================================

function removePosterWall() {
  hidePreview();

  if (wallContainer) {
    wallContainer.remove();
    wallContainer = null;
  }

  // 恢复原表格
  restoreTableVisibility();

  // 清理卡片标记
  document.querySelectorAll(".mt-poster-card").forEach((card) => {
    if (card._posterBound) delete card._posterBound;
  });

  // 移除预览元素
  removeSharedPreview()

  lastTableRowsSignature = null;
  originalTableDisplay = null;
  originalTheadDisplay = null;
}

// ============================================================
// MutationObserver：监听内容变化
// ============================================================

function startObserver() {
  if (observer) return;
  if (!document.body) return;

  let debounceTimer = null;
  observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const table = document.querySelector("table.table-fixed");
      if (!table) return;

      if (table.style.display === "none") {
        applyPosterWall();
      }
    }, 300);
  });

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
  bound = true;
}

function cleanup() {
  hidePreview();
  if (!bound) return;

  stopObserver();
  removePosterWall();

  if (abortController) {
    abortController.abort();
    abortController = null;
  }

  bound = false;
}

// ============================================================
// 公开 API
// ============================================================

export function initPosterWall() {
  if (!isPosterWallEnabled()) {
    cleanup();
    return;
  }
  bindEvents();
  // 等待表格加载完成，最多等待 5 秒
  let retries = 0;
  const maxRetries = 300; // ~5s at 16ms/帧
  const tryApply = () => {
    const table = document.querySelector("table.table-fixed");
    if (table && table.querySelector("tbody tr")) {
      applyPosterWall();
      return;
    }
    if (++retries < maxRetries) {
      requestAnimationFrame(tryApply);
    }
  };
  tryApply();
}

export function reinitPosterWall() {
  cleanup();
  initPosterWall();
}
