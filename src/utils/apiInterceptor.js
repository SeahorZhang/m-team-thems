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

let latestData = new Map();
let latestList = [];
let onDataCallback = null;

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

  return { text: entry.text, color: entry.color, endTime: status.discountEndTime, isPercentDiscount };
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
  };
}

// ============================================================
// 数据访问
// ============================================================

export function getLatestList() {
  return latestList;
}

export function onData(callback) {
  onDataCallback = callback;
  if (latestList.length > 0) callback(latestList);
}

export function hasData() {
  return latestList.length > 0;
}

// ============================================================
// fetch 拦截
// ============================================================

function handleResponse(url, json) {
  if (!url.includes("/api/torrent/search")) return;
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

    if (url.includes("/api/torrent/search")) {
      try {
        const json = await resp.clone().json();
        handleResponse(url, json);
      } catch {
        console.warn("Failed to parse JSON response from /api/torrent/search");
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
      if (this._apiUrl?.includes("/api/torrent/search")) {
        try {
          handleResponse(this._apiUrl, JSON.parse(this.responseText));
        } catch {
          console.warn("Failed to parse JSON response from /api/torrent/search");
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
