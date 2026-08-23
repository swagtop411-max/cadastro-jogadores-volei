import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBMsUR0320Nz3asVRj5axXFvKJ5Ftz9C0Q",
  authDomain: "jogadores-de-volei.firebaseapp.com",
  projectId: "jogadores-de-volei",
  storageBucket: "jogadores-de-volei.firebasestorage.app",
  messagingSenderId: "48728914064",
  appId: "1:48728914064:web:1dd7aeb705319886f74015",
  measurementId: "G-KQ33D1K41Y"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const loginSection = document.getElementById("loginSection");
const adminSection = document.getElementById("adminSection");
const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginStatus = document.getElementById("loginStatus");
const adminStatus = document.getElementById("adminStatus");
const usuarioLogado = document.getElementById("usuarioLogado");
const btnSair = document.getElementById("btnSair");
const atletaForm = document.getElementById("atletaForm");
const atletaId = document.getElementById("atletaId");
const nome = document.getElementById("nome");
const time = document.getElementById("time");
const categoria = document.getElementById("categoria");
const nivel = document.getElementById("nivel");
const foto = document.getElementById("foto");
const fotoPreview = document.getElementById("fotoPreview");
const timesContainer = document.getElementById("timesContainer");
const btnAdicionarTime = document.getElementById("btnAdicionarTime");
const btnSalvar = document.getElementById("btnSalvar");
const btnCancelar = document.getElementById("btnCancelar");
const atletasAdmin = document.getElementById("atletasAdmin");

let atletas = [];
let fotoAtual = "";

function mostrarStatus(elemento, mensagem, tipo = "ok") {
  elemento.textContent = mensagem;
  elemento.className = `status ${tipo}`;
}

function limparStatus(elemento) {
  elemento.textContent = "";
  elemento.className = "status";
}

function mensagemErroLogin(erro) {
  const codigo = erro?.code || "";

  switch (codigo) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "E-mail ou senha incorretos. Confira os dados no Firebase Authentication.";
    case "auth/invalid-email":
      return "O e-mail informado é inválido. Confira se está correto.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
    case "auth/unauthorized-domain":
      return "O domínio do GitHub Pages ainda não está autorizado no Firebase Authentication.";
    case "auth/network-request-failed":
      return "Falha de conexão com o Firebase. Verifique sua internet e tente novamente.";
    default:
      return `Erro no login (${codigo || "desconhecido"}). Abra o console do navegador para detalhes.`;
  }
}

function escaparHTML(valor) {
  const div = document.createElement("div");
  div.textContent = valor ?? "";
  return div.innerHTML;
}

function adicionarTime(nomeTime = "", nivelTime = "Iniciante") {
  const div = document.createElement("div");
  div.className = "time-item";
  div.style.display = "grid";
  div.style.gridTemplateColumns = "minmax(0,1fr) 180px 45px";
  div.style.gap = "8px";
  div.style.marginTop = "8px";

  div.innerHTML = `
    <input class="timeNome" type="text" placeholder="Nome do time">
    <select class="timeNivel">
      <option value="Iniciante">Iniciante</option>
      <option value="Intermediário">Intermediário</option>
      <option value="Livre">Livre</option>
    </select>
    <button type="button" class="btn-danger" aria-label="Remover time">❌</button>
  `;

  div.querySelector(".timeNome").value = nomeTime;
  div.querySelector(".timeNivel").value = nivelTime;
  div.querySelector("button").addEventListener("click", () => div.remove());
  timesContainer.appendChild(div);
}

function obterTimes() {
  return [...timesContainer.querySelectorAll(".time-item")]
    .map(item => ({
      nome: item.querySelector(".timeNome")?.value.trim() || "",
      nivel: item.querySelector(".timeNivel")?.value || "Iniciante"
    }))
    .filter(timeAnterior => timeAnterior.nome);
}

function resetarFormulario() {
  atletaForm.reset();
  atletaId.value = "";
  foto.value = "";
  fotoAtual = "";
  fotoPreview.src = "";
  fotoPreview.style.display = "none";
  timesContainer.innerHTML = '<div class="times-header"><label>Times anteriores</label></div>';
  btnSalvar.textContent = "Cadastrar atleta";
  btnCancelar.classList.add("hidden");
  adicionarTime();
}

function editarAtleta(id) {
  const atleta = atletas.find(item => item.id === id);
  if (!atleta) return;

  atletaId.value = atleta.id;
  nome.value = atleta.nome || "";
  time.value = atleta.time || "";
  categoria.value = atleta.categoria || "";
  nivel.value = atleta.nivel || "Iniciante";

  timesContainer.innerHTML = '<div class="times-header"><label>Times anteriores</label></div>';
  if (Array.isArray(atleta.times) && atleta.times.length) {
    atleta.times.forEach(item => adicionarTime(item.nome, item.nivel));
  } else {
    adicionarTime();
  }

  fotoAtual = atleta.foto || "";
  if (fotoAtual) {
    fotoPreview.src = fotoAtual;
    fotoPreview.style.display = "block";
  } else {
    fotoPreview.src = "";
    fotoPreview.style.display = "none";
  }

  btnSalvar.textContent = "Salvar alterações";
  btnCancelar.classList.remove("hidden");
  atletaForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function excluirAtleta(id) {
  const atleta = atletas.find(item => item.id === id);
  if (!atleta) return;
  if (!confirm(`Tem certeza que deseja excluir "${atleta.nome}"?`)) return;

  try {
    await deleteDoc(doc(db, "atletas", id));
    mostrarStatus(adminStatus, "Atleta excluído com sucesso.");
    await carregarAtletas();
  } catch (erro) {
    console.error(erro);
    mostrarStatus(adminStatus, `Não foi possível excluir (${erro.code || "erro"}).`, "erro");
  }
}

function renderizarAtletas() {
  atletasAdmin.innerHTML = "";
  if (!atletas.length) {
    atletasAdmin.innerHTML = "<p class='subtitulo'>Nenhum atleta cadastrado ainda.</p>";
    return;
  }

  atletas.forEach(atleta => {
    const item = document.createElement("div");
    item.className = "atleta-admin";
    item.innerHTML = `
      <div class="atleta-info">
        <strong>${escaparHTML(atleta.nome)}</strong>
        <span>${escaparHTML(atleta.time || "Sem time")} · ${escaparHTML(atleta.nivel || "Sem nível")}</span>
      </div>
      <div class="atleta-actions">
        <button type="button" class="btn-secondary btn-editar">Editar</button>
        <button type="button" class="btn-danger btn-excluir">Excluir</button>
      </div>
    `;
    item.querySelector(".btn-editar").addEventListener("click", () => editarAtleta(atleta.id));
    item.querySelector(".btn-excluir").addEventListener("click", () => excluirAtleta(atleta.id));
    atletasAdmin.appendChild(item);
  });
}

async function carregarAtletas() {
  try {
    const consulta = query(collection(db, "atletas"), orderBy("criadoEm", "desc"));
    const snapshot = await getDocs(consulta);
    atletas = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    renderizarAtletas();
  } catch (erro) {
    console.error(erro);
    try {
      const snapshot = await getDocs(collection(db, "atletas"));
      atletas = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
      renderizarAtletas();
    } catch (erroFinal) {
      console.error(erroFinal);
      mostrarStatus(adminStatus, `Não foi possível carregar os atletas (${erroFinal.code || "erro"}).`, "erro");
    }
  }
}

function comprimirImagem(arquivo, maxLado = 900, qualidade = 0.82) {
  return new Promise((resolve, reject) => {
    if (!arquivo) return resolve("");
    const reader = new FileReader();
    reader.onload = evento => {
      const imagem = new Image();
      imagem.onload = () => {
        const escala = Math.min(1, maxLado / Math.max(imagem.width, imagem.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(imagem.width * escala));
        canvas.height = Math.max(1, Math.round(imagem.height * escala));
        const contexto = canvas.getContext("2d");
        contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", qualidade));
      };
      imagem.onerror = reject;
      imagem.src = evento.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(arquivo);
  });
}

foto.addEventListener("change", async () => {
  const arquivo = foto.files[0];
  if (!arquivo) return;
  try {
    const imagem = await comprimirImagem(arquivo);
    fotoPreview.src = imagem;
    fotoPreview.style.display = "block";
  } catch (erro) {
    console.error(erro);
    mostrarStatus(adminStatus, "Não foi possível processar a foto.", "erro");
  }
});

loginForm.addEventListener("submit", async evento => {
  evento.preventDefault();
  limparStatus(loginStatus);

  const email = loginEmail.value.trim().toLowerCase();
  const senha = loginPassword.value;

  if (!email || !senha) {
    mostrarStatus(loginStatus, "Informe e-mail e senha.", "erro");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, senha);
    loginForm.reset();
  } catch (erro) {
    console.error("Erro Firebase no login:", erro);
    mostrarStatus(loginStatus, mensagemErroLogin(erro), "erro");
  }
});

btnSair.addEventListener("click", async () => {
  await signOut(auth);
});

const btnEsqueciSenha = document.createElement("button");
btnEsqueciSenha.type = "button";
btnEsqueciSenha.textContent = "Esqueci minha senha";
btnEsqueciSenha.style.cssText = "background:none;border:0;color:#93c5fd;cursor:pointer;text-decoration:underline;padding:8px 0;font:inherit";
loginForm.appendChild(btnEsqueciSenha);

btnEsqueciSenha.addEventListener("click", async () => {
  const email = loginEmail.value.trim().toLowerCase();
  limparStatus(loginStatus);
  if (!email) {
    mostrarStatus(loginStatus, "Digite seu e-mail primeiro para receber o link de recuperação.", "erro");
    loginEmail.focus();
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    mostrarStatus(loginStatus, "Link de redefinição enviado. Verifique o e-mail informado.");
  } catch (erro) {
    console.error("Erro ao redefinir senha:", erro);
    mostrarStatus(loginStatus, mensagemErroLogin(erro), "erro");
  }
});

btnAdicionarTime.addEventListener("click", () => adicionarTime());
btnCancelar.addEventListener("click", resetarFormulario);

atletaForm.addEventListener("submit", async evento => {
  evento.preventDefault();
  limparStatus(adminStatus);

  const nomeValor = nome.value.trim();
  const timeValor = time.value.trim();
  const categoriaValor = categoria.value.trim();

  if (!nomeValor || !timeValor) {
    mostrarStatus(adminStatus, "Preencha nome e time atual.", "erro");
    return;
  }

  btnSalvar.disabled = true;
  btnSalvar.textContent = "Salvando...";

  try {
    let fotoBase64 = fotoAtual;
    if (foto.files[0]) fotoBase64 = await comprimirImagem(foto.files[0]);

    const dados = {
      nome: nomeValor,
      time: timeValor,
      categoria: categoriaValor,
      nivel: nivel.value,
      times: obterTimes(),
      foto: fotoBase64,
      avaliacoes: atletaId.value ? (atletas.find(item => item.id === atletaId.value)?.avaliacoes || []) : [],
      atualizadoEm: serverTimestamp()
    };

    if (atletaId.value) {
      await updateDoc(doc(db, "atletas", atletaId.value), dados);
      mostrarStatus(adminStatus, "Atleta atualizado com sucesso.");
    } else {
      await addDoc(collection(db, "atletas"), { ...dados, criadoEm: serverTimestamp() });
      mostrarStatus(adminStatus, "Atleta cadastrado com sucesso.");
    }

    resetarFormulario();
    await carregarAtletas();
  } catch (erro) {
    console.error("Erro ao salvar atleta:", erro);
    mostrarStatus(adminStatus, `Não foi possível salvar (${erro.code || "erro"}). Verifique as regras do Firestore.`, "erro");
  } finally {
    btnSalvar.disabled = false;
    btnSalvar.textContent = "Cadastrar atleta";
  }
});

onAuthStateChanged(auth, async usuario => {
  if (usuario) {
    loginSection.classList.add("hidden");
    adminSection.classList.remove("hidden");
    usuarioLogado.textContent = `Administrador conectado: ${usuario.email}`;
    resetarFormulario();
    await carregarAtletas();
  } else {
    loginSection.classList.remove("hidden");
    adminSection.classList.add("hidden");
    atletas = [];
  }
});