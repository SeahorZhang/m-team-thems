import App from "./App.js";
import { initDirectImagePreview } from "./utils/directThumbnailPreview.js";
import "./styles/index.css";

const BUTTON_SELECTOR = 'a[href="/donate"]';
const PREVIEW_PATHS = ["/browse", "/showcaseDetail"];
const APP_CONTAINER_ID = "m-team-theme-menu";
let menuMounted = false;
let previewInitialized = false;
let currentPath = window.location.pathname;

function isPreviewPage(path = window.location.pathname) {
  return PREVIEW_PATHS.some((item) => path.startsWith(item));
}

function createMountContainer(donateBtn) {
  const container = document.createElement("div");
  container.id = APP_CONTAINER_ID;
  Object.assign(container.style, {
    position: "relative",
    marginLeft: "3px",
    marginRight: "6px",
    display: "inline-flex",
  });
  return container;
}

function mountApp() {
  if (menuMounted) {
    return;
  }

  const donateBtn = document.querySelector(BUTTON_SELECTOR);
  if (!donateBtn || !donateBtn.parentElement) {
    return;
  }

  Object.assign(donateBtn.parentElement.style, {
    display: "flex",
    alignItems: "center",
  });

  const container = createMountContainer(donateBtn);
  donateBtn.parentElement.insertBefore(container, donateBtn);
  App(container);
  menuMounted = true;
}

const pollTimer = setInterval(() => {
  if (menuMounted) {
    clearInterval(pollTimer);
    return;
  }
  mountApp();
}, 200);

function initializePreview() {
  if (previewInitialized || !isPreviewPage()) {
    return;
  }

  const startPreview = () => {
    initDirectImagePreview();
    previewInitialized = true;
  };

  if (document.readyState === "complete") {
    startPreview();
  } else {
    window.addEventListener("load", startPreview, { once: true });
  }

  setTimeout(() => {
    if (!previewInitialized && isPreviewPage()) {
      startPreview();
    }
  }, 1000);
}

function updateRoute(path) {
  if (path === currentPath) {
    return;
  }

  currentPath = path;
  previewInitialized = false;
  initializePreview();
}

function patchHistoryEvents() {
  const originalPush = history.pushState;
  const originalReplace = history.replaceState;

  history.pushState = function (...args) {
    const result = originalPush.apply(this, args);
    window.dispatchEvent(new Event("locationchange"));
    return result;
  };

  history.replaceState = function (...args) {
    const result = originalReplace.apply(this, args);
    window.dispatchEvent(new Event("locationchange"));
    return result;
  };

  window.addEventListener("popstate", () =>
    updateRoute(window.location.pathname),
  );
  window.addEventListener("locationchange", () =>
    updateRoute(window.location.pathname),
  );
}

patchHistoryEvents();
initializePreview();

const routeObserver = new MutationObserver(() => {
  if (window.location.pathname !== currentPath) {
    updateRoute(window.location.pathname);
  }
});

routeObserver.observe(document.body, {
  childList: true,
  subtree: true,
});
