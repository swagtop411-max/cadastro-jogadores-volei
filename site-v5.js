const THEME_VERSION = "20260901-6";

function ensureTheme() {
  if (document.getElementById("siteThemeV5Runtime")) return;
  const link = document.createElement("link");
  link.id = "siteThemeV5Runtime";
  link.rel = "stylesheet";
  link.href = `site-theme.css?v=${THEME_VERSION}`;
  document.head.appendChild(link);
  document.documentElement.classList.add("site-v5");
  document.body?.classList.add("site-v5");
}

function sharpenImage(img) {
  if (!(img instanceof HTMLImageElement) || img.dataset.v5Quality === "1") return;
  img.dataset.v5Quality = "1";
  img.decoding = "async";
  img.style.imageRendering = "auto";

  const apply = () => {
    const parent = img.parentElement;
    if (!parent || !img.naturalWidth) return;
    const available = parent.clientWidth || img.clientWidth || 0;
    if (!available) return;

    // Não ampliar fotos além da resolução nativa. O arquivo original continua
    // sendo entregue pelo Cloudinary, evitando a perda causada por upscale visual.
    if (img.naturalWidth < available && img.matches(
      ".social-media-frame img,.sn-story-media,.pp-content-media img,.pp-archive-item img,.pp-story,.community-media img,.explore-item img,.saved-item img"
    )) {
      img.style.width = `${img.naturalWidth}px`;
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      img.style.marginInline = "auto";
    }
  };

  if (img.complete) apply();
  else img.addEventListener("load", apply, { once: true });
}

function enhanceMedia(root = document) {
  root.querySelectorAll?.("img").forEach(sharpenImage);
}

function addMenuLink(container, href, icon, label, marker) {
  if (!container || container.querySelector(`[data-v5-link="${marker}"]`)) return;
  const a = document.createElement("a");
  a.href = href;
  a.dataset.v5Link = marker;
  a.innerHTML = `<span aria-hidden="true">${icon}</span><span>${label}</span>`;
  container.appendChild(a);
}

function installDiscoveryLinks() {
  document.querySelectorAll(".site-menu-nav,.pp-nav").forEach(nav => {
    addMenuLink(nav, "explorar.html", "⌕", "EXPLORAR", "explorar");
    addMenuLink(nav, "reels.html", "▶", "REELS", "reels");
    addMenuLink(nav, "salvos.html", "▣", "SALVOS", "salvos");
  });
}

function openStoryArchive() {
  const tab = document.querySelector('.pp-tab[data-tab="archive"]');
  if (tab) {
    tab.click();
    tab.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  const section = document.getElementById("storyArchiveList");
  section?.removeAttribute("hidden");
  section?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function installProfileArchiveButton() {
  if (!/perfil-social\.html$/i.test(location.pathname.split("?")[0])) return;
  const actions = document.getElementById("actions");
  if (!actions || actions.querySelector("#profileStoriesArchiveButton")) return;
  const button = document.createElement("button");
  button.id = "profileStoriesArchiveButton";
  button.type = "button";
  button.className = "pp-btn v5-stories-button";
  button.textContent = "▣ STORIES POSTADOS";
  button.addEventListener("click", openStoryArchive);
  actions.appendChild(button);
}

const MOBILE_HEADER_PROPERTIES = [
  "display","flex-wrap","align-items","justify-content","min-height","height","padding","gap","overflow",
  "flex","width","min-width","max-width","margin-left","overflow-x","overflow-y","white-space","font-size",
  "line-height","text-overflow","-webkit-overflow-scrolling"
];

function clearMobileHeaderStyles(element) {
  if (!element) return;
  MOBILE_HEADER_PROPERTIES.forEach(prop => element.style.removeProperty(prop));
}

function important(element, property, value) {
  element?.style.setProperty(property, value, "important");
}

function installMobileHeader() {
  const mobile = window.matchMedia("(max-width: 720px)").matches;

  document.querySelectorAll(".header").forEach(header => {
    const trigger = header.querySelector(".site-menu-trigger");
    const triggerLabel = trigger?.querySelector("span");
    const brand = header.querySelector(".header-brand,.brand");
    const brandBall = brand?.querySelector(".brand-ball");
    const brandTitle = brand?.querySelector("strong");
    const brandSubtitle = brand?.querySelector("span");
    const center = header.querySelector(".header-center");
    const actions = header.querySelector(".header-actions,.nav");

    if (!mobile) {
      [header, trigger, triggerLabel, brand, brandBall, brandTitle, brandSubtitle, center, actions]
        .forEach(clearMobileHeaderStyles);
      actions?.querySelectorAll(":scope > *").forEach(clearMobileHeaderStyles);
      return;
    }

    // Cabeçalho sempre em uma única linha no celular. Isto prevalece até
    // sobre regras legadas com flex-wrap!important existentes no index.html.
    important(header, "display", "flex");
    important(header, "flex-wrap", "nowrap");
    important(header, "align-items", "center");
    important(header, "justify-content", "flex-start");
    important(header, "min-height", "60px");
    important(header, "height", "60px");
    important(header, "padding", "7px 8px");
    important(header, "gap", "7px");
    important(header, "overflow", "hidden");

    if (center) important(center, "display", "none");

    if (trigger) {
      important(trigger, "display", "inline-flex");
      important(trigger, "align-items", "center");
      important(trigger, "justify-content", "center");
      important(trigger, "flex", "0 0 44px");
      important(trigger, "width", "44px");
      important(trigger, "min-width", "44px");
      important(trigger, "height", "40px");
      important(trigger, "padding", "0");
    }
    if (triggerLabel) important(triggerLabel, "display", "none");

    if (brand) {
      important(brand, "flex", "0 1 174px");
      important(brand, "min-width", "0");
      important(brand, "max-width", "36vw");
      important(brand, "overflow", "hidden");
    }
    if (brandBall) {
      important(brandBall, "flex", "0 0 34px");
      important(brandBall, "width", "34px");
      important(brandBall, "min-width", "34px");
      important(brandBall, "height", "34px");
    }
    if (brandTitle) {
      important(brandTitle, "font-size", "9px");
      important(brandTitle, "line-height", "1.05");
      important(brandTitle, "white-space", "nowrap");
      important(brandTitle, "overflow", "hidden");
      important(brandTitle, "text-overflow", "ellipsis");
    }
    if (brandSubtitle) important(brandSubtitle, "display", "none");

    if (actions) {
      important(actions, "display", "flex");
      important(actions, "align-items", "center");
      important(actions, "justify-content", "flex-start");
      important(actions, "flex", "1 1 auto");
      important(actions, "flex-wrap", "nowrap");
      important(actions, "min-width", "0");
      important(actions, "max-width", "none");
      important(actions, "height", "42px");
      important(actions, "margin-left", "0");
      important(actions, "gap", "5px");
      important(actions, "overflow-x", "auto");
      important(actions, "overflow-y", "hidden");
      important(actions, "-webkit-overflow-scrolling", "touch");

      actions.querySelectorAll(":scope > *").forEach(action => {
        important(action, "flex", "0 0 auto");
        important(action, "width", "auto");
        important(action, "min-width", "36px");
        important(action, "max-width", "none");
        important(action, "min-height", "36px");
        important(action, "height", "36px");
        important(action, "padding", action.classList.contains("sn-header-btn") ? "0" : "0 9px");
        important(action, "font-size", "7px");
        important(action, "white-space", "nowrap");
      });
    }
  });
}

function runEnhancements() {
  ensureTheme();
  enhanceMedia();
  installDiscoveryLinks();
  installProfileArchiveButton();
  installMobileHeader();
  import("./direct-v5.js?v=20260901-1").catch(error => console.warn("Direct V5:", error));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", runEnhancements, { once: true });
} else {
  runEnhancements();
}

let mobileHeaderTimer = 0;
window.addEventListener("resize", () => {
  clearTimeout(mobileHeaderTimer);
  mobileHeaderTimer = setTimeout(installMobileHeader, 80);
}, { passive: true });

const observer = new MutationObserver(mutations => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node instanceof HTMLImageElement) sharpenImage(node);
      if (node instanceof Element) enhanceMedia(node);
    }
  }
  installDiscoveryLinks();
  installProfileArchiveButton();
  installMobileHeader();
});

observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("sn:story-deleted", () => setTimeout(installProfileArchiveButton, 50));
