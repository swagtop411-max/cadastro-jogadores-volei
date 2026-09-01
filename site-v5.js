import "./social-v6.js?v=20260901-2";
import "./social-v6-followfix.js?v=20260901-2";

const THEME_VERSION = "20260901-8";
const MENU_ID = "siteMenuDrawer";
const MENU_TRIGGER_ID = "siteMenuTrigger";

function ensureTheme() {
  let link = document.getElementById("siteThemeV5Runtime");
  if (!link) {
    link = document.createElement("link");
    link.id = "siteThemeV5Runtime";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  link.href = `site-theme.css?v=${THEME_VERSION}`;
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

function menuTemplate() {
  return `
    <div class="site-menu-overlay" data-fechar-menu></div>
    <aside class="site-menu-panel" role="dialog" aria-modal="true" aria-labelledby="siteMenuTitulo">
      <button class="site-menu-close" type="button" data-fechar-menu aria-label="Fechar menu">×</button>
      <div class="site-menu-brand">
        <span>REDE ESPORTIVA</span>
        <h2 id="siteMenuTitulo">MENU</h2>
        <p>Todas as áreas do Banco de Dados de Atletas em um só lugar.</p>
      </div>
      <nav class="site-menu-nav" data-v7-menu-nav>
        <a href="index.html#feed">🏠 <span>INÍCIO / FEED</span></a>
        <a href="explorar.html">⌕ <span>EXPLORAR</span></a>
        <a href="atletas.html">🏐 <span>TODOS OS ATLETAS</span></a>
        <button type="button" data-v7-ranking>🏆 <span>RANKING DOS ATLETAS</span></button>
        <button type="button" data-v7-equipes>👥 <span>EQUIPES CADASTRADAS</span></button>
        <a href="proximos-campeonatos.html">🏆 <span>CAMPEONATOS</span></a>
        <a href="comunidade.html">💬 <span>COMUNIDADE</span></a>
        <a href="reels.html">▶ <span>REELS</span></a>
        <a href="salvos.html">▣ <span>SALVOS</span></a>
        <button type="button" data-v7-messages hidden>✉ <span>MENSAGENS</span><b class="v5-menu-badge" hidden>0</b></button>
        <button type="button" data-v7-notifications hidden>🔔 <span>NOTIFICAÇÕES</span><b class="v5-menu-badge" hidden>0</b></button>
        <a href="conta.html">◉ <span>MINHA CONTA</span></a>
        <a href="https://wa.me/5516988586327?text=Ol%C3%A1!%20Gostaria%20de%20mais%20informa%C3%A7%C3%B5es%20sobre%20o%20Banco%20de%20Dados%20de%20Atletas%20ou%20quero%20ser%20um%20apoiador." target="_blank" rel="noopener noreferrer">💬 <span>INFORMAÇÕES / APOIO</span></a>
        <a href="admin.html" data-v7-admin hidden>🔐 <span>PAINEL ADM</span></a>
      </nav>
      <div class="site-menu-register">
        <strong>Banco de Dados de Atletas</strong>
        <span>Publique, siga atletas, converse e acompanhe campeonatos em uma única rede esportiva.</span>
        <a href="conta.html?tab=register">CRIAR MINHA CONTA →</a>
      </div>
    </aside>`;
}

function ensureHeaderTrigger() {
  const header = document.querySelector(".header");
  if (!header) return null;

  let trigger = document.getElementById(MENU_TRIGGER_ID);
  if (!trigger) {
    trigger = document.createElement("button");
    trigger.id = MENU_TRIGGER_ID;
    trigger.className = "site-menu-trigger";
    trigger.type = "button";
    trigger.setAttribute("aria-controls", MENU_ID);
    trigger.setAttribute("aria-expanded", "false");
    trigger.innerHTML = "☰<span>MENU</span>";
    header.prepend(trigger);
  }

  trigger.onclick = event => {
    event.preventDefault();
    event.stopPropagation();
    window.toggleSiteMenu?.();
  };
  return trigger;
}

function ensureDrawer() {
  let drawer = document.getElementById(MENU_ID);
  if (!drawer) {
    drawer = document.createElement("div");
    drawer.id = MENU_ID;
    drawer.className = "site-menu-drawer";
    drawer.setAttribute("aria-hidden", "true");
    document.body.appendChild(drawer);
  }
  drawer.innerHTML = menuTemplate();
  drawer.setAttribute("aria-hidden", drawer.classList.contains("open") ? "false" : "true");
  return drawer;
}

function closeMainMenu() {
  const drawer = document.getElementById(MENU_ID);
  const trigger = document.getElementById(MENU_TRIGGER_ID);
  drawer?.classList.remove("open");
  drawer?.setAttribute("aria-hidden", "true");
  trigger?.setAttribute("aria-expanded", "false");
  document.documentElement.classList.remove("site-menu-open");
  document.body?.classList.remove("site-menu-open");
}

function openMainMenu() {
  const drawer = document.getElementById(MENU_ID);
  const trigger = document.getElementById(MENU_TRIGGER_ID);
  if (!drawer) return;
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  trigger?.setAttribute("aria-expanded", "true");
  document.documentElement.classList.add("site-menu-open");
  document.body?.classList.add("site-menu-open");
  requestAnimationFrame(() => drawer.querySelector(".site-menu-close")?.focus());
}

function installMenuBehavior() {
  ensureHeaderTrigger();
  const drawer = ensureDrawer();

  window.closeSiteMenu = closeMainMenu;
  window.toggleSiteMenu = () => drawer.classList.contains("open") ? closeMainMenu() : openMainMenu();

  drawer.addEventListener("click", event => {
    const close = event.target.closest?.("[data-fechar-menu]");
    if (close) {
      event.preventDefault();
      closeMainMenu();
      return;
    }

    const ranking = event.target.closest?.("[data-v7-ranking]");
    if (ranking) {
      event.preventDefault();
      closeMainMenu();
      if (typeof window.abrirRanking === "function") window.abrirRanking();
      else if (document.getElementById("btnAbrirRanking")) document.getElementById("btnAbrirRanking").click();
      else location.href = "index.html?abrir=ranking";
      return;
    }

    const equipes = event.target.closest?.("[data-v7-equipes]");
    if (equipes) {
      event.preventDefault();
      closeMainMenu();
      if (typeof window.abrirEquipes === "function") window.abrirEquipes();
      else if (document.getElementById("btnAbrirEquipes")) document.getElementById("btnAbrirEquipes").click();
      else location.href = "index.html#equipes";
      return;
    }

    const messages = event.target.closest?.("[data-v7-messages]");
    if (messages) {
      event.preventDefault();
      closeMainMenu();
      setTimeout(() => document.getElementById("snInboxButton")?.click(), 25);
      return;
    }

    const notifications = event.target.closest?.("[data-v7-notifications]");
    if (notifications) {
      event.preventDefault();
      closeMainMenu();
      setTimeout(() => document.getElementById("snNotificationsButton")?.click(), 25);
      return;
    }

    if (event.target.closest?.("a")) closeMainMenu();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && drawer.classList.contains("open")) closeMainMenu();
  });
}

function badgeCount(sourceId) {
  const source = document.getElementById(sourceId);
  if (!source || source.hidden) return 0;
  return Number(String(source.textContent || "0").replace(/\D/g, "")) || 0;
}

function syncMenuUtilities() {
  const drawer = document.getElementById(MENU_ID);
  if (!drawer) return;

  const messages = drawer.querySelector("[data-v7-messages]");
  const notifications = drawer.querySelector("[data-v7-notifications]");
  const admin = drawer.querySelector("[data-v7-admin]");
  const inboxSource = document.getElementById("snInboxButton");
  const notificationSource = document.getElementById("snNotificationsButton");
  const adminSource = document.getElementById("adminPanelCta");

  if (messages) {
    messages.hidden = !inboxSource;
    const count = badgeCount("snInboxBadge");
    const badge = messages.querySelector(".v5-menu-badge");
    if (badge) {
      badge.hidden = count < 1;
      badge.textContent = count > 99 ? "99+" : String(count);
    }
  }

  if (notifications) {
    notifications.hidden = !notificationSource;
    const count = badgeCount("snNotificationsBadge");
    const badge = notifications.querySelector(".v5-menu-badge");
    if (badge) {
      badge.hidden = count < 1;
      badge.textContent = count > 99 ? "99+" : String(count);
    }
  }

  if (admin) admin.hidden = !adminSource || adminSource.hidden;
}

function relocateSupporters() {
  if (!/index\.html$|\/$/i.test(location.pathname)) return;
  if (document.querySelector(".site-supporters-strip")) return;

  const oldSidebar = document.querySelector(".sponsors-sidebar");
  const list = oldSidebar?.querySelector("#apoiadoresLista");
  if (!oldSidebar || !list) return;

  const strip = document.createElement("section");
  strip.className = "site-supporters-strip";
  strip.setAttribute("aria-label", "Apoiadores do projeto");

  const title = oldSidebar.querySelector(".sponsors-title");
  const cta = oldSidebar.querySelector(".apoio-cta");
  if (title) strip.appendChild(title);
  strip.appendChild(list);
  if (cta) strip.appendChild(cta);

  const home = document.querySelector(".home-social");
  if (home) home.insertAdjacentElement("afterend", strip);
  else document.querySelector("main")?.prepend(strip);
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
  installMenuBehavior();
  enhanceMedia();
  relocateSupporters();
  installProfileArchiveButton();
  syncMenuUtilities();
  import("./direct-v5.js?v=20260901-2").catch(error => console.warn("Direct V5:", error));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", runEnhancements, { once: true });
} else {
  runEnhancements();
}

let utilityTimer = 0;
const observer = new MutationObserver(mutations => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node instanceof HTMLImageElement) sharpenImage(node);
      if (node instanceof Element) enhanceMedia(node);
    }
  }
  clearTimeout(utilityTimer);
  utilityTimer = setTimeout(() => {
    syncMenuUtilities();
    installProfileArchiveButton();
    relocateSupporters();
  }, 35);
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["hidden"]
});

window.addEventListener("sn:story-deleted", () => setTimeout(installProfileArchiveButton, 50));
