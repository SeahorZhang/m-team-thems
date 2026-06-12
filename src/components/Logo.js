import { createElement } from "../utils/dom.js";
import { version } from "../../package.json";

const SOURCE_URL = "https://github.com/SeahorZhang/m-team-thems";
const SCRIPT_URL = "https://greasyfork.org/zh-CN/scripts/538074-m-team-thems";

const githubSvg = `
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
    <path d="M12 0.297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.387
      0.6 0.113 0.82-0.258 0.82-0.577 0-0.285-0.01-1.04-0.015-2.04
      -3.338 0.725-4.042-1.61-4.042-1.61-0.546-1.387-1.334-1.757-1.334-1.757
      -1.09-0.745 0.083-0.729 0.083-0.729 1.205 0.084 1.84 1.237 1.84 1.237
      1.07 1.835 2.807 1.305 3.492 0.998 0.108-0.775 0.418-1.305 0.76-1.605
      -2.665-0.303-5.467-1.332-5.467-5.93 0-1.31 0.465-2.38 1.235-3.22
      -0.135-0.303-0.54-1.523 0.105-3.176 0 0 1.005-0.322 3.3 1.23
      0.96-0.267 1.98-0.399 3-0.405 1.02 0.006 2.04 0.138 3 0.405
      2.28-1.552 3.285-1.23 3.285-1.23 0.645 1.653 0.24 2.873 0.12 3.176
      0.765 0.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92
      0.435 0.375 0.825 1.11 0.825 2.24 0 1.62-0.015 2.92-0.015 3.32
      0 0.315 0.21 0.69 0.825 0.57 4.77-1.587 8.205-6.084 8.205-11.386
      0-6.627-5.373-12-12-12z"/>
  </svg>
`;

const tampermonkeySvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
    <path fill="currentColor" d="M5.955.002C3-.071.275 2.386.043 5.335c-.069 3.32-.011 6.646-.03 9.969c.06 1.87-.276 3.873.715 5.573c1.083 2.076 3.456 3.288 5.77 3.105c4.003-.011 8.008.022 12.011-.017c2.953-.156 5.478-2.815 5.482-5.772c-.007-4.235.023-8.473-.015-12.708C23.82 2.533 21.16.007 18.205.003c-4.083-.005-8.167 0-12.25-.002zm.447 12.683c2.333-.046 4.506 1.805 4.83 4.116c.412 2.287-1.056 4.716-3.274 5.411c-2.187.783-4.825-.268-5.874-2.341c-1.137-2.039-.52-4.827 1.37-6.197a4.9 4.9 0 0 1 2.948-.99zm11.245 0c2.333-.046 4.505 1.805 4.829 4.116c.413 2.287-1.056 4.716-3.273 5.411c-2.188.783-4.825-.268-5.875-2.341c-1.136-2.039-.52-4.827 1.37-6.197a4.9 4.9 0 0 1 2.949-.99z"/>
  </svg>
`;

function createIconLink(href, title, svg) {
  const link = createElement("a", {
    attrs: {
      href,
      target: "_blank",
      rel: "noopener noreferrer",
      title,
    },
    styles: {
      color: "inherit",
      display: "flex",
      alignItems: "center",
    },
  })

  link.appendChild(createElement("span", {
    html: svg,
    styles: {
      display: "inline-flex",
      alignItems: "center",
    },
  }))

  return link
}

export default function Github() {
  const leftContainer = createElement("div", {
    styles: {
      display: "flex",
      gap: "8px",
      alignItems: "center",
    },
  })

  leftContainer.appendChild(createIconLink(SOURCE_URL, "查看源码", githubSvg))
  leftContainer.appendChild(createIconLink(SCRIPT_URL, "油猴脚本", tampermonkeySvg))

  const versionSpan = createElement("span", {
    textContent: `v${version}`,
    styles: {
      fontSize: "12px",
      color: "#999",
    },
  })
  versionSpan.title = `构建时间：${__BUILD_TIME__}`

  const container = createElement("div", {
    styles: {
      padding: "4px 8px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
    },
  })

  container.appendChild(leftContainer)
  container.appendChild(versionSpan)

  return container
}
