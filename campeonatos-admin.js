import "./admin-v8-hardening.js?v=20260902-1";
import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDoc,
  getDocs,
  getDocsFromCache,
  getDocsFromServer,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  limit
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",
  authDomain: "jogadores-de-volei.firebaseapp.com",
  projectId: "jogadores-de-volei",
  storageBucket: "jogadores-de-volei.firebasestorage.app",
  messagingSenderId: "48728914064",
  appId: "1:48728914064:web:1dd7aeb705319886f74015",
  measurementId: "G-K033D1K41Y"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const ADMIN_EMAILS = new Set(["swagtop411@gmail.com"]);
const $ = id => document.getElementById(id);
const esc = value => {
  const el = document.createElement("div");
  el.textContent = value ?? "";
  return el.innerHTML;
};

const LOAD_TIMEOUT = 12000;
const MAX_DOCS = 250;
let loadingPromise = null;

const style = document.createElement("style");
style.textContent = `.campeonato-admin-badge{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:#087fa7;color:#fff;font-size:11px;font-weight:900;margin-left:5px}.campeonatos-admin-panel{padding:24px;background:#f5f8fa;border:1px solid #d7e2e9;border-radius:20px}.campeonatos-admin-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px}.campeonatos-admin-header h2{margin:0 0 5px;color:#172f40;font-size:25px}.campeonatos-admin-header p{margin:0;color:#64798a}.campeonato-admin-section{margin-top:24px}.campeonato-admin-section h3{margin:0 0 10px;color:#193446;font-size:20px}.campeonato-admin-card{display:grid;grid-template-columns:220px 1fr;gap:18px;background:#fff;border:1px solid #d6e2e9;border-radius:18px;padding:16px;margin:14px 0;box-shadow:0 8px 26px rgba(7,24,39,.07)}.campeonato-admin-image{width:220px;height:auto;max-height:360px;object-fit:contain;border-radius:12px;background:#e6edf2;border:1px solid #d6e2e9}.campeonato-admin-info{min-width:0}.campeonato-admin-title{margin:0 0 8px;color:#193446;font-size:23px}.campeonato-admin-meta{color:#587082;font-size:13px;line-height:1.75;margin-bottom:10px}.campeonato-admin-desc{background:#f4f8fa;border-radius:12px;padding:12px;color:#344e61;line-height:1.55;white-space:pre-wrap}.campeonato-admin-link{display:inline-flex;margin-top:10px;color:#087fa7;text-decoration:none;font-size:10px;font-weight:900}.campeonato-admin-status{display:inline-flex;padding:6px 10px;border-radius:999px;background:#e9f7fb;color:#087fa7;font-size:10px;font-weight:900;letter-spacing:1px;margin-bottom:10px}.campeonato-admin-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:14px}.campeonato-admin-empty{padding:32px;border-radius:16px;background:#edf3f6;color:#64798a;text-align:center}.campeonato-admin-error{padding:16px;border-radius:14px;background:#fff0ed;color:#a54b2f;font-weight:700}.btn-campeonato-approve{background:#0d7e61!important;color:#fff!important;border:0!important}.btn-campeonato-reject{background:#b94b4b!important;color:#fff!important;border:0!important}.btn-campeonato-delete{background:#8f2f2f!important;color:#fff!important;border:0!important}@media(max-width:700px){.campeonato-admin-card{grid-template-columns:1fr}.campeonato-admin-image{width:100%;max-height:none}.campeonatos-admin-header{display:block}.campeonatos-admin-header .btn-secondary{margin-top:12px}}`;
document.head.appendChild(style);

function formatarData(value) {
  if (!value) return "Data não informada";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? esc(value)
    : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function hojeISO() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function setStatus(message, error = false) {
  const el = $("campeonatosAdminStatus");
  if (!el) return;
  el.textContent = message;
  el.className = `status ${error ? "erro" : "ok"}`;
}

function parseDescription(value) {
  const text = String(value || "");
  const match = text.match(/\[link\](https?:\/\/[^\s\[]+)\[\/link\]/i);
  return {
    link: match?.[1] || "",
    description: text.replace(/\s*\[link\][\s\S]*?\[\/link\]\s*/gi, " ").trim()
  };
}

function card(c, tipo) {
  const passado = String(c.data || "") < hojeISO();
  const rotulo = tipo === "pendente"
    ? "🟠 AGUARDANDO APROVAÇÃO"
    : passado
      ? "⚪ DATA DO EVENTO PASSOU"
      : "🟢 CAMPEONATO ATIVO";

  const botoes = tipo === "pendente"
    ? `<button class="btn-primary btn-campeonato-approve" data-action="approve" data-id="${esc(c.id)}">✓ APROVAR E PUBLICAR</button><button class="btn-secondary btn-campeonato-reject" data-action="reject" data-id="${esc(c.id)}">✕ RECUSAR</button>`
    : `<button class="btn-secondary btn-campeonato-delete" data-action="delete" data-id="${esc(c.id)}">🗑 APAGAR POSTAGEM</button>`;

  const parsed = parseDescription(c.descricao);
  parsed.link = String(c.linkOrganizador || parsed.link || "");
  return `<article class="campeonato-admin-card"><img class="campeonato-admin-image" src="${esc(c.imagem || "")}" alt="Cartaz de ${esc(c.nome || "campeonato")}" loading="lazy" decoding="async"><div class="campeonato-admin-info"><span class="campeonato-admin-status">${rotulo}</span><h3 class="campeonato-admin-title">${esc(c.nome || "Sem nome")}</h3><div class="campeonato-admin-meta"><strong>📅 ${formatarData(c.data)}</strong><br>📍 ${esc(c.local || "Não informado")}<br>👤 ${esc(c.organizador || "Não informado")}</div>${parsed.description ? `<div class="campeonato-admin-desc">${esc(parsed.description)}</div>` : ""}${parsed.link ? `<a class="campeonato-admin-link" href="${esc(parsed.link)}" target="_blank" rel="noopener noreferrer">🔗 ABRIR LINK DO ORGANIZADOR →</a>` : ""}<div class="campeonato-admin-actions">${botoes}</div></div></article>`;
}

function ativarAba(btn, view) {
  document.querySelectorAll(".admin-tab").forEach(item => item.classList.remove("active"));
  document.querySelectorAll(".admin-view").forEach(item => item.classList.remove("active"));
  btn.classList.add("active");
  view.classList.add("active");
}

function criarInterface() {
  const tabs = document.querySelector(".admin-tabs");
  const adminSection = $("adminSection");
  if (!tabs || !adminSection || $("campeonatosView")) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "admin-tab";
  btn.dataset.tab = "campeonatosView";
  btn.innerHTML = '🏆 Próximos Campeonatos <span id="campeonatosPendentesBadge" class="campeonato-admin-badge">0</span>';
  tabs.appendChild(btn);

  const view = document.createElement("section");
  view.id = "campeonatosView";
  view.className = "admin-view";
  view.innerHTML = '<div class="campeonatos-admin-panel"><div class="campeonatos-admin-header"><div><h2>🏆 Próximos Campeonatos</h2><p>Aprove, acompanhe e remova campeonatos da agenda pública.</p></div><button id="btnAtualizarCampeonatos" class="btn-secondary" type="button">↻ Atualizar</button></div><div id="campeonatosAdminStatus" class="status"></div><div class="campeonato-admin-section"><h3>📨 Aguardando aprovação</h3><div id="campeonatosPendentesAdmin"><div class="campeonato-admin-empty">Carregando...</div></div></div><div class="campeonato-admin-section"><h3>🟢 Campeonatos ativos</h3><div id="campeonatosAtivosAdmin"><div class="campeonato-admin-empty">Carregando...</div></div></div><div class="campeonato-admin-section"><h3>⚪ Encerrados / data passada</h3><div id="campeonatosPassadosAdmin"><div class="campeonato-admin-empty">Carregando...</div></div></div></div>';
  adminSection.appendChild(view);

  btn.addEventListener("click", () => {
    ativarAba(btn, view);
    carregarTudo(true);
  });

  $("btnAtualizarCampeonatos")?.addEventListener("click", () => carregarTudo(true));
}

function withTimeout(promise, label, ms = LOAD_TIMEOUT) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => {
      const error = new Error(`${label} demorou mais de ${Math.round(ms / 1000)} segundos.`);
      error.code = "deadline-exceeded";
      reject(error);
    }, ms))
  ]);
}

async function loadCollection(name) {
  const q = query(collection(db, name), limit(MAX_DOCS));

  try {
    return await withTimeout(getDocsFromServer(q), name);
  } catch (serverError) {
    console.warn(`Leitura do servidor falhou em ${name}:`, serverError);

    try {
      const cached = await withTimeout(getDocsFromCache(q), `${name} (cache)`, 2500);
      if (!cached.empty) return cached;
    } catch (cacheError) {
      console.warn(`Cache indisponível em ${name}:`, cacheError);
    }

    // Última tentativa usando o comportamento padrão do SDK.
    return await withTimeout(getDocs(q), `${name} (fallback)`, 6000);
  }
}

function errorMessage(error, collectionName) {
  const code = String(error?.code || "");
  if (code.includes("permission-denied")) {
    return `Sem permissão para ler ${collectionName}. Confirme se as regras atuais do Firestore foram publicadas e entre novamente com a conta ADM.`;
  }
  if (code.includes("deadline-exceeded")) {
    return `${collectionName} demorou para responder. Clique em Atualizar para tentar novamente.`;
  }
  if (code.includes("unavailable")) {
    return `Firebase temporariamente indisponível para ${collectionName}.`;
  }
  return `Não foi possível carregar ${collectionName}. ${error?.message || code || "Erro desconhecido."}`;
}

async function carregarTudo(force = false) {
  if (loadingPromise && !force) return loadingPromise;

  const pendentesBox = $("campeonatosPendentesAdmin");
  const ativosBox = $("campeonatosAtivosAdmin");
  const passadosBox = $("campeonatosPassadosAdmin");
  const badge = $("campeonatosPendentesBadge");
  const refresh = $("btnAtualizarCampeonatos");

  if (!pendentesBox || !ativosBox || !passadosBox) return;

  [pendentesBox, ativosBox, passadosBox].forEach(el => {
    el.innerHTML = '<div class="campeonato-admin-empty">Carregando...</div>';
  });
  setStatus("Consultando campeonatos no Firebase...");
  if (refresh) refresh.disabled = true;

  loadingPromise = (async () => {
    const [pendingResult, publishedResult] = await Promise.allSettled([
      loadCollection("campeonatos_pendentes"),
      loadCollection("campeonatos")
    ]);

    let partialFailure = false;

    if (pendingResult.status === "fulfilled") {
      const pendentes = pendingResult.value.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(c => c.status === "pendente" && c.publicado === false)
        .sort((x, y) => String(x.data || "").localeCompare(String(y.data || "")));

      if (badge) badge.textContent = String(pendentes.length);
      pendentesBox.innerHTML = pendentes.length
        ? pendentes.map(c => card(c, "pendente")).join("")
        : '<div class="campeonato-admin-empty">🎉 Nenhum campeonato aguardando aprovação.</div>';
    } else {
      partialFailure = true;
      console.error("Falha em campeonatos_pendentes:", pendingResult.reason);
      pendentesBox.innerHTML = `<div class="campeonato-admin-error">${esc(errorMessage(pendingResult.reason, "campeonatos pendentes"))}</div>`;
    }

    if (publishedResult.status === "fulfilled") {
      const publicados = publishedResult.value.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(c => c.publicado === true);

      const ativos = publicados
        .filter(c => String(c.data || "") >= hojeISO())
        .sort((x, y) => String(x.data || "").localeCompare(String(y.data || "")));

      const passados = publicados
        .filter(c => String(c.data || "") < hojeISO())
        .sort((x, y) => String(y.data || "").localeCompare(String(x.data || "")));

      ativosBox.innerHTML = ativos.length
        ? ativos.map(c => card(c, "ativo")).join("")
        : '<div class="campeonato-admin-empty">Nenhum campeonato ativo no momento.</div>';

      passadosBox.innerHTML = passados.length
        ? passados.map(c => card(c, "passado")).join("")
        : '<div class="campeonato-admin-empty">Nenhum campeonato com data passada.</div>';
    } else {
      partialFailure = true;
      console.error("Falha em campeonatos:", publishedResult.reason);
      const message = esc(errorMessage(publishedResult.reason, "campeonatos publicados"));
      ativosBox.innerHTML = `<div class="campeonato-admin-error">${message}</div>`;
      passadosBox.innerHTML = `<div class="campeonato-admin-error">${message}</div>`;
    }

    viewButtons();
    setStatus(
      partialFailure
        ? "A leitura terminou com erro em uma das coleções. Veja a mensagem na seção correspondente."
        : "✓ Campeonatos atualizados.",
      partialFailure
    );
  })();

  try {
    await loadingPromise;
  } finally {
    loadingPromise = null;
    if (refresh) refresh.disabled = false;
  }
}

function viewButtons() {
  document.querySelectorAll("#campeonatosView button[data-action]").forEach(button => {
    button.onclick = () => acao(button.dataset.id, button.dataset.action);
  });
}

async function acao(id, action) {
  if (action === "approve") {
    const pendingRef = doc(db, "campeonatos_pendentes", id);
    const snap = await getDoc(pendingRef);
    if (!snap.exists()) {
      setStatus("Este campeonato não existe mais na fila.", true);
      await carregarTudo(true);
      return;
    }

    const c = { id: snap.id, ...snap.data() };
    if (!confirm(`Publicar "${c.nome || "sem nome"}"?`)) return;

    try {
      await setDoc(doc(db, "campeonatos", id), {
        nome: String(c.nome || ""),
        organizador: String(c.organizador || ""),
        data: String(c.data || ""),
        local: String(c.local || ""),
        descricao: String(c.descricao || ""),
        linkOrganizador: String(c.linkOrganizador || parseDescription(c.descricao).link || ""),
        imagem: String(c.imagem || ""),
        publicado: true,
        status: "aprovado",
        criadoEm: c.criadoEm || new Date().toISOString(),
        aprovadoEm: serverTimestamp(),
        aprovadoPor: auth.currentUser?.email || "administrador",
        origem: "envio-publico"
      });
      await deleteDoc(pendingRef);
      setStatus("✓ Campeonato aprovado e publicado!");
      await carregarTudo(true);
    } catch (error) {
      console.error(error);
      setStatus(`Erro ao publicar: ${error?.code || error?.message || "falha"}`, true);
    }
    return;
  }

  if (action === "reject") {
    if (!confirm("Recusar este campeonato?")) return;
    try {
      await updateDoc(doc(db, "campeonatos_pendentes", id), {
        status: "rejeitado",
        aprovacao: "rejeitado",
        rejeitadoEm: serverTimestamp(),
        rejeitadoPor: auth.currentUser?.email || "administrador"
      });
      setStatus("Campeonato recusado.");
      await carregarTudo(true);
    } catch (error) {
      console.error(error);
      setStatus(`Erro ao recusar: ${error?.code || error?.message || "falha"}`, true);
    }
    return;
  }

  if (action === "delete") {
    if (!confirm("Apagar esta postagem de campeonato definitivamente?")) return;
    try {
      await deleteDoc(doc(db, "campeonatos", id));
      setStatus("🗑 Postagem do campeonato apagada.");
      await carregarTudo(true);
    } catch (error) {
      console.error(error);
      setStatus(`Não foi possível apagar: ${error?.code || error?.message || "falha"}`, true);
    }
  }
}

onAuthStateChanged(auth, async user => {
  if (!user) return;

  try {
    const token = await user.getIdTokenResult(true);
    const email = String(user.email || "").trim().toLowerCase();

    if (token.claims?.admin === true || ADMIN_EMAILS.has(email)) {
      criarInterface();
      setTimeout(() => carregarTudo(true), 180);
    }
  } catch (error) {
    console.error("Falha ao validar administrador:", error);
  }
});
