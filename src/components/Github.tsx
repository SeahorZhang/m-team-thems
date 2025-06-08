import React from "react";
import { Space, Tooltip } from "antd";
import { GithubOutlined } from "@ant-design/icons";
import SimpleIconsTampermonkey from "../assets/simpleIconsTampermonkey.svg?react";
import Icon from "@ant-design/icons";
import { version, license } from "../../package.json";
const youhou = "https://greasyfork.org/zh-CN/scripts/538074-m-team-thems";

declare const __BUILD_TIME__: string;

const Github: React.FC = () => {
  return (
    <div
      style={{
        padding: "4px 8px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
      }}
    >
      <Space size="small" align="center">
        <Tooltip title="查看源码" placement="bottom">
          <a
            href={license}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "inherit",
            }}
            className="icon-link"
          >
            <GithubOutlined style={{ fontSize: 18 }} />
          </a>
        </Tooltip>
        <Tooltip title="油猴" placement="bottom">
          <a
            href={youhou}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "inherit",
            }}
            className="icon-link"
          >
            <Icon
              style={{
                fontSize: 18,
              }}
              component={SimpleIconsTampermonkey}
            />
          </a>
        </Tooltip>
      </Space>

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
    </div>
  );
};

export default Github;
