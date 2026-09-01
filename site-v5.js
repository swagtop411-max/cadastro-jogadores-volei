const THEME_VERSION = "20260901-5";

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

function runEnhancements() {
  ensureTheme();
  enhanceMedia();
  installDiscoveryLinks();
  installProfileArchiveButton();
  import("./direct-v5.js?v=20260901-1").catch(error => console.warn("Direct V5:", error));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", runEnhancements, { once: true });
} else {
  runEnhancements();
}

const observer = new MutationObserver(mutations => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node instanceof HTMLImageElement) sharpenImage(node);
      if (node instanceof Element) enhanceMedia(node);
    }
  }
  installDiscoveryLinks();
  installProfileArchiveButton();
});

observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("sn:story-deleted", () => setTimeout(installProfileArchiveButton, 50));
