import React, { useState, useEffect } from "react";
import type { MenuProps } from "antd";
import { Dropdown, theme, Divider } from "antd";
import ThemeIcon from "./assets/theme.svg?react";
import AntSelectArrow from "./assets/ant-select-arrow.svg?react";
import Icon from "@ant-design/icons";
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
  {
    key: "pink",
    label: "粉色主题",
  },
  {
    key: "dark",
    label: "暗黑主题",
  },
];

const App: React.FC = () => {
  const { token } = useToken();

  // 从 localStorage 获取主题设置
  const [selectedTheme, setSelectedTheme] = useState(() => {
    return localStorage.getItem("theme") || "default";
  });

  // 更新 HTML 根元素的主题属性
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", selectedTheme);
    localStorage.setItem("theme", selectedTheme);
  }, [selectedTheme]);

  const handleThemeClick: MenuProps["onClick"] = (info) => {
    const themeKey = info.key as string;
    setSelectedTheme(themeKey);
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
        <div style={{ width: 150 }}>
          {React.cloneElement(
            menu as React.ReactElement<{
              style: React.CSSProperties;
            }>,
            { style: menuStyle }
          )}
          <Divider style={{ margin: 0 }} />
          <Github />
        </div>
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
