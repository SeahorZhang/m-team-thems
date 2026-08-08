import Logo from "./components/Logo.js";
import { reinitDirectImagePreview } from "./utils/directThumbnailPreview.js";
import { reinitPosterWall } from "./utils/posterWall.js";
import { createElement, createDivider } from "./utils/dom.js";
import { loadBoolean, saveBoolean } from "./utils/storage.js";
import { SVG_MENU } from "./utils/icons.js";
import { createToggleSwitch } from "./utils/ui.js";

// storage keys are inlined to avoid extra indirection
const DEFAULT_THEME = "default";

const themeItems = [
  { key: "default", label: "默认主题" },
  { key: "ocean", label: "蓝色主题" },
  { key: "pink", label: "粉色主题" },
];

function loadTheme() {
  return localStorage.getItem('team-theme') || DEFAULT_THEME;
}

function saveTheme(theme) {
  localStorage.setItem('team-theme', theme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute("team-theme", theme);
  saveTheme(theme);
}

// storage helpers moved to `src/utils/storage.js`
function createThemeItem(item, selectedTheme, onSelect) {
  const menuItem = createElement("div", {
    styles: {
      minHeight: "40px",
      backgroundColor: "#fff",
      color: "#333",
      borderRadius: "8px",
      display: "flex",
      alignItems: "center",
      cursor: "pointer",
      paddingInline: "12px",
      transition: "background-color 0.2s ease",
    },
  });

  menuItem.addEventListener("mouseenter", () => {
    menuItem.style.backgroundColor = "#f7f7f7";
  });

  menuItem.addEventListener("mouseleave", () => {
    menuItem.style.backgroundColor = "transparent";
  });

  const radio = createElement("input", {
    attrs: {
      type: "radio",
      name: "theme",
      value: item.key,
    },
    styles: {
      margin: "0",
      cursor: "pointer",
      accentColor: "#1890ff",
    },
  });
  radio.checked = item.key === selectedTheme;

  const label = createElement("label", {
    styles: {
      cursor: "pointer",
      flex: "1",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      margin: "0",
      userSelect: "none",
      fontSize: "13px",
      color: "#2f2f2f",
    },
  });

  label.appendChild(radio);
  label.appendChild(document.createTextNode(item.label));

  menuItem.appendChild(label);

  menuItem.addEventListener("click", () => {
    radio.checked = true;
    onSelect(item.key);
  });

  return menuItem;
}

function updateThemeRadios(menu, theme) {
  menu.querySelectorAll('input[name="theme"]').forEach((input) => {
    input.checked = input.value === theme;
  });
}

function buildMenuContents(menu, selectedTheme) {
  const themeList = createElement('div');
  themeItems.forEach((item) => {
    themeList.appendChild(
      createThemeItem(item, selectedTheme, (theme) => {
        applyTheme(theme);
        updateThemeRadios(menu, theme);
        menu.style.display = 'none';
      }),
    );
  });
  menu.appendChild(themeList);
  menu.appendChild(createDivider());
  menu.appendChild(createPreviewSwitch(loadBoolean('image-preview-enabled', true)));
  menu.appendChild(createPosterWallSwitch(loadBoolean('poster-wall-enabled', true)));
  // no dev-only items — keep menu identical in dev and prod
  menu.appendChild(createDivider());
  menu.appendChild(Logo());
}

function createPreviewSwitch(initialValue) {
  return createToggleSwitch({
    text: "图片预览",
    hint: "按压滚轮打开详情，悬停显示大图",
    initialValue,
    onChange: (enabled) => {
      saveBoolean('image-preview-enabled', enabled);
      reinitDirectImagePreview();
    },
  });
}

function createPosterWallSwitch(initialValue) {
  return createToggleSwitch({
    text: "海报墙模式",
    hint: "将列表转换为海报墙视图",
    initialValue,
    onChange: (enabled) => {
      saveBoolean('poster-wall-enabled', enabled);
      reinitPosterWall();
    },
  });
}

// picker removed — developer-only helper omitted to keep prod/dev parity

/**
 * 创建App组件 - 主题切换和图片预览开关
 */
export default function App(container) {
  let selectedTheme = loadTheme();
  applyTheme(selectedTheme);

  const dropdown = container;

  const button = createElement("button", {
    attrs: { type: "button", "aria-expanded": "false", title: "主题设置" },
    html: SVG_MENU,
    styles: {
      width: "40px",
      height: "24px",
      borderRadius: "4px",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontSize: "15px",
      cursor: "pointer",
      padding: 0,
      margin: 0,
      border: 0,
      background: "transparent",
      transition: "background-color 0.2s cubic-bezier(0.645, 0.045, 0.355, 1)",
    },
  });

  button.addEventListener("mouseenter", () => {
    button.style.backgroundColor = "rgba(0,0,0,0.04)";
  });
  button.addEventListener("mouseleave", () => {
    button.style.backgroundColor = "transparent";
  });

  const menu = createElement("div", {
    styles: {
      position: "absolute",
      top: "calc(100% + 10px)",
      right: "0",
      minWidth: "200px",
      background: "#fff",
      borderRadius: "12px",
      padding: "8px",
      boxSizing: "border-box",
      boxShadow: "0 20px 40px rgba(0, 0, 0, 0.16)",
      display: "none",
      zIndex: "10000",
      border: "1px solid #e5e7eb",
      overflow: "hidden",
      fontSize: "14px",
    },
  });

  buildMenuContents(menu, selectedTheme);

  dropdown.appendChild(button);
  dropdown.appendChild(menu);

  const adjustMenuPosition = () => {
    menu.style.left = "0";
    menu.style.right = "auto";
    menu.style.maxWidth = "calc(100vw - 16px)";

    const dropdownRect = dropdown.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const overflowRight =
      dropdownRect.left + menuRect.width > window.innerWidth - 8;

    if (overflowRight) {
      menu.style.left = "auto";
      menu.style.right = "0";
    }
  };

  const closeMenu = () => {
    menu.style.display = "none";
    button.setAttribute("aria-expanded", "false");
  };

  const toggleMenu = () => {
    const open = menu.style.display !== "block";
    menu.style.display = open ? "block" : "none";
    button.setAttribute("aria-expanded", String(open));

    if (open) {
      adjustMenuPosition();
    }
  };

  button.addEventListener("click", (event) => {
    event.preventDefault();
    toggleMenu();
  });

  document.addEventListener("click", (event) => {
    if (!dropdown.contains(event.target)) {
      closeMenu();
    }
  });
}
