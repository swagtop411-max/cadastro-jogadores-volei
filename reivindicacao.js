import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { collection, doc, getDoc, getFirestore, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const config = { apiKey: "AIzaSyBMsuR0320Nz3asVRJ5axXFvKJ5Ftz9COQ", authDomain: "jogadores-de-volei.firebaseapp.com", projectId: "jogadores-de-volei", storageBucket: "jogadores-de-volei.firebasestorage.app", messagingSenderId: "48728914064", appId: "1:48728914064:web:1dd7aeb705319886f74015" };
const app = getApps().length ? getApp() : initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);
const perfilId = new URLSearchParams(location.search).get("id");
const esc = (value) => { const div = document.createElement("div"); div.textContent = value ?? ""; return div.innerHTML; };
const safeReturn = () => `${location.pathname}${location.search}`;

function addStyles() {
  if (document.getElementById("claimStyles")) return;
  const style = document.createElement("style");
  style.id = "claimStyles";
  style.textContent = `.claim-button{border:1px solid rgba(217,169,63,.45);background:#111614;color:#f2cc72;border-radius:12px;padding:12px 16px;font:inherit;font-weight:900;cursor:pointer}.claim-button:hover{background:rgba(217,169,63,.12)}.claim-status{margin:12px 0 0;padding:11px 13px;border-radius:12px;background:#f2e6d2;color:#5d4634;font-size:13px}.claim-status.success{background:#e3ecd9;color:#304b3d}.claim-status.error{background:#f5dfd8;color:#8b3f2c}`;
  document.head.appendChild(style);
}

async function existingClaim(user) {
  const claimId = `${perfilId}_${user.uid}`;
  const snapshot = await getDoc(doc(db, "reivindicacoes_perfis", claimId));
  return snapshot.exists() ? snapshot.data() : null;
}

async function mountClaim(profile) {
  if (!perfilId || profile.ownerUid || document.getElementById("reivindicarPerfil")) return;
  const actions = document.querySelector(".perfil-actions");
  if (!actions) return;
  addStyles();
  const button = document.createElement("button");
  button.id = "reivindicarPerfil";
  button.type = "button";
  button.className = "claim-button";
  button.textContent = "👤 REIVINDICAR ESTE PERFIL";
  const status = document.createElement("div");
  status.className = "claim-status";
  status.hidden = true;
  actions.append(button);
  actions.parentElement?.append(status);
  button.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) {
      location.href = `conta.html?return=${encodeURIComponent(safeReturn())}`;
      return;
    }
    button.disabled = true;
    status.hidden = false;
    status.className = "claim-status";
    status.textContent = "Verificando sua solicitação...";
    try {
      const previous = await existingClaim(user);
      if (previous && previous.status !== "recusada") {
        status.className = "claim-status success";
        status.textContent = previous.status === "aprovada" ? "Este perfil já está vinculado a você." : "Sua solicitação já está aguardando análise do administrador.";
        return;
      }
      await setDoc(doc(db, "reivindicacoes_perfis", `${perfilId}_${user.uid}`), {
        perfilId,
        perfilNome: profile.nome || "Atleta",
        solicitanteUid: user.uid,
        solicitanteEmail: user.email || "",
        solicitanteNome: user.displayName || "",
        status: "pendente",
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      }, { merge: true });
      status.className = "claim-status success";
      status.textContent = "Solicitação enviada. O administrador vai conferir os dados e vincular o perfil à sua conta se estiver correto.";
    } catch (error) {
      console.error("Erro ao reivindicar perfil:", error);
      status.className = "claim-status error";
      status.textContent = error.code === "permission-denied" ? "Não foi possível enviar. Confirme que você está conectado e tente novamente." : "Não foi possível enviar a solicitação agora.";
      button.disabled = false;
    }
  });
}

async function init() {
  if (!perfilId) return;
  try {
    const snapshot = await getDoc(doc(db, "atletas", perfilId));
    if (snapshot.exists()) mountClaim({ id: snapshot.id, ...snapshot.data() });
  } catch (error) { console.warn("Não foi possível verificar o vínculo do perfil:", error); }
}

const observer = new MutationObserver(() => { if (document.querySelector(".perfil-actions")) { observer.disconnect(); init(); } });
observer.observe(document.body, { childList: true, subtree: true });
onAuthStateChanged(auth, () => {});
if (document.querySelector(".perfil-actions")) { observer.disconnect(); init(); }
