import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { socialAuth, mountMessageButton, openChatWith, openInbox } from "./social-network.js?v=20260909-46";

let currentUser=socialAuth.currentUser;
let profileTimer=0,menuTimer=0,lastInboxCount=0,baselineReady=false;
const page=()=>location.pathname.split("/").pop()||"index.html";

function installStyles(){
 if(document.getElementById("messagingV51Styles"))return;
 const s=document.createElement("style");s.id="messagingV51Styles";s.textContent=`
 .v51-message-toast{position:fixed;right:18px;top:82px;z-index:700000;width:min(330px,calc(100vw - 28px));display:flex;align-items:center;gap:11px;padding:12px 14px;border:1px solid #b8dce8;border-radius:15px;background:#fff;color:#173247;box-shadow:0 18px 55px rgba(8,39,56,.22);cursor:pointer;animation:v51ToastIn .18s ease-out}.v51-message-toast .ico{width:42px;height:42px;display:grid;place-items:center;flex:0 0 auto;border-radius:50%;background:#0b96bf;color:#fff;font-size:18px}.v51-message-toast strong{display:block;font-size:12px}.v51-message-toast span{display:block;margin-top:3px;color:#607989;font-size:10px}.v51-message-toast b{margin-left:auto;padding:4px 7px;border-radius:999px;background:#0b96bf;color:#fff;font-size:7px}@keyframes v51ToastIn{from{opacity:0;transform:translateY(-7px)}to{opacity:1;transform:none}}@media(max-width:700px){.v51-message-toast{right:8px;top:70px}}
 `;document.head.appendChild(s);
}

function badgeCount(id){
 const el=document.getElementById(id);if(!el||el.hidden)return 0;
 return Number(String(el.textContent||"0").replace(/\D/g,""))||0;
}
function setMenuBadge(selector,count){
 const badge=document.querySelector(`${selector} .v5-menu-badge`);if(!badge)return;
 badge.hidden=count<1;badge.textContent=count>99?"99+":String(count||0);
}
function ensureMenu(){
 const nav=document.querySelector(".site-menu-nav");if(!nav)return;
 const messages=nav.querySelector("[data-v7-messages]");if(messages){messages.hidden=false;setMenuBadge("[data-v7-messages]",badgeCount("snInboxBadge"))}
 if(!nav.querySelector("[data-v51-my-profile]")){
  const link=document.createElement("a");link.href="meu-perfil.html";link.dataset.v51MyProfile="1";link.innerHTML="👤 <span>MEU PERFIL</span>";
  const account=[...nav.querySelectorAll("a")].find(a=>/MINHA CONTA/i.test(a.textContent||""));
  if(account)nav.insertBefore(link,account);else nav.appendChild(link);
 }
}
function showIncomingSignal(){
 document.querySelector(".v51-message-toast")?.remove();
 const toast=document.createElement("button");toast.type="button";toast.className="v51-message-toast";toast.innerHTML='<span class="ico">✉</span><div><strong>Nova mensagem recebida</strong><span>Toque para abrir suas conversas.</span></div><b>ABRIR</b>';
 toast.onclick=()=>{toast.remove();openInbox()};document.body.appendChild(toast);setTimeout(()=>toast.remove(),6500);
 if(document.hidden&&"Notification" in window&&Notification.permission==="granted"){
  try{const n=new Notification("Nova mensagem",{body:"Você recebeu uma nova mensagem na rede esportiva."});n.onclick=()=>{window.focus();openInbox();n.close()}}catch{}
 }
}
function syncBadges(){
 clearTimeout(menuTimer);menuTimer=setTimeout(()=>{
  const inbox=badgeCount("snInboxBadge"),activity=badgeCount("snNotificationsBadge");
  ensureMenu();setMenuBadge("[data-v7-messages]",inbox);setMenuBadge("[data-v27-activity]",activity);
  if(baselineReady&&inbox>lastInboxCount)showIncomingSignal();
  lastInboxCount=inbox;baselineReady=true;
 },35);
}
function watchNativeBadges(){
 for(const id of["snInboxBadge","snNotificationsBadge"]){
  const badge=document.getElementById(id);if(!badge||badge.dataset.v51Watch)return;
  badge.dataset.v51Watch="1";new MutationObserver(syncBadges).observe(badge,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:["hidden"]});
 }
 syncBadges();
}

function ensureProfileMessaging(){
 clearTimeout(profileTimer);profileTimer=setTimeout(()=>{
  if(page()!=="perfil-social.html")return;
  const target=new URLSearchParams(location.search).get("uid")||"",actions=document.getElementById("actions");if(!target||!actions)return;
  if(currentUser?.uid===target){
   if(!document.getElementById("profileInboxV51")){const b=document.createElement("button");b.id="profileInboxV51";b.type="button";b.className="pp-btn";b.textContent="✉ MENSAGENS";b.onclick=()=>openInbox();const publish=document.getElementById("publishButton");publish?.insertAdjacentElement("afterend",b)||actions.appendChild(b)}
  }else if(currentUser&&target&&!document.getElementById("snProfileMessageBtn")){
   mountMessageButton(actions,target,"Atleta","");
  }
 },80);
}
function handleDeepLink(){
 if(!currentUser)return;const params=new URLSearchParams(location.search);if(params.get("abrir")!=="mensagens")return;const uid=params.get("uid")||"";
 setTimeout(()=>uid&&uid!==currentUser.uid?openChatWith(uid):openInbox(),120);
}

document.addEventListener("click",event=>{
 const messages=event.target.closest?.("[data-v7-messages]");if(messages){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();window.closeSiteMenu?.();openInbox();return}
 const notice=event.target.closest?.(".sn-row[data-sn-notification]");if(notice&&notice.querySelector?.(".sn-notification-icon")?.textContent?.trim()==="✉"&&notice.dataset.snActor){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();document.getElementById("snNotificationsOverlay")?.classList.remove("open");openChatWith(notice.dataset.snActor)}
},true);

installStyles();ensureMenu();watchNativeBadges();
for(const delay of[120,450,1200])setTimeout(()=>{ensureMenu();watchNativeBadges();ensureProfileMessaging()},delay);
onAuthStateChanged(socialAuth,user=>{currentUser=user;baselineReady=false;lastInboxCount=0;ensureMenu();watchNativeBadges();ensureProfileMessaging();handleDeepLink()});

if(page()==="meu-perfil.html")setTimeout(()=>import("./profile-composer-v50.js?v=20260915-50").catch(error=>console.warn("Composer V50:",error)),180);
