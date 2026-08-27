import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  addDoc,
  collection,
  getDocs,
  getFirestore,
  query,
  Timestamp,
  where,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBMsuR0320Nz3asVRJ5axXFV5KJ5Ftz9COQ",
  authDomain: "jogadores-de-volei.firebaseapp.com",
  projectId: "jogadores-de-volei",
  storageBucket: "jogadores-de-volei.firebasestorage.app",
  messagingSenderId: "48728914064",
  appId: "1:48728914064:web:1dd7aeb705319886f74015",
};

const db = getFirestore(initializeApp(firebaseConfig));
const postsRef = collection(db, "publicacoes");
const commentsRef = collection(db, "comentarios_publicacoes");
const $ = (id) => document.getElementById(id);
const publishForm = $("publishForm");
const feed = $("communityFeed");
const feedStatus = $("feedStatus");
const publishStatus = $("publishStatus");
const photoInput = $("postPhoto");
const photoPreview = $("photoPreview");
const postText = $("postText");
const postCounter = $("postCounter");
let currentPosts = [];
let currentComments = [];

function escapeHTML(value) {
  const div = document.createElement("div");
  div.textContent = value == null ? "" : String(value);
  return div.innerHTML;
}

function text(value) {
  return value == null ? "" : String(value).trim();
}

function imageSource(value) {
  const source = text(value);
  if (/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(source)) return source;
  if (/^https?:\/\//i.test(source)) return source;
  return "";
}

function initials(name) {
  const parts = text(name).split(/\s+/).filter(Boolean);
  return escapeHTML((parts[0]?.[0] || "V") + (parts[1]?.[0] || "")).toUpperCase();
}

function dateValue(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value.seconds) return Number(value.seconds) * 1000;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatDate(value) {
  const millis = dateValue(value);
  if (!millis) return "Agora";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(millis));
}

function setStatus(element, message, type = "") {
  if (!element) return;
  element.textContent = message;
  element.className = `inline-status ${type}`.trim();
}

function setFeedStatus(message, type = "") {
  if (!feedStatus) return;
  feedStatus.textContent = message;
  feedStatus.className = `feed-status ${type}`.trim();
}

function renderEmpty() {
  feed.innerHTML = `<div class="empty-feed"><strong>A conversa começa com você</strong><span>Ainda não há publicações aprovadas. Compartilhe uma conquista, uma foto ou uma dica para movimentar a comunidade.</span></div>`;
}

function groupComments() {
  return currentComments.reduce((groups, comment) => {
    const postId = text(comment.publicacaoId);
    if (!groups[postId]) groups[postId] = [];
    groups[postId].push(comment);
    return groups;
  }, {});
}

function renderComments(postId, commentsByPost) {
  const comments = commentsByPost[postId] || [];
  if (!comments.length) return `<div class="comment-empty">Seja a primeira pessoa a comentar.</div>`;
  return comments
    .slice()
    .sort((a, b) => dateValue(a.criadoEm) - dateValue(b.criadoEm))
    .map((comment) => `<article class="comment-item"><strong>${escapeHTML(comment.nome)}</strong><time>${escapeHTML(formatDate(comment.criadoEm))}</time><p>${escapeHTML(comment.texto)}</p></article>`)
    .join("");
}

function renderFeed() {
  if (!feed) return;
  if (!currentPosts.length) {
    renderEmpty();
    return;
  }
  const commentsByPost = groupComments();
  feed.innerHTML = currentPosts
    .map((post) => {
      const image = imageSource(post.imagem);
      const imageMarkup = image ? `<img class="post-image" src="${escapeHTML(image)}" alt="Foto publicada por ${escapeHTML(post.nome)}" loading="lazy">` : "";
      const commentsCount = (commentsByPost[post.id] || []).length;
      return `<article class="post-card" data-post-id="${escapeHTML(post.id)}">
        <div class="post-card-inner">
          <div class="post-meta"><div class="post-avatar" aria-hidden="true">${initials(post.nome)}</div><div class="post-meta-copy"><span class="post-author">${escapeHTML(post.nome)}</span><span class="post-date">${escapeHTML(formatDate(post.criadoEm))} • publicação aprovada</span></div></div>
          <p class="post-text">${escapeHTML(post.texto)}</p>
          ${imageMarkup}
          <div class="post-actions"><button class="post-action toggle-comments" type="button" aria-expanded="false">💬 ${commentsCount ? `${commentsCount} comentário${commentsCount === 1 ? "" : "s"}` : "COMENTAR"}</button><button class="post-action share-post" type="button">↗ COMPARTILHAR</button></div>
        </div>
        <section class="comments-panel" aria-label="Comentários da publicação"><div class="comments-title"><span>CONVERSA DA COMUNIDADE</span><span>${commentsCount} ${commentsCount === 1 ? "comentário" : "comentários"}</span></div><div class="comments-list">${renderComments(post.id, commentsByPost)}</div><form class="comment-form" data-post-id="${escapeHTML(post.id)}"><input name="nome" type="text" maxlength="80" placeholder="Seu nome" required><input name="texto" type="text" maxlength="500" placeholder="Escreva um comentário respeitoso..." required><button class="comment-submit" type="submit">ENVIAR</button><div class="comment-status" role="status" aria-live="polite"></div></form></section>
      </article>`;
    })
    .join("");
}

async function loadFeed() {
  setFeedStatus("Carregando publicações...");
  try {
    const [postsSnapshot, commentsSnapshot] = await Promise.all([
      getDocs(query(postsRef, where("aprovado", "==", true))),
      getDocs(query(commentsRef, where("aprovado", "==", true))),
    ]);
    currentPosts = postsSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((post) => text(post.texto) && post.status !== "inativo")
      .sort((a, b) => dateValue(b.criadoEm) - dateValue(a.criadoEm));
    currentComments = commentsSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((comment) => text(comment.publicacaoId) && text(comment.texto));
    renderFeed();
    setFeedStatus(currentPosts.length ? `${currentPosts.length} publicação${currentPosts.length === 1 ? "" : "ões"} na comunidade.` : "Nenhuma publicação aprovada no momento.");
  } catch (error) {
    console.error("Erro ao carregar a comunidade:", error);
    feed.innerHTML = `<div class="empty-feed"><strong>Não foi possível abrir o feed</strong><span>Atualize a página e tente novamente. Se o problema continuar, a conexão com o banco precisa ser revisada.</span></div>`;
    setFeedStatus("Erro ao carregar publicações.", "error");
  }
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataURL) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("A imagem selecionada é inválida."));
    image.src = dataURL;
  });
}

async function compressImage(file) {
  if (!file) return "";
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) throw new Error("Escolha uma imagem JPG, PNG ou WEBP.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Escolha uma imagem de até 8 MB.");
  const dataURL = await readFileAsDataURL(file);
  const image = await loadImage(dataURL);
  const maxDimension = 1400;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  let quality = .78;
  let output = canvas.toDataURL("image/jpeg", quality);
  while (output.length > 650000 && quality > .42) {
    quality -= .08;
    output = canvas.toDataURL("image/jpeg", quality);
  }
  if (output.length > 700000) throw new Error("A imagem não pôde ser reduzida o suficiente. Escolha uma foto menor.");
  return output;
}

photoInput?.addEventListener("change", async () => {
  const file = photoInput.files?.[0];
  photoPreview.classList.add("hidden");
  photoPreview.innerHTML = "";
  if (!file) return;
  try {
    const source = await compressImage(file);
    photoPreview.innerHTML = `<img src="${source}" alt="Prévia da foto selecionada"><span>Foto pronta para ser enviada junto com a publicação.</span>`;
    photoPreview.classList.remove("hidden");
  } catch (error) {
    photoInput.value = "";
    setStatus(publishStatus, error.message, "error");
  }
});

postText?.addEventListener("input", () => {
  if (postCounter) postCounter.textContent = String(postText.value.length);
});

publishForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = publishForm.querySelector("button[type=submit]");
  const name = text($("postName")?.value);
  const body = text(postText?.value);
  const file = photoInput?.files?.[0];
  if (name.length < 2 || body.length < 3) {
    setStatus(publishStatus, "Informe seu nome e escreva uma mensagem com pelo menos 3 caracteres.", "error");
    return;
  }
  button.disabled = true;
  setStatus(publishStatus, "Enviando publicação para análise...");
  try {
    const image = file ? await compressImage(file) : "";
    await addDoc(postsRef, {
      nome: name,
      texto: body,
      imagem: image,
      aprovado: false,
      status: "pendente",
      criadoEm: Timestamp.now(),
    });
    publishForm.reset();
    if (postCounter) postCounter.textContent = "0";
    photoPreview.classList.add("hidden");
    photoPreview.innerHTML = "";
    setStatus(publishStatus, "Publicação enviada. Ela aparecerá no feed depois da aprovação.", "success");
  } catch (error) {
    console.error("Erro ao enviar publicação:", error);
    setStatus(publishStatus, "Não foi possível enviar agora. Confira sua conexão e tente novamente.", "error");
  } finally {
    button.disabled = false;
  }
});

$("refreshFeed")?.addEventListener("click", loadFeed);

feed?.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  const card = event.target.closest(".post-card");
  if (!button || !card) return;
  if (button.classList.contains("toggle-comments")) {
    const panel = card.querySelector(".comments-panel");
    const isOpen = panel.classList.toggle("open");
    button.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) card.querySelector(".comment-form input")?.focus();
  }
  if (button.classList.contains("share-post")) {
    const post = currentPosts.find((item) => item.id === card.dataset.postId);
    if (!post) return;
    const shareData = { title: "Comunidade Banco de Atletas", text: `${post.nome}: ${post.texto}`, url: `${location.origin}${location.pathname}#post-${post.id}` };
    try {
      if (navigator.share) await navigator.share(shareData);
      else if (navigator.clipboard) await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
      button.textContent = "✓ LINK COPIADO";
      setTimeout(() => { button.textContent = "↗ COMPARTILHAR"; }, 1800);
    } catch (error) {
      if (error?.name !== "AbortError") console.warn("Compartilhamento não concluído:", error);
    }
  }
});

feed?.addEventListener("submit", async (event) => {
  const form = event.target.closest(".comment-form");
  if (!form) return;
  event.preventDefault();
  const button = form.querySelector("button[type=submit]");
  const status = form.querySelector(".comment-status");
  const name = text(form.elements.nome.value);
  const body = text(form.elements.texto.value);
  if (name.length < 2 || body.length < 3) {
    status.textContent = "Informe seu nome e um comentário válido.";
    return;
  }
  button.disabled = true;
  status.textContent = "Enviando para análise...";
  try {
    await addDoc(commentsRef, {
      publicacaoId: form.dataset.postId,
      nome: name,
      texto: body,
      aprovado: false,
      status: "pendente",
      criadoEm: Timestamp.now(),
    });
    form.reset();
    status.textContent = "Comentário enviado para análise.";
  } catch (error) {
    console.error("Erro ao enviar comentário:", error);
    status.textContent = "Não foi possível enviar o comentário agora.";
  } finally {
    button.disabled = false;
  }
});

loadFeed();
