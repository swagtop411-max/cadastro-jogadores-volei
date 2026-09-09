await import("./firebase-app-check-v11.js?v=20260909-46");
import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { collection, doc, getDoc, getDocs, getFirestore, limit, query, serverTimestamp, setDoc, where } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

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
const perfilId = params.get("id") || "";
const autoClaim = params.get("claim") === "1";
let profile = null;
let running = false;
let mounted = false;

const text = value => String(value ?? "").trim();
const ms = value => value?.toMillis?.() ?? (value?.seconds ? Number(value.seconds) * 1000 : new Date(value || 0).getTime() || 0);

function addStyles() {
  if (document.getElementById("claimStylesV45")) return;
  const style = document.createElement("style");
  style.id = "claimStylesV45";
  style.textContent = `
    .claim-button-v45{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;border:1px solid #078db8;background:linear-gradient(135deg,#00a6d8,#087fa8);color:#fff;border-radius:12px;padding:12px 16px;font:inherit;font-weight:900;cursor:pointer;box-shadow:0 8px 22px rgba(0,137,181,.18)}
    .claim-button-v45:disabled{opacity:.58;cursor:wait}
    .claim-status-v45{width:100%;box-sizing:border-box;margin:12px 0 0;padding:12px 14px;border-radius:12px;border:1px solid #cbdce6;background:#eff6fa;color:#29485b;font-size:13px;line-height:1.5}
    .claim-status-v45.success{border-color:#b6e1d0;background:#e8f7f1;color:#145d48}
    .claim-status-v45.warn{border-color:#efd09c;background:#fff7e7;color:#7a5410}
    .claim-status-v45.error{border-color:#efc7c0;background:#fff0ed;color:#8d3428}
  `;
  document.head.appendChild(style);
}

function returnUrl() {
  const url = new URL(location.href);
  url.searchParams.set("claim", "1");
  return `${url.pathname}${url.search}${url.hash}`;
}

function clearAutoClaim() {
  if (!autoClaim) return;
  const url = new URL(location.href);
  url.searchParams.delete("claim");
  history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function showStatus(box, message, type = "") {
  if (!box) return;
  box.hidden = false;
  box.className = `claim-status-v45${type ? ` ${type}` : ""}`;
  box.textContent = message;
}

async function ownClaims(user) {
  const rows = [];
  if (!user || !perfilId) return rows;
  try {
    const direct = await getDoc(doc(db, "reivindicacoes_perfis", `${perfilId}_${user.uid}`));
    if (direct.exists()) rows.push({ id: direct.id, ...direct.data() });
  } catch (error) {
    console.warn("Reivindicação direta V45:", error?.code || error);
  }
  try {
    const snap = await getDocs(query(
      collection(db, "reivindicacoes_perfis"),
      where("solicitanteUid", "==", user.uid),
      limit(100)
    ));
    snap.docs.forEach(item => {
      const data = item.data() || {};
      if (String(data.perfilId || "") !== String(perfilId)) return;
      if (!rows.some(row => row.id === item.id)) rows.push({ id: item.id, ...data });
    });
  } catch (error) {
    console.warn("Histórico de reivindicações V45:", error?.code || error);
  }
  return rows.sort((a, b) => ms(b.atualizadoEm || b.criadoEm) - ms(a.atualizadoEm || a.criadoEm));
}

function activeClaim(rows) {
  return rows.find(row => ["pendente", "aprovada"].includes(text(row.status).toLowerCase())) || null;
}

async function submitClaim(user) {
  if (!profile || !perfilId) throw new Error("Perfil antigo não localizado.");
  if (text(profile.ownerUid) === user.uid) {
    return { done: true, type: "success", message: "✓ Este perfil antigo já está vinculado à sua conta." };
  }

  const rows = await ownClaims(user);
  const existing = activeClaim(rows);
  if (existing) {
    const status = text(existing.status).toLowerCase();
    if (status === "aprovada") return { done: true, type: "success", message: "✓ Sua reivindicação já foi aprovada." };
    return { done: true, type: "success", message: "✓ Sua reivindicação já está aguardando análise do administrador." };
  }

  const directId = `${perfilId}_${user.uid}`;
  let claimId = directId;
  try {
    const existingDirect = await getDoc(doc(db, "reivindicacoes_perfis", directId));
    if (existingDirect.exists()) claimId = `${directId}_${Date.now()}`;
  } catch {}

  const perfilNomeRaw = text(profile.nome);
  const perfilNome = perfilNomeRaw.length >= 2 ? perfilNomeRaw.slice(0, 100) : "Atleta";
  const solicitanteNome = text(user.displayName || user.email?.split("@")[0] || "").slice(0, 100);

  await setDoc(doc(db, "reivindicacoes_perfis", claimId), {
    perfilId,
    perfilNome,
    solicitanteUid: user.uid,
    solicitanteEmail: user.email || "",
    solicitanteNome,
    status: "pendente",
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp()
  });

  if (text(profile.ownerUid) && text(profile.ownerUid) !== user.uid) {
    return {
      done: true,
      type: "warn",
      message: "✓ Solicitação enviada para revisão. Este cadastro antigo possui um vínculo anterior, então o administrador vai conferir antes de transferir o perfil."
    };
  }
  return { done: true, type: "success", message: "✓ Reivindicação enviada. O administrador já pode conferir e vincular este perfil antigo à sua conta." };
}

async function run(button, statusBox) {
  if (running || !profile || !perfilId) return;
  const user = auth.currentUser;
  if (!user) {
    location.href = `conta.html?tab=login&return=${encodeURIComponent(returnUrl())}`;
    return;
  }

  running = true;
  if (button) button.disabled = true;
  showStatus(statusBox, "Verificando sua conta e o vínculo deste perfil...");
  try {
    const result = await submitClaim(user);
    showStatus(statusBox, result.message, result.type);
    if (result.done) {
      button?.remove();
      clearAutoClaim();
    }
  } catch (error) {
    console.error("Reivindicação V45:", error);
    const code = text(error?.code);
    const message = code.includes("permission-denied")
      ? "O Firebase recusou a solicitação. Sua sessão pode estar desatualizada. Saia da conta, entre novamente e tente mais uma vez."
      : "Não foi possível enviar a reivindicação agora. Atualize a página e tente novamente.";
    showStatus(statusBox, message, "error");
    if (button) button.disabled = false;
  } finally {
    running = false;
  }
}

async function syncState(button, statusBox) {
  const user = auth.currentUser;
  if (!user || !profile) return;
  if (text(profile.ownerUid) === user.uid) {
    showStatus(statusBox, "✓ Este perfil antigo já está vinculado à sua conta.", "success");
    button?.remove();
    clearAutoClaim();
    return;
  }
  const rows = await ownClaims(user);
  const existing = activeClaim(rows);
  if (existing) {
    const approved = text(existing.status).toLowerCase() === "aprovada";
    showStatus(statusBox, approved ? "✓ Sua reivindicação já foi aprovada." : "✓ Sua reivindicação já está aguardando análise do administrador.", "success");
    button?.remove();
    clearAutoClaim();
    return;
  }
  if (text(profile.ownerUid) && text(profile.ownerUid) !== user.uid) {
    showStatus(statusBox, "Este cadastro antigo possui um vínculo anterior. Você ainda pode solicitar uma revisão para que o administrador confirme a titularidade.", "warn");
  }
  if (autoClaim && button) setTimeout(() => void run(button, statusBox), 100);
}

async function mount() {
  if (mounted || !perfilId) return;
  const actions = document.querySelector(".perfil-actions");
  if (!actions) return;
  try {
    const snap = await getDoc(doc(db, "atletas", perfilId));
    if (!snap.exists()) return;
    profile = { id: snap.id, ...snap.data() };
  } catch (error) {
    console.warn("Perfil para reivindicação V45:", error);
    return;
  }

  mounted = true;
  addStyles();
  const button = document.createElement("button");
  button.id = "reivindicarPerfilV45";
  button.type = "button";
  button.className = "claim-button-v45";
  button.textContent = "👤 REIVINDICAR ESTE PERFIL";
  const statusBox = document.createElement("div");
  statusBox.id = "reivindicacaoStatusV45";
  statusBox.className = "claim-status-v45";
  statusBox.hidden = true;
  actions.appendChild(button);
  actions.parentElement?.appendChild(statusBox);
  button.addEventListener("click", () => void run(button, statusBox));
  await syncState(button, statusBox);
}

const observer = new MutationObserver(() => {
  if (document.querySelector(".perfil-actions")) {
    observer.disconnect();
    void mount();
  }
});
observer.observe(document.body, { childList: true, subtree: true });
if (document.querySelector(".perfil-actions")) {
  observer.disconnect();
  void mount();
}

onAuthStateChanged(auth, async () => {
  const button = document.getElementById("reivindicarPerfilV45");
  const statusBox = document.getElementById("reivindicacaoStatusV45");
  if (!mounted) await mount();
  else await syncState(button, statusBox);
});
