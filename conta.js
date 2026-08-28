import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { createUserWithEmailAndPassword, getAuth, onAuthStateChanged, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, getFirestore, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = { apiKey: "AIzaSyBMsuR0320Nz3asVRJ5axXFV5KJ5Ftz9COQ", authDomain: "jogadores-de-volei.firebaseapp.com", projectId: "jogadores-de-volei", storageBucket: "jogadores-de-volei.firebasestorage.app", messagingSenderId: "48728914064", appId: "1:48728914064:web:1dd7aeb705319886f74015" };
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const $ = (id) => document.getElementById(id);
const status = $("accountStatus");
const loginForm = $("loginForm");
const registerForm = $("registerForm");
const logged = $("accountLogged");
const tabs = [...document.querySelectorAll("[data-account-tab]")];
const returnTarget = new URLSearchParams(location.search).get("return");
function redirectAfterLogin() {
  if (!returnTarget) return;
  try {
    const target = decodeURIComponent(returnTarget);
    if (target.startsWith("/") && !target.startsWith("//")) location.href = target;
  } catch { /* ignora destino inválido */ }
}

function setStatus(message, type = "") { status.textContent = message; status.className = `account-status ${type}`.trim(); }
function friendlyError(error) {
  const code = error?.code || "";
  const messages = {
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/wrong-password": "E-mail ou senha incorretos.",
    "auth/user-not-found": "E-mail ou senha incorretos.",
    "auth/email-already-in-use": "Este e-mail já possui uma conta. Tente entrar.",
    "auth/invalid-email": "Informe um e-mail válido.",
    "auth/weak-password": "Use uma senha com pelo menos 6 caracteres.",
    "auth/password-does-not-meet-requirements": "A senha não atende aos requisitos de segurança.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    "auth/network-request-failed": "Falha de conexão. Verifique sua internet e tente novamente.",
    "auth/user-disabled": "Esta conta está desativada. Entre em contato com a administração.",
    "auth/operation-not-allowed": "O login por e-mail e senha não está habilitado no Firebase. É necessário ativá-lo no console do projeto.",
    "auth/admin-restricted-operation": "O Firebase está bloqueando esta operação. Verifique se o provedor E-mail/Senha está habilitado no Authentication.",
    "auth/internal-error": "O Firebase encontrou um erro interno. Tente novamente em alguns instantes."
  };
  return messages[code] || error?.message || "Não foi possível concluir agora. Tente novamente.";
}
function setBusy(form, busy) { form.querySelectorAll("button").forEach((button) => { button.disabled = busy; }); }
function showTab(name) {
  tabs.forEach((tab) => { const active = tab.dataset.accountTab === name; tab.classList.toggle("active", active); tab.setAttribute("aria-selected", String(active)); });
  loginForm.classList.toggle("hidden", name !== "login");
  registerForm.classList.toggle("hidden", name !== "register");
  setStatus("");
}
function showLogged(user) {
  loginForm.classList.add("hidden"); registerForm.classList.add("hidden"); logged.classList.remove("hidden");
  $("loggedName").textContent = `Olá, ${user.displayName || "atleta"}!`;
  $("loggedEmail").textContent = user.email || "";
  tabs.forEach((tab) => { tab.classList.remove("active"); tab.setAttribute("aria-selected", "false"); });
}
function showSignedOut() { logged.classList.add("hidden"); showTab("login"); }

tabs.forEach((tab) => tab.addEventListener("click", () => showTab(tab.dataset.accountTab)));

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;
  if (!email || password.length < 6) return setStatus("Informe um e-mail válido e uma senha com pelo menos 6 caracteres.", "error");
  setBusy(loginForm, true); setStatus("Entrando...");
  try { await signInWithEmailAndPassword(auth, email, password); setStatus("Login realizado.", "success"); }
  catch (error) { setStatus(friendlyError(error), "error"); }
  finally { setBusy(loginForm, false); }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = $("registerName").value.trim(); const email = $("registerEmail").value.trim(); const password = $("registerPassword").value; const confirm = $("registerPasswordConfirm").value;
  if (name.length < 2) return setStatus("Informe seu nome ou nome esportivo.", "error");
  if (password.length < 6) return setStatus("A senha precisa ter pelo menos 6 caracteres.", "error");
  if (password !== confirm) return setStatus("As senhas não conferem.", "error");
  if (!$("acceptTerms").checked) return setStatus("Aceite os termos de uso para continuar.", "error");
  setBusy(registerForm, true); setStatus("Criando sua conta...");
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
      console.error("Conta criada, mas não foi possível criar o documento do usuário:", profileDocError);
      setStatus("Conta criada, mas o perfil ainda está sendo sincronizado. Você já pode entrar.", "success");
      return;
    }

    try {
      await sendEmailVerification(user);
    } catch (verificationError) {
      console.warn("Não foi possível enviar verificação agora:", verificationError);
    }

    setStatus("Conta criada com sucesso! Você já pode acessar seus cadastros.", "success");
  } catch (error) { setStatus(friendlyError(error), "error"); }
  finally { setBusy(registerForm, false); }
});

$("forgotPassword").addEventListener("click", async () => {
  const email = $("loginEmail").value.trim();
  if (!email) return setStatus("Digite seu e-mail para receber o link de recuperação.", "error");
  try { await sendPasswordResetEmail(auth, email); setStatus("Enviamos as instruções de recuperação para seu e-mail.", "success"); }
  catch (error) { setStatus(friendlyError(error), "error"); }
});

$("logoutButton").addEventListener("click", async () => { await signOut(auth); setStatus("Você saiu da conta.", "success"); });
onAuthStateChanged(auth, (user) => { if (user) { showLogged(user); redirectAfterLogin(); } else showSignedOut(); });
