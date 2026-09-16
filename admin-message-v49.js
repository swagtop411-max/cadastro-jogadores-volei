import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  addDoc, collection, collectionGroup, doc, getDoc, getDocs, getFirestore,
  limit, onSnapshot, query, Timestamp, updateDoc, where
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};
const ADMIN_EMAIL="swagtop411@gmail.com";
const app=getApps().length?getApp():initializeApp(cfg),auth=getAuth(app),db=getFirestore(app);
const identityCache=new Map();
let currentUser=auth.currentUser,adminCommUnsub=null,deepLinkHandledFor="";

const txt=v=>String(v??"").trim();
const esc=v=>{const el=document.createElement("div");el.textContent=txt(v);return el.innerHTML};
const ms=v=>v?.toMillis?.()??(v?.seconds?Number(v.seconds)*1000:new Date(v||0).getTime()||0);
const fmt=v=>{const n=ms(v);return n?new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"}).format(new Date(n)):"-"};
const isAdminUser=u=>txt(u?.email).toLowerCase()===ADMIN_EMAIL;
const isAdminThread=x=>txt(x?.sourceId).startsWith("admin:");

async function waitAppCheck(){try{await globalThis.__BD_APP_CHECK_PROMISE__}catch{}}

function installStyles(){
 if(document.getElementById("adminMessageV49Styles"))return;
 const style=document.createElement("style");style.id="adminMessageV49Styles";style.textContent=`
 .v49-modal{position:fixed!important;inset:0!important;z-index:600000!important;display:grid!important;place-items:center!important;padding:18px!important;background:rgba(4,19,31,.74)!important;backdrop-filter:blur(5px)!important}
 .v49-modal[hidden]{display:none!important}.v49-dialog{position:relative!important;z-index:1!important;width:min(720px,calc(100vw - 28px))!important;max-height:88vh!important;overflow:auto!important;padding:22px!important;border:1px solid #cfe0e9!important;border-radius:18px!important;background:#fff!important;color:#173247!important;box-shadow:0 34px 100px rgba(0,0,0,.38)!important;opacity:1!important;visibility:visible!important;transform:none!important}
 .v49-dialog h2,.v49-dialog h3{margin:0 42px 10px 0!important;color:#123d54!important}.v49-dialog p{color:#5f7888!important;line-height:1.55!important}.v49-close{position:absolute!important;right:12px!important;top:12px!important;width:38px!important;height:38px!important;border:1px solid #cfdee6!important;border-radius:50%!important;background:#fff!important;color:#45697c!important;font-size:20px!important;cursor:pointer!important}
 .v49-actions{display:flex!important;gap:8px!important;flex-wrap:wrap!important;justify-content:flex-end!important;margin-top:14px!important}.v49-actions button{min-height:40px!important;padding:9px 13px!important;border:1px solid #c7d9e3!important;border-radius:10px!important;background:#fff!important;color:#176986!important;font-size:9px!important;font-weight:900!important;cursor:pointer!important}.v49-actions button.primary{background:#0b96bf!important;color:#fff!important;border-color:#0b96bf!important}.v49-actions button:disabled{opacity:.55!important;cursor:wait!important}
 .v49-dialog textarea{width:100%!important;min-height:130px!important;padding:12px!important;border:1px solid #c8dae4!important;border-radius:11px!important;background:#f9fbfc!important;color:#173247!important;resize:vertical!important}.v49-status{min-height:22px!important;margin-top:9px!important;color:#28718d!important;font-size:10px!important;font-weight:800!important}.v49-status.error{color:#a53f3f!important}.v49-notice{padding:14px!important;border:1px solid #d8e6ed!important;border-radius:13px!important;background:#f5fafc!important;color:#294e62!important;line-height:1.55!important;white-space:pre-wrap!important}.v49-log-list{display:grid!important;gap:8px!important;margin-top:12px!important}.v49-log{padding:10px 12px!important;border:1px solid #dfe9ee!important;border-radius:11px!important;background:#f9fbfc!important}.v49-log strong{display:block!important;color:#153f55!important;font-size:10px!important}.v49-log span,.v49-log small{display:block!important;margin-top:3px!important;color:#6b8493!important;font-size:9px!important;overflow-wrap:anywhere!important}
 #adminCommV49 .command-v33-row.incoming{border-color:#bfe7d4!important;background:#f5fcf8!important}#adminCommV49 .command-v33-row.outgoing{border-color:#d6e5ec!important;background:#fbfdfe!important}.v49-direction{display:inline-flex!important;margin-bottom:4px!important;padding:4px 7px!important;border-radius:999px!important;background:#e8f4f8!important;color:#0f708f!important;font-size:7px!important;font-weight:900!important}.incoming .v49-direction{background:#e4f6ec!important;color:#1e7a55!important}
 @media(max-width:700px){.v49-modal{padding:8px!important}.v49-dialog{padding:18px!important}.v49-actions{justify-content:stretch!important}.v49-actions button{flex:1!important}.v49-dialog textarea{min-height:120px!important}}
 `;document.head.appendChild(style);
}

function ensureModal(){
 installStyles();let modal=document.getElementById("adminMessageV49Modal");
 if(modal)return modal;
 modal=document.createElement("div");modal.id="adminMessageV49Modal";modal.className="v49-modal";modal.hidden=true;
 modal.innerHTML='<section class="v49-dialog" role="dialog" aria-modal="true" aria-labelledby="v49ModalTitle"><button class="v49-close" type="button" data-v49-close aria-label="Fechar">×</button><div id="adminMessageV49Body"></div></section>';
 document.body.appendChild(modal);return modal;
}
function openModal(html){const modal=ensureModal(),body=document.getElementById("adminMessageV49Body");body.innerHTML=html;modal.hidden=false;document.body.style.overflow="hidden";requestAnimationFrame(()=>modal.querySelector("textarea,button:not(.v49-close)")?.focus())}
function closeModal(){const modal=document.getElementById("adminMessageV49Modal");if(modal)modal.hidden=true;document.body.style.overflow=""}

async function identityOf(uid){
 uid=txt(uid);if(!uid)return{uid:"",nome:"Usuário",fotoUrl:""};if(identityCache.has(uid))return identityCache.get(uid);
 let profile=null,account=null;
 try{const s=await getDoc(doc(db,"perfis",uid));if(s.exists())profile=s.data()}catch{}
 try{const s=await getDoc(doc(db,"usuarios",uid));if(s.exists())account=s.data()}catch{}
 if(!account){try{const s=await getDocs(query(collection(db,"usuarios"),where("uid","==",uid),limit(1)));if(!s.empty)account=s.docs[0].data()}catch{}}
 const value={uid,nome:txt(profile?.nome||account?.nome||account?.email||"Usuário"),fotoUrl:txt(profile?.fotoUrl||account?.fotoUrl||"")};identityCache.set(uid,value);return value;
}

async function loadAccount(uid){
 try{const s=await getDoc(doc(db,"usuarios",uid));if(s.exists())return{id:s.id,...s.data()}}catch{}
 try{const s=await getDocs(query(collection(db,"usuarios"),where("uid","==",uid),limit(1)));if(!s.empty)return{id:s.docs[0].id,...s.docs[0].data()}}catch{}
 return{uid};
}
async function loadLogs(uid){
 try{const s=await getDocs(query(collection(db,"access_logs"),where("uid","==",uid),limit(100)));return s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>ms(b.criadoEm)-ms(a.criadoEm)).slice(0,30)}catch(error){console.warn("Atividade ADM V49:",error);return[]}
}

async function openAdminActivity(uid){
 if(!isAdminUser(currentUser))return;await waitAppCheck();
 openModal('<h2 id="v49ModalTitle">Carregando atividade...</h2><p>Buscando os eventos mais recentes desta conta.</p>');
 const [account,logs]=await Promise.all([loadAccount(uid),loadLogs(uid)]),name=txt(account.nome||account.email||uid);
 openModal(`<h2 id="v49ModalTitle">👤 ${esc(name)}</h2><p>${esc(account.email||"")}<br><code>${esc(uid)}</code></p><div class="v49-actions"><button type="button" data-v49-copy="${esc(uid)}">COPIAR UID</button><button class="primary" type="button" data-v49-compose="${esc(uid)}">ENVIAR AVISO</button></div><h3 style="margin-top:18px!important">Últimos eventos</h3><div class="v49-log-list">${logs.length?logs.map(l=>`<div class="v49-log"><strong>${esc(l.pagina==="/__saida__"?"SAÍDA":txt(l.tipo||"SESSÃO").toUpperCase())}</strong><span>${esc(l.plataforma||"web")} · ${esc(l.dispositivo||"-")} · ${esc(l.pagina||"/")}</span><small>${esc(fmt(l.criadoEm))}</small></div>`).join(""):'<div class="v49-notice">Nenhuma atividade registrada para esta conta.</div>'}</div>`);
}

async function openAdminCompose(uid,threadId=""){
 if(!isAdminUser(currentUser))return;const person=await identityOf(uid),thread=threadId||`admin:${uid}:${Date.now()}`;
 openModal(`<h2 id="v49ModalTitle">📣 Mensagem administrativa</h2><p>Destino: <strong>${esc(person.nome||uid)}</strong></p><textarea id="adminMessageV49Text" maxlength="500" placeholder="Digite a mensagem. Ela aparecerá como notificação e poderá ser respondida."></textarea><div id="adminMessageV49Status" class="v49-status"></div><div class="v49-actions"><button type="button" data-v49-close>CANCELAR</button><button class="primary" type="button" data-v49-send="${esc(uid)}" data-v49-thread="${esc(thread)}">ENVIAR E NOTIFICAR</button></div>`);
}

async function sendAdminNotice(uid,threadId){
 const input=document.getElementById("adminMessageV49Text"),status=document.getElementById("adminMessageV49Status"),value=txt(input?.value),button=document.querySelector(`[data-v49-send="${CSS.escape(uid)}"]`);
 if(value.length<3){if(status){status.textContent="Escreva uma mensagem com pelo menos 3 caracteres.";status.classList.add("error")}return}
 if(!isAdminUser(currentUser))return;if(button)button.disabled=true;if(status){status.classList.remove("error");status.textContent="Enviando..."}
 try{
  await waitAppCheck();
  await addDoc(collection(db,"notificacoes",uid,"itens"),{targetUid:uid,actorUid:currentUser.uid,actorNome:"Administração",actorFoto:"",type:"message",sourceId:txt(threadId||`admin:${uid}:${Date.now()}`).slice(0,200),text:value.slice(0,500),lida:false,createdAt:Timestamp.now()});
  if(status)status.textContent="✓ Mensagem entregue ao centro de notificações. A pessoa poderá responder diretamente.";
  setTimeout(closeModal,900);
 }catch(error){console.error("Mensagem ADM V49:",error);if(status){status.textContent="Não foi possível entregar a mensagem agora. Nenhum envio foi confirmado.";status.classList.add("error")}}
 finally{if(button)button.disabled=false}
}

async function fetchNotice(id){if(!currentUser||!id)return null;try{const s=await getDoc(doc(db,"notificacoes",currentUser.uid,"itens",id));return s.exists()?{id:s.id,...s.data()}:null}catch(error){console.warn("Aviso administrativo V49:",error);return null}}
async function openAdminNotice(item){
 if(!currentUser||!item)return;try{if(item.lida!==true)await updateDoc(doc(db,"notificacoes",currentUser.uid,"itens",item.id),{lida:true})}catch{}
 const actor=await identityOf(item.actorUid),isAdminActor=txt(item.actorNome).toLowerCase()==="administração"||isAdminThread(item);
 openModal(`<h2 id="v49ModalTitle">${isAdminActor?"📣 Mensagem da Administração":"✉ Mensagem"}</h2><p>De: <strong>${esc(item.actorNome||actor.nome||"Administração")}</strong></p><div class="v49-notice">${esc(item.text||"Mensagem sem texto.")}</div><textarea id="adminReplyV49Text" maxlength="500" placeholder="Escreva sua resposta..."></textarea><div id="adminReplyV49Status" class="v49-status"></div><div class="v49-actions"><button type="button" data-v49-close>FECHAR</button><button class="primary" type="button" data-v49-reply-send="${esc(item.actorUid||"")}" data-v49-thread="${esc(item.sourceId||`admin:${item.actorUid}:${Date.now()}`)}">RESPONDER</button></div>`);
}

async function sendReply(targetUid,threadId){
 const input=document.getElementById("adminReplyV49Text"),status=document.getElementById("adminReplyV49Status"),value=txt(input?.value),button=document.querySelector(`[data-v49-reply-send="${CSS.escape(targetUid)}"]`);
 if(value.length<1){if(status){status.textContent="Digite sua resposta.";status.classList.add("error")}return}if(!currentUser||!targetUid)return;if(button)button.disabled=true;if(status){status.classList.remove("error");status.textContent="Enviando resposta..."}
 try{
  await waitAppCheck();const me=await identityOf(currentUser.uid);
  await addDoc(collection(db,"notificacoes",targetUid,"itens"),{targetUid,actorUid:currentUser.uid,actorNome:me.nome||currentUser.displayName||"Usuário",actorFoto:me.fotoUrl||"",type:"message",sourceId:txt(threadId).slice(0,200),text:value.slice(0,500),lida:false,createdAt:Timestamp.now()});
  if(status)status.textContent="✓ Resposta enviada. O destinatário será notificado.";setTimeout(closeModal,850);
 }catch(error){console.error("Resposta administrativa V49:",error);if(status){status.textContent="Não foi possível enviar a resposta agora.";status.classList.add("error")}}
 finally{if(button)button.disabled=false}
}

function navigateRegularNotice(item){
 if(!item)return;if(item.type==="message"){location.href=`index.html?abrir=mensagens${item.actorUid?`&uid=${encodeURIComponent(item.actorUid)}`:""}`;return}
 if(["like","comment","mention"].includes(item.type)&&item.sourceId){location.href=`index.html?post=${encodeURIComponent(item.sourceId)}&activity=1#feed`;return}
 if(item.actorUid){location.href=`perfil-social.html?uid=${encodeURIComponent(item.actorUid)}`;return}location.href="index.html#feed";
}

async function handleNoticeClick(id){
 const item=await fetchNotice(id);if(!item)return;if(isAdminThread(item)){await openAdminNotice(item);return}
 try{if(item.lida!==true)await updateDoc(doc(db,"notificacoes",currentUser.uid,"itens",id),{lida:true})}catch{}
 navigateRegularNotice(item);
}

function installCapture(){
 if(document.documentElement.dataset.adminMessageV49Capture==="1")return;document.documentElement.dataset.adminMessageV49Capture="1";
 document.addEventListener("click",event=>{
  const close=event.target.closest?.("[data-v49-close]");if(close){event.preventDefault();event.stopPropagation();closeModal();return}
  const copy=event.target.closest?.("[data-v49-copy]");if(copy){event.preventDefault();event.stopPropagation();navigator.clipboard?.writeText(copy.dataset.v49Copy||"");copy.textContent="COPIADO";setTimeout(()=>copy.textContent="COPIAR UID",900);return}
  const compose=event.target.closest?.("[data-v49-compose]");if(compose){event.preventDefault();event.stopPropagation();void openAdminCompose(compose.dataset.v49Compose,compose.dataset.v49Thread||"");return}
  const send=event.target.closest?.("[data-v49-send]");if(send){event.preventDefault();event.stopPropagation();void sendAdminNotice(send.dataset.v49Send,send.dataset.v49Thread||"");return}
  const reply=event.target.closest?.("[data-v49-reply-send]");if(reply){event.preventDefault();event.stopPropagation();void sendReply(reply.dataset.v49ReplySend,reply.dataset.v49Thread||"");return}
  if(isAdminUser(currentUser)){
   const activity=event.target.closest?.("#commandV33 [data-v33-user]");if(activity){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();void openAdminActivity(activity.dataset.v33User);return}
   const msg=event.target.closest?.("#commandV33 [data-v33-message]");if(msg){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();void openAdminCompose(msg.dataset.v33Message);return}
  }
  const noticeRow=event.target.closest?.(".sn-row[data-sn-notification]");
  const activityRow=event.target.closest?.(".activity-item[data-activity-id]");
  const id=noticeRow?.dataset.snNotification||activityRow?.dataset.activityId||"";
  if(id&&currentUser){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();void handleNoticeClick(id)}
 },true);
 document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!document.getElementById("adminMessageV49Modal")?.hidden)closeModal()});
}

async function renderAdminComm(docs){
 const box=document.getElementById("adminCommV49List"),status=document.getElementById("adminCommV49Status");if(!box||!currentUser)return;
 const rows=docs.filter(x=>isAdminThread(x)&&(txt(x.actorUid)===currentUser.uid||txt(x.targetUid)===currentUser.uid)).sort((a,b)=>ms(b.createdAt)-ms(a.createdAt)).slice(0,30);
 const uids=[...new Set(rows.map(x=>txt(x.actorUid)===currentUser.uid?txt(x.targetUid):txt(x.actorUid)).filter(Boolean))];await Promise.all(uids.map(identityOf));
 if(status)status.textContent=`${rows.length} mensagem${rows.length===1?"":"s"} administrativa${rows.length===1?"":"s"} recente${rows.length===1?"":"s"} · atualização em tempo real`;
 box.innerHTML=rows.length?rows.map(x=>{const outgoing=txt(x.actorUid)===currentUser.uid,userUid=outgoing?txt(x.targetUid):txt(x.actorUid),person=identityCache.get(userUid)||{nome:userUid};return `<div class="command-v33-row ${outgoing?"outgoing":"incoming"}"><div><span class="v49-direction">${outgoing?"ENVIADA":"RESPOSTA RECEBIDA"}</span><strong>${esc(person.nome||userUid||"Conta")}</strong><span>${esc(x.text||"")}</span><small>${esc(fmt(x.createdAt))} · ${esc(x.sourceId||"")}</small></div><div class="command-v33-actions"><button class="primary" type="button" data-v49-compose="${esc(userUid)}" data-v49-thread="${esc(x.sourceId||"")}">RESPONDER</button></div></div>`}).join(""):'<div class="command-v33-empty">Nenhuma mensagem administrativa registrada.</div>';
}

function mountAdminCommPanel(){
 if(!isAdminUser(currentUser)||document.getElementById("adminCommV49"))return false;const anchor=document.getElementById("commandV33AccountsPanel")||document.querySelector("#commandV33 .command-v33-panel");if(!anchor)return false;
 const panel=document.createElement("section");panel.id="adminCommV49";panel.className="command-v33-panel";panel.innerHTML='<div class="command-v33-title"><div><h3>💬 Comunicação administrativa</h3><p>Mensagens enviadas pelo Controle e respostas recebidas. Atualização em tempo real.</p></div></div><div id="adminCommV49Status" class="command-v33-status">Conectando às mensagens...</div><div id="adminCommV49List" class="command-v33-list"></div>';anchor.insertAdjacentElement("afterend",panel);
 startAdminCommWatch();return true;
}
function startAdminCommWatch(){
 if(adminCommUnsub||!isAdminUser(currentUser))return;const q=query(collectionGroup(db,"itens"),limit(1200));adminCommUnsub=onSnapshot(q,snap=>{const docs=snap.docs.filter(d=>d.ref.path.startsWith("notificacoes/")).map(d=>({id:d.id,_path:d.ref.path,...d.data()}));void renderAdminComm(docs)},error=>{console.warn("Comunicação ADM V49:",error);const s=document.getElementById("adminCommV49Status");if(s)s.textContent="Não foi possível atualizar as respostas agora."})
}

function watchAdminMount(){
 const mount=()=>{if(isAdminUser(currentUser))mountAdminCommPanel()};mount();
 const obs=new MutationObserver(mount);obs.observe(document.documentElement,{childList:true,subtree:true});
}

async function handleDeepLink(){
 if(!currentUser||deepLinkHandledFor===currentUser.uid)return;const p=new URLSearchParams(location.search),directId=p.get("adminNotice");
 if(directId){deepLinkHandledFor=currentUser.uid;const item=await fetchNotice(directId);if(item&&isAdminThread(item))await openAdminNotice(item);return}
 if(p.get("abrir")!=="mensagens")return;
 try{await waitAppCheck();const s=await getDocs(query(collection(db,"notificacoes",currentUser.uid,"itens"),limit(150)));const rows=s.docs.map(d=>({id:d.id,...d.data()})).filter(isAdminThread).sort((a,b)=>ms(b.createdAt)-ms(a.createdAt));if(rows[0]){deepLinkHandledFor=currentUser.uid;await openAdminNotice(rows[0])}}catch{}
}

installStyles();installCapture();watchAdminMount();
onAuthStateChanged(auth,user=>{currentUser=user;if(!user){adminCommUnsub?.();adminCommUnsub=null;return}void handleDeepLink();if(isAdminUser(user))mountAdminCommPanel()});
