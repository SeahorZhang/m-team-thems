import { createElement } from './dom.js'

export function setToggleState(checkbox, enabled) {
  checkbox.checked = enabled
  checkbox.style.backgroundColor = enabled ? '#1890ff' : '#d9d9d9'
}

export function injectToggleStyles() {
  if (document.head.querySelector('style[data-toggle-switch]')) return

  const switchStyle = createElement('style', {
    attrs: { 'data-toggle-switch': 'true' },
    textContent: `
      .mt-toggle-switch {
        appearance: none;
        -webkit-appearance: none;
        width: 38px;
        height: 20px;
        border-radius: 999px;
        background-color: #d9d9d9;
        border: none;
        cursor: pointer;
        position: relative;
        outline: none;
        transition: background-color 0.24s ease;
        flex-shrink: 0;
      }

      .mt-toggle-switch:before {
        content: '';
        position: absolute;
        width: 14px;
        height: 14px;
        top: 3px;
        left: 3px;
        border-radius: 50%;
        background-color: #fff;
        transition: left 0.24s ease;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
      }

      .mt-toggle-switch:checked:before {
        left: 21px;
      }
    `,
  })

  document.head.appendChild(switchStyle)
}

export function createToggleSwitch({ text, hint, initialValue, onChange }) {
  injectToggleStyles()

  const wrapper = createElement('div', {
    styles: {
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      color: '#333',
      transition: 'background-color 0.2s ease',
      fontSize: '13px',
      userSelect: 'none',
      gap: '4px',
      padding: '6px',
      cursor: 'pointer',
    },
  })

  wrapper.addEventListener('mouseenter', () => {
    wrapper.style.backgroundColor = '#f7f7f7'
  })
  wrapper.addEventListener('mouseleave', () => {
    wrapper.style.backgroundColor = 'transparent'
  })

  const label = createElement('div', {
    styles: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      cursor: 'pointer',
    },
  })

  const textEl = createElement('span', { textContent: text })
  const checkbox = createElement('input', {
    className: 'mt-toggle-switch',
    attrs: { type: 'checkbox' },
  })

  setToggleState(checkbox, initialValue)

  const toggle = () => {
    const enabled = !checkbox.checked
    setToggleState(checkbox, enabled)
    onChange(enabled)
  }

  checkbox.addEventListener('change', (event) => {
    const enabled = event.target.checked
    setToggleState(checkbox, enabled)
    onChange(enabled)
  })

  wrapper.addEventListener('click', (event) => {
    if (event.target === checkbox) return
    toggle()
  })

  label.appendChild(textEl)
  label.appendChild(checkbox)

  const hintEl = createElement('div', {
    textContent: hint,
    styles: {
      fontSize: '11px',
      color: '#6d6d6d',
      margin: '0',
      lineHeight: '1.4',
    },
  })

  wrapper.appendChild(label)
  wrapper.appendChild(hintEl)

  return wrapper
}
