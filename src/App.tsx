import React, { useState, useEffect } from "react";
import type { MenuProps } from "antd";
import { Dropdown, theme, Divider } from "antd";
import ThemeIcon from "./assets/theme.svg?react";
import AntSelectArrow from "./assets/ant-select-arrow.svg?react";
import Icon from "@ant-design/icons";
import DarkSwitch from "./components/DarkSwitch";
import Github from "./components/Github";

const { useToken } = theme;

// 主题菜单项
const themeItems: MenuProps["items"] = [
  {
    key: "default",
    label: "默认主题",
  },
  {
    key: "ocean",
    label: "蓝色主题",
  },
];

const App: React.FC = () => {
  const { token } = useToken();

  // 从 localStorage 获取主题和暗黑模式设置
  const [selectedTheme, setSelectedTheme] = useState(() => {
    return localStorage.getItem("theme") || "default";
  });

  const [isCssMode, setIsCssMode] = useState(() => {
    return localStorage.getItem("cssMode") === "true";
  });

  // 更新 HTML 根元素的主题和暗黑模式属性
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", selectedTheme);
    root.setAttribute("data-css-mode", isCssMode.toString());

    // 保存设置到 localStorage
    localStorage.setItem("theme", selectedTheme);
    localStorage.setItem("cssMode", isCssMode.toString());
  }, [selectedTheme, isCssMode]);

  const handleThemeClick: MenuProps["onClick"] = (info) => {
    const themeKey = info.key as string;
    setSelectedTheme(themeKey);
  };

  const handleDarkModeChange = (checked: boolean) => {
    setIsCssMode(checked);
  };

  const menuStyle: React.CSSProperties = {
    boxShadow: "none",
    backgroundColor: "transparent",
  };

  return (
    <Dropdown
      menu={{
        items: themeItems,
        selectable: true,
        defaultSelectedKeys: [selectedTheme],
        selectedKeys: [selectedTheme],
        onClick: handleThemeClick,
      }}
      trigger={["click"]}
      popupRender={(menu) => (
        <>
          {React.cloneElement(
            menu as React.ReactElement<{
              style: React.CSSProperties;
            }>,
            { style: menuStyle }
          )}
          <Divider style={{ margin: 0 }} />
          <DarkSwitch checked={isCssMode} onChange={handleDarkModeChange} />
          <Divider style={{ margin: 0 }} />
          <Github />
        </>
      )}
    >
      <a
        onClick={(e) => e.preventDefault()}
        style={{
          cursor: "pointer",
          color: token.colorText,
        }}
      >
        <Icon style={{ fontSize: "17px" }} component={ThemeIcon} />
        <Icon style={{ fontSize: "18px" }} component={AntSelectArrow} />
      </a>
    </Dropdown>
  );
};

export default App;
