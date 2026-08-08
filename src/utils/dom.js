export function setStyles(element, styles) {
  Object.entries(styles || {}).forEach(([key, value]) => {
    if (value == null) {
      return
    }
    element.style[key] = value
  })
}

export function createElement(tag, options = {}) {
  const {
    className,
    id,
    attrs = {},
    dataset = {},
    styles,
    textContent,
    html,
    children = [],
    on = {},
  } = options

  const element = document.createElement(tag)

  if (className) {
    if (Array.isArray(className)) element.className = className.join(' ')
    else element.className = className
  }

  if (id) element.id = id

  if (textContent !== undefined) element.textContent = textContent
  if (html !== undefined) element.innerHTML = html

  Object.entries(attrs).forEach(([name, value]) => {
    if (value != null) element.setAttribute(name, String(value))
  })

  Object.entries(dataset || {}).forEach(([key, value]) => {
    if (value != null) element.dataset[key] = String(value)
  })

  setStyles(element, styles)

  children.forEach((child) => {
    if (child) element.appendChild(child)
  })

  Object.entries(on || {}).forEach(([ev, handler]) => {
    if (typeof handler === 'function') element.addEventListener(ev, handler)
  })

  return element
}

export function createDivider() {
  return createElement('div', {
    styles: {
      height: '1px',
      backgroundColor: '#f1f1f1',
      margin: '6px 0',
    },
  })
}
