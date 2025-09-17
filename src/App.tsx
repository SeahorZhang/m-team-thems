import React, { useState, useEffect } from "react";
import type { MenuProps } from "antd";
import { Dropdown, theme, Divider, Form, Switch } from "antd";
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
];

const App: React.FC = () => {
  const { token } = useToken();

  // 从 localStorage 获取主题设置
  const [selectedTheme, setSelectedTheme] = useState(() => {
    return localStorage.getItem("team-theme") || "default";
  });

  // 图片预览开关状态
  const [imagePreviewEnabled, setImagePreviewEnabled] = useState(() => {
    return localStorage.getItem('image-preview-enabled') !== 'false';
  });

  // 更新 HTML 根元素的主题属性
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("team-theme", selectedTheme);
    localStorage.setItem("team-theme", selectedTheme);
  }, [selectedTheme]);

  const handleThemeClick: MenuProps["onClick"] = (info) => {
    const themeKey = info.key as string;
    setSelectedTheme(themeKey);
  };

  const menuStyle: React.CSSProperties = {
    boxShadow: "none",
    backgroundColor: "transparent",
  };

  const handleSwitchChange = (checked: boolean) => {
    console.log(`图片预览开关: ${checked}`);
    setImagePreviewEnabled(checked);
    localStorage.setItem('image-preview-enabled', checked.toString());
    
    // 重新初始化直接缩略图预览功能
    import('./utils/directThumbnailPreview').then(({ reinitDirectImagePreview }) => {
      reinitDirectImagePreview();
    });
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
        <div style={{ width: 180 }}>
          {React.cloneElement(
            menu as React.ReactElement<{
              style: React.CSSProperties;
            }>,
            { style: menuStyle }
          )}
          <Divider style={{ margin: 0 }} />
          <Form style={{ padding: "4px 8px" }} layout={"inline"}>
            <Form.Item
              label="图片预览"
              tooltip="鼠标悬停在列表的缩略图上预览大图"
            >
              <Switch
                checkedChildren="开启"
                unCheckedChildren="关闭"
                checked={imagePreviewEnabled}
                onChange={handleSwitchChange}
              />
            </Form.Item>
          </Form>
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
