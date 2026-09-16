await import("./firebase-app-check-v11.js?v=20260909-46");
import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { collection, doc, getDoc, getFirestore, limit, onSnapshot, query, updateDoc, where } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { mountMessageButton, openChatWith, openInbox } from "./social-network.js?v=20260915-50";

const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};
const app=getApps().length?getApp():initializeApp(cfg),auth=getAuth(app),db=getFirestore(app);
let currentUser=auth.currentUser,unsubInbox=null,unsubNotifications=null,menuInboxCount=0,menuNotificationCount=0,profileTimer=0;
const shownMessages=new Set();
const page=()=>location.pathname.split("/").pop()||"index.html";
const ms=v=>v?.toMillis?.()??(v?.seconds?Number(v.seconds)*1000:new Date(v||0).getTime()||0);
const esc=v=>{const d=document.createElement("div");d.textContent=String(v??"");return d.innerHTML};

function installStyles(){
 if(document.getElementById("messagingV50Styles"))return;
 const s=document.createElement("style");s.id="messagingV50Styles";s.textContent=`
 .v50-message-toast{position:fixed;right:18px;top:82px;z-index:700000;width:min(360px,calc(100vw - 28px));display:grid;grid-template-columns:46px 1fr auto;gap:11px;align-items:center;padding:12px;border:1px solid #b8dce8;border-radius:15px;background:#fff;color:#173247;box-shadow:0 18px 55px rgba(8,39,56,.24);cursor:pointer;animation:v50ToastIn .2s ease-out}.v50-message-toast img{width:46px;height:46px;border-radius:50%;object-fit:cover;background:#e9f1f5}.v50-message-toast strong{display:block;font-size:12px}.v50-message-toast span{display:block;margin-top:3px;color:#607989;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.v50-message-toast b{align-self:start;padding:4px 7px;border-radius:999px;background:#0b96bf;color:#fff;font-size:7px}.v50-message-toast:hover{transform:translateY(-1px)}@keyframes v50ToastIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}@media(max-width:700px){.v50-message-toast{right:8px;top:70px}}
 `;document.head.appendChild(s);
}

async function profileOf(uid){
 try{const s=await getDoc(doc(db,"perfis",uid));return s.exists()?{uid,...s.data()}:{uid,nome:"Atleta",fotoUrl:""}}catch{return{uid,nome:"Atleta",fotoUrl:""}}
}
function unreadConversation(d){const x=d.data();return !!(currentUser&&x.lastSenderUid&&x.lastSenderUid!==currentUser.uid&&!(x.lastReadBy||[]).includes(currentUser.uid))}
function setMenuBadge(selector,count){const b=document.querySelector(`${selector} .v5-menu-badge`);if(!b)return;b.hidden=count<1;b.textContent=count>99?"99+":String(count||0)}
function ensureMenu(){
 const nav=document.querySelector(".site-menu-nav");if(!nav)return;
 const messages=nav.querySelector("[data-v7-messages]");if(messages){messages.hidden=false;setMenuBadge("[data-v7-messages]",menuInboxCount)}
 setMenuBadge("[data-v27-activity]",menuNotificationCount);
 if(!nav.querySelector("[data-v50-my-profile]")){
  const link=document.createElement("a");link.href="meu-perfil.html";link.dataset.v50MyProfile="1";link.innerHTML="👤 <span>MEU PERFIL</span>";
  const account=[...nav.querySelectorAll("a")].find(a=>/MINHA CONTA/i.test(a.textContent||""));
  if(account)nav.insertBefore(link,account);else nav.appendChild(link);
 }
}
function emitCounts(){
 window.dispatchEvent(new CustomEvent("bd:inbox-count",{detail:{unread:menuInboxCount}}));
 window.dispatchEvent(new CustomEvent("bd:notification-count",{detail:{unread:menuNotificationCount}}));
 ensureMenu();
}

async function showIncomingToast(d){
 if(!currentUser||!unreadConversation(d))return;const x=d.data(),other=(x.participants||[]).find(v=>v!==currentUser.uid);if(!other)return;
 const signature=`${currentUser.uid}:${d.id}:${ms(x.lastMessageAt)}:${x.lastSenderUid}`;if(shownMessages.has(signature))return;shownMessages.add(signature);
 const p=await profileOf(other),old=document.querySelector(".v50-message-toast");old?.remove();
 const toast=document.createElement("button");toast.type="button";toast.className="v50-message-toast";toast.innerHTML=`<img src="${esc(p.fotoUrl||"")}" alt=""><div><strong>Nova mensagem de ${esc(p.nome||"Atleta")}</strong><span>${esc(x.lastMessage||"Abra a conversa para responder.")}</span></div><b>ABRIR</b>`;
 toast.onclick=()=>{toast.remove();openChatWith(other,p.nome||"Atleta",p.fotoUrl||"")};document.body.appendChild(toast);setTimeout(()=>toast.remove(),8000);
 if(document.hidden&&"Notification" in window&&Notification.permission==="granted"){
  try{const n=new Notification(`Nova mensagem de ${p.nome||"Atleta"}`,{body:String(x.lastMessage||"Nova mensagem").slice(0,140),icon:p.fotoUrl||undefined});n.onclick=()=>{window.focus();openChatWith(other,p.nome||"Atleta",p.fotoUrl||"");n.close()}}catch{}
 }
}

function watchInbox(){
 unsubInbox?.();unsubInbox=null;if(!currentUser){menuInboxCount=0;emitCounts();return}
 const q=query(collection(db,"conversas"),where("participants","array-contains",currentUser.uid),limit(200));
 unsubInbox=onSnapshot(q,snap=>{
  const unread=snap.docs.filter(unreadConversation);menuInboxCount=unread.length;emitCounts();
  if(unread.length){const newest=[...unread].sort((a,b)=>ms(b.data().lastMessageAt)-ms(a.data().lastMessageAt))[0];void showIncomingToast(newest)}
 },error=>console.warn("Mensagens V50:",error));
}
function watchNotifications(){
 unsubNotifications?.();unsubNotifications=null;if(!currentUser){menuNotificationCount=0;emitCounts();return}
 unsubNotifications=onSnapshot(query(collection(db,"notificacoes",currentUser.uid,"itens"),limit(200)),snap=>{menuNotificationCount=snap.docs.filter(d=>d.data().lida!==true).length;emitCounts()},error=>console.warn("Notificações V50:",error));
}

async function ensureProfileMessaging(){
 clearTimeout(profileTimer);profileTimer=setTimeout(async()=>{
  if(page()!=="perfil-social.html")return;const target=new URLSearchParams(location.search).get("uid")||"",actions=document.getElementById("actions");if(!target||!actions)return;
  if(currentUser?.uid===target){
   if(!document.getElementById("profileInboxV50")){const b=document.createElement("button");b.id="profileInboxV50";b.type="button";b.className="pp-btn";b.textContent="✉ MENSAGENS";b.onclick=()=>openInbox();const publish=document.getElementById("publishButton");publish?.insertAdjacentElement("afterend",b)||actions.appendChild(b)}
  }else if(currentUser&&target&&!document.getElementById("snProfileMessageBtn")){
   const p=await profileOf(target);mountMessageButton(actions,target,p.nome||"Atleta",p.fotoUrl||"");
  }
 },120);
}

async function handleMessageNotificationClick(event){
 const row=event.target.closest?.(".sn-row[data-sn-notification]");if(!row||!currentUser)return;const id=row.dataset.snNotification;if(!id)return;
 try{const s=await getDoc(doc(db,"notificacoes",currentUser.uid,"itens",id));if(!s.exists())return;const item=s.data();if(item.type!=="message"||!item.actorUid)return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();if(item.lida!==true)updateDoc(s.ref,{lida:true}).catch(()=>{});document.getElementById("snNotificationsOverlay")?.classList.remove("open");const p=await profileOf(item.actorUid);openChatWith(item.actorUid,p.nome||item.actorNome||"Atleta",p.fotoUrl||item.actorFoto||"")}catch(error){console.warn("Abrir mensagem V50:",error)}
}

function handleDeepLink(){
 if(!currentUser)return;const params=new URLSearchParams(location.search);if(params.get("abrir")!=="mensagens")return;const uid=params.get("uid")||"";setTimeout(async()=>{if(uid&&uid!==currentUser.uid){const p=await profileOf(uid);openChatWith(uid,p.nome||"Atleta",p.fotoUrl||"")}else openInbox()},180);
}

document.addEventListener("click",event=>{
 const messages=event.target.closest?.("[data-v7-messages]");if(messages){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();window.closeSiteMenu?.();void openInbox();return}
 void handleMessageNotificationClick(event);
},true);

const observer=new MutationObserver(()=>{ensureMenu();void ensureProfileMessaging()});observer.observe(document.documentElement,{childList:true,subtree:true});
installStyles();ensureMenu();
onAuthStateChanged(auth,user=>{currentUser=user;shownMessages.clear();watchInbox();watchNotifications();ensureMenu();void ensureProfileMessaging();handleDeepLink()});

if(page()==="meu-perfil.html")import("./profile-composer-v50.js?v=20260915-50").catch(error=>console.warn("Composer V50:",error));
