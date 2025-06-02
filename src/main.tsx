import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./styles/index.css";

const mountApp = () => {
  const observer = new MutationObserver(() => {
    const donateBtn = document.querySelector('a[href="/donate"]');
    if (donateBtn) {
      console.log("找到捐赠按钮，准备插入主题切换组件");
      observer.disconnect();

      // 给父元素添加 flex 样式
      const parentElement = donateBtn.parentElement;
      if (parentElement) {
        parentElement.style.display = "flex";
        parentElement.style.alignItems = "center";
      }

      // 创建容器
      const container = document.createElement("div");
      container.style.marginRight = "6px";
      container.style.paddingTop = "4px";

      // 在捐赠按钮前插入容器
      donateBtn.parentNode?.insertBefore(container, donateBtn);

      // 渲染 App 组件
      createRoot(container).render(
        <StrictMode>
          <App />
        </StrictMode>
      );
    }
  });

  // 开始观察整个文档
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
};

mountApp();
