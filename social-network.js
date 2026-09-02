import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  addDoc, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, getFirestore,
  limit, onSnapshot, orderBy, query, setDoc, Timestamp, updateDoc, where
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const cfg = {
  apiKey: "AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",
  authDomain: "jogadores-de-volei.firebaseapp.com",
  projectId: "jogadores-de-volei",
  storageBucket: "jogadores-de-volei.firebasestorage.app",
  messagingSenderId: "48728914064",
  appId: "1:48728914064:web:1dd7aeb705319886f74015"
};

const app = getApps().length ? getApp() : initializeApp(cfg);
export const socialAuth = getAuth(app);
export const socialDb = getFirestore(app);
let currentUser = socialAuth.currentUser;
let unsubInbox = null;
let unsubNotifications = null;
let unsubMessages = null;
let storyTimer = null;
const profileCache = new Map();

const esc = (value) => {
  const el = document.createElement("div");
  el.textContent = value == null ? "" : String(value);
  return el.innerHTML;
};
const millis = (v) => {
  if (!v) return 0;
  if (typeof v.toMillis === "function") return v.toMillis();
  if (v.seconds) return Number(v.seconds) * 1000;
  const n = new Date(v).getTime();
  return Number.isFinite(n) ? n : 0;
};
const fallbackAvatar = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#18221d"/><text x="100" y="125" text-anchor="middle" font-size="72">🏐</text></svg>');

function installStyles() {
  if (document.getElementById("socialNetworkStyles")) return;
  const style = document.createElement("style");
  style.id = "socialNetworkStyles";
  style.textContent = `
  .sn-header-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;min-width:38px;height:38px;border:1px solid rgba(217,169,63,.35);border-radius:10px;background:#101612;color:#f2cc72;cursor:pointer;font-weight:900}
  .sn-badge{position:absolute;right:-5px;top:-6px;min-width:18px;height:18px;padding:0 5px;border-radius:20px;background:#ef5d4f;color:#fff;font:800 10px/18px Arial;text-align:center;box-shadow:0 0 0 2px #080d0b}.sn-badge[hidden]{display:none!important}
  .sn-overlay{position:fixed;inset:0;z-index:20000;background:rgba(0,0,0,.78);display:none;align-items:stretch;justify-content:flex-end}.sn-overlay.open{display:flex}
  .sn-panel{width:min(430px,100vw);height:100%;background:#080d0b;border-left:1px solid rgba(217,169,63,.25);display:flex;flex-direction:column;box-shadow:-20px 0 60px rgba(0,0,0,.45)}
  .sn-panel-head{display:flex;align-items:center;justify-content:space-between;padding:18px;border-bottom:1px solid rgba(217,169,63,.18)}.sn-panel-head h3{margin:0;color:#f2cc72;font:900 18px Arial}.sn-close{border:0;background:transparent;color:#f2cc72;font-size:25px;cursor:pointer}
  .sn-list{overflow:auto;flex:1;padding:8px}.sn-row{display:flex;gap:11px;align-items:center;padding:11px;border-radius:12px;color:#eee;text-decoration:none;cursor:pointer}.sn-row:hover{background:#111914}.sn-row.unread{background:#132019}.sn-row img{width:50px;height:50px;border-radius:50%;object-fit:cover;border:1px solid rgba(242,204,114,.35)}.sn-row-main{min-width:0;flex:1}.sn-row-main strong,.sn-row-main span{display:block}.sn-row-main strong{font-size:13px}.sn-row-main span{margin-top:4px;color:#9aa19b;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sn-row time{color:#767d77;font-size:9px}
  .sn-chat{position:fixed;z-index:21000;right:18px;bottom:18px;width:min(390px,calc(100vw - 24px));height:min(610px,calc(100vh - 40px));display:none;flex-direction:column;background:#0b100d;border:1px solid rgba(217,169,63,.3);border-radius:18px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.65)}.sn-chat.open{display:flex}.sn-chat-head{display:flex;align-items:center;gap:9px;padding:12px 14px;border-bottom:1px solid rgba(217,169,63,.18)}.sn-chat-head img{width:36px;height:36px;border-radius:50%;object-fit:cover}.sn-chat-head strong{flex:1;color:#f4efe2}.sn-chat-messages{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:7px}.sn-msg{max-width:78%;padding:9px 11px;border-radius:14px;background:#172019;color:#eee;font-size:12px;line-height:1.4;align-self:flex-start}.sn-msg.mine{align-self:flex-end;background:linear-gradient(135deg,#e8bc58,#b87d20);color:#111}.sn-msg small{display:block;opacity:.55;font-size:8px;margin-top:4px;text-align:right}.sn-chat-form{display:flex;gap:7px;padding:10px;border-top:1px solid rgba(217,169,63,.15)}.sn-chat-form input{flex:1;min-width:0;border:1px solid rgba(217,169,63,.25);border-radius:20px;background:#111713;color:#fff;padding:10px 13px;outline:none}.sn-chat-form button{border:0;border-radius:20px;padding:0 15px;background:#e8bc58;color:#111;font-weight:900;cursor:pointer}
  .sn-story-ring{position:relative;cursor:pointer;border-radius:50%;padding:3px;background:linear-gradient(135deg,#f8d771,#e07837,#b841c6)}.sn-story-ring.seen{background:#485049}.sn-story-ring>img,.sn-story-ring>video{display:block;border-radius:50%;border:3px solid #0a0f0c;object-fit:cover}
  .sn-story-viewer{position:fixed;inset:0;z-index:22000;background:rgba(0,0,0,.97);display:none;align-items:center;justify-content:center}.sn-story-viewer.open{display:flex}
  .sn-story-card{position:relative;width:min(540px,100vw);height:min(900px,100vh);background:#000;overflow:hidden}
  .sn-story-content{position:absolute;inset:0;display:grid;place-items:center;background:#000;overflow:hidden}
  .sn-story-media{display:block;width:auto!important;height:auto!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;background:#000;image-rendering:auto}
  video.sn-story-media{width:100%!important;height:100%!important}
  .sn-story-top{position:absolute;left:0;right:0;top:0;z-index:5;padding:10px;background:linear-gradient(rgba(0,0,0,.78),transparent)}.sn-progresses{display:flex;gap:3px;margin-bottom:10px}.sn-progress{height:2px;flex:1;background:rgba(255,255,255,.35);overflow:hidden}.sn-progress i{display:block;height:100%;width:0;background:#fff}.sn-progress.done i{width:100%}
  .sn-story-user{display:inline-flex;align-items:center;gap:8px;color:#fff!important;font:800 11px Arial;text-decoration:none;max-width:calc(100% - 105px);cursor:pointer}.sn-story-user:hover strong{text-decoration:underline}.sn-story-user img{width:32px;height:32px;border-radius:50%;object-fit:cover}.sn-story-user strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .sn-story-close{position:absolute;right:9px;top:7px;border:0;background:transparent;color:#fff;font-size:25px;cursor:pointer}.sn-story-delete{position:absolute;right:44px;top:11px;border:1px solid rgba(255,255,255,.3);border-radius:8px;background:rgba(0,0,0,.45);color:#fff;padding:5px 8px;font:800 9px Arial;cursor:pointer}.sn-story-delete:hover{background:#7f211b}
  .sn-story-nav{position:absolute;top:55px;bottom:0;width:32%;border:0;background:transparent;cursor:pointer;z-index:2}.sn-story-prev{left:0}.sn-story-next{right:0}.sn-story-caption{position:absolute;left:16px;right:16px;bottom:20px;color:#fff;text-align:center;text-shadow:0 1px 5px #000;font-size:12px;z-index:4;pointer-events:none}
  .sn-notification-icon{width:32px;text-align:center;font-size:18px}.sn-empty{padding:28px 15px;text-align:center;color:#8c948e;font-size:12px}
  @media(max-width:700px){.sn-chat{right:6px;bottom:6px;height:calc(100vh - 12px);width:calc(100vw - 12px)}.sn-panel{width:100vw}.sn-story-card{width:100vw;height:100vh}}
  `;
  document.head.appendChild(style);
}

async function profileOf(uid) {
  if (!uid) return { uid: "", nome: "Atleta", fotoUrl: fallbackAvatar };
  if (profileCache.has(uid)) return profileCache.get(uid);
  try {
    const snap = await getDoc(doc(socialDb, "perfis", uid));
    const p = snap.exists() ? { uid, ...snap.data() } : { uid, nome: "Atleta" };
    p.fotoUrl = p.fotoUrl || fallbackAvatar;
    profileCache.set(uid, p);
    return p;
  } catch {
    return { uid, nome: "Atleta", fotoUrl: fallbackAvatar };
  }
}

function socialGate() {
  if (currentUser) return true;
  location.href = `conta.html?tab=login&return=${encodeURIComponent(location.pathname + location.search + location.hash)}`;
  return false;
}
function conversationId(a, b) { return [a, b].sort().join("__"); }

function ensureBaseUI() {
  installStyles();
  if (!document.getElementById("snInboxOverlay")) {
    document.body.insertAdjacentHTML("beforeend", `
      <div id="snInboxOverlay" class="sn-overlay" aria-hidden="true"><section class="sn-panel"><div class="sn-panel-head"><h3>Mensagens</h3><button class="sn-close" data-sn-close="snInboxOverlay">×</button></div><div id="snInboxList" class="sn-list"></div></section></div>
      <div id="snNotificationsOverlay" class="sn-overlay" aria-hidden="true"><section class="sn-panel"><div class="sn-panel-head"><h3>Notificações</h3><button class="sn-close" data-sn-close="snNotificationsOverlay">×</button></div><div id="snNotificationsList" class="sn-list"></div></section></div>
      <section id="snChat" class="sn-chat" aria-hidden="true"><div class="sn-chat-head"><img id="snChatAvatar" alt=""><strong id="snChatName">Conversa</strong><button class="sn-close" data-sn-chat-close>×</button></div><div id="snChatMessages" class="sn-chat-messages"></div><form id="snChatForm" class="sn-chat-form"><input id="snChatInput" maxlength="2000" autocomplete="off" placeholder="Mensagem..." required><button>Enviar</button></form></section>
    `);
    document.addEventListener("click", (e) => {
      const close = e.target.closest?.("[data-sn-close]");
      if (close) document.getElementById(close.dataset.snClose)?.classList.remove("open");
      if (e.target.classList?.contains("sn-overlay")) e.target.classList.remove("open");
      if (e.target.closest?.("[data-sn-chat-close]")) closeChat();
    });
  }
  const header = document.querySelector(".header-actions");
  if (header && !document.getElementById("snInboxButton")) {
    const wrap = document.createElement("span");
    wrap.style.display = "contents";
    wrap.innerHTML = `<button id="snInboxButton" class="sn-header-btn" type="button" title="Mensagens">✉<span id="snInboxBadge" class="sn-badge" hidden>0</span></button><button id="snNotificationsButton" class="sn-header-btn" type="button" title="Notificações">🔔<span id="snNotificationsBadge" class="sn-badge" hidden>0</span></button>`;
    header.prepend(wrap);
    document.getElementById("snInboxButton").onclick = () => socialGate() && openInbox();
    document.getElementById("snNotificationsButton").onclick = () => socialGate() && openNotifications();
  }
}

function setBadge(id, count) {
  const badge = document.getElementById(id);
  if (!badge) return;
  badge.hidden = !count;
  badge.textContent = count > 99 ? "99+" : String(count || 0);
}

async function renderInboxDocs(docs) {
  const list = document.getElementById("snInboxList");
  if (!list || !currentUser) return;
  const rows = [];
  const sorted=docs.sort((a,b)=>millis(b.data().lastMessageAt)-millis(a.data().lastMessageAt));
  const otherUids=[...new Set(sorted.map(d=>(d.data().participants||[]).find(x=>x!==currentUser.uid)).filter(Boolean))];
  await Promise.all(otherUids.map(profileOf));
  for (const d of sorted) {
    const data = d.data();
    const otherUid = (data.participants || []).find(x => x !== currentUser.uid);
    if (!otherUid) continue;
    const p = profileCache.get(otherUid)||await profileOf(otherUid);
    const unread = data.lastSenderUid && data.lastSenderUid !== currentUser.uid && !(data.lastReadBy || []).includes(currentUser.uid);
    rows.push(`<div class="sn-row${unread ? " unread" : ""}" data-sn-conversation="${esc(d.id)}" data-sn-other="${esc(otherUid)}"><img src="${esc(p.fotoUrl || fallbackAvatar)}" alt=""><div class="sn-row-main"><strong>${esc(p.nome || "Atleta")}</strong><span>${esc(data.lastMessage || "Inicie uma conversa")}</span></div><time>${data.lastMessageAt ? new Date(millis(data.lastMessageAt)).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) : ""}</time></div>`);
  }
  list.innerHTML = rows.join("") || '<div class="sn-empty">Nenhuma conversa ainda.</div>';
  list.querySelectorAll("[data-sn-conversation]").forEach(row => row.onclick = async () => {
    const p = await profileOf(row.dataset.snOther);
    openChatWith(row.dataset.snOther, p.nome, p.fotoUrl);
  });
}

function watchInbox() {
  if (unsubInbox) { unsubInbox(); unsubInbox = null; }
  if (!currentUser) { setBadge("snInboxBadge", 0); return; }
  const q = query(collection(socialDb, "conversas"), where("participants", "array-contains", currentUser.uid), limit(200));
  unsubInbox = onSnapshot(q, snap => {
    const unread = snap.docs.filter(d => {
      const x=d.data(); return x.lastSenderUid && x.lastSenderUid !== currentUser.uid && !(x.lastReadBy||[]).includes(currentUser.uid);
    }).length;
    setBadge("snInboxBadge", unread);
    if (document.getElementById("snInboxOverlay")?.classList.contains("open")) renderInboxDocs([...snap.docs]);
  }, err => console.warn("Inbox realtime:", err));
}

export async function openInbox() {
  ensureBaseUI();
  if (!socialGate()) return;
  const overlay = document.getElementById("snInboxOverlay");
  overlay.classList.add("open");
  const list = document.getElementById("snInboxList");
  list.innerHTML = '<div class="sn-empty">Carregando conversas...</div>';
  try {
    const snap = await getDocs(query(collection(socialDb,"conversas"),where("participants","array-contains",currentUser.uid),limit(200)));
    await renderInboxDocs([...snap.docs]);
  } catch (e) {
    console.error(e);
    list.innerHTML='<div class="sn-empty">Não foi possível carregar as conversas.</div>';
  }
}

export async function createNotification(targetUid, type, { sourceId="", text="" }={}) {
  if (!currentUser || !targetUid || targetUid === currentUser.uid) return;
  try {
    const me = await profileOf(currentUser.uid);
    await addDoc(collection(socialDb,"notificacoes",targetUid,"itens"),{
      targetUid,
      actorUid: currentUser.uid,
      actorNome: me.nome || currentUser.displayName || "Atleta",
      actorFoto: me.fotoUrl || "",
      type,
      sourceId: String(sourceId || "").slice(0,200),
      text: String(text || "").slice(0,500),
      lida: false,
      createdAt: Timestamp.now()
    });
  } catch (e) { console.warn("Notificação:", e); }
}

function notificationText(x) {
  if (x.type === "like") return "curtiu sua publicação.";
  if (x.type === "comment") return `comentou${x.text ? ": " + x.text : " na sua publicação."}`;
  if (x.type === "follow") return "começou a seguir você.";
  if (x.type === "message") return `enviou uma mensagem${x.text ? ": " + x.text : "."}`;
  return x.text || "interagiu com você.";
}

function watchNotifications() {
  if (unsubNotifications) { unsubNotifications(); unsubNotifications = null; }
  if (!currentUser) { setBadge("snNotificationsBadge",0); return; }
  unsubNotifications = onSnapshot(query(collection(socialDb,"notificacoes",currentUser.uid,"itens"),limit(150)), snap => {
    setBadge("snNotificationsBadge", snap.docs.filter(d=>d.data().lida!==true).length);
    if (document.getElementById("snNotificationsOverlay")?.classList.contains("open")) renderNotifications([...snap.docs]);
  }, err=>console.warn("Notificações realtime:",err));
}

async function renderNotifications(docs) {
  const list=document.getElementById("snNotificationsList"); if(!list)return;
  docs.sort((a,b)=>millis(b.data().createdAt)-millis(a.data().createdAt));
  list.innerHTML=docs.map(d=>{const x=d.data();return `<div class="sn-row${x.lida===true?"":" unread"}" data-sn-notification="${esc(d.id)}" data-sn-actor="${esc(x.actorUid||"")}"><div class="sn-notification-icon">${x.type==="like"?"❤":x.type==="comment"?"💬":x.type==="follow"?"➕":"✉"}</div><img src="${esc(x.actorFoto||fallbackAvatar)}" alt=""><div class="sn-row-main"><strong>${esc(x.actorNome||"Atleta")}</strong><span>${esc(notificationText(x))}</span></div></div>`}).join("")||'<div class="sn-empty">Nenhuma notificação.</div>';
  for(const row of list.querySelectorAll("[data-sn-notification]")){
    row.onclick=async()=>{
      try{await updateDoc(doc(socialDb,"notificacoes",currentUser.uid,"itens",row.dataset.snNotification),{lida:true})}catch{}
      if(row.dataset.snActor) location.href=`perfil-social.html?uid=${encodeURIComponent(row.dataset.snActor)}`;
    };
  }
}

export async function openNotifications(){
  ensureBaseUI(); if(!socialGate())return;
  const overlay=document.getElementById("snNotificationsOverlay");overlay.classList.add("open");
  const list=document.getElementById("snNotificationsList");list.innerHTML='<div class="sn-empty">Carregando...</div>';
  try{const snap=await getDocs(query(collection(socialDb,"notificacoes",currentUser.uid,"itens"),limit(150)));await renderNotifications([...snap.docs]);}
  catch(e){console.error(e);list.innerHTML='<div class="sn-empty">Não foi possível carregar as notificações.</div>'}
}

let activeChat = { id:"", otherUid:"" };
export async function openChatWith(otherUid, otherName="Atleta", otherAvatar="") {
  ensureBaseUI(); if(!socialGate() || !otherUid || otherUid===currentUser.uid)return;
  const chatId=conversationId(currentUser.uid,otherUid); activeChat={id:chatId,otherUid};
  const other=await profileOf(otherUid); otherName=other.nome||otherName;otherAvatar=other.fotoUrl||otherAvatar||fallbackAvatar;
  const chat=document.getElementById("snChat");chat.classList.add("open");
  document.getElementById("snChatName").textContent=otherName;document.getElementById("snChatAvatar").src=otherAvatar;
  try{
    const ref=doc(socialDb,"conversas",chatId), snap=await getDoc(ref);
    if(!snap.exists())await setDoc(ref,{participants:[currentUser.uid,otherUid].sort(),lastMessage:"",lastSenderUid:"",lastMessageAt:Timestamp.now(),lastReadBy:[currentUser.uid],createdAt:Timestamp.now()});
    else await updateDoc(ref,{lastReadBy:arrayUnion(currentUser.uid)});
  }catch(e){console.error("Abrir conversa:",e)}
  watchMessages(chatId);
  document.getElementById("snChatInput")?.focus();
}

function watchMessages(chatId){
  if(unsubMessages){unsubMessages();unsubMessages=null}
  const list=document.getElementById("snChatMessages");list.innerHTML='<div class="sn-empty">Carregando...</div>';
  const q=query(collection(socialDb,"conversas",chatId,"mensagens"),orderBy("createdAt","asc"),limit(200));
  unsubMessages=onSnapshot(q,snap=>{
    list.innerHTML=snap.docs.map(d=>{const x=d.data(),mine=x.senderUid===currentUser?.uid;return `<div class="sn-msg${mine?" mine":""}">${esc(x.text||"")}<small>${millis(x.createdAt)?new Date(millis(x.createdAt)).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}):""}</small></div>`}).join("")||'<div class="sn-empty">Envie a primeira mensagem.</div>';
    list.scrollTop=list.scrollHeight;
    updateDoc(doc(socialDb,"conversas",chatId),{lastReadBy:arrayUnion(currentUser.uid)}).catch(()=>{});
  },err=>{console.error(err);list.innerHTML='<div class="sn-empty">Mensagens indisponíveis.</div>'});
}

function closeChat(){
  if(unsubMessages){unsubMessages();unsubMessages=null}
  document.getElementById("snChat")?.classList.remove("open");
  activeChat={id:"",otherUid:""};
}

function installChatForm(){
  const form=document.getElementById("snChatForm");if(!form||form.dataset.ready)return;form.dataset.ready="1";
  form.onsubmit=async(e)=>{
    e.preventDefault();if(!currentUser||!activeChat.id)return;
    const input=document.getElementById("snChatInput"),text=input.value.trim();if(!text)return;
    const btn=form.querySelector("button");btn.disabled=true;
    try{
      await addDoc(collection(socialDb,"conversas",activeChat.id,"mensagens"),{senderUid:currentUser.uid,text,type:"text",createdAt:Timestamp.now()});
      await setDoc(doc(socialDb,"conversas",activeChat.id),{participants:[currentUser.uid,activeChat.otherUid].sort(),lastMessage:text.slice(0,500),lastSenderUid:currentUser.uid,lastMessageAt:Timestamp.now(),lastReadBy:[currentUser.uid]}, {merge:true});
      input.value="";
      await createNotification(activeChat.otherUid,"message",{sourceId:activeChat.id,text:text.slice(0,120)});
    }catch(err){console.error(err);alert("Não foi possível enviar a mensagem.")}
    finally{btn.disabled=false;input.focus()}
  };
}

export function mountMessageButton(container, targetUid, targetName="Atleta", targetAvatar=""){
  if(!container||!targetUid||document.getElementById("snProfileMessageBtn"))return;
  const b=document.createElement("button");b.id="snProfileMessageBtn";b.type="button";b.className="pp-btn";b.textContent="✉ MENSAGEM";
  b.onclick=()=>openChatWith(targetUid,targetName,targetAvatar);container.appendChild(b);
}

export async function getActiveStories({ownerUid="",max=40}={}){
  try{
    let q;
    if(ownerUid)q=query(collection(socialDb,"stories"),where("ownerUid","==",ownerUid),where("aprovado","==",true),limit(max));
    else q=query(collection(socialDb,"stories"),where("aprovado","==",true),where("visibilidade","==","publico"),limit(max));
    const snap=await getDocs(q),now=Date.now();
    return snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>!millis(x.expiraEm)||millis(x.expiraEm)>now).sort((a,b)=>millis(a.criadoEm)-millis(b.criadoEm));
  }catch(e){console.warn("Stories:",e);return[]}
}

async function seenStoryIds(stories){
  const seen=new Set();if(!currentUser)return seen;
  await Promise.all(stories.map(async s=>{try{if((await getDoc(doc(socialDb,"story_views",s.id,"usuarios",currentUser.uid))).exists())seen.add(s.id)}catch{}}));
  return seen;
}

async function markStorySeen(story){
  if(!currentUser||!story?.id)return;
  try{await setDoc(doc(socialDb,"story_views",story.id,"usuarios",currentUser.uid),{viewerUid:currentUser.uid,viewedAt:Timestamp.now()},{merge:true})}catch(e){console.warn("Story visto:",e)}
}

function storyMedia(story){return story.mediaUrl||story.imagemUrl||story.imagem||""}

export async function openStoryViewer(inputStories,startIndex=0){
  if(!inputStories?.length)return;
  ensureBaseUI();installStyles();
  const stories=[...inputStories];
  let viewer=document.getElementById("snStoryViewer");
  if(!viewer){
    viewer=document.createElement("div");
    viewer.id="snStoryViewer";
    viewer.className="sn-story-viewer";
    viewer.innerHTML='<div class="sn-story-card"><div class="sn-story-content"></div><div class="sn-story-top"><div class="sn-progresses"></div><a class="sn-story-user" href="#"><img alt=""><strong></strong></a><button class="sn-story-delete" type="button" hidden>EXCLUIR</button><button class="sn-story-close" type="button">×</button></div><button class="sn-story-nav sn-story-prev" aria-label="Anterior"></button><button class="sn-story-nav sn-story-next" aria-label="Próximo"></button><div class="sn-story-caption"></div></div>';
    document.body.appendChild(viewer);
  }
  let index=Math.max(0,Math.min(startIndex,stories.length-1));
  viewer.classList.add("open");

  const close=()=>{
    clearTimeout(storyTimer);
    viewer.classList.remove("open");
    viewer.querySelector("video")?.pause();
  };

  const show=async()=>{
    if(!stories.length){close();return}
    index=Math.max(0,Math.min(index,stories.length-1));
    clearTimeout(storyTimer);
    const s=stories[index],p=await profileOf(s.ownerUid);
    await markStorySeen(s);

    const profileLink=viewer.querySelector(".sn-story-user");
    profileLink.href=`perfil-social.html?uid=${encodeURIComponent(s.ownerUid||"")}`;
    profileLink.onclick=(event)=>{event.stopPropagation();close()};
    profileLink.querySelector("img").src=p.fotoUrl||fallbackAvatar;
    profileLink.querySelector("strong").textContent=p.nome||s.nome||"Atleta";

    const deleteButton=viewer.querySelector(".sn-story-delete");
    deleteButton.hidden=!(currentUser && s.ownerUid===currentUser.uid);
    deleteButton.onclick=async(event)=>{
      event.preventDefault();event.stopPropagation();
      clearTimeout(storyTimer);
      if(!confirm("Excluir este Story definitivamente?")){show();return}
      try{
        await deleteDoc(doc(socialDb,"stories",s.id));
        stories.splice(index,1);
        window.dispatchEvent(new CustomEvent("sn:story-deleted",{detail:{id:s.id,ownerUid:s.ownerUid}}));
        if(!stories.length){close();return}
        if(index>=stories.length)index=stories.length-1;
        await show();
      }catch(error){console.error("Excluir Story:",error);alert("Não foi possível excluir o Story.");await show()}
    };

    viewer.querySelector(".sn-progresses").innerHTML=stories.map((_,i)=>`<span class="sn-progress${i<index?" done":""}"><i></i></span>`).join("");
    const content=viewer.querySelector(".sn-story-content"),url=storyMedia(s),isVideo=(s.mediaType||s.tipo||"").startsWith("video");
    content.innerHTML=isVideo?`<video class="sn-story-media" src="${esc(url)}" autoplay playsinline></video>`:`<img class="sn-story-media" src="${esc(url)}" alt="Story em qualidade original" decoding="async">`;
    viewer.querySelector(".sn-story-caption").textContent=s.legenda||"";

    const bar=viewer.querySelectorAll(".sn-progress")[index]?.querySelector("i");
    const next=()=>{if(index<stories.length-1){index++;show()}else close()};
    if(isVideo){
      const v=content.querySelector("video");
      v.onloadedmetadata=()=>{
        const duration=Math.min(15000,Math.max(3000,(v.duration||5)*1000));
        if(bar){bar.style.transition=`width ${duration}ms linear`;requestAnimationFrame(()=>bar.style.width="100%")}
        storyTimer=setTimeout(next,duration);
      };
      v.onended=next;
    }else{
      const image=content.querySelector("img");
      image.onload=()=>{
        image.dataset.naturalWidth=String(image.naturalWidth||0);
        image.dataset.naturalHeight=String(image.naturalHeight||0);
      };
      if(bar){bar.style.transition="width 5000ms linear";requestAnimationFrame(()=>bar.style.width="100%")}
      storyTimer=setTimeout(next,5000);
    }
  };

  viewer.querySelector(".sn-story-close").onclick=close;
  viewer.querySelector(".sn-story-next").onclick=()=>{if(index<stories.length-1){index++;show()}else close()};
  viewer.querySelector(".sn-story-prev").onclick=()=>{if(index>0){index--;show()}};
  show();
}

export async function renderStoriesBar(container){
  if(!container)return;
  const stories=await getActiveStories();
  if(!stories.length){container.innerHTML='<div class="sn-empty">Nenhum story ativo agora.</div>';return}
  const seen=await seenStoryIds(stories),groups=new Map();
  for(const s of stories){if(!groups.has(s.ownerUid))groups.set(s.ownerUid,[]);groups.get(s.ownerUid).push(s)}
  const rows=[];
  for(const [uid,list] of groups){const p=await profileOf(uid),unseen=list.some(s=>!seen.has(s.id));rows.push({uid,list,p,unseen})}
  rows.sort((a,b)=>Number(b.unseen)-Number(a.unseen));
  container.innerHTML=rows.map((g,i)=>`<article class="story-item" data-sn-story-group="${i}"><div class="sn-story-ring${g.unseen?"":" seen"}"><img src="${esc(g.p.fotoUrl||fallbackAvatar)}" alt="" width="64" height="64"></div><span>${esc((g.p.nome||"Atleta").split(" ")[0])}</span></article>`).join("");
  container.querySelectorAll("[data-sn-story-group]").forEach(el=>el.onclick=()=>openStoryViewer(rows[Number(el.dataset.snStoryGroup)].list,0));
}

export async function attachProfileStory(avatarEl, ownerUid){
  if(!avatarEl||!ownerUid)return;
  const stories=await getActiveStories({ownerUid,max:30});
  avatarEl.style.outline="";avatarEl.style.outlineOffset="";avatarEl.onclick=null;
  if(!stories.length)return;
  const seen=await seenStoryIds(stories);
  avatarEl.style.cursor="pointer";
  avatarEl.style.outline=stories.some(s=>!seen.has(s.id))?"3px solid #e69b3f":"3px solid #59605a";
  avatarEl.style.outlineOffset="3px";
  avatarEl.onclick=()=>openStoryViewer(stories,0);
}

export function initSocialNetwork(){
  ensureBaseUI();installChatForm();
  onAuthStateChanged(socialAuth,u=>{currentUser=u;ensureBaseUI();installChatForm();watchInbox();watchNotifications()});
}

initSocialNetwork();
