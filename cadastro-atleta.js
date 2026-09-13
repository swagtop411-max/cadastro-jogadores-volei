import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

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
const APP_PACKAGE = "br.com.cadastrodeatletas.app";

function isPlayStoreApp() {
  if (window.__BD_PLAY_STORE_MODE__ === true) return true;
  const params = new URLSearchParams(location.search);
  if (params.get("app") === "1") return true;
  return String(document.referrer || "").startsWith(`android-app://${APP_PACKAGE}`);
}

function normalizarCidade(valor, uf) {
  let cidade = String(valor || "").trim().replace(/\s+/g, " ");
  const estado = String(uf || "").trim().toUpperCase();
  const match = cidade.match(/^([A-Z]{2})\s*[-,]\s*(.+)$/i) || cidade.match(/^(.+?)\s*[-,]\s*([A-Z]{2})$/i);
  if (match) cidade = match[1].length === 2 ? match[2].trim() : match[1].trim();
  return estado && cidade ? `${estado} - ${cidade}` : "";
}

function normalizarCategoria(valor) {
  const texto = String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (texto.includes("inic")) return "Iniciante";
  if (texto.includes("avan")) return "Avançado";
  return "Intermediário";
}

function calcularIdade(dataIso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dataIso || ""))) return -1;
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  const nascimento = new Date(ano, mes - 1, dia);
  if (
    nascimento.getFullYear() !== ano ||
    nascimento.getMonth() !== mes - 1 ||
    nascimento.getDate() !== dia
  ) return -1;

  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  const aniversarioAindaNaoChegou =
    hoje.getMonth() < mes - 1 ||
    (hoje.getMonth() === mes - 1 && hoje.getDate() < dia);
  if (aniversarioAindaNaoChegou) idade -= 1;
  return idade;
}

async function comprimirImagem(file, max = 1000) {
  if (!file) throw new Error("Selecione uma foto do atleta.");
  if (!file.type?.startsWith("image/")) throw new Error("O arquivo selecionado não é uma imagem compatível.");
  if (file.size > 15 * 1024 * 1024) throw new Error("A foto é muito grande. Escolha uma imagem de até 15 MB.");

  let objectUrl = "";
  try {
    objectUrl = URL.createObjectURL(file);
    let imagem;
    if ("createImageBitmap" in window) {
      try { imagem = await createImageBitmap(file); } catch {}
    }
    if (!imagem) {
      imagem = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Não foi possível ler a foto. Use JPG, PNG ou WEBP."));
        img.src = objectUrl;
      });
    }

    const largura = imagem.width;
    const altura = imagem.height;
    if (!largura || !altura) throw new Error("Não foi possível identificar as dimensões da foto.");

    const escala = Math.min(1, max / Math.max(largura, altura));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(largura * escala));
    canvas.height = Math.max(1, Math.round(altura * escala));
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Não foi possível processar a foto neste aparelho.");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imagem, 0, 0, canvas.width, canvas.height);
    if (typeof imagem.close === "function") imagem.close();

    let qualidade = 0.84;
    let resultado = canvas.toDataURL("image/jpeg", qualidade);
    while (resultado.length > 620000 && qualidade > 0.35) {
      qualidade -= 0.07;
      resultado = canvas.toDataURL("image/jpeg", qualidade);
    }
    if (!resultado || resultado === "data:,") throw new Error("Não foi possível processar a foto.");
    if (resultado.length > 700000) throw new Error("A foto não pôde ser reduzida o suficiente. Escolha uma foto menor.");
    return resultado;
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

function montarModal() {
  const playMode = isPlayStoreApp();
  const backdrop = document.createElement("div");
  backdrop.className = "cadastro-modal-backdrop";

  const planosHtml = playMode
    ? `<label class="plano-card selecionado"><input type="radio" name="cadPlano" value="gratuito" checked><strong>Gratuito</strong><span>R$ 0,00/mês</span></label>`
    : `<label class="plano-card selecionado"><input type="radio" name="cadPlano" value="gratuito" checked><strong>Gratuito</strong><span>R$ 0,00/mês</span></label>
       <label class="plano-card"><input type="radio" name="cadPlano" value="bronze"><strong>Bronze</strong><span>R$ 9,90/mês</span></label>
       <label class="plano-card"><input type="radio" name="cadPlano" value="prata"><strong>Prata</strong><span>R$ 19,90/mês</span></label>
       <label class="plano-card"><input type="radio" name="cadPlano" value="ouro"><strong>Ouro</strong><span>R$ 34,90/mês</span></label>
       <label class="plano-card"><input type="radio" name="cadPlano" value="premium"><strong>Premium</strong><span>R$ 49,90/mês</span></label>`;

  backdrop.innerHTML = `
    <div class="cadastro-modal" role="dialog" aria-modal="true" aria-labelledby="cadastroTitulo">
      <div class="cadastro-modal-head">
        <div>
          <span class="cadastro-modal-kicker">BANCO DE DADOS DE ATLETAS</span>
          <h2 id="cadastroTitulo">QUERO ME CADASTRAR</h2>
          <p>Preencha seus dados. O cadastro ficará aguardando análise antes da publicação.</p>
        </div>
        <button class="cadastro-close" type="button" aria-label="Fechar">×</button>
      </div>
      <form id="cadastroForm" class="cadastro-form">
        <div class="cadastro-field"><label>NOME COMPLETO *</label><input id="cadNome" required maxlength="100" autocomplete="name"></div>
        <div class="cadastro-field"><label>DATA DE NASCIMENTO *</label><input id="cadNascimento" type="date" required></div>
        <div class="cadastro-field"><label>ESTADO (UF) *</label><select id="cadUF" required>
          <option value="">Selecione</option><option>AC</option><option>AL</option><option>AP</option><option>AM</option><option>BA</option><option>CE</option><option>DF</option><option>ES</option><option>GO</option><option>MA</option><option>MT</option><option>MS</option><option>MG</option><option>PA</option><option>PB</option><option>PR</option><option>PE</option><option>PI</option><option>RJ</option><option>RN</option><option>RS</option><option>RO</option><option>RR</option><option>SC</option><option>SP</option><option>SE</option><option>TO</option>
        </select></div>
        <div class="cadastro-field"><label>CIDADE *</label><input id="cadCidade" required maxlength="70" autocomplete="address-level2"></div>
        <div class="cadastro-field full"><label>MODALIDADES *</label><div class="multi-options">
          <label><input type="checkbox" name="cadModalidade" value="Vôlei de praia"> 🏖️ Vôlei de praia</label>
          <label><input type="checkbox" name="cadModalidade" value="Vôlei de quadra"> 🏐 Vôlei de quadra</label>
        </div></div>
        <div class="cadastro-field full"><label>POSIÇÕES *</label><div class="multi-options">
          <label><input type="checkbox" name="cadPosicao" value="Levantador">Levantador</label>
          <label><input type="checkbox" name="cadPosicao" value="Ponteiro">Ponteiro</label>
          <label><input type="checkbox" name="cadPosicao" value="Oposto">Oposto</label>
          <label><input type="checkbox" name="cadPosicao" value="Central">Central</label>
          <label><input type="checkbox" name="cadPosicao" value="Líbero">Líbero</label>
          <label><input type="checkbox" name="cadPosicao" value="Universal">Universal</label>
        </div></div>
        <div class="cadastro-field"><label>CATEGORIA *</label><select id="cadCategoria" required><option value="">Selecione</option><option>Iniciante</option><option>Intermediário</option><option>Avançado</option></select></div>
        <div class="cadastro-field"><label>TIME / EQUIPE ATUAL *</label><input id="cadTime" required maxlength="100"></div>
        <div class="cadastro-field"><label>WHATSAPP / CONTATO *</label><input id="cadContato" required maxlength="30" autocomplete="tel"></div>
        <div class="cadastro-field full"><label>PLANO DO ATLETA *</label><div class="cad-planos">${planosHtml}</div>${playMode ? '<small class="campo-opcional">No aplicativo Android da Google Play, esta versão utiliza somente o plano gratuito.</small>' : ''}</div>
        <div class="cadastro-field full"><label>FOTO DO ATLETA *</label><input id="cadFoto" type="file" accept="image/jpeg,image/png,image/webp" required><img id="cadPreview" class="cadastro-photo-preview" alt="Pré-visualização"></div>
        <div class="cadastro-field full"><label>CAMPEONATOS QUE PARTICIPEI <span class="campo-opcional">(OPCIONAL)</span></label><div id="cadCampeonatos"></div><button type="button" id="btnAddCampeonato" class="btn-add-campeonato">＋ ADICIONAR CAMPEONATO</button></div>
        <div class="cadastro-field full"><label>OBSERVAÇÕES <span class="campo-opcional">(OPCIONAL)</span></label><textarea id="cadObs" maxlength="500"></textarea></div>
        <div class="cadastro-field full"><label><input id="cadConfirmAdult" type="checkbox" required> Confirmo que tenho 18 anos ou mais.</label></div>
        <div class="cadastro-submit"><button id="cadEnviar" type="submit">ENVIAR PARA ANÁLISE</button><span id="cadStatus" class="cadastro-status" aria-live="polite"></span></div>
      </form>
    </div>`;

  return backdrop;
}

function adicionarCampeonato(container) {
  const item = document.createElement("div");
  item.className = "campeonato-item";
  item.innerHTML = `
    <input class="campNome" maxlength="120" placeholder="Nome do campeonato">
    <select class="campColocacao" aria-label="Colocação">
      <option value="">Selecione a colocação</option>
      ${Array.from({ length: 20 }, (_, i) => `<option value="${i + 1}º lugar">${i + 1}º lugar</option>`).join("")}
    </select>
    <input class="campAno" type="number" min="1900" max="2100" placeholder="Ano">
    <button type="button" class="btn-remove-campeonato" aria-label="Remover campeonato">✕</button>`;
  item.querySelector("button")?.addEventListener("click", () => item.remove());
  container.appendChild(item);
}

function abrirCadastro() {
  if (document.querySelector(".cadastro-modal-backdrop")) return;
  const backdrop = montarModal();
  document.body.appendChild(backdrop);
  document.body.style.overflow = "hidden";

  const modal = backdrop.querySelector(".cadastro-modal");
  const form = backdrop.querySelector("#cadastroForm");
  const fotoInput = backdrop.querySelector("#cadFoto");
  const preview = backdrop.querySelector("#cadPreview");
  const campeonatos = backdrop.querySelector("#cadCampeonatos");
  const status = backdrop.querySelector("#cadStatus");

  const fechar = () => {
    document.body.style.overflow = "";
    backdrop.remove();
  };

  backdrop.querySelector(".cadastro-close")?.addEventListener("click", fechar);
  backdrop.addEventListener("click", (event) => { if (event.target === backdrop) fechar(); });
  document.addEventListener("keydown", function escHandler(event) {
    if (event.key !== "Escape" || !document.body.contains(backdrop)) return;
    document.removeEventListener("keydown", escHandler);
    fechar();
  });

  backdrop.querySelector("#btnAddCampeonato")?.addEventListener("click", () => adicionarCampeonato(campeonatos));

  fotoInput?.addEventListener("change", () => {
    preview.style.display = "none";
    preview.removeAttribute("src");
    const file = fotoInput.files?.[0];
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      status.textContent = "Selecione uma imagem JPG, PNG ou WEBP.";
      status.className = "cadastro-status erro";
      fotoInput.value = "";
      return;
    }
    const url = URL.createObjectURL(file);
    preview.onload = () => URL.revokeObjectURL(url);
    preview.onerror = () => {
      URL.revokeObjectURL(url);
      preview.removeAttribute("src");
      status.textContent = "Não foi possível visualizar esta foto.";
      status.className = "cadastro-status erro";
    };
    preview.src = url;
    preview.style.display = "block";
    status.textContent = "";
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const botao = backdrop.querySelector("#cadEnviar");
    try {
      status.textContent = "";
      status.className = "cadastro-status";
      const user = auth.currentUser;
      if (!user) throw new Error("Faça login para enviar seu cadastro.");

      const nascimento = backdrop.querySelector("#cadNascimento").value;
      const idade = calcularIdade(nascimento);
      if (idade < 18) throw new Error("O Cadastro de Atletas é destinado somente a pessoas com 18 anos ou mais.");
      if (!backdrop.querySelector("#cadConfirmAdult").checked) throw new Error("Confirme que você possui 18 anos ou mais.");

      const modalidades = [...backdrop.querySelectorAll('input[name="cadModalidade"]:checked')].map((el) => el.value);
      const posicoes = [...backdrop.querySelectorAll('input[name="cadPosicao"]:checked')].map((el) => el.value);
      if (!modalidades.length) throw new Error("Selecione pelo menos uma modalidade.");
      if (!posicoes.length) throw new Error("Selecione pelo menos uma posição.");

      const uf = backdrop.querySelector("#cadUF").value.trim().toUpperCase();
      const cidade = normalizarCidade(backdrop.querySelector("#cadCidade").value, uf);
      const contato = backdrop.querySelector("#cadContato").value.trim();
      if (contato.length < 8) throw new Error("Informe um contato válido.");

      botao.disabled = true;
      status.textContent = "Enviando cadastro...";

      const historicoCampeonatos = [...campeonatos.querySelectorAll(".campeonato-item")]
        .map((item) => ({
          campeonato: item.querySelector(".campNome").value.trim(),
          colocacao: item.querySelector(".campColocacao").value.trim(),
          ano: item.querySelector(".campAno").value.trim()
        }))
        .filter((item) => item.campeonato)
        .slice(0, 30);

      const planos = {
        gratuito: ["Gratuito", 0],
        bronze: ["Bronze", 9.9],
        prata: ["Prata", 19.9],
        ouro: ["Ouro", 34.9],
        premium: ["Premium", 49.9]
      };
      let planoId = backdrop.querySelector('input[name="cadPlano"]:checked')?.value || "gratuito";
      if (isPlayStoreApp()) planoId = "gratuito";
      const [plano, valorPlano] = planos[planoId] || planos.gratuito;

      const foto = await comprimirImagem(fotoInput.files?.[0]);
      const nome = backdrop.querySelector("#cadNome").value.trim();
      const time = backdrop.querySelector("#cadTime").value.trim();
      const observacoes = backdrop.querySelector("#cadObs").value.trim();

      await addDoc(collection(db, "atletas_pendentes"), {
        ownerUid: user.uid,
        ownerEmail: user.email || "",
        nome,
        nascimento,
        cidade,
        uf,
        contato,
        modalidades,
        posicoes,
        modalidade: modalidades.join(", "),
        posicao: posicoes.join(", "),
        categoria: normalizarCategoria(backdrop.querySelector("#cadCategoria").value),
        time,
        observacoes,
        foto,
        status: "ativo",
        aprovacao: "pendente",
        historicoCampeonatos,
        plano,
        planoId,
        valorPlano,
        planoStatus: planoId === "gratuito" ? "ativo" : "aguardando_pagamento",
        pagamentoConfirmado: false,
        criadoEm: new Date().toISOString()
      });

      modal.innerHTML = `
        <div class="cadastro-success">
          <div class="success-icon">🏐</div>
          <h3>CADASTRO ENVIADO!</h3>
          <p>Seu cadastro foi recebido e ficará aguardando análise da M&amp;M Organização.</p>
          ${planoId === "gratuito" ? '<p>Não há pagamento a fazer.</p>' : '<p>O pagamento do plano é concluído somente pelos canais oficiais do site. No aplicativo Google Play não oferecemos compra digital externa.</p>'}
          <div class="cadastro-success-actions"><button type="button" id="cadFecharSucesso" class="btn-voltar-site">FECHAR</button></div>
        </div>`;
      modal.querySelector("#cadFecharSucesso")?.addEventListener("click", fechar);
    } catch (erro) {
      status.textContent = erro?.message || "Não foi possível enviar o cadastro.";
      status.className = "cadastro-status erro";
    } finally {
      if (botao && document.body.contains(botao)) botao.disabled = false;
    }
  });

  requestAnimationFrame(() => backdrop.querySelector("#cadNome")?.focus());
}

function init() {
  document.querySelectorAll('.whatsapp-cadastro[href="#cadastro"], [data-abrir-cadastro-atleta]').forEach((link) => {
    link.removeAttribute("target");
    link.addEventListener("click", (event) => {
      event.preventDefault();
      abrirCadastro();
    });
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();

export { abrirCadastro, calcularIdade, isPlayStoreApp };
