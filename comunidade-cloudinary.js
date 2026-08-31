import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { addDoc, collection, getFirestore, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { uploadCloudinary } from "./cloudinary-upload.js?v=20260831-1";

const firebaseConfig = {
  apiKey: "AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",
  authDomain: "jogadores-de-volei.firebaseapp.com",
  projectId: "jogadores-de-volei",
  storageBucket: "jogadores-de-volei.firebasestorage.app",
  messagingSenderId: "48728914064",
  appId: "1:48728914064:web:1dd7aeb705319886f74015",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = (id) => document.getElementById(id);
const text = (value) => (value == null ? "" : String(value).trim());

function setStatus(message, type = "") {
  const element = $("publishStatus");
  if (!element) return;
  element.textContent = message;
  element.className = `inline-status ${type}`.trim();
}

async function handleSubmit(event) {
  const form = $("publishForm");
  if (!form || event.target !== form) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  const button = form.querySelector('button[type="submit"]');
  const user = auth.currentUser;
  const name = text($("postName")?.value);
  const body = text($("postText")?.value);
  const file = $("postPhoto")?.files?.[0] || null;

  if (!user) {
    setStatus("Entre na sua conta para publicar na comunidade.", "error");
    return;
  }
  if (name.length < 2 || body.length < 3) {
    setStatus("Informe seu nome e escreva uma mensagem com pelo menos 3 caracteres.", "error");
    return;
  }

  if (button) button.disabled = true;
  setStatus(file ? "Enviando foto para o Cloudinary..." : "Enviando publicação para análise...");

  try {
    let upload = null;
    if (file) {
      upload = await uploadCloudinary(file, {
        maxBytes: 8 * 1024 * 1024,
        allowImage: true,
        allowVideo: false,
        tags: ["cadastro-de-atletas", "publicacoes", "comunidade"],
      });
    }

    await addDoc(collection(db, "publicacoes"), {
      ownerUid: user.uid,
      ownerEmail: user.email || "",
      nome: user.displayName || name,
      texto: body,
      imagem: upload?.url || "",
      imagemUrl: upload?.url || "",
      imagemPath: upload?.path || "",
      imagemMime: upload?.mime || "image/jpeg",
      imagemTamanho: Number(upload?.size || 0),
      legenda: body,
      tipo: "imagem",
      armazenamento: upload ? "cloudinary" : "nenhum",
      aprovado: false,
      status: "pendente",
      criadoEm: serverTimestamp(),
    });

    form.reset();
    if ($("postCounter")) $("postCounter").textContent = "0";
    const preview = $("photoPreview");
    if (preview) {
      preview.classList.add("hidden");
      preview.innerHTML = "";
    }
    setStatus("Publicação enviada. Ela aparecerá no feed depois da aprovação.", "success");
  } catch (error) {
    console.error("Comunidade Cloudinary:", error);
    setStatus(error?.message || "Não foi possível enviar agora. Confira sua conexão e tente novamente.", "error");
  } finally {
    if (button) button.disabled = false;
  }
}

document.addEventListener("submit", handleSubmit, true);
