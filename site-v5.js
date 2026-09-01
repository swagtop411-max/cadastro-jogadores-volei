import "./social-v6.js?v=20260901-1";

const THEME_VERSION = "20260901-7";

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

function addMenuLink(container, href, icon, label, marker, options = {}) {
  if (!container) return null;
  let link = container.querySelector(`[data-v5-link="${marker}"]`);
  if (!link) {
    link = document.createElement("a");
    link.dataset.v5Link = marker;
    container.appendChild(link);
  }

  const html = `<span aria-hidden="true">${icon}</span><span>${label}</span>`;
  if (link.getAttribute("href") !== href) link.setAttribute("href", href);
  if (link.innerHTML !== html) link.innerHTML = html;
  if (options.target && link.target !== options.target) link.target = options.target;
  if (options.rel && link.rel !== options.rel) link.rel = options.rel;
  return link;
}

function closeMainMenu() {
  if (typeof window.closeSiteMenu === "function") window.closeSiteMenu();
  else {
    document.getElementById("siteMenuDrawer")?.classList.remove("open");
    document.documentElement.classList.remove("site-menu-open");
    document.body?.classList.remove("site-menu-open");
  }
}

function addMenuAction(container, marker, icon, label, sourceId, badgeId) {
  if (!container) return null;
  let button = container.querySelector(`[data-v5-action="${marker}"]`);
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.dataset.v5Action = marker;
    button.innerHTML = `<span aria-hidden="true">${icon}</span><span>${label}</span><b class="v5-menu-badge" hidden>0</b>`;
    button.addEventListener("click", () => {
      closeMainMenu();
      setTimeout(() => document.getElementById(sourceId)?.click(), 30);
    });
    container.appendChild(button);
  }

  const source = document.getElementById(sourceId);
  const sourceBadge = badgeId ? document.getElementById(badgeId) : null;
  const badge = button.querySelector(".v5-menu-badge");
  const count = Number(String(sourceBadge?.textContent || "0").replace(/\D/g, "")) || 0;
  const badgeHidden = !count || sourceBadge?.hidden === true;

  if (badge) {
    if (badge.hidden !== badgeHidden) badge.hidden = badgeHidden;
    const labelValue = count > 99 ? "99+" : String(count);
    if (badge.textContent !== labelValue) badge.textContent = labelValue;
  }
  const buttonHidden = !source;
  if (button.hidden !== buttonHidden) button.hidden = buttonHidden;
  return button;
}

function installPrimaryMenuActions() {
  document.querySelectorAll(".site-menu-nav").forEach(nav => {
    addMenuLink(nav, "explorar.html", "⌕", "EXPLORAR", "explorar");
    addMenuLink(nav, "reels.html", "▶", "REELS", "reels");
    addMenuLink(nav, "salvos.html", "▣", "SALVOS", "salvos");

    const support = document.querySelector(".whatsapp-top-cta");
    if (support?.href) {
      addMenuLink(nav, support.href, "💬", "INFORMAÇÕES / APOIO", "apoio-info", {
        target: "_blank",
        rel: "noopener noreferrer"
      });
    }

    addMenuAction(nav, "mensagens", "✉", "MENSAGENS", "snInboxButton", "snInboxBadge");
    addMenuAction(nav, "notificacoes", "🔔", "NOTIFICAÇÕES", "snNotificationsButton", "snNotificationsBadge");

    const adminSource = document.getElementById("adminPanelCta");
    let adminLink = nav.querySelector('[data-v5-link="admin"]');
    if (adminSource) {
      adminLink = addMenuLink(nav, adminSource.href || "admin.html", "🔐", "PAINEL ADM", "admin");
      if (adminLink.hidden !== adminSource.hidden) adminLink.hidden = adminSource.hidden;
    } else if (adminLink && adminLink.hidden !== true) {
      adminLink.hidden = true;
    }
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
  "flex","width","min-width","max-width","margin-left","white-space","font-size","line-height","text-overflow",
  "letter-spacing","text-align"
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
      return;
    }

    important(header, "display", "flex");
    important(header, "flex-wrap", "nowrap");
    important(header, "align-items", "center");
    important(header, "justify-content", "flex-start");
    important(header, "min-height", "58px");
    important(header, "height", "58px");
    important(header, "padding", "7px 12px");
    important(header, "gap", "10px");
    important(header, "overflow", "hidden");

    if (center) important(center, "display", "none");
    if (actions) important(actions, "display", "none");

    if (trigger) {
      important(trigger, "display", "inline-flex");
      important(trigger, "align-items", "center");
      important(trigger, "justify-content", "center");
      important(trigger, "flex", "0 0 42px");
      important(trigger, "width", "42px");
      important(trigger, "min-width", "42px");
      important(trigger, "height", "40px");
      important(trigger, "padding", "0");
    }
    if (triggerLabel) important(triggerLabel, "display", "none");

    if (brand) {
      important(brand, "display", "flex");
      important(brand, "align-items", "center");
      important(brand, "justify-content", "flex-start");
      important(brand, "flex", "1 1 auto");
      important(brand, "min-width", "0");
      important(brand, "max-width", "none");
      important(brand, "overflow", "hidden");
    }
    if (brandBall) important(brandBall, "display", "none");
    if (brandSubtitle) important(brandSubtitle, "display", "none");
    if (brandTitle) {
      important(brandTitle, "display", "block");
      important(brandTitle, "font-size", "12px");
      important(brandTitle, "line-height", "1");
      important(brandTitle, "letter-spacing", ".35px");
      important(brandTitle, "white-space", "nowrap");
      important(brandTitle, "overflow", "hidden");
      important(brandTitle, "text-overflow", "ellipsis");
    }
  });
}

function runEnhancements() {
  ensureTheme();
  enhanceMedia();
  installPrimaryMenuActions();
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
  installPrimaryMenuActions();
  installProfileArchiveButton();
  installMobileHeader();
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["hidden"]
});

window.addEventListener("sn:story-deleted", () => setTimeout(installProfileArchiveButton, 50));
