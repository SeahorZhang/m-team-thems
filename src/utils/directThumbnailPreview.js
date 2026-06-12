const SELECTORS = {
  imageContainer: ".ant-image",
  imageCover: ".ant-image-cover",
  image: "img.ant-image-img",
  container: ".ant-table-wrapper",
};

const STORAGE_KEY = "image-preview-enabled";
const PREVIEW_MAX_WIDTH_RATIO = 0.5;
const PREVIEW_MAX_HEIGHT_RATIO = 0.72;

let previewEl = null;
let currentImage = null;
let initialized = false;
let bound = false;
let pendingLoader = null;
let previewEnabled = localStorage.getItem(STORAGE_KEY) !== "false";

function createPreviewElement() {
  if (previewEl) {
    return
  }

  previewEl = document.createElement("img")
  Object.assign(previewEl.style, {
    position: "fixed",
    zIndex: "99999",
    display: "none",
    opacity: "0",
    borderRadius: "14px",
    boxShadow: "0 18px 50px rgba(0, 0, 0, 0.2)",
    objectFit: "contain",
    backgroundColor: "#fff",
    pointerEvents: "none",
    transition: "opacity 0.2s ease, transform 0.2s ease",
    maxWidth: "none",
    maxHeight: "none",
    willChange: "opacity, transform, left, top",
  })

  document.body.appendChild(previewEl)
}

function hidePreview() {
  currentImage = null
  if (!previewEl) {
    return
  }

  previewEl.style.opacity = "0"
  previewEl.style.transform = "scale(0.97)"

  setTimeout(() => {
    if (!currentImage) {
      previewEl.style.display = "none"
    }
  }, 180)
}

function getImageFromEvent(event) {
  const target = event.target
  if (!target) {
    return null
  }

  if (target.matches(SELECTORS.image)) {
    return target
  }

  const wrapper = target.closest(SELECTORS.imageCover)
  if (!wrapper) {
    return null
  }

  return wrapper.closest(SELECTORS.imageContainer)?.querySelector(SELECTORS.image) || null
}

function updatePreviewPosition(target, width, height) {
  const rect = target.getBoundingClientRect()
  const spacing = 18
  let left = rect.right + spacing
  let top = rect.top + rect.height / 2 - height / 2

  if (left + width + 14 > window.innerWidth && rect.left > width + spacing) {
    left = rect.left - width - spacing
  }

  top = Math.max(12, top)
  top = Math.min(top, window.innerHeight - height - 12)

  Object.assign(previewEl.style, {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
  })
}

function renderPreview(img) {
  if (!previewEnabled) {
    return
  }

  currentImage = img
  if (!previewEl) {
    createPreviewElement()
  }

  if (pendingLoader) {
    pendingLoader.onload = null
  }

  const loader = new Image()
  pendingLoader = loader
  loader.decoding = "async"
  loader.onload = () => {
    if (currentImage !== img) {
      return
    }

    const rect = img.getBoundingClientRect()
    const availableWidth = Math.min(window.innerWidth * PREVIEW_MAX_WIDTH_RATIO, window.innerWidth - rect.right - 42)
    const availableHeight = Math.min(window.innerHeight * PREVIEW_MAX_HEIGHT_RATIO, window.innerHeight - 30)
    const naturalWidth = loader.naturalWidth
    const naturalHeight = loader.naturalHeight
    const ratio = Math.min(availableWidth / naturalWidth, availableHeight / naturalHeight, 1)
    const width = naturalWidth * ratio
    const height = naturalHeight * ratio

    previewEl.src = loader.src
    updatePreviewPosition(img, width, height)
    previewEl.style.display = "block"
    previewEl.style.transform = "scale(1)"

    requestAnimationFrame(() => {
      previewEl.style.opacity = "1"
    })
  }

  loader.src = img.src
}

function isSameImageArea(event, img) {
  if (!event.relatedTarget || !img) {
    return false
  }

  const imageArea = img.closest(SELECTORS.imageContainer)
  return imageArea?.contains(event.relatedTarget) || false
}

function handleMouseOver(event) {
  if (!previewEnabled) {
    return
  }

  const img = getImageFromEvent(event)
  if (!img || isSameImageArea(event, img)) {
    return
  }

  renderPreview(img)
}

function handleMouseOut(event) {
  if (!previewEnabled) {
    return
  }

  const img = getImageFromEvent(event)
  if (!img || isSameImageArea(event, img)) {
    return
  }

  hidePreview()
}

function getEventRoot() {
  return document.querySelector(SELECTORS.container) || document.body
}

function bindEvents() {
  if (bound) {
    return
  }

  const root = getEventRoot()
  root.addEventListener("mouseover", handleMouseOver)
  root.addEventListener("mouseout", handleMouseOut)
  window.addEventListener("resize", hidePreview)
  window.addEventListener("scroll", hidePreview, true)
  bound = true
}

function unbindEvents() {
  if (!bound) {
    return
  }

  const root = getEventRoot()
  root.removeEventListener("mouseover", handleMouseOver)
  root.removeEventListener("mouseout", handleMouseOut)
  window.removeEventListener("resize", hidePreview)
  window.removeEventListener("scroll", hidePreview, true)
  bound = false
}

function cleanup() {
  hidePreview()
  unbindEvents()
  initialized = false
}

function syncPreviewEnabled() {
  previewEnabled = localStorage.getItem(STORAGE_KEY) !== "false"
}

function initDirectImagePreview() {
  syncPreviewEnabled()

  if (!previewEnabled) {
    cleanup()
    return
  }

  if (initialized) {
    return
  }

  createPreviewElement()
  bindEvents()
  initialized = true
}

function reinitDirectImagePreview() {
  cleanup()
  syncPreviewEnabled()

  if (previewEnabled) {
    initDirectImagePreview()
  }
}

export { initDirectImagePreview, reinitDirectImagePreview }
