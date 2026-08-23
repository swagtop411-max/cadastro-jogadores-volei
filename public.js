import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Configuração EXATA do app Web cadastrado no Firebase.
const firebaseConfig = {
  apiKey: "AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",
  authDomain: "jogadores-de-volei.firebaseapp.com",
  projectId: "jogadores-de-volei",
  storageBucket: "jogadores-de-volei.firebasestorage.app",
  messagingSenderId: "48728914064",
  appId: "1:48728914064:web:1dd7aeb705319886f74015",
  measurementId: "G-K033D1K41Y"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const busca = document.getElementById("busca");
const filtroNivel = document.getElementById("filtroNivel");
const listaJogadores = document.getElementById("listaJogadores");
const ranking = document.getElementById("ranking");
const totalElement = document.getElementById("total");
const mediaElement = document.getElementById("media");
const melhorElement = document.getElementById("melhor");

let jogadores = [];

function escaparHTML(valor) {
  const div = document.createElement("div");
  div.textContent = valor ?? "";
  return div.innerHTML;
}

function fotoPadrao() {
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="#1e293b"/><text x="150" y="165" text-anchor="middle" font-size="80">🏐</text></svg>`
  );
}

function fotoSegura(foto) {
  if (typeof foto !== "string" || !foto.trim()) return fotoPadrao();
  if (foto.startsWith("data:image/") || foto.startsWith("https://") || foto.startsWith("http://")) return foto;
  return fotoPadrao();
}

function media(avaliacoes) {
  if (!Array.isArray(avaliacoes)) return 0;
  const valores = avaliacoes.map(Number).filter(Number.isFinite);
  if (!valores.length) return 0;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

function normalizar(data) {
  return {
    id: data.id || "",
    nome: data.nome || "Sem nome",
    time: data.time || "Sem time",
    categoria: data.categoria || "",
    nivel: data.nivel || "Iniciante",
    foto: data.foto || "",
    times: Array.isArray(data.times) ? data.times : [],
    avaliacoes: Array.isArray(data.avaliacoes) ? data.avaliacoes : []
  };
}

async function carregarJogadores() {
  listaJogadores.innerHTML = '<p class="subtitulo">Carregando atletas...</p>';

  try {
    let snapshot;

    try {
      snapshot = await getDocs(query(collection(db, "atletas"), orderBy("nome")));
    } catch (erroOrdenacao) {
      console.warn("Não foi possível ordenar por nome. Tentando consulta simples.", erroOrdenacao);
      snapshot = await getDocs(collection(db, "atletas"));
    }

    jogadores = snapshot.docs
      .map(docSnap => normalizar({ id: docSnap.id, ...docSnap.data() }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    renderizar();
  } catch (erro) {
    console.error("Erro ao carregar atletas do Firestore:", erro);

    let mensagem = "Não foi possível carregar os atletas.";

    if (erro?.code === "permission-denied") {
      mensagem = "A leitura do Firestore foi bloqueada pelas regras de segurança.";
    } else if (erro?.code === "unavailable") {
      mensagem = "O Firebase está temporariamente indisponível. Tente novamente.";
    } else if (erro?.code === "auth/invalid-api-key") {
      mensagem = "A chave da API do Firebase está inválida.";
    }

    listaJogadores.innerHTML = `
      <div class="card">
        <div>
          <h3>${escaparHTML(mensagem)}</h3>
          <p>Abra o console do navegador (F12) para ver o erro técnico.</p>
        </div>
      </div>`;
  }
}

function atualizarDashboard() {
  totalElement.textContent = `${jogadores.length} ${jogadores.length === 1 ? "jogador" : "jogadores"}`;

  const medias = jogadores.map(j => media(j.avaliacoes)).filter(n => n > 0);
  const geral = medias.length ? medias.reduce((a, b) => a + b, 0) / medias.length : 0;
  mediaElement.textContent = geral ? geral.toFixed(1) : "0.0";

  const melhor = jogadores
    .map(j => ({ jogador: j, nota: media(j.avaliacoes) }))
    .filter(item => item.nota > 0)
    .sort((a, b) => b.nota - a.nota)[0];

  melhorElement.textContent = melhor ? `${melhor.jogador.nome} ⭐ ${melhor.nota.toFixed(1)}` : "Nenhum";
}

function renderizarRanking() {
  const ordenados = jogadores
    .map(j => ({ jogador: j, nota: media(j.avaliacoes) }))
    .sort((a, b) => b.nota - a.nota || a.jogador.nome.localeCompare(b.jogador.nome, "pt-BR"))
    .slice(0, 10);

  if (!ordenados.length) {
    ranking.innerHTML = "<h2>🏆 Ranking</h2><p>Nenhum atleta cadastrado.</p>";
    return;
  }

  ranking.innerHTML = `
    <h2>🏆 Ranking dos atletas</h2>
    ${ordenados.map((item, index) => `
      <p><strong>${index + 1}º</strong> ${escaparHTML(item.jogador.nome)}${item.nota ? ` · ⭐ ${item.nota.toFixed(1)}` : " · Sem avaliação"}</p>
    `).join("")}
  `;
}

function renderizarCards(lista) {
  if (!lista.length) {
    listaJogadores.innerHTML = `
      <div class="card">
        <div>
          <h3>Nenhum atleta encontrado</h3>
          <p>Tente mudar a busca ou o filtro.</p>
        </div>
      </div>`;
    return;
  }

  listaJogadores.innerHTML = lista.map(jogador => {
    const times = jogador.times.length
      ? `<ul>${jogador.times.map(item => `<li>${escaparHTML(item.nome || "")} · ${escaparHTML(item.nivel || "")}</li>`).join("")}</ul>`
      : "<p>Nenhum time anterior informado.</p>";
    const nota = media(jogador.avaliacoes);

    return `
      <article class="card">
        <img src="${fotoSegura(jogador.foto)}" alt="Foto de ${escaparHTML(jogador.nome)}" loading="lazy">
        <div>
          <h3>${escaparHTML(jogador.nome)}</h3>
          <p><strong>Time atual:</strong> ${escaparHTML(jogador.time)}</p>
          <p><strong>Categoria:</strong> ${escaparHTML(jogador.categoria || "Não informada")}</p>
          <p><strong>Nível:</strong> ${escaparHTML(jogador.nivel)}</p>
          ${nota ? `<p><strong>Avaliação:</strong> ⭐ ${nota.toFixed(1)}</p>` : "<p><strong>Avaliação:</strong> Sem avaliações</p>"}
          <p><strong>Times anteriores:</strong></p>
          ${times}
        </div>
      </article>`;
  }).join("");
}

function renderizar() {
  const texto = busca.value.trim().toLowerCase();
  const nivelSelecionado = filtroNivel.value;

  const filtrados = jogadores.filter(jogador => {
    const correspondeTexto = !texto ||
      jogador.nome.toLowerCase().includes(texto) ||
      jogador.time.toLowerCase().includes(texto) ||
      jogador.categoria.toLowerCase().includes(texto);
    const correspondeNivel = !nivelSelecionado || jogador.nivel === nivelSelecionado;
    return correspondeTexto && correspondeNivel;
  });

  atualizarDashboard();
  renderizarRanking();
  renderizarCards(filtrados);
}

busca.addEventListener("input", renderizar);
filtroNivel.addEventListener("change", renderizar);

carregarJogadores();
