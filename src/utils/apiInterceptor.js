/**
 * M-Team API 拦截器
 *
 * Hook fetch，拦截 /api/torrent/search 响应，
 * 提取结构化 JSON 数据供海报墙等模块使用。
 */

import { getCategoryName, getCategoryParent } from './categoryMap.js';

// ============================================================
// 数据存储
// ============================================================

const SEARCH_URL = "/api/torrent/search";
const TRACKER_URL = "/api/tracker/queryHistory";

let latestData = new Map();
let latestList = [];
let onDataCallback = null;

// tracker 轮询：peerMap 按 tid 存当前连接的做种/下载（left 是还没下完的字节数），
// historyMap 按 tid 存下载历史，里面有记录的都是已经下完过的种子
let peerMap = {};
let historyMap = {};
let onTrackerCallback = null;

export function isTrackedUrl(url) {
  return Boolean(url) && (url.includes(SEARCH_URL) || url.includes(TRACKER_URL));
}

// ============================================================
// 工具函数
// ============================================================

const SIZE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB"];

export function formatSize(bytes) {
  const n = Number(bytes);
  if (!n || isNaN(n)) return "";
  let i = 0;
  let size = n;
  while (size >= 1024 && i < SIZE_UNITS.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(2)} ${SIZE_UNITS[i]}`;
}

/**
 * 解析折扣信息
 */
export function parseDiscount(torrent) {
  const status = torrent.status;

  // mallSingleFree 活动 → FREE
  if (status?.mallSingleFree?.status === "ONGOING") {
    const endDate = status.mallSingleFree.endDate;
    let freeText = "FREE";

    if (endDate) {
      const diff = new Date(endDate) - new Date();
      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        freeText = days > 0 ? `FREE ${days}d ${hours}h` : `FREE ${hours}h`;
      }
    }

    return { text: freeText, color: "#15b400", endTime: endDate, isPercentDiscount: false };
  }

  const discount = status?.discount;
  if (!discount || discount === "NONE") {
    return { text: "", color: "", endTime: null, isPercentDiscount: false };
  }

  const map = {
    FREE: { text: "FREE", color: "#15b400" },
    PERCENT_25: { text: "25%", color: "#f89838" },
    PERCENT_50: { text: "50%", color: "#f89838" },
    PERCENT_70: { text: "70%", color: "#f89838" },
    PERCENT_2X_FREE: { text: "2x FREE", color: "#15b400" },
  };

  const entry = map[discount] || { text: discount, color: "#666" };
  const isPercentDiscount = discount.startsWith("PERCENT_") && discount !== "PERCENT_2X_FREE";

  // 计算折扣剩余时间
  let discountText = entry.text;
  const endTime = status.discountEndTime;
  if (endTime) {
    const diff = new Date(endTime) - new Date();
    if (diff > 0) {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      if (days > 0) {
        discountText = `${entry.text} ${days}d ${hours}h`;
      } else if (hours > 0) {
        discountText = `${entry.text} ${hours}h`;
      }
    }
  }

  return { text: discountText, color: entry.color, endTime, isPercentDiscount };
}

/**
 * 解析魔力值倍率
 */
export function parseMsUp(msUp) {
  const n = Number(msUp);
  if (!n || isNaN(n)) return "";
  return `+${n}%`;
}

/**
 * 下载进度百分比
 * peerMap 的 left 是当前剩余字节：0 即下完，其余按 (size-left)/size 向下取整，
 * 免得差几字节就显示成 100%。下完但当前没在做种时 peerMap 里没有条目，
 * 退回 historyMap —— 那里有记录的都是完成过的下载。
 */
export function parseProgress(size, peer, history) {
  if (peer) {
    const left = Number(peer.left);
    if (left === 0) return 100;

    const total = Number(size);
    if (Number.isFinite(left) && Number.isFinite(total) && total > 0) {
      return Math.max(0, Math.floor((1 - left / total) * 100));
    }
  }

  if (history && Number(history.timesCompleted) >= 1) return 100;
  return null;
}

/**
 * 上传距今，与原列表第 3 列的显示保持一致
 */
export function formatAge(dateStr) {
  if (!dateStr) return "";
  const then = new Date(String(dateStr).replace(" ", "T")).getTime();
  if (!Number.isFinite(then)) return "";

  const days = Math.floor((Date.now() - then) / 86400000);
  if (days < 1) return "今天";
  if (days < 30) return `${days} 天`;
  if (days < 365) return `${Math.floor(days / 30)} 个月`;
  return `${Math.floor(days / 365)} 年`;
}

/**
 * 将 API 种子数据转换为海报卡片所需格式
 */
export function toCardData(torrent) {
  const discount = parseDiscount(torrent);
  const status = torrent.status || {};

  // 封面图
  const imgSrc = Array.isArray(torrent.imageList) && torrent.imageList.length > 0
    ? torrent.imageList[0]
    : "";

  // 标签：category + labelsNew
  const tagMeta = [];

  const categoryName = getCategoryName(torrent.category);
  if (categoryName) {
    tagMeta.push({
      text: categoryName,
      categoryParent: getCategoryParent(torrent.category),
    });
  }

  (torrent.labelsNew || []).forEach((label) => {
    if (label) tagMeta.push({ text: label });
  });

  // 魔力值倍率
  const msUpText = parseMsUp(torrent.msUp);
  const msUpImgSrc = msUpText ? "https://static.m-team.cc/static/ms_up.jpg" : "";

  return {
    id: torrent.id,
    href: `/detail/${torrent.id}`,
    title: torrent.name || "",
    imgSrc,
    size: formatSize(torrent.size),
    seeders: status.seeders || "0",
    leechers: status.leechers || "0",
    // 折扣标签
    badge: discount.isPercentDiscount ? "" : discount.text,
    badgeExpiry: discount.endTime || "",
    badgeColor: discount.color,
    percentDiscount: discount.isPercentDiscount ? discount.text : "",
    percentDiscountColor: discount.isPercentDiscount ? discount.color : "",
    // 标签
    tagMeta,
    isSticky: Number(status.toppingLevel) > 0,
    isFav: !!torrent.collection,
    // 魔力值倍率
    msUpText,
    msUpImgSrc,
    // 原列表有、海报此前缺的信息
    comments: status.comments || "",
    createdDate: torrent.createdDate || "",
    ageText: formatAge(torrent.createdDate),
    subtitle: torrent.smallDescr || "",
    dmmUrl: torrent.dmmCode || "",
    imdbUrl: torrent.imdb || "",
    imdbRating: torrent.imdbRating || "",
    doubanUrl: torrent.douban || "",
    doubanRating: torrent.doubanRating || "",
  };
}

// ============================================================
// 数据访问
// ============================================================

export function getLatestList() {
  return latestList;
}

export function getPeerMap() {
  return peerMap;
}

export function getHistoryMap() {
  return historyMap;
}

export function onTrackerUpdate(callback) {
  onTrackerCallback = callback;
  if (Object.keys(peerMap).length > 0 || Object.keys(historyMap).length > 0) callback();
}

export function onData(callback) {
  onDataCallback = callback;
  if (latestList.length > 0) callback(latestList);
}

export function hasData() {
  return latestList.length > 0;
}

export function clearLatestData() {
  // tracker 的 peerMap/historyMap 不按路由清理：它们是"我全部在做种/下过的种子"这种账号级
  // 数据，切页时站点不一定会重新拉 tracker，清掉就没进度了。
  latestData.clear();
  latestList = [];
}

// ============================================================
// fetch 拦截
// ============================================================

function handleResponse(url, json) {
  if (url.includes(TRACKER_URL)) {
    if (!json?.data) return;
    peerMap = json.data.peerMap || {};
    historyMap = json.data.historyMap || {};
    if (onTrackerCallback) onTrackerCallback();
    return;
  }

  if (!url.includes(SEARCH_URL)) return;
  if (json.code !== "0" || !json.data?.data) return;

  const list = json.data.data;
  latestData.clear();
  latestList = list;
  list.forEach((item) => latestData.set(String(item.id), item));

  if (onDataCallback) onDataCallback(list);
}

function hookFetch() {
  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const resp = await origFetch.apply(this, args);
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";

    if (isTrackedUrl(url)) {
      try {
        const json = await resp.clone().json();
        handleResponse(url, json);
      } catch {
        console.warn("Failed to parse JSON response from", url);
      }
    }

    return resp;
  };

  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this._apiUrl = url;
    return origOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function () {
    this.addEventListener("load", function () {
      if (isTrackedUrl(this._apiUrl)) {
        try {
          handleResponse(this._apiUrl, JSON.parse(this.responseText));
        } catch {
          console.warn("Failed to parse JSON response from", this._apiUrl);
        }
      }
    });
    return origSend.apply(this, arguments);
  };
}

// ============================================================
// 初始化
// ============================================================

let initialized = false;

export function initApiInterceptor() {
  if (initialized) return;
  hookFetch();
  initialized = true;
}
