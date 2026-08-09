/**
 * 海报墙模式
 *
 * 将帖子列表转换为海报墙/网格布局，支持悬停大图预览和点击打开详情。
 */

import { createSharedPreviewEl, hideSharedPreview, removeSharedPreview } from './sharedPreview.js'
import { loadBoolean } from './storage.js'
import { SVG_STAR, SVG_DOWNLOAD, SVG_CHECK } from './icons.js'
import { getLatestList, toCardData, onData, hasData, initApiInterceptor } from './apiInterceptor.js'

let wallContainer = null;
let observer = null;
let abortController = null;
let lastApiSignature = null;
let originalTableDisplay = null;
let originalTheadDisplay = null;

// ============================================================
// 预览
// ============================================================

function showPreview(img) {
  if (!img?.src) return;
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

  if (left + width + 12 > window.innerWidth) left = rect.left - width - 18;
  left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
  top = Math.max(12, Math.min(top, window.innerHeight - height - 12));

  preview.src = img.src;
  Object.assign(preview.style, {
    display: "block",
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
  });

  requestAnimationFrame(() => { preview.style.opacity = "1"; });
}

function hidePreview() {
  hideSharedPreview();
}

// ============================================================
// 标签
// ============================================================

function createTagChip(tag) {
  const item = document.createElement("span");
  item.className = "mt-poster-tag mt-poster-tag-popup-item";
  item.textContent = tag.text;
  if (tag.title) item.title = tag.title;
  if (tag.backgroundColor) item.style.backgroundColor = tag.backgroundColor;
  if (tag.textColor) item.style.color = tag.textColor;
  if (tag.categoryParent) {
    item.classList.add("ant-tag", "ant-tag-selected", `cat-parent-${tag.categoryParent}`);
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
    if (element.parentNode) element.parentNode.removeChild(element);
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
    tagRow.appendChild(overflow);

    while (tagRow.scrollWidth > tagRow.clientWidth && visibleTags.length) {
      const lastVisible = visibleTags.pop();
      if (!lastVisible) break;
      tagRow.removeChild(lastVisible.element);
      hiddenTags.unshift(lastVisible.tag);
    }

    overflow.textContent = `+${hiddenTags.length}`;
  } else {
    overflow.style.display = "none";
  }

  popup.innerHTML = "";
  hiddenTags.forEach((tag) => {
    if (!tag.text) return;
    popup.appendChild(createTagChip(tag));
  });
}

// ============================================================
// 创建海报卡片
// ============================================================

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

  // 左上角标签（置顶 + FREE）
  const topBar = document.createElement("div");
  topBar.className = "mt-poster-top-bar";

  if (data.isSticky) {
    const wrapper = document.createElement("div");
    const stickyTag = document.createElement("span");
    stickyTag.className = "mt-poster-tag mt-poster-tag-sticky";
    stickyTag.textContent = "置顶";
    wrapper.appendChild(stickyTag);
    topBar.appendChild(wrapper);
  }

  if (data.badge) {
    const wrapper = document.createElement("div");
    const badgeTag = document.createElement("span");
    badgeTag.className = "mt-poster-tag mt-poster-tag-badge";
    badgeTag.textContent = data.badge;
    if (data.badgeExpiry) badgeTag.title = data.badgeExpiry;
    if (data.badgeColor) badgeTag.style.backgroundColor = data.badgeColor;
    wrapper.appendChild(badgeTag);
    topBar.appendChild(wrapper);
  }

  if (topBar.childNodes.length > 0) card.appendChild(topBar);

  // 底部信息栏
  const info = document.createElement("div");
  info.className = "mt-poster-info";

  // 标签行
  const tagRow = document.createElement("div");
  tagRow.className = "mt-poster-tag-row";

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
        popup.style.top = `${Math.max(rect.top - popup.offsetHeight - 8, 8)}px`;
      });
    };
    const hidePopup = () => {
      clearTimeout(popupTimeout);
      popupTimeout = setTimeout(() => popup.classList.remove("is-visible"), 80);
    };

    overflow.addEventListener("mouseenter", showPopup);
    overflow.addEventListener("mouseleave", hidePopup);
    overflow.addEventListener("focus", showPopup);
    overflow.addEventListener("blur", hidePopup);
    popup.addEventListener("mouseenter", showPopup);
    popup.addEventListener("mouseleave", hidePopup);
  }

  // 标题行
  const titleRow = document.createElement("div");
  titleRow.className = "mt-poster-title";

  // 魔力值倍率图片
  if (data.msUpImgSrc) {
    const msUpImg = document.createElement("img");
    msUpImg.src = data.msUpImgSrc;
    msUpImg.alt = data.msUpText;
    msUpImg.title = data.msUpText;
    msUpImg.style.cssText = "height:14px;width:14px";
    titleRow.appendChild(msUpImg);
  }

  const titleSpan = document.createElement("span");
  titleSpan.className = "mt-poster-title-text";
  titleSpan.textContent = data.title;
  titleSpan.title = data.title;
  titleRow.appendChild(titleSpan);

  // 百分比折扣标签
  if (data.percentDiscount) {
    const discountTag = document.createElement("span");
    discountTag.className = "mt-poster-tag mt-poster-tag-discount";
    discountTag.textContent = data.percentDiscount;
    if (data.percentDiscountColor) discountTag.style.backgroundColor = data.percentDiscountColor;
    titleRow.appendChild(discountTag);
  }

  // 完成标识
  if (data.progress >= 100) {
    const checkIcon = document.createElement("span");
    checkIcon.className = "mt-poster-complete-icon";
    checkIcon.innerHTML = SVG_CHECK;
    checkIcon.title = "下载完成";
    titleRow.appendChild(checkIcon);
  }

  // 数据行
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

  // 操作按钮
  function findDomRow(id) {
    if (!id) return null;
    const rows = document.querySelectorAll("table.table-fixed tbody tr");
    for (const tr of rows) {
      const link = tr.querySelector('a[href*="/detail/"], a[href*="/showcaseDetail/"]');
      if (link?.href.includes(`/${id}`)) return tr;
    }
    return null;
  }

  const actions = document.createElement("span");
  actions.className = "mt-poster-actions";

  const favBtn = document.createElement("span");
  favBtn.className = "mt-poster-action" + (data.isFav ? " mt-poster-action--fav-active" : "");
  favBtn.innerHTML = SVG_STAR;
  favBtn.title = data.isFav ? "已收藏" : "收藏";
  favBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const tr = findDomRow(data.id);
    if (!tr) return;
    const starBtn = tr.querySelector(".anticon-star");
    if (starBtn) {
      (starBtn.closest("button") || starBtn).click();
      data.isFav = !data.isFav;
      favBtn.classList.toggle("mt-poster-action--fav-active", data.isFav);
      favBtn.title = data.isFav ? "已收藏" : "收藏";
    }
  });
  actions.appendChild(favBtn);

  const dlBtn = document.createElement("span");
  dlBtn.className = "mt-poster-action";
  dlBtn.innerHTML = SVG_DOWNLOAD;
  dlBtn.title = "下载";
  dlBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const tr = findDomRow(data.id);
    if (tr) {
      const buttons = tr.querySelectorAll("td:last-child button");
      if (buttons.length >= 2) {
        buttons[1].click();
        return;
      }
    }
    const idMatch = data.href?.match(/\/(detail|showcaseDetail)\/(\w+)/);
    if (idMatch) window.open(`/dl/${idMatch[2]}`, "_blank");
  });
  actions.appendChild(dlBtn);

  metaRow.appendChild(actions);
  info.appendChild(tagRow);
  info.appendChild(titleRow);
  info.appendChild(metaRow);
  card.appendChild(info);

  // 覆盖链接
  if (data.href) {
    card.style.position = card.style.position || 'relative';
    info.style.zIndex = '2';

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

  // 进度条
  if (data.progress >= 0) {
    const barWrap = document.createElement("div");
    barWrap.className = "mt-poster-progress";
    const bar = document.createElement("div");
    bar.className = "mt-poster-progress-bar";
    bar.style.width = `${data.progress}%`;
    bar.style.backgroundColor = data.progress >= 100 ? "#52c41a" : "#1890ff";
    barWrap.appendChild(bar);
    card.appendChild(barWrap);
    if (data.progress >= 100) card.classList.add("mt-poster-complete");
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

  card.addEventListener("mouseenter", () => {
    if (loadBoolean('image-preview-enabled', true)) {
      const img = card.querySelector("img");
      if (img) showPreview(img);
    }
  }, { signal });

  card.addEventListener("mouseleave", () => hidePreview(), { signal });

  card.addEventListener("click", (e) => {
    const href = card.dataset.href;
    if (href && e.button === 0) {
      e.preventDefault();
      window.open(href, "_blank", "noopener,noreferrer");
    }
  }, { signal });
}

// ============================================================
// 表格显示/隐藏
// ============================================================

function rememberTableVisibility(table) {
  if (!table) return;
  if (originalTableDisplay === null) originalTableDisplay = table.style.display || "";

  const spinWrap = table.closest(".ant-spin") || document.querySelector(".ant-spin");
  if (spinWrap) {
    const thead = spinWrap.querySelector("thead");
    if (thead && originalTheadDisplay === null) originalTheadDisplay = thead.style.display || "";
  }
}

function restoreTableVisibility() {
  const table = document.querySelector("table.table-fixed");
  if (table) table.style.display = originalTableDisplay ?? "";

  const spinWrap = document.querySelector(".ant-spin");
  if (spinWrap) {
    const thead = spinWrap.querySelector("thead");
    if (thead) thead.style.display = originalTheadDisplay ?? "";
  }
}

// ============================================================
// 应用/移除海报墙
// ============================================================

function applyPosterWall() {
  const table = document.querySelector("table.table-fixed");
  if (!table) return;

  const apiList = getLatestList();
  if (!apiList.length) return;

  const signature = apiList.map((t) => t.id).join("::");
  if (wallContainer && signature === lastApiSignature) return;

  const existingWall = document.querySelector(".mt-poster-wall");
  if (existingWall) {
    existingWall.remove();
    wallContainer = null;
  }

  const container = table.closest(".ant-spin-container") || table.parentElement;
  if (!container || container.querySelector(".mt-poster-wall")) return;

  rememberTableVisibility(table);
  table.style.display = "none";

  const spinWrap = container.closest(".ant-spin");
  if (spinWrap) {
    const thead = spinWrap.querySelector("thead");
    if (thead) thead.style.display = "none";
  }

  wallContainer = document.createElement("div");
  wallContainer.className = "mt-poster-wall";

  const fragment = document.createDocumentFragment();
  apiList.forEach((torrent) => {
    const data = toCardData(torrent);
    const card = createPosterCard(data);
    bindCard(card);
    fragment.appendChild(card);
  });
  lastApiSignature = signature;

  wallContainer.appendChild(fragment);
  container.appendChild(wallContainer);

  requestAnimationFrame(() => {
    wallContainer.querySelectorAll(".mt-poster-card").forEach(layoutPosterCardTags);
  });
}

function removePosterWall() {
  hidePreview();
  if (wallContainer) {
    wallContainer.remove();
    wallContainer = null;
  }
  restoreTableVisibility();
  document.querySelectorAll(".mt-poster-card").forEach((card) => {
    if (card._posterBound) delete card._posterBound;
  });
  removeSharedPreview();
  lastApiSignature = null;
  originalTableDisplay = null;
  originalTheadDisplay = null;
}

// ============================================================
// Observer
// ============================================================

function startObserver() {
  if (observer || !document.body) return;

  let debounceTimer = null;
  observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (!isPosterWallEnabled()) return;
      const table = document.querySelector("table.table-fixed");
      if (!table || table.style.display === "none") return;
      if (hasData()) applyPosterWall();
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
// 绑定/清理
// ============================================================

let bound = false;

function bindEvents() {
  if (bound) return;
  abortController = new AbortController();
  initApiInterceptor();
  startObserver();
  onData(() => {
    if (isPosterWallEnabled()) applyPosterWall();
  });
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

export function isPosterWallEnabled() {
  return loadBoolean('poster-wall-enabled', true);
}

export function initPosterWall() {
  if (!isPosterWallEnabled()) {
    cleanup();
    return;
  }
  bindEvents();

  let retries = 0;
  const maxRetries = 300;
  const tryApply = () => {
    const table = document.querySelector("table.table-fixed");
    const hasTable = !!table?.querySelector("tbody tr");
    if (hasTable && hasData()) {
      applyPosterWall();
      return;
    }
    if (++retries < maxRetries) requestAnimationFrame(tryApply);
  };
  tryApply();
}

export function reinitPosterWall() {
  cleanup();
  initPosterWall();
}
