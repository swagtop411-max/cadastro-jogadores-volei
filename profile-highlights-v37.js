import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { collection, getDocs, getFirestore, limit, query, where } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { storyImageUrl } from "./media-utils.js?v=20260909-46";
import { openStoryViewer } from "./social-network.js?v=20260909-46";

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
  const db = getFirestore(app);
  const uid = new URLSearchParams(location.search).get("uid") || "";
  const ms = value => value?.toMillis?.() ?? (value?.seconds ? Number(value.seconds) * 1000 : new Date(value || 0).getTime() || 0);
  const esc = value => {
    const el = document.createElement("div");
    el.textContent = value == null ? "" : String(value);
    return el.innerHTML;
  };
  let refreshTimer = 0;

  function installStyles() {
    if (document.getElementById("profileHighlightsV37Styles")) return;
    const style = document.createElement("style");
    style.id = "profileHighlightsV37Styles";
    style.textContent = `
      .pp-tabs [data-tab="stories"],.pp-tabs [data-tab="archive"],#profileStoriesArchiveButton{display:none!important}
      #storyList,#storyArchiveList{display:none!important}
      .pp-tabs{justify-content:flex-start!important}.pp-tabs .pp-tab[data-tab="posts"]{display:inline-flex!important}
      .profile-highlights-v37{margin-top:16px;padding:16px 18px;border:1px solid rgba(244,200,77,.22);border-radius:20px;background:#07100d;color:#fff;overflow:hidden}
      .profile-highlights-v37.embedded{margin:10px 0 0;padding:0;border:0;border-radius:0;background:transparent;box-shadow:none}
      .profile-highlights-v37.embedded .profile-highlights-v37-head{display:none}
      .profile-highlights-v37-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
      .profile-highlights-v37-head strong{font:900 12px/1 Montserrat,Arial,sans-serif;letter-spacing:.6px;color:#fff}
      .profile-highlights-v37-head span{font:700 8px/1 Montserrat,Arial,sans-serif;color:#7f929f}
      .profile-highlights-v37-list{display:flex;gap:13px;overflow-x:auto;padding:3px 1px 6px;scrollbar-width:none}
      .profile-highlights-v37-list::-webkit-scrollbar{display:none}
      .profile-highlight-v37{flex:0 0 76px;width:76px;border:0;background:transparent;padding:0;color:#fff;cursor:pointer;text-align:center}
      .profile-highlight-v37-media{display:block;width:70px;height:70px;margin:0 auto 7px;border-radius:50%;padding:3px;background:linear-gradient(135deg,#f4c84d,#d99c2e);box-sizing:border-box;box-shadow:0 6px 18px rgba(0,0,0,.25)}
      .profile-highlight-v37-media>img,.profile-highlight-v37-media>video{display:block;width:100%;height:100%;border-radius:50%;object-fit:cover;background:#031424;border:3px solid #07100d;box-sizing:border-box}
      .profile-highlight-v37 small{display:block;max-width:76px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#d7e1e7;font:700 8px/1.25 Montserrat,Arial,sans-serif}
      .profile-highlights-v37-empty{padding:6px 0 2px;color:#83939f;font:700 9px/1.45 Montserrat,Arial,sans-serif}
      @media(max-width:720px){.profile-highlights-v37:not(.embedded){margin:14px 10px 0;padding:14px 12px}.profile-highlight-v37{flex-basis:72px;width:72px}.profile-highlight-v37-media{width:66px;height:66px}}
    `;
    document.head.appendChild(style);
  }

  function enforcePublicationsOnly() {
    document.querySelectorAll('.pp-tabs [data-tab="stories"],.pp-tabs [data-tab="archive"],#profileStoriesArchiveButton').forEach(el => el.remove());
    document.getElementById("storyList")?.setAttribute("hidden", "");
    document.getElementById("storyArchiveList")?.setAttribute("hidden", "");
    const gallery = document.getElementById("gallery");
    if (gallery) gallery.hidden = false;
    const postTab = document.querySelector('.pp-tab[data-tab="posts"]');
    if (postTab) postTab.classList.add("active");
  }

  function findExistingHighlightsHost() {
    const direct = document.querySelector("#profileHighlights,.profile-highlights,[data-profile-highlights],.beta-profile-highlights");
    if (direct) return direct;
    const candidates = [...document.querySelectorAll("section,article,div")];
    for (const el of candidates) {
      if (el.id === "profileHighlightsV37") continue;
      const ownText = [...el.childNodes]
        .slice(0, 6)
        .map(node => node.textContent || "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
      if (ownText.startsWith("DESTAQUES") || /(^|\s)DESTAQUES($|\s)/.test(ownText.slice(0, 100))) return el;
    }
    return null;
  }

  function ensureHighlightsShell() {
    let shell = document.getElementById("profileHighlightsV37");
    if (shell) return shell;

    const existing = findExistingHighlightsHost();
    if (existing) {
      shell = document.createElement("div");
      shell.id = "profileHighlightsV37";
      shell.className = "profile-highlights-v37 embedded";
      shell.innerHTML = '<div class="profile-highlights-v37-head"><strong>STORIES ARQUIVADOS</strong><span>após 24h</span></div><div id="profileHighlightsV37List" class="profile-highlights-v37-list"></div>';
      existing.appendChild(shell);
      return shell;
    }

    shell = document.createElement("section");
    shell.id = "profileHighlightsV37";
    shell.className = "profile-highlights-v37";
    shell.innerHTML = '<div class="profile-highlights-v37-head"><strong>DESTAQUES</strong><span>Stories após 24h</span></div><div id="profileHighlightsV37List" class="profile-highlights-v37-list"></div>';
    const publicationsSection = document.querySelector(".pp-section");
    const profile = document.querySelector(".pp-profile");
    if (publicationsSection?.parentElement) publicationsSection.parentElement.insertBefore(shell, publicationsSection);
    else profile?.after(shell);
    return shell;
  }

  async function getStories() {
    if (!uid) return [];
    try {
      let snap;
      try {
        snap = await getDocs(query(collection(db, "stories"), where("ownerUid", "==", uid), where("aprovado", "==", true), limit(150)));
      } catch {
        snap = await getDocs(query(collection(db, "stories"), where("ownerUid", "==", uid), limit(150)));
      }
      return snap.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
        .filter(item => item.aprovado !== false && String(item.status || "publicado").toLowerCase() !== "excluido")
        .sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm));
    } catch (error) {
      console.warn("Destaques V37:", error);
      return [];
    }
  }

  function highlightMarkup(story, index) {
    const raw = story.mediaUrl || "";
    const isVideo = String(story.mediaType || story.tipo || "").startsWith("video");
    const media = isVideo
      ? `<video src="${esc(raw)}" muted playsinline preload="metadata"></video>`
      : `<img src="${esc(storyImageUrl(raw))}" alt="Story arquivado" loading="lazy" decoding="async">`;
    const dateMs = ms(story.expiraEm) || ms(story.criadoEm);
    const label = dateMs ? new Date(dateMs).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "Destaque";
    return `<button type="button" class="profile-highlight-v37" data-highlight-index="${index}" aria-label="Abrir Story arquivado de ${label}"><span class="profile-highlight-v37-media">${media}</span><small>${esc(label)}</small></button>`;
  }

  async function renderHighlights() {
    enforcePublicationsOnly();
    const shell = ensureHighlightsShell();
    const list = shell?.querySelector("#profileHighlightsV37List");
    if (!list) return;

    const all = await getStories();
    const now = Date.now();
    const expired = all.filter(item => {
      const expires = ms(item.expiraEm);
      return expires > 0 && expires <= now;
    });

    list.innerHTML = expired.length
      ? expired.map(highlightMarkup).join("")
      : '<div class="profile-highlights-v37-empty">Os Stories aparecem aqui automaticamente depois de 24 horas.</div>';

    list.querySelectorAll("[data-highlight-index]").forEach(button => {
      button.onclick = () => openStoryViewer(expired, Number(button.dataset.highlightIndex) || 0);
    });

    clearTimeout(refreshTimer);
    const nextExpiry = all
      .map(item => ms(item.expiraEm))
      .filter(value => value > now)
      .sort((a, b) => a - b)[0];
    if (nextExpiry) {
      refreshTimer = setTimeout(renderHighlights, Math.min(Math.max(nextExpiry - now + 1500, 2000), 60 * 60 * 1000));
    }
  }

  installStyles();
  enforcePublicationsOnly();

  const observer = new MutationObserver(() => {
    enforcePublicationsOnly();
    ensureHighlightsShell();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener("sn:story-deleted", () => setTimeout(renderHighlights, 120));
  setTimeout(renderHighlights, 120);
  setTimeout(renderHighlights, 700);
  setTimeout(renderHighlights, 1600);
}
