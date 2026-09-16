import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { collection, deleteDoc, doc, onSnapshot, orderBy, query } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { socialAuth, socialDb, mountMessageButton, openChatWith, openInbox, openNotifications } from "./social-network.js?v=20260909-46";

let currentUser=socialAuth.currentUser;
let profileTimer=0,menuTimer=0,lastInboxCount=0,lastActivityCount=0,baselineReady=false;
let managedChat={id:"",otherUid:"",otherName:"Atleta",unsub:null,docs:[]};
const page=()=>location.pathname.split("/").pop()||"index.html";
const esc=value=>{const el=document.createElement("div");el.textContent=value??"";return el.innerHTML};
const millis=v=>v?.toMillis?.()??(v?.seconds?Number(v.seconds)*1000:new Date(v||0).getTime()||0);
const conversationId=(a,b)=>[a,b].sort().join("__");

function installStyles(){
 if(document.getElementById("messagingV53Styles"))return;
 const s=document.createElement("style");s.id="messagingV53Styles";s.textContent=`
 .v53-message-toast{position:fixed;right:18px;top:86px;z-index:700000;width:min(345px,calc(100vw - 28px));display:flex;align-items:center;gap:11px;padding:12px 14px;border:1px solid #b8dce8;border-radius:15px;background:#fff;color:#173247;box-shadow:0 18px 55px rgba(8,39,56,.24);cursor:pointer;animation:v53ToastIn .18s ease-out}.v53-message-toast .ico{width:42px;height:42px;display:grid;place-items:center;flex:0 0 auto;border-radius:50%;background:#0b96bf;color:#fff;font-size:18px}.v53-message-toast strong{display:block;font-size:12px}.v53-message-toast span{display:block;margin-top:3px;color:#607989;font-size:10px}.v53-message-toast b{margin-left:auto;padding:4px 7px;border-radius:999px;background:#0b96bf;color:#fff;font-size:7px}
 .v53-notification-alarm{position:fixed;right:18px;top:18px;z-index:690000;display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 14px;border:1px solid rgba(255,255,255,.28);border-radius:999px;background:#0b96bf;color:#fff;font:900 10px/1 Arial,sans-serif;letter-spacing:.25px;box-shadow:0 14px 38px rgba(8,39,56,.28);cursor:pointer}.v53-notification-alarm[hidden]{display:none!important}.v53-notification-alarm .bell{font-size:18px;animation:v53Bell 1.4s ease-in-out infinite}.v53-notification-alarm .count{display:grid;place-items:center;min-width:23px;height:23px;padding:0 6px;border-radius:99px;background:#ef4d5b;color:#fff;font-size:10px;box-shadow:0 0 0 3px rgba(255,255,255,.24)}
 .sn-chat.v53-managed #snChatMessages{display:none!important}.v53-chat-messages{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:8px;background:#0b100d}.v53-chat-tools{display:flex;gap:5px;margin-left:auto}.v53-chat-tools button{border:1px solid rgba(242,204,114,.28);border-radius:8px;background:#141b16;color:#f2cc72;padding:6px 8px;font:900 8px Arial;cursor:pointer}.v53-chat-note{padding:8px 12px;border-bottom:1px solid rgba(217,169,63,.12);background:#101611;color:#95a099;font:700 8px/1.4 Arial;text-align:center}
 .v53-msg-wrap{display:flex;align-items:flex-end;gap:5px;max-width:86%;align-self:flex-start}.v53-msg-wrap.mine{align-self:flex-end;flex-direction:row-reverse}.v53-msg-bubble{position:relative;min-width:70px;padding:9px 11px;border-radius:14px;background:#172019;color:#eee;font-size:12px;line-height:1.4;overflow-wrap:anywhere}.v53-msg-wrap.mine .v53-msg-bubble{background:linear-gradient(135deg,#e8bc58,#b87d20);color:#111}.v53-msg-time{display:block;margin-top:4px;opacity:.58;font-size:8px;text-align:right}.v53-msg-menu{width:27px;height:27px;border:1px solid rgba(255,255,255,.12);border-radius:50%;background:#111713;color:#aeb9b1;cursor:pointer;font-weight:900}.v53-msg-actions{display:flex;gap:5px;flex-wrap:wrap;margin:1px 0 5px}.v53-msg-actions[hidden]{display:none!important}.v53-msg-actions button{border:1px solid rgba(255,255,255,.14);border-radius:8px;background:#151c17;color:#d8e1db;padding:6px 8px;font:800 8px Arial;cursor:pointer}.v53-msg-actions button.danger{border-color:rgba(239,77,91,.35);color:#ff9099}.v53-chat-empty{padding:30px 15px;text-align:center;color:#8c948e;font-size:11px}
 @keyframes v53ToastIn{from{opacity:0;transform:translateY(-7px)}to{opacity:1;transform:none}}@keyframes v53Bell{0%,100%{transform:rotate(0)}20%{transform:rotate(14deg)}40%{transform:rotate(-12deg)}60%{transform:rotate(8deg)}80%{transform:rotate(-5deg)}}
 @media(max-width:700px){.v53-message-toast{right:8px;top:70px}.v53-notification-alarm{right:9px;top:9px;min-height:40px;padding:0 11px}.v53-notification-alarm .label{display:none}.v53-msg-wrap{max-width:92%}.v53-chat-tools button{padding:6px}.v53-chat-note{font-size:7px}}
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
function ensureAlarm(){
 let alarm=document.getElementById("v53NotificationAlarm");if(alarm)return alarm;
 alarm=document.createElement("button");alarm.id="v53NotificationAlarm";alarm.type="button";alarm.className="v53-notification-alarm";alarm.hidden=true;alarm.innerHTML='<span class="bell">🔔</span><span class="label">VOCÊ TEM NOTIFICAÇÕES</span><span class="count">0</span>';
 alarm.onclick=()=>{const activity=badgeCount("snNotificationsBadge"),inbox=badgeCount("snInboxBadge");if(activity>0){if(page()==="atividade.html")openNotifications();else location.href="atividade.html"}else if(inbox>0)openInbox()};
 document.body.appendChild(alarm);return alarm;
}
function showIncomingSignal(kind="activity"){
 document.querySelector(".v53-message-toast")?.remove();
 const toast=document.createElement("button");toast.type="button";toast.className="v53-message-toast";
 const message=kind==="message"?"Nova mensagem recebida":"Você recebeu uma nova notificação";
 toast.innerHTML=`<span class="ico">${kind==="message"?"✉":"🔔"}</span><div><strong>${message}</strong><span>Toque para ver o que aconteceu.</span></div><b>ABRIR</b>`;
 toast.onclick=()=>{toast.remove();if(kind==="message"&&badgeCount("snNotificationsBadge")===0)openInbox();else if(page()==="atividade.html")openNotifications();else location.href="atividade.html"};
 document.body.appendChild(toast);setTimeout(()=>toast.remove(),7200);
 if(document.hidden&&"Notification" in window&&Notification.permission==="granted"){
  try{const n=new Notification(message,{body:"Abra o Cadastro de Atletas para ver os detalhes."});n.onclick=()=>{window.focus();if(kind==="message")openInbox();else location.href="atividade.html";n.close()}}catch{}
 }
}
function syncBadges(){
 clearTimeout(menuTimer);menuTimer=setTimeout(()=>{
  const inbox=badgeCount("snInboxBadge"),activity=badgeCount("snNotificationsBadge"),alarm=ensureAlarm();
  ensureMenu();setMenuBadge("[data-v7-messages]",inbox);setMenuBadge("[data-v27-activity]",activity);
  const total=activity>0?activity:inbox;alarm.hidden=total<1;alarm.querySelector(".count").textContent=total>99?"99+":String(total||0);
  if(baselineReady){if(activity>lastActivityCount)showIncomingSignal("activity");else if(inbox>lastInboxCount)showIncomingSignal("message")}
  lastInboxCount=inbox;lastActivityCount=activity;baselineReady=true;
 },45);
}
function watchNativeBadges(){
 for(const id of["snInboxBadge","snNotificationsBadge"]){
  const badge=document.getElementById(id);if(!badge||badge.dataset.v53Watch)return;
  badge.dataset.v53Watch="1";new MutationObserver(syncBadges).observe(badge,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:["hidden"]});
 }
 syncBadges();
}

function hiddenKey(chatId){return`bd-chat-hidden-v53:${currentUser?.uid||"guest"}:${chatId}`}
function clearKey(chatId){return`bd-chat-cleared-v53:${currentUser?.uid||"guest"}:${chatId}`}
function hiddenIds(chatId){try{return new Set(JSON.parse(localStorage.getItem(hiddenKey(chatId))||"[]"))}catch{return new Set()}}
function saveHidden(chatId,set){try{localStorage.setItem(hiddenKey(chatId),JSON.stringify([...set].slice(-2000)))}catch{}}
function clearBefore(chatId){return Number(localStorage.getItem(clearKey(chatId))||0)||0}
function localToast(text){let el=document.getElementById("v53LocalToast");if(!el){el=document.createElement("div");el.id="v53LocalToast";el.style.cssText="position:fixed;left:50%;bottom:24px;z-index:710000;transform:translateX(-50%);padding:10px 14px;border-radius:999px;background:#071827;color:#fff;font:800 9px Arial;box-shadow:0 12px 35px rgba(0,0,0,.28)";document.body.appendChild(el)}el.textContent=text;el.hidden=false;clearTimeout(el._t);el._t=setTimeout(()=>el.hidden=true,2600)}

function cleanupManagedChat(){
 managedChat.unsub?.();managedChat={id:"",otherUid:"",otherName:"Atleta",unsub:null,docs:[]};
 const chat=document.getElementById("snChat");chat?.classList.remove("v53-managed");document.getElementById("v53ChatMessages")?.remove();document.getElementById("v53ChatNote")?.remove();document.querySelector(".v53-chat-tools")?.remove();
}
function ensureManagedChatUi(){
 const chat=document.getElementById("snChat"),old=document.getElementById("snChatMessages"),head=chat?.querySelector(".sn-chat-head");if(!chat||!old||!head)return null;
 chat.classList.add("v53-managed");
 if(!document.getElementById("v53ChatNote")){const note=document.createElement("div");note.id="v53ChatNote";note.className="v53-chat-note";note.textContent="As conversas ficam salvas. Você pode excluir uma mensagem própria para todos ou ocultar mensagens e limpar o histórico apenas para você neste dispositivo.";old.before(note)}
 let list=document.getElementById("v53ChatMessages");if(!list){list=document.createElement("div");list.id="v53ChatMessages";list.className="v53-chat-messages";old.after(list)}
 if(!head.querySelector(".v53-chat-tools")){const tools=document.createElement("div");tools.className="v53-chat-tools";tools.innerHTML='<button type="button" data-v53-clear-history>🧹 LIMPAR HISTÓRICO</button>';const close=head.querySelector("[data-sn-chat-close]");head.insertBefore(tools,close||null)}
 if(!list.dataset.ready){list.dataset.ready="1";list.addEventListener("click",async event=>{
   const menu=event.target.closest("[data-v53-msg-menu]");if(menu){const actions=menu.closest(".v53-msg-wrap")?.querySelector(".v53-msg-actions");if(actions)actions.hidden=!actions.hidden;return}
   const hide=event.target.closest("[data-v53-hide]");if(hide){const set=hiddenIds(managedChat.id);set.add(hide.dataset.v53Hide);saveHidden(managedChat.id,set);renderManagedMessages();return}
   const remove=event.target.closest("[data-v53-delete-all]");if(remove){if(!confirm("Excluir esta mensagem para todos os participantes?"))return;try{await deleteDoc(doc(socialDb,"conversas",managedChat.id,"mensagens",remove.dataset.v53DeleteAll));localToast("Mensagem excluída para todos.")}catch(error){console.error("Excluir mensagem:",error);localToast("Não foi possível excluir esta mensagem.")}return}
  })}
 head.querySelector("[data-v53-clear-history]").onclick=()=>{if(!managedChat.id)return;if(!confirm("Limpar este histórico para você neste dispositivo? As mensagens continuarão disponíveis para o outro participante."))return;try{localStorage.setItem(clearKey(managedChat.id),String(Date.now()));localStorage.removeItem(hiddenKey(managedChat.id))}catch{}renderManagedMessages();localToast("Histórico limpo para você neste dispositivo.")};
 return list;
}
function renderManagedMessages(){
 const list=ensureManagedChatUi();if(!list||!managedChat.id)return;
 const hidden=hiddenIds(managedChat.id),cleared=clearBefore(managedChat.id);
 const docs=[...managedChat.docs].sort((a,b)=>millis(a.data.createdAt)-millis(b.data.createdAt)).filter(x=>millis(x.data.createdAt)>cleared&&!hidden.has(x.id));
 if(!docs.length){list.innerHTML='<div class="v53-chat-empty">Nenhuma mensagem visível neste histórico. As próximas mensagens aparecerão aqui.</div>';return}
 list.innerHTML=docs.map(item=>{const x=item.data,mine=x.senderUid===currentUser?.uid,time=millis(x.createdAt)?new Date(millis(x.createdAt)).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):"";return `<div class="v53-msg-wrap${mine?" mine":""}" data-v53-message="${esc(item.id)}"><button class="v53-msg-menu" type="button" data-v53-msg-menu aria-label="Opções da mensagem">⋮</button><div><div class="v53-msg-bubble">${esc(x.text||"")}<small class="v53-msg-time">${esc(time)}</small></div><div class="v53-msg-actions" hidden><button type="button" data-v53-hide="${esc(item.id)}">EXCLUIR PARA MIM</button>${mine?`<button class="danger" type="button" data-v53-delete-all="${esc(item.id)}">EXCLUIR PARA TODOS</button>`:""}</div></div></div>`}).join("");list.scrollTop=list.scrollHeight;
}
function watchManagedMessages(chatId){
 managedChat.unsub?.();managedChat.docs=[];const list=ensureManagedChatUi();if(list)list.innerHTML='<div class="v53-chat-empty">Carregando histórico...</div>';
 managedChat.unsub=onSnapshot(query(collection(socialDb,"conversas",chatId,"mensagens"),orderBy("createdAt","asc")),snap=>{managedChat.docs=snap.docs.map(d=>({id:d.id,data:d.data()}));renderManagedMessages()},error=>{console.error("Histórico da conversa:",error);if(list)list.innerHTML='<div class="v53-chat-empty">Não foi possível carregar o histórico agora.</div>'});
}
async function openManagedChat(uid,name="Atleta",avatar=""){
 if(!currentUser||!uid||uid===currentUser.uid)return;cleanupManagedChat();managedChat={id:conversationId(currentUser.uid,uid),otherUid:uid,otherName:name||"Atleta",unsub:null,docs:[]};
 await openChatWith(uid,name,avatar);setTimeout(()=>{ensureManagedChatUi();watchManagedMessages(managedChat.id)},70);
}

function ensureProfileMessaging(){
 clearTimeout(profileTimer);profileTimer=setTimeout(()=>{
  if(page()!=="perfil-social.html")return;
  const target=new URLSearchParams(location.search).get("uid")||"",actions=document.getElementById("actions");if(!target||!actions)return;
  if(currentUser?.uid===target){
   if(!document.getElementById("profileInboxV51")){const b=document.createElement("button");b.id="profileInboxV51";b.type="button";b.className="pp-btn";b.textContent="✉ MENSAGENS";b.onclick=()=>openInbox();const publish=document.getElementById("publishButton");publish?.insertAdjacentElement("afterend",b)||actions.appendChild(b)}
  }else if(currentUser&&target&&!document.getElementById("snProfileMessageBtn"))mountMessageButton(actions,target,"Atleta","");
 },80);
}
function handleDeepLink(){
 if(!currentUser)return;const params=new URLSearchParams(location.search);if(params.get("abrir")!=="mensagens")return;const uid=params.get("uid")||"";
 setTimeout(()=>uid&&uid!==currentUser.uid?openManagedChat(uid):openInbox(),120);
}

document.addEventListener("click",event=>{
 const close=event.target.closest?.("[data-sn-chat-close]");if(close){cleanupManagedChat();return}
 const profileMessage=event.target.closest?.("#snProfileMessageBtn");if(profileMessage){const uid=new URLSearchParams(location.search).get("uid")||"";if(uid){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();openManagedChat(uid);return}}
 const conversation=event.target.closest?.("[data-sn-conversation][data-sn-other]");if(conversation){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();document.getElementById("snInboxOverlay")?.classList.remove("open");openManagedChat(conversation.dataset.snOther);return}
 const messages=event.target.closest?.("[data-v7-messages]");if(messages){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();window.closeSiteMenu?.();openInbox();return}
 const notice=event.target.closest?.(".sn-row[data-sn-notification]");if(notice&&notice.querySelector?.(".sn-notification-icon")?.textContent?.trim()==="✉"&&notice.dataset.snActor){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();document.getElementById("snNotificationsOverlay")?.classList.remove("open");openManagedChat(notice.dataset.snActor)}
},true);

installStyles();ensureMenu();ensureAlarm();watchNativeBadges();
for(const delay of[120,450,1000,1800])setTimeout(()=>{ensureMenu();watchNativeBadges();ensureProfileMessaging();syncBadges()},delay);
onAuthStateChanged(socialAuth,user=>{currentUser=user;baselineReady=false;lastInboxCount=0;lastActivityCount=0;if(!user){cleanupManagedChat();document.getElementById("v53NotificationAlarm")?.setAttribute("hidden","");return}ensureMenu();watchNativeBadges();ensureProfileMessaging();handleDeepLink();syncBadges()});

if(page()==="meu-perfil.html")setTimeout(()=>import("./profile-composer-v50.js?v=20260915-50").catch(error=>console.warn("Composer V50:",error)),180);
