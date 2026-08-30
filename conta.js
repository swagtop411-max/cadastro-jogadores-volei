import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",
  authDomain: "jogadores-de-volei.firebaseapp.com",
  projectId: "jogadores-de-volei",
  storageBucket: "jogadores-de-volei.firebasestorage.app",
  messagingSenderId: "48728914064",
  appId: "1:48728914064:web:1dd7aeb705319886f74015"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = (id) => document.getElementById(id);
const status = $("accountStatus");
const loginForm = $("loginForm");
const registerForm = $("registerForm");
const logged = $("accountLogged");
const tabs = [...document.querySelectorAll("[data-account-tab]")];
const urlParams = new URLSearchParams(location.search);\nconst returnTarget = urlParams.get("return");\nconst requestedTab = urlParams.get("tab");

function redirectAfterLogin() {
  if (!returnTarget) return;
  try {
    const target = decodeURIComponent(returnTarget);
    if (target.startsWith("/") && !target.startsWith("//")) location.href = target;
  } catch {
    // destino inválido
  }
}

function setStatus(message, type = "") {
  if (!status) return;
  status.textContent = message;
  status.className = `account-status ${type}`.trim();
}

function friendlyError(error, operation = "generic") {
  const code = error?.code || "";
  console.error(`Firebase ${operation} error:`, error);

  const messages = {
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/wrong-password": "E-mail ou senha incorretos.",
    "auth/user-not-found": "E-mail ou senha incorretos.",
    "auth/invalid-email": "Informe um e-mail válido.",
    "auth/email-already-in-use": 'Este e-mail já possui uma conta. Entre na aba "Entrar".',
    "auth/weak-password": "Use uma senha com pelo menos 6 caracteres.",
    "auth/password-does-not-meet-requirements": "A senha não atende aos requisitos de segurança do Firebase.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    "auth/network-request-failed": "Falha de conexão. Verifique sua internet e tente novamente.",
    "auth/user-disabled": "Esta conta está desativada. Entre em contato com a administração.",
    "auth/operation-not-allowed": 'O cadastro por e-mail e senha está desativado no Firebase. Ative o provedor "E-mail/Senha" em Authentication → Sign-in method.',
    "auth/admin-restricted-operation": 'O Firebase está bloqueando o cadastro por e-mail/senha. Ative o provedor "E-mail/Senha" em Authentication → Sign-in method.',
    "auth/internal-error": "O Firebase encontrou um erro interno. Tente novamente em alguns instantes.",
    "auth/unauthorized-domain": "Este domínio ainda não está autorizado no Firebase Authentication. Adicione o domínio do site em Authentication → Settings → Authorized domains.",
    "auth/invalid-api-key": "A configuração do Firebase está inválida. Verifique a chave da aplicação.",
    "auth/api-key-not-valid-please-pass-a-valid-api-key": "A chave da API do Firebase deste site está inválida ou foi revogada. Atualize o firebaseConfig do aplicativo Web no Firebase e publique novamente.",
    "auth/invalid-api-key": "A configuração do Firebase está inválida. Verifique a chave da aplicação.",
    "auth/app-not-authorized": "Esta aplicação não está autorizada pelo Firebase. Verifique o domínio e a configuração do projeto.",
    "permission-denied": "A conta foi criada, mas o perfil não pôde ser salvo. Avise a administração."
  };

  if (messages[code]) return messages[code];

  if (operation === "register") {
    // Nunca esconder o código real durante o diagnóstico: isso permite identificar
    // exatamente qual bloqueio o Firebase está devolvendo no ambiente publicado.
    const detail = [code, error?.message].filter(Boolean).join(" — ");
    return detail
      ? `Não foi possível criar a conta. Firebase: ${detail}`
      : "Não foi possível criar a conta. Verifique a configuração do Firebase e tente novamente.";
  }

  if (operation === "login") {
    const detail = [code, error?.message].filter(Boolean).join(" — ");
    return detail
      ? `Não foi possível entrar. Firebase: ${detail}`
      : "Não foi possível entrar. Verifique o e-mail, a senha e a configuração do Firebase.";
  }

  return error?.message || "Não foi possível concluir agora. Tente novamente.";
}

function setBusy(form, busy) {
  form.querySelectorAll("button").forEach((button) => {
    button.disabled = busy;
  });
}

function showTab(name) {
  const isRegister = name === "register";

  tabs.forEach((tab) => {
    const active = tab.dataset.accountTab === name;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  loginForm.classList.toggle("hidden", isRegister);
  registerForm.classList.toggle("hidden", !isRegister);
  logged.classList.add("hidden");
  setStatus("");
}

async function redirectToProfileIfNeeded(user, forceOnRegister = false) {
  if (forceOnRegister) {
    location.href = "meu-perfil.html?novo=1";
    return;
  }
  try {
    const profileSnap = await getDoc(doc(db, "perfis", user.uid));
    if (!profileSnap.exists() || !profileSnap.data()?.nome || !profileSnap.data()?.cidade || !profileSnap.data()?.uf) {
      location.href = "meu-perfil.html?novo=1";
    }
  } catch (error) {
    console.warn("Não foi possível verificar o perfil:", error);
  }
}

function showLogged(user) {
  loginForm.classList.add("hidden");
  registerForm.classList.add("hidden");
  logged.classList.remove("hidden");

  $("loggedName").textContent = `Olá, ${user.displayName || "atleta"}!`;
  $("loggedEmail").textContent = user.email || "";

  tabs.forEach((tab) => {
    tab.classList.remove("active");
    tab.setAttribute("aria-selected", "false");
  });
}

function showSignedOut() {
  logged.classList.add("hidden");
  showTab("login");
}

tabs.forEach((tab) => {
  tab.addEventListener("click", (event) => {
    event.preventDefault();
    showTab(tab.dataset.accountTab);
  });
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = $("loginEmail").value.trim().toLowerCase();
  const password = $("loginPassword").value;

  if (!email || !email.includes("@")) {
    setStatus("Informe um e-mail válido.", "error");
    return;
  }

  if (password.length < 6) {
    setStatus("A senha precisa ter pelo menos 6 caracteres.", "error");
    return;
  }

  setBusy(loginForm, true);
  setStatus("Entrando...");

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    setStatus(`Login realizado. Bem-vindo, ${credential.user.displayName || "atleta"}!`, "success");
    redirectAfterLogin();
  } catch (error) {
    setStatus(friendlyError(error, "login"), "error");
  } finally {
    setBusy(loginForm, false);
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = $("registerName").value.trim();
  const email = $("registerEmail").value.trim().toLowerCase();
  const password = $("registerPassword").value;
  const confirm = $("registerPasswordConfirm").value;

  if (name.length < 2) {
    setStatus("Informe seu nome ou nome esportivo.", "error");
    return;
  }

  if (!email || !email.includes("@")) {
    setStatus("Informe um e-mail válido.", "error");
    return;
  }

  if (password.length < 6) {
    setStatus("A senha precisa ter pelo menos 6 caracteres.", "error");
    return;
  }

  if (password !== confirm) {
    setStatus("As senhas não conferem.", "error");
    return;
  }

  if (!$("acceptTerms").checked) {
    setStatus("Aceite os termos de uso para continuar.", "error");
    return;
  }

  setBusy(registerForm, true);
  setStatus("Criando sua conta...");

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    try {
      await updateProfile(user, { displayName: name });
    } catch (profileError) {
      console.warn("Não foi possível salvar o nome no perfil de autenticação:", profileError);
    }

    try {
      await setDoc(doc(db, "usuarios", user.uid), {
        uid: user.uid,
        nome: name,
        email,
        papel: "usuario",
        status: "ativo",
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      }, { merge: true });
    } catch (profileDocError) {
      console.error("Conta criada, mas falhou a sincronização do perfil no Firestore:", { code: profileDocError?.code, message: profileDocError?.message });
    }

    try {
      await sendEmailVerification(user);
    } catch (verificationError) {
      console.warn("Não foi possível enviar o e-mail de verificação agora:", verificationError);
    }

    setStatus("Conta criada! Agora complete seu perfil para entrar na rede.", "success");
    showLogged(user);
    await redirectToProfileIfNeeded(user, true);
  } catch (error) {
    console.error("Falha no cadastro da conta:", { code: error?.code, message: error?.message });
    setStatus(friendlyError(error, "register"), "error");
  } finally {
    setBusy(registerForm, false);
  }
});

$("forgotPassword").addEventListener("click", async () => {
  const email = $("loginEmail").value.trim().toLowerCase();

  if (!email || !email.includes("@")) {
    setStatus("Digite seu e-mail para receber o link de recuperação.", "error");
    return;
  }

  try {
    setStatus("Enviando instruções de recuperação...");
    await sendPasswordResetEmail(auth, email);
    setStatus("Enviamos as instruções de recuperação para seu e-mail.", "success");
  } catch (error) {
    setStatus(friendlyError(error, "login"), "error");
  }
});

$("logoutButton").addEventListener("click", async () => {
  try {
    await signOut(auth);
    setStatus("Você saiu da conta.", "success");
  } catch (error) {
    setStatus("Não foi possível sair agora. Tente novamente.", "error");
  }
});

if (requestedTab === "register") showTab("register");\n\nonAuthStateChanged(auth, (user) => {
  if (user) {
    showLogged(user);
    redirectAfterLogin();
    if (!location.pathname.endsWith("/meu-perfil.html")) redirectToProfileIfNeeded(user);
  } else {
    showSignedOut();
  }
});
