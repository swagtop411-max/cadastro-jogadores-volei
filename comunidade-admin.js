import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBMsuR0320Nz3asVRj5axXFV5KJ5Ftz9COQ",
  authDomain: "jogadores-de-volei.firebaseapp.com",
  projectId: "jogadores-de-volei",
  storageBucket: "jogadores-de-volei.firebasestorage.app",
  messagingSenderId: "48728914064",
  appId: "1:48728914064:web:1dd7aeb705319886f74015",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const postsRef = collection(db, "publicacoes");
const commentsRef = collection(db, "comentarios_publicacoes");
const list = document.getElementById("comunidadeAdminLista");
const status = document.getElementById("comunidadeAdminStatus");
const badge = document.getElementById("comunidadePendentesBadge");
let pendingPosts = [];
let pendingComments = [];

const text = (value) => value == null ? "" : String(value).trim();
const escapeHTML = (value) => { const el = document.createElement("div"); el.textContent = value == null ? "" : String(value); return el.innerHTML; };
const imageSource = (value) => { const source = text(value); return /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(source) || /^https?:\/\//i.test(source) ? source : ""; };
const dateValue = (value) => { if (!value) return 0; if (typeof value.toMillis === "function") return value.toMillis(); if (value.seconds) return Number(value.seconds) * 1000; const parsed = Date.parse(value); return Number.isNaN(parsed) ? 0 : parsed; };
const formatDate = (value) => dateValue(value) ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(dateValue(value))) : "Agora";

function setStatus(message, type = "") {
  if (!status) return;
  status.textContent = message;
  status.className = `status ${type}`.trim();
}

function updateBadge() {
  if (badge) badge.textContent = String(pendingPosts.length + pendingComments.length);
}

function moderationCard(item, type) {
  const isPost = type === "post";
  const image = isPost ? imageSource(item.imagem) : "";
  const imageMarkup = image ? `<img class="community-moderation-image" src="${escapeHTML(image)}" alt="Foto enviada por ${escapeHTML(item.nome)}" loading="lazy">` : "";
  const relation = isPost ? "Publicação para o feed" : `Comentário na publicação ${escapeHTML(item.publicacaoId)}`;
  return `<article class="community-moderation-card" data-type="${type}" data-id="${escapeHTML(item.id)}"><div><span class="community-moderation-type">${isPost ? "PUBLICAÇÃO" : "COMENTÁRIO"}</span><h3>${escapeHTML(item.nome)}</h3><p>${escapeHTML(item.texto)}</p><div class="community-moderation-meta">${relation} · ${escapeHTML(formatDate(item.criadoEm))}</div>${imageMarkup}</div><div class="community-moderation-actions"><button class="community-approve-button" type="button" data-community-action="approve">✓ APROVAR</button><button class="community-reject-button" type="button" data-community-action="reject">✕ RECUSAR</button></div></article>`;
}

function renderModeration() {
  updateBadge();
  if (!list) return;
  if (!pendingPosts.length && !pendingComments.length) {
    list.innerHTML = `<div class="community-admin-empty">Nenhuma publicação ou comentário aguardando moderação.</div>`;
    return;
  }
  const postsMarkup = pendingPosts.length ? pendingPosts.map((item) => moderationCard(item, "post")).join("") : `<div class="community-admin-empty">Nenhuma publicação pendente.</div>`;
  const commentsMarkup = pendingComments.length ? pendingComments.map((item) => moderationCard(item, "comment")).join("") : `<div class="community-admin-empty">Nenhum comentário pendente.</div>`;
  list.innerHTML = `<div class="community-admin-separator">Publicações (${pendingPosts.length})</div><div class="community-admin-list">${postsMarkup}</div><div class="community-admin-separator">Comentários (${pendingComments.length})</div><div class="community-admin-list">${commentsMarkup}</div>`;
}

async function loadModeration() {
  if (!list) return;
  list.innerHTML = `<p class="subtitulo">Carregando pendências...</p>`;
  try {
    const [postsSnapshot, commentsSnapshot] = await Promise.all([
      getDocs(query(postsRef, where("aprovado", "==", false))),
      getDocs(query(commentsRef, where("aprovado", "==", false))),
    ]);
    pendingPosts = postsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })).filter((item) => item.status === "pendente").sort((a, b) => dateValue(a.criadoEm) - dateValue(b.criadoEm));
    pendingComments = commentsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })).filter((item) => item.status === "pendente").sort((a, b) => dateValue(a.criadoEm) - dateValue(b.criadoEm));
    renderModeration();
    setStatus(`${pendingPosts.length + pendingComments.length} item(ns) aguardando moderação.`, "success");
  } catch (error) {
    console.error("Erro ao carregar moderação da comunidade:", error);
    list.innerHTML = `<div class="community-admin-error">Não foi possível carregar as pendências. Confirme se as regras novas já foram publicadas no Firebase.</div>`;
    setStatus("Erro ao carregar a comunidade.", "error");
  }
}

list?.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-community-action]");
  const card = event.target.closest("[data-type][data-id]");
  if (!button || !card) return;
  const type = card.dataset.type;
  const id = card.dataset.id;
  const isApprove = button.dataset.communityAction === "approve";
  if (!isApprove && !window.confirm("Recusar e excluir este conteúdo? Essa ação não pode ser desfeita.")) return;
  button.disabled = true;
  try {
    const collectionName = type === "post" ? "publicacoes" : "comentarios_publicacoes";
    if (isApprove) await updateDoc(doc(db, collectionName, id), { aprovado: true, status: "ativo", aprovadoEm: serverTimestamp() });
    else await deleteDoc(doc(db, collectionName, id));
    await loadModeration();
    setStatus(isApprove ? "Conteúdo aprovado e publicado no feed." : "Conteúdo recusado e removido.", "success");
  } catch (error) {
    console.error("Erro ao moderar conteúdo:", error);
    button.disabled = false;
    setStatus("Não foi possível concluir a moderação. Tente novamente.", "error");
  }
});

document.getElementById("btnAtualizarComunidade")?.addEventListener("click", loadModeration);
onAuthStateChanged(auth, (user) => {
  if (user) loadModeration();
});
