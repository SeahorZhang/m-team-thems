import React from "react";
import type { RadioChangeEvent } from "antd";
import { Space, Radio } from "antd";

interface DarkSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const DarkSwitch: React.FC<DarkSwitchProps> = ({ checked, onChange }) => {
  const handleModeChange = (e: RadioChangeEvent) => {
    onChange(e.target.value === "customizeCss");
  };

  return (
    <Space style={{ padding: 8 }}>
      <Radio.Group
        value={checked ? "customizeCss" : "defaultCss"}
        onChange={handleModeChange}
        options={[
          { label: "默认样式", value: "defaultCss" },
          { label: "优化样式", value: "customizeCss" },
        ]}
        optionType="button"
        buttonStyle="solid"
        size="small"
      />
    </Space>
  );
};

export default DarkSwitch;
