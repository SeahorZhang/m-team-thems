import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./styles/index.css";

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
  
  // 立即尝试初始化，不依赖接口
  const tryInitialize = () => {
    if (isInitialized) return;
    
    // 动态导入直接缩略图预览功能
    import('./utils/directThumbnailPreview').then(({ initDirectImagePreview }) => {
      initDirectImagePreview();
      isInitialized = true;
    }).catch(error => {
      console.error('加载直接缩略图预览功能失败:', error);
    });
  };
  
  // 立即尝试初始化
  tryInitialize();
  
  // 监听接口请求，作为备用触发方式
  const originOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method: string, url: string | URL, async: boolean = true, username?: string | null, password?: string | null) {
    if (url.toString().includes("/api/torrent/search")) {
      this.addEventListener("readystatechange", function () {
        if (this.readyState === 4 && this.status === 200) {
          const res = JSON.parse(this.responseText);
          if (res.message === "SUCCESS") {
            // 如果还没初始化，再次尝试
            tryInitialize();
          }
        }
      });
    }
    originOpen.call(this, method, url, async, username, password);
  };
};

