/**
 * M-Team 分类ID到名称和父级的映射
 * 来源：/api/category
 */
const CATEGORY_MAP = {
  "100": { name: "电影", parent: null },
  "105": { name: "影剧/综艺", parent: null },
  "110": { name: "Music", parent: null },
  "115": { name: "AV(有码)", parent: null },
  "120": { name: "AV(无码)", parent: null },
  "401": { name: "电影/SD", parent: "100" },
  "402": { name: "影剧/综艺/HD", parent: "105" },
  "403": { name: "影剧/综艺/SD", parent: "105" },
  "404": { name: "纪录", parent: "444" },
  "405": { name: "动画", parent: "449" },
  "406": { name: "演唱", parent: "110" },
  "407": { name: "运动", parent: "450" },
  "409": { name: "Misc(其他)", parent: "450" },
  "410": { name: "AV(有码)/HD Censored", parent: "115" },
  "411": { name: "H-游戏", parent: "446" },
  "412": { name: "H-动漫", parent: "446" },
  "413": { name: "H-漫画", parent: "446" },
  "419": { name: "电影/HD", parent: "100" },
  "420": { name: "电影/DVDiSo", parent: "100" },
  "421": { name: "电影/BluRay", parent: "100" },
  "422": { name: "软件", parent: "450" },
  "423": { name: "PC游戏", parent: "447" },
  "424": { name: "AV(有码)/SD Censored", parent: "115" },
  "425": { name: "IV(写真影集)", parent: "445" },
  "426": { name: "AV(无码)/DVDiSo Uncensored", parent: "120" },
  "427": { name: "电子书", parent: "450" },
  "429": { name: "AV(无码)/HD Uncensored", parent: "120" },
  "430": { name: "AV(无码)/SD Uncensored", parent: "120" },
  "431": { name: "AV(有码)/Blu-Ray Censored", parent: "115" },
  "432": { name: "AV(无码)/Blu-Ray Uncensored", parent: "120" },
  "433": { name: "IV(写真图集)", parent: "445" },
  "434": { name: "Music(无损)", parent: "110" },
  "435": { name: "影剧/综艺/DVDiSo", parent: "105" },
  "436": { name: "AV(网站)/0Day", parent: "120" },
  "437": { name: "AV(有码)/DVDiSo Censored", parent: "115" },
  "438": { name: "影剧/综艺/BluRay", parent: "105" },
  "439": { name: "电影/Remux", parent: "100" },
  "440": { name: "AV(Gay)/HD", parent: "120" },
  "442": { name: "有声书", parent: "450" },
  "444": { name: "纪录", parent: null },
  "445": { name: "IV", parent: null },
  "446": { name: "H-ACG", parent: null },
  "447": { name: "游戏", parent: null },
  "448": { name: "TV游戏", parent: "447" },
  "449": { name: "动漫", parent: null },
  "450": { name: "其他", parent: null },
  "451": { name: "教育影片", parent: "450" },
  "453": { name: "动画/BluRay", parent: "449" },
};

/**
 * 根据分类ID获取分类名称
 * @param {string|number} id 分类ID
 * @returns {string} 分类名称，未找到返回空字符串
 */
export function getCategoryName(id) {
  const entry = CATEGORY_MAP[String(id)];
  return entry ? entry.name : "";
}

/**
 * 根据分类ID获取父级分类ID
 * @param {string|number} id 分类ID
 * @returns {string|null} 父级分类ID，未找到返回null
 */
export function getCategoryParent(id) {
  const entry = CATEGORY_MAP[String(id)];
  return entry ? entry.parent : null;
}

export default CATEGORY_MAP;
