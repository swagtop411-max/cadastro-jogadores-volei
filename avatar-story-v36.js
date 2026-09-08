import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { doc, getDoc, getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

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
const uid = new URLSearchParams(location.search).get("uid");
const avatar = document.getElementById("avatar");
const storyList = document.getElementById("storyList");
const storyCount = document.getElementById("stories");

if (avatar && uid) {
  let fullPhotoUrl = avatar.currentSrc || avatar.src || "";

  const style = document.createElement("style");
  style.id = "avatarStoryV36Styles";
  style.textContent = `
    #avatar{cursor:pointer;transition:transform .16s ease,box-shadow .2s ease}
    #avatar:active{transform:scale(.985)}
    #avatar.avatar-story-active{box-shadow:0 0 0 4px #fff,0 0 0 8px #f0a33a!important}
    .avatar-photo-viewer{position:fixed;inset:0;z-index:70000;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.96);padding:18px}
    .avatar-photo-viewer.open{display:flex}
    .avatar-photo-viewer img{display:block;max-width:min(94vw,760px);max-height:90vh;width:auto;height:auto;object-fit:contain;border-radius:16px;box-shadow:0 24px 80px rgba(0,0,0,.45)}
    .avatar-photo-viewer button{position:absolute;right:18px;top:max(18px,env(safe-area-inset-top));width:44px;height:44px;border:0;border-radius:50%;background:rgba(255,255,255,.14);color:#fff;font-size:30px;line-height:1;cursor:pointer}
  `;
  document.head.appendChild(style);

  document.body.insertAdjacentHTML("beforeend", `
    <div id="avatarPhotoViewer" class="avatar-photo-viewer" role="dialog" aria-modal="true" aria-label="Foto do perfil">
      <button id="closeAvatarPhotoViewer" type="button" aria-label="Fechar">×</button>
      <img id="avatarPhotoFull" alt="Foto do perfil do atleta">
    </div>
  `);

  const viewer = document.getElementById("avatarPhotoViewer");
  const fullImage = document.getElementById("avatarPhotoFull");
  const closeButton = document.getElementById("closeAvatarPhotoViewer");

  function firstActiveStory() {
    return storyList?.querySelector("[data-story-index]") || null;
  }

  function updateAvatarState() {
    const hasStory = Boolean(firstActiveStory());
    avatar.classList.toggle("avatar-story-active", hasStory);
    avatar.setAttribute(
      "aria-label",
      hasStory ? "Abrir stories deste atleta" : "Ampliar foto do perfil"
    );
    avatar.title = hasStory ? "Ver stories" : "Ver foto do perfil";
  }

  function openProfilePhoto() {
    if (!viewer || !fullImage) return;
    fullImage.src = fullPhotoUrl || avatar.currentSrc || avatar.src;
    viewer.classList.add("open");
    document.documentElement.style.overflow = "hidden";
  }

  function closeProfilePhoto() {
    if (!viewer) return;
    viewer.classList.remove("open");
    document.documentElement.style.overflow = "";
  }

  avatar.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const firstStory = firstActiveStory();
    if (firstStory) {
      firstStory.click();
      return;
    }
    openProfilePhoto();
  }, true);

  closeButton?.addEventListener("click", closeProfilePhoto);
  viewer?.addEventListener("click", event => {
    if (event.target === viewer) closeProfilePhoto();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && viewer?.classList.contains("open")) closeProfilePhoto();
  });

  if (storyList) {
    new MutationObserver(updateAvatarState).observe(storyList, {
      childList: true,
      subtree: true
    });
  }
  if (storyCount) {
    new MutationObserver(updateAvatarState).observe(storyCount, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  getDoc(doc(db, "perfis", uid)).then(snap => {
    if (!snap.exists()) return;
    const data = snap.data() || {};
    fullPhotoUrl = data.fotoUrl || data.foto || fullPhotoUrl;
  }).catch(() => {});

  updateAvatarState();
  setTimeout(updateAvatarState, 400);
  setTimeout(updateAvatarState, 1200);
}

import("./profile-highlights-v37.js?v=20260908-37").catch(error => console.warn("Destaques V37:", error));
