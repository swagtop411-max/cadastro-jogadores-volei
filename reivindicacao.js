import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { collection, doc, getDoc, getDocs, getFirestore, query, serverTimestamp, setDoc, where } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const config = {
  apiKey: "AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",
  authDomain: "jogadores-de-volei.firebaseapp.com",
  projectId: "jogadores-de-volei",
  storageBucket: "jogadores-de-volei.firebasestorage.app",
  messagingSenderId: "48728914064",
  appId: "1:48728914064:web:1dd7aeb705319886f74015"
};

const app = getApps().length ? getApp() : initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);
const params = new URLSearchParams(location.search);
const perfilId = params.get("id");
const autoClaim = params.get("claim") === "1";
const PENDING_CLAIM_KEY = "bd_pending_claim_v9";
let profileData = null;
let claimRunning = false;
let mounted = false;

function addStyles() {
  if (document.getElementById("claimStylesV9")) return;
  const style = document.createElement("style");
  style.id = "claimStylesV9";
  style.textContent = `
    .claim-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid #078db8;background:linear-gradient(135deg,#00a6d8,#087fa8);color:#fff;border-radius:12px;padding:12px 16px;font:inherit;font-weight:900;cursor:pointer;box-shadow:0 8px 22px rgba(0,137,181,.18)}
    .claim-button:hover{filter:brightness(1.04);transform:translateY(-1px)}
    .claim-button:disabled{opacity:.6;cursor:wait;transform:none}
    .claim-status{margin:12px 0 0;padding:12px 14px;border-radius:12px;border:1px solid #cbdce6;background:#eff6fa;color:#29485b;font-size:13px;line-height:1.5}
    .claim-status.success{border-color:#b6e1d0;background:#e8f7f1;color:#145d48}
    .claim-status.error{border-color:#efc7c0;background:#fff0ed;color:#8d3428}
  `;
  document.head.appendChild(style);
}

function claimReturnUrl() {
  const url = new URL(location.href);
  url.searchParams.set("claim", "1");
  return `${url.pathname}${url.search}`;
}

function rememberPendingClaim() {
  try {
    localStorage.setItem(PENDING_CLAIM_KEY, JSON.stringify({ perfilId, returnTo: claimReturnUrl(), savedAt: Date.now() }));
  } catch {}
}

function clearPendingClaim() {
  try { localStorage.removeItem(PENDING_CLAIM_KEY); } catch {}
}

function clearAutoClaimParam() {
  if (!autoClaim) return;
  const url = new URL(location.href);
  url.searchParams.delete("claim");
  history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

async function claimsForUser(user) {
  if (!user || !perfilId) return [];
  const rows = [];
  const directId = `${perfilId}_${user.uid}`;
  try {
    const direct = await getDoc(doc(db, "reivindicacoes_perfis", directId));
    if (direct.exists()) rows.push({ id: direct.id, ...direct.data() });
  } catch (error) {
    console.warn("Reivindicação direta:", error?.code || error);
  }

  try {
    const snap = await getDocs(query(
      collection(db, "reivindicacoes_perfis"),
      where("solicitanteUid", "==", user.uid)
    ));
    for (const item of snap.docs) {
      const data = item.data() || {};
      if (String(data.perfilId || "") !== String(perfilId)) continue;
      if (rows.some(row => row.id === item.id)) continue;
      rows.push({ id: item.id, ...data });
    }
  } catch (error) {
    console.warn("Histórico de reivindicações:", error?.code || error);
  }

  return rows.sort((a, b) => {
    const av = a.atualizadoEm?.toMillis?.() || a.criadoEm?.toMillis?.() || 0;
    const bv = b.atualizadoEm?.toMillis?.() || b.criadoEm?.toMillis?.() || 0;
    return bv - av;
  });
}

function latestClaimState(rows) {
  const active = rows.find(row => ["pendente", "aprovada"].includes(String(row.status || "").toLowerCase()));
  return active || rows[0] || null;
}

function statusFor(profile, user, claim) {
  if (profile?.ownerUid) {
    return profile.ownerUid === user?.uid
      ? { type: "success", text: "✓ Este perfil já está vinculado à sua conta.", done: true }
      : { type: "error", text: "Este perfil já está vinculado a outra conta. Se isso estiver incorreto, fale com a administração.", done: true };
  }
  if (!claim) return null;
  const state = String(claim.status || "").toLowerCase();
  if (state === "aprovada") return { type: "success", text: "✓ Sua reivindicação foi aprovada e o perfil está sendo vinculado à sua conta.", done: true };
  if (state === "pendente") return { type: "success", text: "Sua solicitação já está aguardando análise do administrador.", done: true };
  if (["rejeitada", "recusada"].includes(state)) return { type: "", text: "Uma solicitação anterior foi recusada. Você pode enviar uma nova reivindicação.", done: false };
  return null;
}

async function createClaim(user, profile) {
  const rows = await claimsForUser(user);
  const existing = latestClaimState(rows);
  const stateInfo = statusFor(profile, user, existing);
  if (stateInfo?.done) return { ...stateInfo, created: false };

  if (profile?.ownerUid) return statusFor(profile, user, existing);

  const deterministicId = `${perfilId}_${user.uid}`;
  const deterministicTaken = rows.some(row => row.id === deterministicId);
  const claimId = deterministicTaken
    ? `${perfilId}_${user.uid}_${Date.now()}`
    : deterministicId;

  await setDoc(doc(db, "reivindicacoes_perfis", claimId), {
    perfilId,
    perfilNome: profile?.nome || "Atleta",
    solicitanteUid: user.uid,
    solicitanteEmail: user.email || "",
    solicitanteNome: user.displayName || "",
    status: "pendente",
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp()
  });

  return {
    type: "success",
    text: "✓ Solicitação enviada. O administrador já consegue ver seu nome, e-mail, UID da conta e o ID deste perfil para fazer a vinculação.",
    done: true,
    created: true
  };
}

function setClaimStatus(element, info) {
  if (!element || !info) return;
  element.hidden = false;
  element.className = `claim-status${info.type ? ` ${info.type}` : ""}`;
  element.textContent = info.text;
}

async function runClaim(button, status) {
  if (claimRunning || !profileData || !perfilId) return;
  const user = auth.currentUser;
  if (!user) {
    rememberPendingClaim();
    location.href = `conta.html?return=${encodeURIComponent(claimReturnUrl())}`;
    return;
  }

  claimRunning = true;
  if (button) button.disabled = true;
  setClaimStatus(status, { type: "", text: "Verificando sua conta e preparando a reivindicação..." });
  try {
    const result = await createClaim(user, profileData);
    setClaimStatus(status, result);
    if (result?.done) {
      button?.remove();
      clearPendingClaim();
      clearAutoClaimParam();
    } else if (button) {
      button.disabled = false;
    }
  } catch (error) {
    console.error("Erro ao reivindicar perfil:", error);
    const msg = error?.code === "permission-denied"
      ? "O Firebase recusou a solicitação. Atualize a página e tente novamente conectado à sua conta. Se persistir, a administração já consegue vincular manualmente usando seu UID."
      : "Não foi possível enviar a reivindicação agora. Tente novamente em alguns instantes.";
    setClaimStatus(status, { type: "error", text: msg });
    if (button) button.disabled = false;
  } finally {
    claimRunning = false;
  }
}

async function mountClaim(profile) {
  if (!perfilId || mounted) return;
  const actions = document.querySelector(".perfil-actions");
  if (!actions) return;
  mounted = true;
  profileData = profile;
  addStyles();

  const button = document.createElement("button");
  button.id = "reivindicarPerfil";
  button.type = "button";
  button.className = "claim-button";
  button.textContent = "👤 REIVINDICAR ESTE PERFIL";

  const status = document.createElement("div");
  status.id = "reivindicacaoStatus";
  status.className = "claim-status";
  status.hidden = true;
  actions.append(button);
  actions.parentElement?.append(status);

  button.addEventListener("click", () => void runClaim(button, status));

  const user = auth.currentUser;
  if (user) {
    try {
      const rows = await claimsForUser(user);
      const info = statusFor(profile, user, latestClaimState(rows));
      if (info) {
        setClaimStatus(status, info);
        if (info.done) button.remove();
      }
    } catch (error) {
      console.warn("Estado da reivindicação:", error);
    }
  }

  if (autoClaim && auth.currentUser && document.body.contains(button)) {
    setTimeout(() => void runClaim(button, status), 120);
  }
}

async function init() {
  if (!perfilId) return;
  try {
    const snapshot = await getDoc(doc(db, "atletas", perfilId));
    if (snapshot.exists()) await mountClaim({ id: snapshot.id, ...snapshot.data() });
  } catch (error) {
    console.warn("Não foi possível carregar o perfil para reivindicação:", error);
  }
}

const observer = new MutationObserver(() => {
  if (document.querySelector(".perfil-actions")) {
    observer.disconnect();
    void init();
  }
});
observer.observe(document.body, { childList: true, subtree: true });

onAuthStateChanged(auth, user => {
  if (!user || !profileData) return;
  const button = document.getElementById("reivindicarPerfil");
  const status = document.getElementById("reivindicacaoStatus");
  if (autoClaim && button) setTimeout(() => void runClaim(button, status), 80);
});

if (document.querySelector(".perfil-actions")) {
  observer.disconnect();
  void init();
}
