/**
 * 直接缩略图预览 - 直接监听缩略图元素
 */

// 常量定义
const PREVIEW_STYLES = `
  position: fixed;
  max-width: 300px;
  max-height: 200px;
  width: auto;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  object-fit: contain;
  z-index: 9999;
  opacity: 0;
  transition: opacity 0.2s ease, transform 0.2s ease;
  pointer-events: auto;
  display: none;
`;

const HIDE_DELAY = 300;
const QUICK_HIDE_DELAY = 50;
const ANIMATION_DURATION = 200;

// 检查是否启用了图片预览功能
export const isImagePreviewEnabled = (): boolean => {
  return localStorage.getItem('image-preview-enabled') !== 'false';
};

// 状态管理
class PreviewState {
  previewElement: HTMLImageElement | null = null;
  isInitialized = false;
  processedThumbnails = new Set<HTMLElement>();
  globalHideTimer: number | null = null;
  isMouseOverPreview = false;

  clearHideTimer(): void {
    if (this.globalHideTimer) {
      clearTimeout(this.globalHideTimer);
      this.globalHideTimer = null;
    }
  }

  reset(): void {
    this.clearHideTimer();
    this.isMouseOverPreview = false;
  }
}

const state = new PreviewState();

function createPreviewElement(): void {
  if (state.previewElement) return;

  state.previewElement = document.createElement('img');
  state.previewElement.style.cssText = PREVIEW_STYLES;
  document.body.appendChild(state.previewElement);

  setupPreviewEventListeners();
}

function setupPreviewEventListeners(): void {
  if (!state.previewElement) return;

  // 点击图片关闭
  state.previewElement.addEventListener('click', hidePreview);
  
  // 鼠标进入预览图片时，保持显示
  state.previewElement.addEventListener('mouseenter', (e) => {
    e.stopPropagation();
    state.isMouseOverPreview = true;
    state.clearHideTimer();
  });
  
  // 鼠标在预览图片上移动时，保持显示
  state.previewElement.addEventListener('mousemove', (e) => {
    e.stopPropagation();
    state.isMouseOverPreview = true;
    state.clearHideTimer();
  });
  
  // 鼠标离开预览图片时，立即隐藏
  state.previewElement.addEventListener('mouseleave', (e) => {
    e.stopPropagation();
    state.isMouseOverPreview = false;
    hidePreviewImmediately();
  });

  // ESC键关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.previewElement?.style.display !== 'none') {
      hidePreview();
    }
  });
}

function showPreview(img: HTMLImageElement): void {
  if (!state.previewElement) return;

  // 检查图片地址是否有效
  if (!img.src || img.src.trim() === '' || img.src === 'data:') {
    hidePreview();
    return;
  }

  state.clearHideTimer();
  state.isMouseOverPreview = false;
  
  // 如果图片相同，不重新加载
  if (state.previewElement.src !== img.src) {
    state.previewElement.src = img.src;
  }
  
  // 计算预览位置 - 只显示在右边，空间不够时才缩小图片
  const rect = img.getBoundingClientRect();
  
  const spacing = 15; // 间距
  const previewLeft = rect.right + spacing; // 固定显示在右边
  const previewTop = rect.top + (rect.height / 2); // 垂直居中对齐
  
  // 获取原图尺寸
  const defaultWidth = img.naturalWidth || img.width;
  const defaultHeight = img.naturalHeight || img.height;
  
  // 计算可用的最大宽度
  const availableWidth = window.innerWidth - previewLeft - 20; // 减去右边距
  
  // 计算预览图的显示尺寸，优先以原图尺寸显示
  let displayWidth = defaultWidth;
  let displayHeight = defaultHeight;
  
  // 计算可用的最大高度（屏幕高度的70%）
  const availableHeight = window.innerHeight * 0.7;
  
  // 先检查高度是否需要缩小
  if (displayHeight > availableHeight) {
    const heightRatio = availableHeight / displayHeight;
    displayHeight = availableHeight;
    displayWidth = displayWidth * heightRatio;
  }
  
  // 再检查宽度是否需要缩小
  if (displayWidth > availableWidth) {
    const widthRatio = availableWidth / displayWidth;
    displayWidth = availableWidth;
    displayHeight = displayHeight * widthRatio;
  }
  
  // 再次检查高度，因为宽度缩小可能影响高度
  if (displayHeight > availableHeight) {
    const heightRatio = availableHeight / displayHeight;
    displayHeight = availableHeight;
    displayWidth = displayWidth * heightRatio;
  }
  
  // 调整预览图位置，使其垂直居中对齐
  let finalTop = previewTop - (displayHeight / 2); // 以中心点对齐
  
  // 检查是否超出屏幕上下边界，如果超出则调整位置
  const previewBottom = finalTop + displayHeight;
  
  // 如果上边超出屏幕，调整到屏幕顶部
  if (finalTop < 10) {
    finalTop = 10;
  }
  
  // 如果下边超出屏幕，调整到屏幕底部
  if (previewBottom > window.innerHeight - 30) {
    finalTop = window.innerHeight - displayHeight - 30;
  }
  
  // 设置位置和尺寸（getBoundingClientRect 返回的是相对于视口的位置，不需要加滚动偏移）
  state.previewElement.style.left = `${previewLeft}px`;
  state.previewElement.style.top = `${finalTop}px`;
  state.previewElement.style.width = `${displayWidth}px`;
  state.previewElement.style.height = `${displayHeight}px`;
  state.previewElement.style.maxWidth = 'none'; // 移除maxWidth限制
  state.previewElement.style.maxHeight = 'none'; // 移除maxHeight限制
  state.previewElement.style.transform = 'none'; // 移除 transform，使用绝对定位
  
  // 显示预览
  state.previewElement.style.display = 'block';
  
  // 触发动画
  requestAnimationFrame(() => {
    if (state.previewElement) {
      state.previewElement.style.opacity = '1';
    }
  });
}

function hidePreviewImmediately(): void {
  if (!state.previewElement) return;

  state.clearHideTimer();

  // 使用很短的延迟来允许快速切换时取消隐藏
  state.globalHideTimer = window.setTimeout(() => {
    if (state.previewElement && state.previewElement.style.display !== 'none') {
      animateHide();
    }
    state.globalHideTimer = null;
  }, QUICK_HIDE_DELAY);
}

function animateHide(): void {
  if (!state.previewElement) return;

  state.previewElement.style.opacity = '0';
  
  // 动画完成后隐藏
  setTimeout(() => {
    if (state.previewElement) {
      state.previewElement.style.display = 'none';
      state.previewElement.src = '';
      state.isMouseOverPreview = false;
    }
  }, ANIMATION_DURATION);
}

function hidePreview(): void {
  if (!state.previewElement) return;

  // 如果鼠标在预览图片上，不隐藏
  if (state.isMouseOverPreview) {
    return;
  }

  state.clearHideTimer();

  // 设置全局隐藏定时器，增加延迟时间
  state.globalHideTimer = window.setTimeout(() => {
    // 再次检查鼠标是否在预览图片上
    if (state.isMouseOverPreview) {
      return;
    }

    // 检查是否还有预览显示
    if (state.previewElement && state.previewElement.style.display !== 'none') {
      animateHide();
    }
    
    state.globalHideTimer = null;
  }, HIDE_DELAY);
}

function addThumbnailListeners(thumbnail: HTMLElement): void {
  if (state.processedThumbnails.has(thumbnail)) {
    return;
  }
  
  state.processedThumbnails.add(thumbnail);
  
  const eventHandlers = {
    mouseenter: () => {
      if (isImagePreviewEnabled()) {
        state.clearHideTimer();
        const img = thumbnail as HTMLImageElement;
        // 检查图片地址是否有效
        if (!img.src || img.src.trim() === '' || img.src === 'data:') {
          hidePreview();
          return;
        }
        showPreview(img);
      }
    },
    mouseleave: hidePreviewImmediately
  };

  // 为缩略图的父容器添加事件监听器（因为遮罩层可能阻止了img的事件）
  const parentContainer = thumbnail.closest('.ant-image');
  const targetElement = parentContainer || thumbnail;
  
  targetElement.addEventListener('mouseenter', eventHandlers.mouseenter);
  targetElement.addEventListener('mouseleave', eventHandlers.mouseleave);
}

function processExistingThumbnails(): void {
  const thumbnails = document.querySelectorAll('img.torrent-list__thumbnail');
  
  thumbnails.forEach((thumbnail) => {
    addThumbnailListeners(thumbnail as HTMLElement);
  });
}

export function initDirectImagePreview(): void {
  if (state.isInitialized) {
    return;
  }

  if (!isImagePreviewEnabled()) {
    return;
  }

  createPreviewElement();
  setupThumbnailObserver();
  
  // 延迟处理现有缩略图，确保页面完全加载
  const processWithRetry = (retryCount = 0) => {
    const thumbnails = document.querySelectorAll('img.torrent-list__thumbnail');
    
    if (thumbnails.length > 0) {
      processExistingThumbnails();
      state.isInitialized = true;
      console.log(`预览功能初始化成功，找到 ${thumbnails.length} 个缩略图`);
    } else if (retryCount < 20) {
      // 增加重试次数和更短的间隔，提高成功率
      setTimeout(() => processWithRetry(retryCount + 1), 100);
    } else {
      // 即使没找到缩略图也标记为已初始化，等待观察器处理新添加的
      state.isInitialized = true;
      console.log('预览功能初始化完成，等待动态加载的缩略图');
    }
  };
  
  // 立即尝试一次，然后开始重试
  processWithRetry();
}

function setupThumbnailObserver(): void {
  const observer = new MutationObserver((mutations) => {
    const hasNewThumbnails = mutations.some(mutation => 
      mutation.type === 'childList' && 
      Array.from(mutation.addedNodes).some(node => 
        node instanceof HTMLElement && (
          (node.tagName === 'IMG' && node.classList.contains('torrent-list__thumbnail')) ||
          node.querySelector('img.torrent-list__thumbnail')
        )
      )
    );
    
    if (hasNewThumbnails) {
      processExistingThumbnails();
    }
  });
  
  const rootElement = document.querySelector("#root");
  if (rootElement) {
    observer.observe(rootElement, {
      childList: true,
      subtree: true
    });
  }
}

export function reinitDirectImagePreview(): void {
  // 清理现有事件监听器
  state.processedThumbnails.forEach(thumbnail => {
    // 克隆元素来移除事件监听器
    const newThumbnail = thumbnail.cloneNode(true) as HTMLElement;
    thumbnail.parentNode?.replaceChild(newThumbnail, thumbnail);
  });
  state.processedThumbnails.clear();
  
  // 移除预览元素
  if (state.previewElement && state.previewElement.parentNode) {
    state.previewElement.parentNode.removeChild(state.previewElement);
    state.previewElement = null;
  }
  
  state.reset();
  state.isInitialized = false;
  
  // 重新初始化
  initDirectImagePreview();
}
