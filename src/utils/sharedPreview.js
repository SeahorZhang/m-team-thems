let previewEl = null
let pendingShow = 0

export function createSharedPreviewEl() {
  if (previewEl) return previewEl

  previewEl = document.createElement('img')
  Object.assign(previewEl.style, {
    position: 'fixed',
    zIndex: '99999',
    display: 'none',
    opacity: '0',
    borderRadius: '14px',
    boxShadow: '0 18px 50px rgba(0,0,0,.2)',
    objectFit: 'contain',
    pointerEvents: 'none',
    backgroundColor: '#f5f5f5',
    transition: 'opacity .15s ease',
  })

  previewEl.addEventListener('transitionend', () => {
    if (previewEl && previewEl.style.opacity === '0') {
      previewEl.style.display = 'none'
    }
  })

  document.body.appendChild(previewEl)
  return previewEl
}

export function hideSharedPreview() {
  pendingShow++
  if (previewEl) previewEl.style.opacity = '0'
}

// 预览层是常驻单例，换 src 后浏览器会继续绘制上一张图的位图，
// 直到新图解码完成，所以必须等解码结束再定位并淡入。
// place() 放在 token 校验之后的那一帧里执行：调用方会在其中一起摆好预览图、
// 详情面板和暗罩，避免快速划动时旧悬停被作废、却只留下面板没有图的错位。
export function showSharedPreview(src, place) {
  const el = createSharedPreviewEl()
  const token = ++pendingShow
  el.src = src

  el.decode().then(() => {
    if (token !== pendingShow) return
    requestAnimationFrame(() => {
      if (token !== pendingShow) return
      place(el)
      requestAnimationFrame(() => {
        if (token === pendingShow) el.style.opacity = '1'
      })
    })
  }).catch(() => {
    /* 图片加载失败时保持隐藏 */
  })
}

export function removeSharedPreview() {
  pendingShow++
  if (previewEl) {
    previewEl.remove()
    previewEl = null
  }
}

// 悬停放大时的背景暗罩：常驻 DOM 只切 opacity，pointer-events:none 不挡交互。
// 层级低于预览图(99999)与详情面板(99998)，让两者浮在暗罩之上。
let dimEl = null

export function showDimOverlay() {
  if (!dimEl) {
    dimEl = document.createElement('div')
    dimEl.className = 'mt-dim-overlay'
    document.body.appendChild(dimEl)
  }
  dimEl.style.opacity = '1'
}

export function hideDimOverlay() {
  if (dimEl) dimEl.style.opacity = '0'
}

export function removeDimOverlay() {
  if (dimEl) {
    dimEl.remove()
    dimEl = null
  }
}
