export function setStyles(element, styles) {
  Object.entries(styles || {}).forEach(([key, value]) => {
    if (value == null) {
      return
    }
    element.style[key] = value
  })
}

export function createElement(tag, options = {}) {
  const { className, id, attrs = {}, styles, textContent, html, children = [] } = options
  const element = document.createElement(tag)

  if (className) {
    element.className = className
  }

  if (id) {
    element.id = id
  }

  if (textContent !== undefined) {
    element.textContent = textContent
  }

  if (html !== undefined) {
    element.innerHTML = html
  }

  Object.entries(attrs).forEach(([name, value]) => {
    if (value != null) {
      element.setAttribute(name, String(value))
    }
  })

  setStyles(element, styles)

  children.forEach((child) => {
    if (child) {
      element.appendChild(child)
    }
  })

  return element
}
