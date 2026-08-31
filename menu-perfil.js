import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { uploadCloudinary } from "./cloudinary-upload.js?v=20260831-1";

const cfg = {
  apiKey: "AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",
  authDomain: "jogadores-de-volei.firebaseapp.com",
  projectId: "jogadores-de-volei",
  storageBucket: "jogadores-de-volei.firebasestorage.app",
  messagingSenderId: "48728914064",
  appId: "1:48728914064:web:1dd7aeb705319886f74015",
};

const app = getApps().length ? getApp() : initializeApp(cfg);
const auth = getAuth(app);
const db = getFirestore(app);
let currentUser = null;
let socialPublishType = "feed";

const $ = (id) => document.getElementById(id);
const text = (value) => (value == null ? "" : String(value).trim());

function atualizarMinhaContaMenu() {
  document.querySelectorAll("[data-menu-account]").forEach((el) => {
    el.innerHTML = "◉ MINHA CONTA <span>›</span>";
    el.setAttribute("href", "conta.html");
    el.setAttribute("aria-label", "Abrir minha conta");
    delete el.dataset.loggedIn;
  });
}

function status(id, message, error = false) {
  const el = $(id);
  if (!el) return;
  el.textContent = message;
  el.className = "status" + (error ? " erro" : "");
}

function historyFromForm() {
  const rows = [...document.querySelectorAll("#campeonatosLista .campeonato-row")];
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const item = {
      campeonato: text(row.querySelector(".campeonato-nome")?.value),
      colocacao: text(row.querySelector(".campeonato-colocacao")?.value),
      ano: text(row.querySelector(".campeonato-ano")?.value),
    };
    if (!item.campeonato && !item.colocacao && !item.ano) continue;
    const key = `${item.campeonato}|${item.colocacao}|${item.ano}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out.slice(0, 30);
}

function planData(userData) {
  const id = document.querySelector('input[name="profilePlano"]:checked')?.value || "gratuito";
  const prices = { gratuito: 0, bronze: 9.9, prata: 19.9, ouro: 34.9, premium: 49.9 };
  const names = { gratuito: "Gratuito", bronze: "Bronze", prata: "Prata", ouro: "Ouro", premium: "Premium" };
  const same = id === text(userData?.planoId || "gratuito");
  const confirmed = id !== "gratuito" && same && userData?.pagamentoConfirmado === true;
  return {
    plano: names[id],
    planoId: id,
    valorPlano: prices[id],
    planoStatus: id === "gratuito" || confirmed ? "ativo" : "aguardando_pagamento",
    pagamentoConfirmado: confirmed,
  };
}

async function uploadFile(file, folder, maxBytes) {
  if (!file) return null;
  const isStory = folder === "stories";
  const isVideoFolder = folder === "videos";
  return uploadCloudinary(file, {
    maxBytes,
    allowImage: !isVideoFolder,
    allowVideo: isVideoFolder || isStory,
    tags: ["cadastro-de-atletas", folder],
  });
}

async function secureSaveProfile() {
  if (!currentUser) return;
  const button = $("saveProfile");
  if (!button) return;

  const nome = text($("name")?.value);
  const cidade = text($("city")?.value);
  const uf = text($("uf")?.value).toUpperCase();
  const categoria = text($("categoria")?.value) || "Iniciante";
  const historico = historyFromForm();

  if (nome.length < 2 || cidade.length < 2 || !uf) {
    status("profileStatus", "Preencha nome, cidade e estado.", true);
    return;
  }
  if (historico.some((x) => !x.campeonato || !x.colocacao || !x.ano)) {
    status("profileStatus", "Complete nome, colocação e ano de todos os campeonatos.", true);
    return;
  }

  button.disabled = true;
  status("profileStatus", "Salvando seu perfil...");

  try {
    const [pubSnap, userSnap] = await Promise.all([
      getDoc(doc(db, "perfis", currentUser.uid)),
      getDoc(doc(db, "usuarios", currentUser.uid)),
    ]);
    const oldPublic = pubSnap.exists() ? pubSnap.data() : {};
    const userData = userSnap.exists() ? userSnap.data() : {};
    const avatarFile = $("avatarInput")?.files?.[0];
    const coverFile = $("coverInput")?.files?.[0];

    const avatarUp = avatarFile ? await uploadFile(avatarFile, "perfil", 5 * 1024 * 1024) : null;
    const coverUp = coverFile ? await uploadFile(coverFile, "capa", 8 * 1024 * 1024) : null;

    const fotoUrl = avatarUp?.url || oldPublic.fotoUrl || "";
    const fotoPath = avatarUp?.path || oldPublic.fotoPath || "";
    const capaUrl = coverUp?.url || oldPublic.capaUrl || "";
    const capaPath = coverUp?.path || oldPublic.capaPath || "";
    const modalidade = text($("modalidade")?.value);
    const posicao = text($("posicao")?.value);
    const time = text($("time")?.value);
    const bio = text($("bio")?.value);
    const plan = planData(userData);

    const publicProfile = {
      uid: currentUser.uid,
      nome,
      cidade,
      uf,
      modalidade,
      posicao,
      categoria,
      time,
      bio,
      fotoUrl,
      fotoPath,
      capaUrl,
      capaPath,
      historicoCampeonatos: historico,
    };

    const privateProfile = {
      uid: currentUser.uid,
      nome,
      email: currentUser.email || userData.email || "",
      papel: userData.papel || "usuario",
      status: "ativo",
      nascimento: text($("birth")?.value),
      cidade,
      uf,
      modalidade,
      posicao,
      categoria,
      time,
      contato: text($("contato")?.value),
      bio,
      historicoCampeonatos: historico,
      fotoUrl,
      fotoPath,
      capaUrl,
      capaPath,
      armazenamentoMidia: "cloudinary",
      ...plan,
      atualizadoEm: serverTimestamp(),
    };

    if (!userSnap.exists()) privateProfile.criadoEm = serverTimestamp();
    if (userData.legadoAtletaId) privateProfile.legadoAtletaId = userData.legadoAtletaId;

    await setDoc(doc(db, "usuarios", currentUser.uid), privateProfile, { merge: true });
    await setDoc(doc(db, "perfis", currentUser.uid), publicProfile, { merge: false });

    const legacy = await getDocs(query(collection(db, "atletas"), where("ownerUid", "==", currentUser.uid)));
    if (!legacy.empty) {
      await updateDoc(legacy.docs[0].ref, {
        nome,
        cidade,
        uf,
        modalidade,
        posicao,
        categoria,
        time,
        historicoCampeonatos: historico,
        foto: fotoUrl,
        nascimento: deleteField(),
        ownerEmail: deleteField(),
        atualizadoEm: serverTimestamp(),
      });
    }

    if ($("avatar") && fotoUrl) $("avatar").src = fotoUrl;
    if ($("coverPreview") && capaUrl) $("coverPreview").style.backgroundImage = `url("${capaUrl.replace(/"/g, "%22")}")`;
    if ($("displayName")) $("displayName").textContent = nome;
    status("profileStatus", "Perfil salvo com segurança.");
  } catch (error) {
    console.error("Perfil Cloudinary:", error);
    status("profileStatus", error?.message || "Não foi possível salvar o perfil.", true);
  } finally {
    button.disabled = false;
  }
}

async function publishMedia(file, kind) {
  if (!currentUser || !file) return;
  const caption = text($("captionInput")?.value);
  status("mediaStatus", "Enviando mídia...");

  try {
    if (kind === "photo") {
      const up = await uploadFile(file, "publicacoes", 10 * 1024 * 1024);
      await addDoc(collection(db, "publicacoes"), {
        ownerUid: currentUser.uid,
        ownerEmail: currentUser.email || "",
        nome: text($("name")?.value) || currentUser.displayName || "Atleta",
        texto: caption,
        imagem: up.url,
        imagemUrl: up.url,
        imagemPath: up.path,
        imagemMime: up.mime,
        imagemTamanho: up.size,
        legenda: caption,
        tipo: "imagem",
        armazenamento: "cloudinary",
        aprovado: false,
        status: "pendente",
        criadoEm: serverTimestamp(),
      });
    } else if (kind === "video") {
      const up = await uploadFile(file, "videos", 45 * 1024 * 1024);
      await addDoc(collection(db, "videos"), {
        ownerUid: currentUser.uid,
        nome: text($("name")?.value) || currentUser.displayName || "Atleta",
        videoUrl: up.url,
        videoPath: up.path,
        videoMime: up.mime,
        videoTamanho: up.size,
        legenda: caption,
        armazenamento: "cloudinary",
        aprovado: false,
        status: "pendente",
        criadoEm: serverTimestamp(),
      });
    } else {
      const up = await uploadFile(file, "stories", 45 * 1024 * 1024);
      const mediaType = up.mime.startsWith("video/") ? "video" : "image";
      await addDoc(collection(db, "stories"), {
        ownerUid: currentUser.uid,
        nome: text($("name")?.value) || currentUser.displayName || "Atleta",
        mediaUrl: up.url,
        mediaPath: up.path,
        mediaType,
        legenda: caption,
        tipo: mediaType,
        armazenamento: "cloudinary",
        aprovado: false,
        status: "pendente",
        criadoEm: serverTimestamp(),
        expiraEm: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    }

    status("mediaStatus", "Mídia enviada para aprovação.");
    if ($("captionInput")) $("captionInput").value = "";
  } catch (error) {
    console.error("Publicação Cloudinary:", error);
    status("mediaStatus", error?.message || "Não foi possível enviar a mídia.", true);
  }
}

function installProfileV3() {
  const save = $("saveProfile");
  if (!save) return;
  save.onclick = secureSaveProfile;

  const photo = $("photoInput");
  const video = $("videoInput");
  const story = $("storyInput");

  if (photo) photo.onchange = async () => {
    const file = photo.files?.[0];
    photo.value = "";
    if (file) await publishMedia(file, "photo");
  };
  if (video) video.onchange = async () => {
    const file = video.files?.[0];
    video.value = "";
    if (file) await publishMedia(file, "video");
  };
  if (story) story.onchange = async () => {
    const file = story.files?.[0];
    story.value = "";
    if (file) await publishMedia(file, "story");
  };
}

function socialStatus(message, error = false) {
  const el = $("uploadStatus");
  if (!el) return;
  el.hidden = false;
  el.textContent = message;
  el.className = `upload-status${error ? " error" : ""}`;
}

function selectedSocialFile() {
  return $("cameraInput")?.files?.[0] || $("galleryInput")?.files?.[0] || null;
}

async function publishFromPublicProfile() {
  if (!currentUser) {
    socialStatus("Entre na sua conta para publicar.", true);
    return;
  }

  const uid = new URLSearchParams(location.search).get("uid");
  if (!uid || currentUser.uid !== uid) {
    socialStatus("Você só pode publicar no seu próprio perfil.", true);
    return;
  }

  const file = selectedSocialFile();
  if (!file) {
    socialStatus("Selecione uma mídia antes de publicar.", true);
    return;
  }

  const button = $("postMediaBtn");
  const caption = text($("captionInput")?.value);
  const nome = text($("name")?.textContent) || currentUser.displayName || "Atleta";
  if (button) button.disabled = true;
  socialStatus("Enviando mídia para o Cloudinary...");

  try {
    const isVideo = file.type.startsWith("video/");
    const up = await uploadCloudinary(file, {
      maxBytes: isVideo ? 45 * 1024 * 1024 : 10 * 1024 * 1024,
      allowImage: true,
      allowVideo: true,
      tags: ["cadastro-de-atletas", socialPublishType === "story" ? "stories" : isVideo ? "videos" : "publicacoes"],
    });

    if (socialPublishType === "story") {
      const mediaType = isVideo ? "video" : "image";
      await addDoc(collection(db, "stories"), {
        ownerUid: currentUser.uid,
        nome,
        mediaUrl: up.url,
        mediaPath: up.path,
        mediaType,
        tipo: mediaType,
        legenda: caption,
        armazenamento: "cloudinary",
        aprovado: false,
        status: "pendente",
        criadoEm: serverTimestamp(),
        expiraEm: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    } else if (isVideo) {
      await addDoc(collection(db, "videos"), {
        ownerUid: currentUser.uid,
        nome,
        videoUrl: up.url,
        videoPath: up.path,
        videoMime: up.mime,
        videoTamanho: up.size,
        legenda: caption,
        armazenamento: "cloudinary",
        aprovado: false,
        status: "pendente",
        criadoEm: serverTimestamp(),
      });
    } else {
      await addDoc(collection(db, "publicacoes"), {
        ownerUid: currentUser.uid,
        ownerEmail: currentUser.email || "",
        nome,
        texto: caption || "Foto publicada pelo atleta.",
        imagem: up.url,
        imagemUrl: up.url,
        imagemPath: up.path,
        imagemMime: up.mime,
        imagemTamanho: up.size,
        legenda: caption,
        tipo: "imagem",
        armazenamento: "cloudinary",
        aprovado: false,
        status: "pendente",
        criadoEm: serverTimestamp(),
      });
    }

    socialStatus("Mídia enviada para aprovação.");
    if ($("captionInput")) $("captionInput").value = "";
    if ($("cameraInput")) $("cameraInput").value = "";
    if ($("galleryInput")) $("galleryInput").value = "";
    setTimeout(() => {
      $("mediaModal")?.classList.remove("open");
      $("mediaModal")?.setAttribute("aria-hidden", "true");
    }, 500);
  } catch (error) {
    console.error("Perfil social Cloudinary:", error);
    socialStatus(error?.message || "Não foi possível publicar a mídia.", true);
  } finally {
    if (button) button.disabled = false;
  }
}

function installPublicProfileCloudinary() {
  if (!$("postMediaBtn")) return;
  document.addEventListener("click", (event) => {
    const choice = event.target.closest?.(".publish-choice");
    if (choice?.dataset?.publishType) socialPublishType = choice.dataset.publishType;

    const postButton = event.target.closest?.("#postMediaBtn");
    if (!postButton) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    publishFromPublicProfile();
  }, true);
}

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  atualizarMinhaContaMenu();
  setTimeout(installProfileV3, 0);
  setTimeout(installProfileV3, 400);
});

installPublicProfileCloudinary();
setTimeout(installProfileV3, 0);
