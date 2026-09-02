import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  addDoc,
  collection,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { uploadCloudinary } from "./cloudinary-upload.js?v=20260901-8";
import { feedImageUrl } from "./media-utils.js?v=20260901-1";

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
const $ = id => document.getElementById(id);
const esc = value => {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
};

const TIMEOUT = 18000;
const withTimeout = (promise, ms = TIMEOUT) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => {
    reject(Object.assign(new Error("O banco demorou para responder."), {
      code: "deadline-exceeded"
    }));
  }, ms))
]);

const hoje = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};

const fmt = value => {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? "Data não informada"
    : date.toLocaleDateString("pt-BR");
};

function safeUrl(value) {
  let url = String(value || "").trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.href : "";
  } catch {
    return "";
  }
}

function extractLink(description) {
  const text = String(description || "");
  const match = text.match(/\[link\](https?:\/\/[^\s\[]+)\[\/link\]/i);
  return {
    link: match?.[1] || "",
    description: text
      .replace(/\s*\[link\][\s\S]*?\[\/link\]\s*/gi, " ")
      .trim()
  };
}

function embedLink(description, link) {
  const base = String(description || "")
    .replace(/\s*\[link\][\s\S]*?\[\/link\]\s*/gi, " ")
    .trim()
    .slice(0, 520);

  return link
    ? `${base}${base ? "\n" : ""}[link]${link}[/link]`.slice(0, 700)
    : base;
}

async function carregar() {
  const box = $("listaCampeonatos");
  const counter = $("contador");
  if (!box || !counter) return;

  try {
    let snap;

    try {
      snap = await withTimeout(getDocs(query(
        collection(db, "campeonatos"),
        where("publicado", "==", true),
        orderBy("data", "asc"),
        limit(60)
      )));
    } catch {
      snap = await withTimeout(getDocs(query(
        collection(db, "campeonatos"),
        where("publicado", "==", true),
        limit(60)
      )));
    }

    const campeonatos = snap.docs
      .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
      .filter(item => String(item.data || "") >= hoje())
      .sort((a, b) => String(a.data || "").localeCompare(String(b.data || "")));

    counter.textContent = `${campeonatos.length} ${campeonatos.length === 1 ? "evento publicado" : "eventos publicados"}`;

    box.innerHTML = campeonatos.length
      ? campeonatos.map(item => {
          const parsed = extractLink(item.descricao);
          const image = feedImageUrl(item.imagem || "");
          const media = parsed.link
            ? `<a class="champ-image-link" href="${esc(parsed.link)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir página do organizador de ${esc(item.nome || "campeonato")}"><img class="champ-image" src="${esc(image)}" alt="Cartaz de ${esc(item.nome || "campeonato")}" loading="lazy" decoding="async"></a>`
            : `<div class="champ-image-link"><img class="champ-image" src="${esc(image)}" alt="Cartaz de ${esc(item.nome || "campeonato")}" loading="lazy" decoding="async"></div>`;

          return `<article class="champ-card">${media}<div class="champ-body"><span class="tag">🏆 CAMPEONATO</span><h3>${esc(item.nome || "Campeonato")}</h3><div class="meta"><strong>📅 ${fmt(item.data)}</strong><br>📍 ${esc(item.local || "Local não informado")}<br>👤 ${esc(item.organizador || "Organizador não informado")}</div>${parsed.description ? `<p class="meta">${esc(parsed.description)}</p>` : ""}${parsed.link ? `<a class="champ-organizer-link" href="${esc(parsed.link)}" target="_blank" rel="noopener noreferrer">ABRIR PÁGINA / INSCRIÇÕES →</a>` : ""}</div></article>`;
        }).join("")
      : '<div class="empty" style="grid-column:1/-1">Ainda não há campeonatos próximos publicados.</div>';
  } catch (error) {
    console.error(error);
    counter.textContent = "Não foi possível carregar";
    box.innerHTML = '<div class="empty" style="grid-column:1/-1">Não foi possível carregar os campeonatos agora.</div>';
  }
}

function configurarPreview() {
  const input = $("cartaz");
  const preview = $("preview");
  if (!input || !preview) return;

  input.addEventListener("change", () => {
    const file = input.files?.[0];
    preview.style.display = "none";
    preview.removeAttribute("src");

    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) {
      input.value = "";
      const status = $("status");
      if (status) {
        status.textContent = "Use JPG, PNG ou WEBP com até 10 MB.";
        status.className = "status erro";
      }
      return;
    }

    const localUrl = URL.createObjectURL(file);
    preview.src = localUrl;
    preview.style.display = "block";
    preview.onload = () => URL.revokeObjectURL(localUrl);
  });
}

function limparFormulario(form) {
  try {
    if (form && typeof form.reset === "function") form.reset();

    const preview = $("preview");
    if (preview) {
      preview.style.display = "none";
      preview.removeAttribute("src");
    }

    const dataInput = $("data");
    if (dataInput) dataInput.min = hoje();
  } catch (error) {
    // A limpeza da interface nunca deve transformar um envio salvo em erro.
    console.warn("Campeonato salvo, mas não foi possível limpar o formulário:", error);
  }
}

async function submit(event) {
  event.preventDefault();

  // currentTarget deixa de ser confiável depois de awaits em eventos DOM.
  // Guardamos a referência estável ao formulário antes de iniciar operações assíncronas.
  const form = event.currentTarget instanceof HTMLFormElement
    ? event.currentTarget
    : $("formCampeonato");

  const status = $("status");
  const button = $("btnEnviar");
  const nomeInput = $("nome");
  const organizadorInput = $("organizador");
  const dataInput = $("data");
  const localInput = $("local");
  const descricaoInput = $("descricao");
  const cartazInput = $("cartaz");
  const linkInput = $("linkOrganizador");

  if (!form || !status || !button || !nomeInput || !organizadorInput || !dataInput || !localInput || !descricaoInput || !cartazInput || !linkInput) {
    console.error("Formulário de campeonato incompleto no DOM.");
    if (status) {
      status.textContent = "Não foi possível iniciar o envio. Atualize a página e tente novamente.";
      status.className = "status erro";
    }
    return;
  }

  const nome = nomeInput.value.trim();
  const organizador = organizadorInput.value.trim();
  const data = dataInput.value;
  const local = localInput.value.trim();
  const descricao = descricaoInput.value.trim();
  const file = cartazInput.files?.[0];
  const linkRaw = linkInput.value.trim();
  const link = linkRaw ? safeUrl(linkRaw) : "";

  status.className = "status";

  if (nome.length < 2 || organizador.length < 2 || local.length < 2 || !data || !file) {
    status.textContent = "Preencha os campos obrigatórios e selecione o cartaz.";
    status.className = "status erro";
    return;
  }

  if (data < hoje()) {
    status.textContent = "A data deve ser hoje ou futura.";
    status.className = "status erro";
    return;
  }

  if (linkRaw && !link) {
    status.textContent = "Informe um link HTTPS válido para o organizador ou deixe o campo vazio.";
    status.className = "status erro";
    return;
  }

  let saved = false;

  try {
    button.disabled = true;
    button.textContent = "ENVIANDO CARTAZ...";
    status.textContent = "Enviando o cartaz original em alta qualidade...";

    const upload = await uploadCloudinary(file, {
      maxBytes: 10 * 1024 * 1024,
      allowImage: true,
      allowVideo: false,
      tags: ["cadastro-de-atletas", "campeonatos"]
    });

    button.textContent = "SALVANDO...";
    status.textContent = "Salvando campeonato para análise...";

    await withTimeout(addDoc(collection(db, "campeonatos_pendentes"), {
      nome,
      organizador,
      data,
      local,
      descricao: embedLink(descricao, link),
      imagem: upload.url,
      publicado: false,
      status: "pendente",
      aprovacao: "pendente",
      criadoEm: new Date().toISOString()
    }));

    saved = true;
    limparFormulario(form);

    status.textContent = "✓ Campeonato enviado com sucesso. Depois da aprovação, o cartaz abrirá o link informado.";
    status.className = "status ok";
  } catch (error) {
    console.error(error);

    if (saved) {
      status.textContent = "✓ Campeonato salvo com sucesso. Houve apenas uma falha ao atualizar a tela.";
      status.className = "status ok";
    } else {
      status.textContent = error?.message || "Não foi possível enviar o campeonato.";
      status.className = "status erro";
    }
  } finally {
    button.disabled = false;
    button.textContent = "ENVIAR PARA ANÁLISE";
  }
}

const dataInput = $("data");
if (dataInput) dataInput.min = hoje();

configurarPreview();
$("formCampeonato")?.addEventListener("submit", submit);
$("btnAtualizarCampeonatos")?.addEventListener("click", carregar);
carregar();
