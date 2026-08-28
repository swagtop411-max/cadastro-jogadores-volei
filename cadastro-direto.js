import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

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
const db = getFirestore(app);
const auth = getAuth(app);
const DATA_TIMEOUT_MS = 20000;
const withTimeout = (promise, ms = DATA_TIMEOUT_MS) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error("O banco demorou para responder. Tente novamente em alguns segundos."), { code: "deadline-exceeded" })), ms))]);

const $ = (id) => document.getElementById(id);
const form = $("cadastroForm");
const foto = $("cadFoto");
const preview = $("cadPreview");
const btn = $("cadEnviar");
const mensagem = $("cadStatusMsg");
const campeonatosBox = $("cadCampeonatos");
const btnAddCampeonato = $("btnAddCampeonato");

const PLANOS_ATLETA = {
  gratuito: { nome: "Gratuito", valor: 0 },
  bronze: { nome: "Bronze", valor: 9.9 },
  prata: { nome: "Prata", valor: 19.9 },
  ouro: { nome: "Ouro", valor: 34.9 },
  premium: { nome: "Premium", valor: 49.9 }
};

function mostrarMensagem(texto = "", erro = false) {
  if (!mensagem) return;
  mensagem.textContent = texto;
  mensagem.className = erro ? "cadastro-status erro" : "cadastro-status";
}

function normalizarCategoria(valor) {
  const s = String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (s.includes("inic")) return "Iniciante";
  if (s.includes("avan")) return "Avançado";
  return "Intermediário";
}

function normalizarCidade(cidade, uf) {
  let s = String(cidade || "").trim().replace(/\s+/g, " ");
  const u = String(uf || "").trim().toUpperCase();

  const m =
    s.match(/^([A-Z]{2})\s*[-,]\s*(.+)$/i) ||
    s.match(/^(.+?)\s*[-,]\s*([A-Z]{2})$/i);

  if (m) s = m[1].length === 2 ? m[2].trim() : m[1].trim();

  return u && s ? u + " - " + s : "";
}

async function comprimirFoto(file, max = 900) {
  if (!file) throw new Error("Selecione uma foto do atleta.");
  if (!file.type || !file.type.startsWith("image/")) {
    throw new Error("O arquivo selecionado não é uma imagem compatível. Use JPG, PNG ou WEBP.");
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("A foto é muito grande. Escolha uma imagem de até 15 MB.");
  }

  let objectUrl = "";

  try {
    objectUrl = URL.createObjectURL(file);

    let img = null;

    if ("createImageBitmap" in window) {
      try {
        img = await createImageBitmap(file);
      } catch (_) {}
    }

    if (!img) {
      img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () =>
          reject(new Error("Não foi possível ler a foto. Use JPG, PNG ou WEBP."));
        image.src = objectUrl;
      });
    }

    const width = img.width;
    const height = img.height;

    if (!width || !height) {
      throw new Error("Não foi possível identificar as dimensões da foto.");
    }

    const scale = Math.min(1, max / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Não foi possível processar a foto neste aparelho.");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    if (img.close) img.close();

    let quality = 0.84;
    let result = canvas.toDataURL("image/jpeg", quality);

    while (result.length > 620000 && quality > 0.35) {
      quality -= 0.07;
      result = canvas.toDataURL("image/jpeg", quality);
    }

    if (!result || result === "data:,") {
      throw new Error("Não foi possível processar a foto.");
    }

    if (result.length > 700000) {
      throw new Error("A foto ficou muito grande. Escolha uma foto menor.");
    }

    return result;
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

function atualizarPlanos() {
  const selecionado =
    document.querySelector('input[name="cadPlano"]:checked') ||
    document.querySelector('input[name="cadPlano"][value="gratuito"]');

  document.querySelectorAll(".plano-card").forEach((card) => {
    const radio = card.querySelector('input[name="cadPlano"]');
    card.classList.toggle("selecionado", !!radio && radio === selecionado);
    card.setAttribute("role", "radio");
    card.setAttribute("aria-checked", radio === selecionado ? "true" : "false");
    card.tabIndex = 0;
  });

  if (selecionado && !selecionado.checked) selecionado.checked = true;
}

function configurarPlanos() {
  document.querySelectorAll(".plano-card").forEach((card) => {
    const radio = card.querySelector('input[name="cadPlano"]');
    if (!radio) return;

    card.addEventListener("click", (event) => {
      if (event.target !== radio) event.preventDefault();
      radio.checked = true;
      radio.dispatchEvent(new Event("change", { bubbles: true }));
    });

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        radio.checked = true;
        radio.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    radio.addEventListener("change", atualizarPlanos);
  });

  atualizarPlanos();
}

function adicionarCampeonato(dados = {}) {
  if (!campeonatosBox) return;

  const item = document.createElement("div");
  item.className = "campeonato-item";

  const nome = String(dados.campeonato || "").replace(/"/g, "&quot;");
  const ano = String(dados.ano || "").replace(/"/g, "&quot;");
  const colocacao = String(dados.colocacao || "");

  const opcoes = Array.from({ length: 20 }, (_, i) => {
    const valor = i + 1 + "º lugar";
    return '<option value="' + valor + '"' +
      (colocacao === valor ? " selected" : "") +
      ">" + valor + "</option>";
  }).join("");

  item.innerHTML =
    '<input class="campNome" maxlength="120" placeholder="Nome do campeonato" value="' + nome + '">' +
    '<select class="campColocacao" aria-label="Colocação">' +
      '<option value="">Selecione a colocação</option>' + opcoes +
    "</select>" +
    '<input class="campAno" type="number" min="1900" max="2100" placeholder="Ano" value="' + ano + '">' +
    '<button type="button" class="btn-remove-campeonato" aria-label="Remover campeonato">✕</button>';

  item.querySelector(".btn-remove-campeonato").addEventListener("click", () => {
    item.remove();
  });

  campeonatosBox.appendChild(item);
}

function obterCampeonatos() {
  if (!campeonatosBox) return [];

  return [...campeonatosBox.querySelectorAll(".campeonato-item")]
    .map((item) => ({
      campeonato: item.querySelector(".campNome")?.value.trim() || "",
      colocacao: item.querySelector(".campColocacao")?.value.trim() || "",
      ano: item.querySelector(".campAno")?.value.trim() || ""
    }))
    .filter((item) => item.campeonato)
    .slice(0, 30);
}

function configurarCampeonatos() {
  btnAddCampeonato?.addEventListener("click", (event) => {
    event.preventDefault();
    adicionarCampeonato();
  });
}

function configurarFoto() {
  if (!foto || !preview) return;

  foto.addEventListener("change", () => {
    const file = foto.files?.[0];

    preview.removeAttribute("src");
    preview.style.display = "none";

    if (!file) {
      mostrarMensagem("");
      return;
    }

    const objectUrl = URL.createObjectURL(file);

    preview.onload = () => {
      URL.revokeObjectURL(objectUrl);
      preview.style.display = "block";
      mostrarMensagem("");
    };

    preview.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      preview.removeAttribute("src");
      preview.style.display = "none";
      mostrarMensagem("Não foi possível visualizar esta foto. Use JPG, PNG ou WEBP.", true);
    };

    preview.src = objectUrl;
  });
}

async function enviarCadastro(event) {
  event.preventDefault();
  event.stopPropagation();

  if (!form || !btn) return;

  mostrarMensagem("");

  try {
    const modalidades = [
      ...document.querySelectorAll("#cadModalidades input[type='checkbox']:checked")
    ].map((input) => input.value);

    const posicoes = [
      ...document.querySelectorAll("#cadPosicoes input[type='checkbox']:checked")
    ].map((input) => input.value);

    if (!modalidades.length) {
      mostrarMensagem("Selecione pelo menos uma modalidade.", true);
      return;
    }

    if (!posicoes.length) {
      mostrarMensagem("Selecione pelo menos uma posição.", true);
      return;
    }

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (!foto?.files?.[0]) {
      mostrarMensagem("Selecione uma foto do atleta.", true);
      foto?.focus();
      return;
    }

    const planoInput =
      document.querySelector('input[name="cadPlano"]:checked') ||
      document.querySelector('input[name="cadPlano"][value="gratuito"]');

    const planoId = planoInput?.value || "gratuito";
    const plano = PLANOS_ATLETA[planoId] || PLANOS_ATLETA.gratuito;
    const campeonatos = obterCampeonatos();

    btn.disabled = true;
    btn.textContent = "ENVIANDO...";
    mostrarMensagem("Enviando cadastro para análise...");

    const imagem = await comprimirFoto(foto.files[0]);

    // O cadastro público não pode depender da ativação do Login Anônimo.
    // Se o projeto estiver com Anonymous Auth desativado, seguimos com um
    // envio público controlado pelas regras do Firestore.
    let usuario = auth.currentUser;
    if (!usuario) {
      try {
        usuario = (await signInAnonymously(auth)).user;
      } catch (authError) {
        if (authError?.code !== "auth/admin-restricted-operation") throw authError;
      }
    }

    const dados = {
      ownerUid: usuario?.uid || "",
      ownerEmail: usuario?.email || "",
      nome: $("cadNome").value.trim(),
      nascimento: $("cadNascimento").value || "",
      cidade: normalizarCidade($("cadCidade").value, $("cadUF").value),
      uf: $("cadUF").value.toUpperCase(),
      contato: $("cadContato").value.trim(),

      modalidades,
      posicoes,
      modalidade: modalidades.join(", "),
      posicao: posicoes.join(", "),

      categoria: normalizarCategoria($("cadCategoria").value),
      time: $("cadTime").value.trim(),
      observacoes: $("cadObs")?.value.trim() || "",

      foto: imagem,

      status: "ativo",
      aprovacao: "pendente",

      historicoCampeonatos: campeonatos,

      plano: plano.nome,
      planoId,
      valorPlano: plano.valor,
      planoStatus: planoId === "gratuito" ? "ativo" : "aguardando_pagamento",
      pagamentoConfirmado: false,

      criadoEm: new Date().toISOString()
    };

    /*
     * A gravação só limpa/troca a tela depois que o Firestore
     * confirmar o addDoc. Assim um erro não reinicia o formulário.
     */
    const ref = await withTimeout(addDoc(collection(db, "atletas_pendentes"), dados));

    console.info("Cadastro criado com sucesso:", ref.id);

    const modal = document.querySelector(".cadastro-modal");

    if (modal) {
      const valor = Number(plano.valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      const pedido = ref.id.slice(0, 8).toUpperCase();
      const pago = planoId !== "gratuito";
      const whatsapp = "https://wa.me/5516988586327?text=" + encodeURIComponent(
        "Olá! Fiz o pagamento do plano " + plano.nome + " do Banco de Dados de Atletas. " +
        "Meu nome é " + dados.nome + ". Pedido: " + pedido
      );

      modal.innerHTML =
        '<div class="cadastro-success">' +
          '<div class="success-icon">🏐</div>' +
          '<h3>CADASTRO ENVIADO!</h3>' +
          '<p>Seus dados foram recebidos e ficarão aguardando aprovação da M&amp;M Organização.</p>' +
          (pago
            ? '<div class="cadastro-pagamento">' +
                '<div class="cadastro-pagamento-title">💳 PAGAMENTO DO PLANO ' + plano.nome.toUpperCase() + '</div>' +
                '<p>Para ativar seu plano de visibilidade, faça o Pix no valor de <strong>' + valor + '</strong>.</p>' +
                '<div class="cadastro-pix-label">CHAVE PIX</div>' +
                '<button id="copiarPixAtleta" type="button" class="cadastro-pix-key">📋 memorganizacao@gmail.com</button>' +
                '<small>Depois de realizar o pagamento, envie o comprovante para agilizar a confirmação. Seu perfil só receberá os benefícios do plano após a confirmação do pagamento.</small>' +
                '<a href="' + whatsapp + '" target="_blank" rel="noopener noreferrer" class="cadastro-pix-whatsapp">💬 ENVIAR COMPROVANTE PELO WHATSAPP</a>' +
                '<div class="cadastro-pedido">Pedido: <strong>' + pedido + '</strong></div>' +
              '</div>'
            : '<p class="cadastro-gratuito">Como você escolheu o plano gratuito, não há pagamento a fazer.</p>') +
          '<div class="cadastro-success-actions">' +
            '<a href="https://wa.me/5516988586327?text=Ol%C3%A1!%20Acabei%20de%20enviar%20meu%20cadastro%20para%20o%20Banco%20de%20Dados%20de%20Atletas." target="_blank" rel="noopener noreferrer">💬 FALAR COM A M&amp;M ORGANIZAÇÃO</a>' +
            '<a href="index.html" class="btn-voltar-site">← VOLTAR AO SITE</a>' +
          '</div>' +
        '</div>';

      const copiar = document.getElementById("copiarPixAtleta");
      copiar?.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText("memorganizacao@gmail.com");
          copiar.textContent = "✓ CHAVE PIX COPIADA";
          setTimeout(() => { copiar.textContent = "📋 memorganizacao@gmail.com"; }, 1800);
        } catch (_) {
          mostrarMensagem("Copie a chave Pix: memorganizacao@gmail.com");
        }
      });
    }
  } catch (error) {
    console.error("Erro completo ao enviar cadastro:", error);

    let msg = "Não foi possível enviar o cadastro.";

    if (error?.code === "deadline-exceeded") {
      msg = "O banco demorou para responder. Nenhum cadastro foi confirmado. Tente novamente.";
    } else if (error?.code === "permission-denied") {
      msg = "O Firestore recusou o cadastro. Verifique as regras publicadas.";
    } else if (error?.code === "failed-precondition") {
      msg = "O Firestore informou uma pré-condição inválida. Tente novamente.";
    } else if (error?.message) {
      msg = error.message;
    }

    mostrarMensagem(msg, true);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "ENVIAR PARA ANÁLISE";
    }
  }
}

if (form) {
  form.addEventListener("submit", enviarCadastro);
  configurarPlanos();
  configurarCampeonatos();
  configurarFoto();
  mostrarMensagem("");
}
