let previewEl = null

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
  if (previewEl) previewEl.style.opacity = '0'
}

export function removeSharedPreview() {
  if (previewEl) {
    previewEl.remove()
    previewEl = null
  }
}
