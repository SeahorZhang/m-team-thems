import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./styles/index.css";
import { initDirectImagePreview } from "./utils/directThumbnailPreview";

const mountApp = () => {
  const observer = new MutationObserver(() => {
    const donateBtn = document.querySelector('a[href="/donate"]');
    if (donateBtn) {
      observer.disconnect();

      // 给父元素添加 flex 样式
      const parentElement = donateBtn.parentElement;
      if (parentElement) {
        parentElement.style.display = "flex";
        parentElement.style.alignItems = "center";
      }

      // 创建容器
      const container = document.createElement("div");
      container.style.marginLeft = "3px";
      container.style.marginRight = "6px";
      container.style.paddingTop = "6px";

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


if (window.location.pathname.startsWith("/browse")) {
  checkBrowser();
}

// 页面渲染后先检查浏览器地址是否包含browse
function checkBrowser() {
  let isInitialized = false;
  
  // 尝试初始化缩略图预览功能
  const tryInitialize = () => {
    if (isInitialized) return;
    
    try {
      initDirectImagePreview();
      isInitialized = true;
    } catch (error) {
      console.error('加载直接缩略图预览功能失败:', error);
    }
  };
  
  // 多种时机尝试初始化
  if (document.readyState === 'complete') {
    // 页面已完全加载，立即初始化
    tryInitialize();
  } else {
    // 页面还在加载中，等待多个事件
    window.addEventListener('load', tryInitialize);
    document.addEventListener('DOMContentLoaded', tryInitialize);
  }
  
  // 额外的延迟初始化，确保所有内容都已渲染
  setTimeout(tryInitialize, 1000);
};

