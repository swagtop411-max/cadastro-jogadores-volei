import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getDownloadURL, getStorage, ref, uploadBytes } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  limit,
  setDoc,
  Timestamp,
  where,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",
  authDomain: "jogadores-de-volei.firebaseapp.com",
  projectId: "jogadores-de-volei",
  storageBucket: "jogadores-de-volei.firebasestorage.app",
  messagingSenderId: "48728914064",
  appId: "1:48728914064:web:1dd7aeb705319886f74015",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
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
let currentUser = null;
let likesByPost = {};
let likedPosts = new Set();

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
          <div class="post-actions"><button class="post-action like-post" type="button">${likedPosts.has(post.id) ? "♥" : "♡"} CURTIR${likesByPost[post.id] ? ` ${likesByPost[post.id]}` : ""}</button><button class="post-action toggle-comments" type="button" aria-expanded="false">💬 ${commentsCount ? `${commentsCount} comentário${commentsCount === 1 ? "" : "s"}` : "COMENTAR"}</button><button class="post-action share-post" type="button">↗ COMPARTILHAR</button><button class="post-action report-post" type="button">⚑ DENUNCIAR</button></div>
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
      getDocs(query(postsRef, where("aprovado", "==", true), limit(30))),
      getDocs(query(commentsRef, where("aprovado", "==", true), limit(300))),
    ]);
    currentPosts = postsSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((post) => text(post.texto) && post.status !== "inativo")
      .sort((a, b) => dateValue(b.criadoEm) - dateValue(a.criadoEm));
    currentComments = commentsSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((comment) => text(comment.publicacaoId) && text(comment.texto));
    const likeSnapshots = await Promise.all(currentPosts.map((post) => getDocs(collection(db, "curtidas_publicacoes", post.id, "usuarios"))));
    likesByPost = Object.fromEntries(currentPosts.map((post, index) => [post.id, likeSnapshots[index].size]));
    likedPosts = new Set();
    if (currentUser) {
      const likedSnapshots = await Promise.all(currentPosts.map((post) => getDoc(doc(db, "curtidas_publicacoes", post.id, "usuarios", currentUser.uid))));
      likedSnapshots.forEach((snapshot, index) => { if (snapshot.exists()) likedPosts.add(currentPosts[index].id); });
    }
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

async function uploadPostImage(file, uid) {
  const compressed = await compressImage(file);
  const response = await fetch(compressed);
  const blob = await response.blob();
  const path = `usuarios/${uid}/publicacoes/${crypto.randomUUID()}.jpg`;
  const imageRef = ref(storage, path);

  // Upload com limite de tempo para nunca deixar o botão preso indefinidamente.
  try {
    await Promise.race([
      uploadBytes(imageRef, blob, {
        contentType: "image/jpeg",
        cacheControl: "public,max-age=31536000"
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("O envio da foto demorou demais.")), 15000)
      )
    ]);
    return await getDownloadURL(imageRef);
  } catch (error) {
    console.warn("Falha no Storage. Usando a imagem compactada diretamente no Firestore.", error);
    throw new Error("Não foi possível enviar a foto para o armazenamento. Verifique sua conexão e tente novamente.");
  }
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
  if (!currentUser) {
    setStatus(publishStatus, "Entre na sua conta para publicar na comunidade.", "error");
    return;
  }
  button.disabled = true;
  setStatus(publishStatus, "Enviando publicação para análise...");
  try {
    const image = file ? await uploadPostImage(file, currentUser.uid) : "";
    const criadoEm = Timestamp.now();
    const imagemUrl = image || "";
    await addDoc(postsRef, {
      ownerUid: currentUser.uid,
      ownerEmail: currentUser.email || "",
      nome: currentUser.displayName || name,
      texto: body,
      imagem: imagemUrl,
      imagemUrl,
      imagemPath: "",
      imagemMime: file?.type || "image/jpeg",
      imagemTamanho: Number(file?.size || 0),
      legenda: body,
      tipo: "imagem",
      armazenamento: "storage",
      aprovado: false,
      status: "pendente",
      criadoEm,
    });
    publishForm.reset();
    if (postCounter) postCounter.textContent = "0";
    photoPreview.classList.add("hidden");
    photoPreview.innerHTML = "";
    setStatus(publishStatus, "Publicação enviada. Ela aparecerá no feed depois da aprovação.", "success");
  } catch (error) {
    console.error("Erro ao enviar publicação:", error);
    const message = error?.message || "";
    if (message.includes("permission") || message.includes("Missing")) {
      setStatus(publishStatus, "O Firebase recusou o envio. Verifique as permissões do Storage/Firestore.", "error");
    } else {
      setStatus(publishStatus, message || "Não foi possível enviar agora. Confira sua conexão e tente novamente.", "error");
    }
  } finally {
    button.disabled = false;
  }
});

$("refreshFeed")?.addEventListener("click", loadFeed);

feed?.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  const card = event.target.closest(".post-card");
  if (!button || !card) return;
  if (button.classList.contains("like-post")) {
    if (!currentUser) {
      setFeedStatus("Entre na sua conta para curtir publicações.", "error");
      return;
    }
    const postId = card.dataset.postId;
    const likeRef = doc(db, "curtidas_publicacoes", postId, "usuarios", currentUser.uid);
    try {
      if (likedPosts.has(postId)) {
        await deleteDoc(likeRef);
        likedPosts.delete(postId);
        likesByPost[postId] = Math.max(0, (likesByPost[postId] || 1) - 1);
      } else {
        await setDoc(likeRef, { uid: currentUser.uid, criadoEm: Timestamp.now() });
        likedPosts.add(postId);
        likesByPost[postId] = (likesByPost[postId] || 0) + 1;
      }
      renderFeed();
    } catch (error) {
      console.error("Erro ao alternar curtida:", error);
      setFeedStatus("Não foi possível registrar a curtida.", "error");
    }
  }
  if (button.classList.contains("report-post")) {
    if (!currentUser) {
      setFeedStatus("Entre na sua conta para denunciar uma publicação.", "error");
      return;
    }
    const reason = window.prompt("Por que você deseja denunciar esta publicação?", "Conteúdo inadequado");
    if (!reason?.trim()) return;
    try {
      await addDoc(collection(db, "denuncias"), { alvoTipo: "publicacao", alvoId: card.dataset.postId, motivo: reason.trim(), detalhes: "", reportadoPorUid: currentUser.uid, criadoEm: Timestamp.now(), status: "pendente" });
      button.textContent = "✓ DENÚNCIA ENVIADA";
      button.disabled = true;
    } catch (error) {
      console.error("Erro ao denunciar publicação:", error);
      setFeedStatus("Não foi possível enviar a denúncia.", "error");
    }
  }
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
  if (!currentUser) {
    status.textContent = "Entre na sua conta para comentar na comunidade.";
    return;
  }
  button.disabled = true;
  status.textContent = "Enviando para análise...";
  try {
    await addDoc(commentsRef, {
      ownerUid: currentUser.uid,
      ownerEmail: currentUser.email || "",
      publicacaoId: form.dataset.postId,
      nome: currentUser.displayName || name,
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

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  const accountLink = $("accountLink");
  if (accountLink) {
    accountLink.textContent = user ? `◉ ${user.displayName || "MINHA CONTA"}` : "◉ ENTRAR";
    accountLink.href = "conta.html";
  }
});

loadFeed();
