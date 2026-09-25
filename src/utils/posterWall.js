/**
 * 海报墙模式
 *
 * 将帖子列表转换为海报墙/网格布局，支持悬停大图预览和点击打开详情。
 */

import { showSharedPreview, hideSharedPreview, removeSharedPreview, showDimOverlay, hideDimOverlay, removeDimOverlay } from './sharedPreview.js'
import { loadBoolean } from './storage.js'
import { SVG_STAR, SVG_DOWNLOAD, SVG_CHECK } from './icons.js'
import { getLatestList, toCardData, onData, hasData, initApiInterceptor, getPeerMap, getHistoryMap, onTrackerUpdate, parseProgress } from './apiInterceptor.js'

let wallContainer = null;
let observer = null;
let abortController = null;
let lastApiSignature = null;
let originalTableDisplay = null;
let originalTheadDisplay = null;
let panelEl = null;

// ============================================================
// 预览
// ============================================================

function span(cls, text) {
  const node = document.createElement("span");
  node.className = cls;
  node.textContent = text || "";
  return node;
}

// 详情浮层：卡片只留封面与关键角标，其余信息接在大图预览下方同宽展示。
// 内容一律用 textContent 写入，种子标题来自站点数据，不能走 innerHTML。
function renderPosterPanel(data) {
  const panel = panelEl || (panelEl = document.createElement("div"));
  panel.className = "mt-poster-panel";
  panel.replaceChildren();

  const tagRow = document.createElement("div");
  tagRow.className = "mt-pp-tags";
  (data.tagMeta || []).forEach((tag) => {
    if (tag.text) tagRow.appendChild(span("mt-pp-tag", tag.text));
  });
  if (tagRow.childNodes.length > 0) panel.appendChild(tagRow);

  panel.appendChild(span("mt-pp-title", data.title));
  if (data.subtitle) panel.appendChild(span("mt-pp-sub", data.subtitle));

  const row = document.createElement("div");
  row.className = "mt-pp-row";
  row.appendChild(span("mt-pp-size", data.size));
  row.appendChild(span("mt-pp-seed", `↑${data.seeders}`));
  row.appendChild(span("mt-pp-lee", `↓${data.leechers}`));
  if (data.comments && data.comments !== "0") row.appendChild(span("mt-pp-dim", `评${data.comments}`));
  if (data.ageText) row.appendChild(span("mt-pp-dim", data.ageText));

  const links = document.createElement("span");
  links.className = "mt-pp-links";
  if (data.dmmUrl) links.appendChild(span("mt-pp-link mt-pp-dmm", "DMM"));
  if (data.imdbUrl) links.appendChild(span("mt-pp-link mt-pp-imdb", data.imdbRating ? `IMDb ${data.imdbRating}` : "IMDb"));
  if (data.doubanUrl) links.appendChild(span("mt-pp-link mt-pp-douban", data.doubanRating ? `豆瓣 ${data.doubanRating}` : "豆瓣"));
  if (links.childNodes.length > 0) row.appendChild(links);

  panel.appendChild(row);
  return panel;
}

// 面板永远在大图下方：面板高度被 CSS 限死（标签 1 行、标题/副标题各 2 行、数据 1 行），
// 大图按这个固定预留量收缩，保证最后一行卡片也不会把面板顶出视口。
const PANEL_ALLOWANCE = 150;

// 与大图同侧同宽，固定接在图下方
function placePosterPanel(card, rect) {
  if (!card?._posterData) return;
  const panel = renderPosterPanel(card._posterData);
  if (!panel.parentNode) document.body.appendChild(panel);

  panel.style.display = "block";
  panel.style.width = `${rect.width}px`;
  panel.style.left = `${rect.left}px`;
  panel.style.top = `${rect.top + rect.height + 2}px`;
}

function hidePosterPanel() {
  if (panelEl) panelEl.style.display = "none";
}

function removePosterPanel() {
  if (panelEl) {
    panelEl.remove();
    panelEl = null;
  }
}

function showPreview(img, card) {
  if (!img?.src) return;

  showSharedPreview(img.src, (preview) => {
    if (!img.isConnected) return;

    const naturalWidth = preview.naturalWidth || 200;
    const naturalHeight = preview.naturalHeight || 200;
    const maxWidth = window.innerWidth * 0.5;
    const maxHeight = Math.max(200, window.innerHeight * 0.72 - PANEL_ALLOWANCE);
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
    // 大图底部必须给面板留出空间，否则面板只能叠到图上（图层级更高）就看不见了。
    // 预留量不能吃掉全部高度，否则宽高会变成 0/负数，大图直接不显示。
    const roomBelow = Math.min(PANEL_ALLOWANCE + 10, window.innerHeight * 0.3);
    const heightCap = Math.max(160, window.innerHeight - roomBelow - 24);
    let finalWidth = width;
    let finalHeight = height;
    if (finalHeight > heightCap) {
      finalHeight = heightCap;
      finalWidth = finalHeight * ratio;
      if (finalWidth > maxWidth) {
        finalWidth = maxWidth;
        finalHeight = finalWidth / ratio;
      }
    }

    let left = rect.right + 18;
    let top = rect.top + rect.height / 2 - finalHeight / 2;

    if (left + finalWidth + 12 > window.innerWidth) left = rect.left - finalWidth - 18;
    left = Math.max(12, Math.min(left, window.innerWidth - finalWidth - 12));
    top = Math.max(12, Math.min(top, window.innerHeight - finalHeight - roomBelow));

    Object.assign(preview.style, {
      display: "block",
      left: `${left}px`,
      top: `${top}px`,
      width: `${finalWidth}px`,
      height: `${finalHeight}px`,
    });

    placePosterPanel(card, { left, top, width: finalWidth, height: finalHeight });
    showDimOverlay();
  });
}

function hidePreview() {
  hideSharedPreview();
  hidePosterPanel();
  hideDimOverlay();
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
  card.dataset.id = data.id;
  card._posterData = data;

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

  // 操作按钮（与标题同行；大小/做种/下载/评论等数字在 hover 面板里）
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

  titleRow.appendChild(actions);

  // 副标题行（原列表标题下的灰色简介）
  const subtitle = document.createElement("div");
  subtitle.className = "mt-poster-subtitle";
  subtitle.textContent = data.subtitle;
  subtitle.title = data.subtitle;

  info.appendChild(tagRow);
  info.appendChild(titleRow);
  if (data.subtitle) info.appendChild(subtitle);
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
      if (img) showPreview(img, card);
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
// 下载进度
// ============================================================

function setCardProgress(card, progress) {
  let wrap = card.querySelector(".mt-poster-progress");

  if (progress == null) {
    if (wrap) wrap.remove();
    card.querySelector(".mt-poster-complete-icon")?.remove();
    card.classList.remove("mt-poster-complete");
    return;
  }

  const done = progress >= 100;
  card.classList.toggle("mt-poster-complete", done);

  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "mt-poster-progress";
    const bar = document.createElement("div");
    bar.className = "mt-poster-progress-bar";
    wrap.appendChild(bar);
    card.appendChild(wrap);
  }

  const bar = wrap.firstElementChild;
  bar.style.width = `${progress}%`;

  const titleRow = card.querySelector(".mt-poster-title");
  if (done && titleRow && !titleRow.querySelector(".mt-poster-complete-icon")) {
    const checkIcon = document.createElement("span");
    checkIcon.className = "mt-poster-complete-icon";
    checkIcon.innerHTML = SVG_CHECK;
    checkIcon.title = "下载完成";
    // 插在按钮之前，保证顺序是 标题 → 完成勾 → 收藏/下载
    titleRow.insertBefore(checkIcon, titleRow.querySelector(".mt-poster-actions"));
  }
}

// 进度取自 tracker 轮询的 peerMap/historyMap：站点列表行里那条 antd Progress 也是这么来的，
// search 接口的种子里没有这个字段。
function applyPosterProgress() {
  if (!wallContainer) return;

  const peers = getPeerMap();
  const history = getHistoryMap();
  const cardsById = new Map();
  wallContainer.querySelectorAll(".mt-poster-card").forEach((card) => {
    cardsById.set(card.dataset.id, card);
  });

  getLatestList().forEach((torrent) => {
    const card = cardsById.get(String(torrent.id));
    if (card) setCardProgress(card, parseProgress(torrent.size, peers[torrent.id], history[torrent.id]));
  });
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
  applyPosterProgress();

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
  removePosterPanel();
  removeDimOverlay();
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
  // tracker 轮询比列表晚到也要把进度补上
  onTrackerUpdate(() => {
    if (isPosterWallEnabled()) applyPosterProgress();
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
