import { createElement } from "../utils/dom.js";
import { version } from "../../package.json";
import { SVG_GITHUB, SVG_TAMPERMONKEY } from "../utils/icons.js";

const SOURCE_URL = "https://github.com/SeahorZhang/m-team-thems";
const SCRIPT_URL = "https://greasyfork.org/zh-CN/scripts/538074-m-team-thems";

// use shared icons
const githubSvg = SVG_GITHUB;
const tampermonkeySvg = SVG_TAMPERMONKEY;

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
  });

  link.appendChild(
    createElement("span", {
      html: svg,
      styles: {
        display: "inline-flex",
        alignItems: "center",
      },
    }),
  );

  return link;
}

export default function Github() {
  const leftContainer = createElement("div", {
    styles: {
      display: "flex",
      gap: "8px",
      alignItems: "center",
      color: "#333",
      justifyContent: "space-between",
    },
  });

  leftContainer.appendChild(createIconLink(SOURCE_URL, "查看源码", githubSvg));
  leftContainer.appendChild(
    createIconLink(SCRIPT_URL, "油猴脚本", tampermonkeySvg),
  );

  const versionSpan = createElement("span", {
    textContent: `${__BUILD_TIME__} ${version}`,
    styles: {
      fontSize: "12px",
      color: "#999",
      lineHeight: '1',
    },
  });
  versionSpan.title = `构建时间：${__BUILD_TIME__}\n版本号：${version}`;

  const container = createElement("div", {
    styles: {
      padding: "4px 6px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
    },
  });

  container.appendChild(leftContainer);
  container.appendChild(versionSpan);

  return container;
}
