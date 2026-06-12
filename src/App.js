import Logo from "./components/Logo.js";
import { reinitDirectImagePreview } from "./utils/directThumbnailPreview.js";
import { createElement, setStyles } from "./utils/dom.js";

const STORAGE_THEME = "team-theme";
const STORAGE_PREVIEW = "image-preview-enabled";
const DEFAULT_THEME = "default";

const themeItems = [
  { key: "default", label: "默认主题" },
  { key: "ocean", label: "蓝色主题" },
  { key: "pink", label: "粉色主题" },
];

function loadTheme() {
  return localStorage.getItem(STORAGE_THEME) || DEFAULT_THEME;
}

function saveTheme(theme) {
  localStorage.setItem(STORAGE_THEME, theme);
}

function loadPreviewEnabled() {
  return localStorage.getItem(STORAGE_PREVIEW) !== "false";
}

function savePreviewEnabled(enabled) {
  localStorage.setItem(STORAGE_PREVIEW, String(enabled));
}

function applyTheme(theme) {
  document.documentElement.setAttribute("team-theme", theme);
  saveTheme(theme);
}

function createDivider() {
  return createElement("div", {
    styles: {
      height: "1px",
      backgroundColor: "#f1f1f1",
      margin: "6px 0",
    },
  });
}

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

function createPreviewSwitch(initialValue) {
  const label = createElement("label", {
    attrs: { htmlFor: "preview-switch" },
    styles: {
      justifyContent: "space-between",
      userSelect: "none",
      minHeight: "40px",
      backgroundColor: "#fff",
      color: "#333",
      borderRadius: "8px",
      display: "flex",
      alignItems: "center",
      cursor: "pointer",
      paddingInline: "12px",
      transition: "background-color 0.2s ease",
      fontSize: "13px",
    },
  });
  label.title = "鼠标悬停在列表缩略图上显示大图预览";

  label.addEventListener("mouseenter", () => {
    label.style.backgroundColor = "#f7f7f7";
  });
  label.addEventListener("mouseleave", () => {
    label.style.backgroundColor = "transparent";
  });

  const text = createElement("span", { textContent: "图片预览" });
  const checkbox = createElement("input", {
    attrs: { type: "checkbox", id: "preview-switch" },
    styles: {
      appearance: "none",
      WebkitAppearance: "none",
      width: "38px",
      height: "20px",
      borderRadius: "999px",
      backgroundColor: initialValue ? "#1890ff" : "#d9d9d9",
      border: "none",
      cursor: "pointer",
      position: "relative",
      outline: "none",
      transition: "background-color 0.24s ease",
      flexShrink: "0",
    },
  });

  checkbox.checked = initialValue;
  checkbox.addEventListener("change", (event) => {
    const enabled = event.target.checked;
    checkbox.style.backgroundColor = enabled ? "#1890ff" : "#d9d9d9";
    savePreviewEnabled(enabled);
    reinitDirectImagePreview();
  });

  if (!document.head.querySelector("style[data-preview-switch]")) {
    const switchStyle = createElement("style", {
      attrs: { "data-preview-switch": "true" },
      textContent: `
        #preview-switch {
          position: relative;
        }

        #preview-switch:before {
          content: '';
          position: absolute;
          width: 14px;
          height: 14px;
          top: 3px;
          left: 3px;
          border-radius: 50%;
          background-color: #fff;
          transition: left 0.24s ease;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
        }

        #preview-switch:checked:before {
          left: 21px;
        }
      `,
    });
    document.head.appendChild(switchStyle);
  }

  label.appendChild(text);
  label.appendChild(checkbox);
  return label;
}

/**
 * 创建App组件 - 主题切换和图片预览开关
 */
export default function App(container) {
  let selectedTheme = loadTheme();
  applyTheme(selectedTheme);

  const dropdown = container;

  const button = createElement("button", {
    attrs: { type: "button", "aria-expanded": "false", title: "主题设置" },
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 20 20"><path fill="currentColor" fill-rule="evenodd" d="M4 2a2 2 0 0 0-2 2v11a3 3 0 1 0 6 0V4a2 2 0 0 0-2-2zm1 14a1 1 0 1 0 0-2a1 1 0 0 0 0 2m5-1.757l4.9-4.9a2 2 0 0 0 0-2.828L13.485 5.1a2 2 0 0 0-2.828 0L10 5.757zM16 18H9.071l6-6H16a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2" clip-rule="evenodd"/></svg>`,
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
      minWidth: "176px",
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

  const themeList = createElement("div");
  themeItems.forEach((item) => {
    themeList.appendChild(
      createThemeItem(item, selectedTheme, (theme) => {
        selectedTheme = theme;
        applyTheme(theme);
        updateThemeRadios(menu, theme);
        menu.style.display = "none";
      }),
    );
  });
  menu.appendChild(themeList);
  menu.appendChild(createDivider());
  menu.appendChild(createPreviewSwitch(loadPreviewEnabled()));
  menu.appendChild(createDivider());

  const githubComponent = Logo();
  setStyles(githubComponent, {
    height: "40px",
    color: "#333",
    display: "flex",
    alignItems: "center",
    paddingInline: "12px",
    fontSize: "13px",
    justifyContent: "space-between",
  });
  menu.appendChild(githubComponent);

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
