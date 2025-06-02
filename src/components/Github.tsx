import React from "react";
import { Space, Tooltip } from "antd";
import { GithubOutlined } from "@ant-design/icons";
import { version } from "../../package.json";

declare const __BUILD_TIME__: string;

const Github: React.FC = () => {
  return (
    <Space
      style={{
        padding: 8,
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      <a
        href="https://github.com/Seahor/m-team-theme"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "inherit" }}
      >
        <GithubOutlined style={{ fontSize: 16 }} />
      </a>

      <Tooltip title={`更新时间：${__BUILD_TIME__}`} placement="bottom">
        <span
          style={{
            fontSize: 12,
            color: "#999",
          }}
        >
          V{version}
        </span>
      </Tooltip>
    </Space>
  );
};

export default Github;
