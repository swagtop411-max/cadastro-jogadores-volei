await import("./firebase-app-check-v11.js?v=20260904-2");
import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { collection, doc, getDoc, getDocs, getFirestore, limit, query, where } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { storyImageUrl } from "./media-utils.js?v=20260904-2";
import { openStoryViewer } from "./social-network.js?v=20260909-45";

const PAGE = location.pathname.split("/").pop() || "";
if (PAGE === "perfil-social.html") {
  const cfg = {
    apiKey: "AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",
    authDomain: "jogadores-de-volei.firebaseapp.com",
    projectId: "jogadores-de-volei",
    storageBucket: "jogadores-de-volei.firebasestorage.app",
    messagingSenderId: "48728914064",
    appId: "1:48728914064:web:1dd7aeb705319886f74015"
  };
  const app = getApps().length ? getApp() : initializeApp(cfg);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const uid = new URLSearchParams(location.search).get("uid") || "";
  const avatar = document.getElementById("avatar");
  let activeStories = [];
  let allReadableStories = [];
  let refreshTimer = 0;
  let parentCaptureBound = false;

  const ms = value => value?.toMillis?.() ?? (value?.seconds ? Number(value.seconds) * 1000 : new Date(value || 0).getTime() || 0);
  const esc = value => {
    const el = document.createElement("div");
    el.textContent = value == null ? "" : String(value);
    return el.innerHTML;
  };

  function expiryMs(story) {
    const explicit = ms(story?.expiraEm);
    if (explicit > 0) return explicit;
    const created = ms(story?.criadoEm);
    return created > 0 ? created + 24 * 60 * 60 * 1000 : 0;
  }

  function installStyles() {
    if (document.getElementById("profileStoryAccessV45Styles")) return;
    const style = document.createElement("style");
    style.id = "profileStoryAccessV45Styles";
    style.textContent = `
      .pp-tabs [data-tab="stories"],.pp-tabs [data-tab="archive"],#profileStoriesArchiveButton{display:none!important}
      #storyList,#storyArchiveList{display:none!important}
      .pp-tabs{justify-content:flex-start!important}
      .pp-tabs .pp-tab[data-tab="posts"]{display:inline-flex!important}
      .profile-highlights-v45{margin-top:16px;padding:16px 18px;border:1px solid rgba(244,200,77,.22);border-radius:20px;background:#07100d;color:#fff;overflow:hidden}
      .profile-highlights-v45.embedded{margin:10px 0 0;padding:0;border:0;border-radius:0;background:transparent}
      .profile-highlights-v45.embedded .profile-highlights-v45-head{display:none}
      .profile-highlights-v45-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
      .profile-highlights-v45-head strong{font:900 12px/1 Montserrat,Arial,sans-serif;letter-spacing:.6px;color:#fff}
      .profile-highlights-v45-head span{font:700 8px/1 Montserrat,Arial,sans-serif;color:#7f929f}
      .profile-highlights-v45-list{display:flex;gap:13px;overflow-x:auto;padding:3px 1px 6px;scrollbar-width:none}
      .profile-highlights-v45-list::-webkit-scrollbar{display:none}
      .profile-highlight-v45{flex:0 0 76px;width:76px;border:0;background:transparent;padding:0;color:#fff;cursor:pointer;text-align:center}
      .profile-highlight-v45-media{display:block;width:70px;height:70px;margin:0 auto 7px;border-radius:50%;padding:3px;background:linear-gradient(135deg,#f4c84d,#d99c2e);box-sizing:border-box}
      .profile-highlight-v45-media>img,.profile-highlight-v45-media>video{display:block;width:100%;height:100%;border-radius:50%;object-fit:cover;background:#031424;border:3px solid #07100d;box-sizing:border-box}
      .profile-highlight-v45 small{display:block;max-width:76px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#d7e1e7;font:700 8px/1.25 Montserrat,Arial,sans-serif}
      .profile-highlights-v45-empty{padding:6px 0 2px;color:#83939f;font:700 9px/1.45 Montserrat,Arial,sans-serif}
      @media(max-width:720px){.profile-highlights-v45:not(.embedded){margin:14px 10px 0;padding:14px 12px}.profile-highlight-v45{flex-basis:72px;width:72px}.profile-highlight-v45-media{width:66px;height:66px}}
    `;
    document.head.appendChild(style);
  }

  function enforcePublicationsOnly() {
    document.querySelectorAll('.pp-tabs [data-tab="stories"],.pp-tabs [data-tab="archive"],#profileStoriesArchiveButton').forEach(el => el.remove());
    document.getElementById("storyList")?.setAttribute("hidden", "");
    document.getElementById("storyArchiveList")?.setAttribute("hidden", "");
    const gallery = document.getElementById("gallery");
    if (gallery) gallery.hidden = false;
    document.querySelector('.pp-tab[data-tab="posts"]')?.classList.add("active");
  }

  async function canReadPrivateStories() {
    const user = auth.currentUser;
    if (!user || !uid) return false;
    if (user.uid === uid) return true;
    try {
      return (await getDoc(doc(db, "seguidores", uid, "usuarios", user.uid))).exists();
    } catch {
      return false;
    }
  }

  async function readStories() {
    if (!uid) return [];
    const privateAccess = await canReadPrivateStories();
    const constraints = [
      where("ownerUid", "==", uid),
      where("aprovado", "==", true)
    ];
    if (!privateAccess) constraints.push(where("visibilidade", "==", "publico"));
    try {
      const snap = await getDocs(query(collection(db, "stories"), ...constraints, limit(150)));
      return snap.docs
        .map(item => ({ id: item.id, ...item.data() }))
        .filter(item => String(item.status || "publicado").toLowerCase() !== "excluido")
        .sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm));
    } catch (error) {
      console.warn("Stories públicos V45:", error?.code || error);
      return [];
    }
  }

  function setAvatarState() {
    if (!avatar) return;
    if (activeStories.length) {
      avatar.style.setProperty("box-shadow", "0 0 0 4px #fff,0 0 0 8px #f0a33a", "important");
      avatar.style.cursor = "pointer";
      avatar.setAttribute("aria-label", "Abrir Stories deste atleta");
      avatar.title = "Ver Stories";
    } else {
      avatar.style.removeProperty("box-shadow");
    }
    const count = document.getElementById("stories");
    if (count) count.textContent = String(activeStories.length);
  }

  function bindAvatarCapture() {
    if (!avatar || parentCaptureBound) return;
    const parent = avatar.parentElement || document;
    parentCaptureBound = true;
    parent.addEventListener("click", event => {
      if (event.target !== avatar || !activeStories.length) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openStoryViewer(activeStories, 0);
    }, true);
  }

  function findExistingHighlightsHost() {
    const direct = document.querySelector("#profileHighlights,.profile-highlights,[data-profile-highlights],.beta-profile-highlights");
    if (direct) return direct;
    const candidates = [...document.querySelectorAll("section,article,div")];
    for (const el of candidates) {
      if (el.id === "profileHighlightsV45") continue;
      const ownText = [...el.childNodes].slice(0, 6).map(node => node.textContent || "").join(" ").replace(/\s+/g, " ").trim().toUpperCase();
      if (ownText.startsWith("DESTAQUES") || /(^|\s)DESTAQUES($|\s)/.test(ownText.slice(0, 100))) return el;
    }
    return null;
  }

  function ensureHighlightsShell() {
    let shell = document.getElementById("profileHighlightsV45");
    if (shell) return shell;
    document.getElementById("profileHighlightsV37")?.remove();
    const existing = findExistingHighlightsHost();
    shell = document.createElement(existing ? "div" : "section");
    shell.id = "profileHighlightsV45";
    shell.className = `profile-highlights-v45${existing ? " embedded" : ""}`;
    shell.innerHTML = '<div class="profile-highlights-v45-head"><strong>DESTAQUES</strong><span>Stories após 24h</span></div><div id="profileHighlightsV45List" class="profile-highlights-v45-list"></div>';
    if (existing) existing.appendChild(shell);
    else {
      const publications = document.querySelector(".pp-section");
      const profileSection = document.querySelector(".pp-profile");
      if (publications?.parentElement) publications.parentElement.insertBefore(shell, publications);
      else profileSection?.after(shell);
    }
    return shell;
  }

  function highlightMarkup(story, index) {
    const raw = story.mediaUrl || "";
    const isVideo = String(story.mediaType || story.tipo || "").startsWith("video");
    const media = isVideo
      ? `<video src="${esc(raw)}" muted playsinline preload="metadata"></video>`
      : `<img src="${esc(storyImageUrl(raw))}" alt="Story arquivado" loading="lazy" decoding="async">`;
    const when = expiryMs(story) || ms(story.criadoEm);
    const label = when ? new Date(when).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "Destaque";
    return `<button type="button" class="profile-highlight-v45" data-highlight-index="${index}" aria-label="Abrir Story arquivado de ${label}"><span class="profile-highlight-v45-media">${media}</span><small>${esc(label)}</small></button>`;
  }

  function renderHighlights() {
    const shell = ensureHighlightsShell();
    const list = shell?.querySelector("#profileHighlightsV45List");
    if (!list) return;
    const now = Date.now();
    const expired = allReadableStories.filter(item => {
      const expires = expiryMs(item);
      return expires > 0 && expires <= now;
    });
    list.innerHTML = expired.length
      ? expired.map(highlightMarkup).join("")
      : '<div class="profile-highlights-v45-empty">Os Stories aparecem aqui automaticamente depois de 24 horas.</div>';
    list.querySelectorAll("[data-highlight-index]").forEach(button => {
      button.addEventListener("click", () => openStoryViewer(expired, Number(button.dataset.highlightIndex) || 0));
    });
  }

  async function refresh() {
    enforcePublicationsOnly();
    allReadableStories = await readStories();
    const now = Date.now();
    activeStories = allReadableStories
      .filter(item => {
        const expires = expiryMs(item);
        return expires > now;
      })
      .sort((a, b) => ms(a.criadoEm) - ms(b.criadoEm));
    setAvatarState();
    bindAvatarCapture();
    renderHighlights();

    clearTimeout(refreshTimer);
    const nextExpiry = activeStories.map(expiryMs).filter(value => value > now).sort((a, b) => a - b)[0];
    if (nextExpiry) refreshTimer = setTimeout(refresh, Math.min(Math.max(nextExpiry - now + 1200, 2000), 60 * 60 * 1000));
  }

  installStyles();
  enforcePublicationsOnly();
  bindAvatarCapture();
  onAuthStateChanged(auth, () => void refresh());
  window.addEventListener("sn:story-deleted", () => setTimeout(refresh, 120));
  window.addEventListener("focus", () => void refresh());
  setTimeout(refresh, 120);
  setTimeout(refresh, 900);
}
