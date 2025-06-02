import React from "react";
import { Space, Tooltip } from "antd";
import { GithubOutlined } from "@ant-design/icons";
import { version, license } from "../../package.json";

declare const __BUILD_TIME__: string;

const Github: React.FC = () => {
  return (
    <Space
      style={{
        padding: "4px 8px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
      }}
    >
      <Tooltip title="查看源码" placement="bottom">
        <a
          href={license}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "inherit" }}
        >
          <GithubOutlined style={{ fontSize: 16 }} />
        </a>
      </Tooltip>

      <Tooltip title={`更新时间：${__BUILD_TIME__}`} placement="bottom">
        <span
          style={{
            fontSize: 12,
            color: "#999",
          }}
        >
          v{version}
        </span>
      </Tooltip>
    </Space>
  );
};

export default Github;
