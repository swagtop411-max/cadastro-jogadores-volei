import "./firebase-app-check-v11.js?v=20260909-46";
import{getApp,getApps,initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getAuth,onAuthStateChanged}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import{collection,deleteDoc,doc,getDoc,getDocs,getFirestore,onSnapshot,query,serverTimestamp,setDoc,where}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import{getFunctions,httpsCallable}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js";

const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};
const ADMIN_EMAIL="swagtop411@gmail.com";
const app=getApps().length?getApp():initializeApp(cfg),auth=getAuth(app),db=getFirestore(app),functions=getFunctions(app,"southamerica-east1");
const adminDeleteAccount=httpsCallable(functions,"adminDeleteAccount");
const esc=value=>{const el=document.createElement("div");el.textContent=value==null?"":String(value);return el.innerHTML};
const text=value=>String(value??"").trim();
const ms=value=>value?.toMillis?.()??(value?.seconds?Number(value.seconds)*1000:Date.parse(value||"")||0);
const fmt=value=>ms(value)?new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"}).format(new Date(ms(value))):"Data não informada";
let requests=[],stopSnapshot=null,busy=false;

function installStyles(){
 if(document.getElementById("adminDeletionV80Css"))return;
 const style=document.createElement("style");
 style.id="adminDeletionV80Css";
 style.textContent=`
 .delete-v80-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:16px}
 .delete-v80-head h2{margin:0 0 5px}.delete-v80-head p{margin:0;color:#6f8796;font-size:11px}
 .delete-v80-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(280px,.65fr);gap:14px}
 .delete-v80-panel{padding:16px;border:1px solid #d8e5eb;border-radius:14px;background:#fff}
 .delete-v80-panel h3{margin:0 0 7px;color:#173d53;font-size:13px}.delete-v80-panel p{margin:0 0 12px;color:#6e8492;font-size:10px;line-height:1.5}
 .delete-v80-manual{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}
 .delete-v80-manual input{min-height:44px;padding:0 12px;border:1px solid #c7dce5;border-radius:10px;font-size:11px}
 .delete-v80-manual button,.delete-v80-card button{min-height:40px;padding:0 12px;border:1px solid #c4d8e1;border-radius:10px;background:#fff;color:#146d89;font-size:9px;font-weight:900;cursor:pointer}
 .delete-v80-card button.danger{border-color:#d99b9b;background:#fff5f5;color:#a42e2e}
 .delete-v80-list{display:grid;gap:10px}.delete-v80-card{padding:13px;border:1px solid #dbe6eb;border-radius:12px;background:#f9fcfd}
 .delete-v80-card.pending{border-left:5px solid #e5a62e}.delete-v80-card strong{display:block;color:#153e53;font-size:12px}
 .delete-v80-card small{display:block;margin-top:4px;color:#738a97;font-size:9px;overflow-wrap:anywhere}
 .delete-v80-card .meta{margin-top:8px;padding:8px;border-radius:8px;background:#fff;color:#607b89;font-size:9px}
 .delete-v80-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.delete-v80-empty{padding:28px 12px;text-align:center;border:1px dashed #cadde5;border-radius:12px;color:#7b919e;font-size:10px}
 .delete-v80-status{min-height:18px;margin-top:9px;color:#176b88;font-size:10px}.delete-v80-status.error{color:#a42e2e}
 @media(max-width:800px){.delete-v80-grid{grid-template-columns:1fr}.delete-v80-head{display:grid}.delete-v80-manual{grid-template-columns:1fr}.delete-v80-manual button{width:100%}}
 `;
 document.head.appendChild(style);
}

function openView(){
 document.querySelectorAll(".admin-tab").forEach(item=>item.classList.remove("active"));
 document.querySelectorAll(".admin-view").forEach(item=>item.classList.remove("active"));
 document.getElementById("deletionTabV80")?.classList.add("active");
 document.getElementById("deletionViewV80")?.classList.add("active");
 document.getElementById("deletionViewV80")?.scrollIntoView({behavior:"smooth",block:"start"});
}

function ensureUi(){
 installStyles();
 const tabs=document.querySelector(".admin-tabs"),panel=document.querySelector(".admin-panel")||document.querySelector("main.admin-page")||document.querySelector(".admin-page");
 if(!tabs||!panel)return false;
 if(!document.getElementById("deletionTabV80")){
  const tab=document.createElement("button");
  tab.id="deletionTabV80";tab.type="button";tab.className="admin-tab";
  tab.innerHTML='🗑️ Exclusões <span id="deletionBadgeV80" class="comments-badge" hidden>0</span>';
  tab.addEventListener("click",openView);tabs.appendChild(tab);
 }
 if(!document.getElementById("deletionViewV80")){
  const view=document.createElement("section");
  view.id="deletionViewV80";view.className="admin-view";
  view.innerHTML=`
   <div class="delete-v80-head"><div><h2>🗑️ Exclusão de contas</h2><p>Pedidos de exclusão e remoção administrativa completa por e-mail ou UID.</p></div><button type="button" id="deletionRefreshV80">ATUALIZAR</button></div>
   <div class="delete-v80-grid">
    <section class="delete-v80-panel"><h3>Pedidos recebidos</h3><p>Pedidos feitos pelo fluxo de exclusão do aplicativo aparecem aqui automaticamente.</p><div id="deletionListV80" class="delete-v80-list"><div class="delete-v80-empty">Carregando pedidos...</div></div></section>
    <section class="delete-v80-panel"><h3>Excluir manualmente</h3><p>Use quando o pedido chegou por WhatsApp ou outro canal. Informe o e-mail cadastrado ou o UID.</p><div class="delete-v80-manual"><input id="deletionLookupV80" type="text" placeholder="E-mail ou UID da conta"><button id="deletionFindV80" type="button">LOCALIZAR</button></div><div id="deletionLookupResultV80"></div><div id="deletionStatusV80" class="delete-v80-status"></div></section>
   </div>`;
  panel.appendChild(view);
  view.querySelector("#deletionRefreshV80").onclick=()=>subscribeRequests(true);
  view.querySelector("#deletionFindV80").onclick=()=>void manualLookup();
 }
 return true;
}

function setStatus(message,error=false){
 const el=document.getElementById("deletionStatusV80");if(!el)return;
 el.textContent=message||"";el.classList.toggle("error",!!error);
}

function renderRequests(){
 const list=document.getElementById("deletionListV80"),badge=document.getElementById("deletionBadgeV80");
 if(!list)return;
 const pending=requests.filter(item=>text(item.status||"pendente").toLowerCase()==="pendente");
 if(badge){badge.textContent=String(pending.length);badge.hidden=!pending.length}
 if(!requests.length){list.innerHTML='<div class="delete-v80-empty">Nenhum pedido de exclusão registrado.</div>';return}
 list.innerHTML=requests.map(item=>`
  <article class="delete-v80-card ${text(item.status||"pendente").toLowerCase()}">
   <strong>${esc(item.nome||item.email||"Conta")}</strong>
   <small>${esc(item.email||"E-mail não informado")}</small>
   <small>UID: ${esc(item.uid||item.id||"não informado")}</small>
   <div class="meta">Solicitado em ${esc(fmt(item.criadoEm||item.atualizadoEm))} · origem: ${esc(item.origem||"app")}</div>
   <div class="delete-v80-actions">
    <button type="button" data-del-copy="${esc(item.uid||item.id||"")}">COPIAR UID</button>
    <button type="button" class="danger" data-del-account="${esc(item.uid||item.id||"")}" data-del-request="${esc(item.id||"")}">EXCLUIR CONTA E DADOS</button>
   </div>
  </article>`).join("");
 list.querySelectorAll("[data-del-copy]").forEach(btn=>btn.onclick=async()=>{await navigator.clipboard?.writeText(btn.dataset.delCopy||"");btn.textContent="COPIADO";setTimeout(()=>btn.textContent="COPIAR UID",900)});
 list.querySelectorAll("[data-del-account]").forEach(btn=>btn.onclick=()=>void deleteAccount(btn.dataset.delAccount,btn.dataset.delRequest||""));
}

async function subscribeRequests(force=false){
 if(force&&stopSnapshot){stopSnapshot();stopSnapshot=null}
 if(stopSnapshot)return;
 try{
  stopSnapshot=onSnapshot(collection(db,"solicitacoes_exclusao"),snap=>{
   requests=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>ms(b.criadoEm||b.atualizadoEm)-ms(a.criadoEm||a.atualizadoEm));
   renderRequests();
  },error=>{
   console.error("Pedidos de exclusão:",error);
   const list=document.getElementById("deletionListV80");if(list)list.innerHTML='<div class="delete-v80-empty">Não foi possível ler a fila de exclusões. O campo manual continua disponível.</div>';
  });
 }catch(error){console.error("Fila de exclusões:",error)}
}

async function resolveAccount(term){
 const value=text(term);if(!value)return null;
 const direct=await getDoc(doc(db,"usuarios",value)).catch(()=>null);
 if(direct?.exists())return{id:direct.id,...direct.data()};
 let snap=await getDocs(query(collection(db,"usuarios"),where("email","==",value.toLowerCase()))).catch(()=>null);
 if(!snap?.empty){const d=snap.docs[0];return{id:d.id,...d.data()}}
 // Compatibilidade com e-mails legados que possam preservar maiúsculas.
 snap=await getDocs(collection(db,"usuarios"));
 const found=snap.docs.find(d=>text(d.data()?.email).toLowerCase()===value.toLowerCase());
 return found?{id:found.id,...found.data()}:null;
}

async function manualLookup(){
 const input=document.getElementById("deletionLookupV80"),result=document.getElementById("deletionLookupResultV80");
 const value=text(input?.value);if(!value){setStatus("Informe o e-mail ou UID.",true);return}
 setStatus("Localizando conta...");
 try{
  const account=await resolveAccount(value);
  if(!account){result.innerHTML='<div class="delete-v80-empty">Conta não encontrada no cadastro.</div>';setStatus("");return}
  const uid=text(account.uid||account.id);
  result.innerHTML=`<article class="delete-v80-card"><strong>${esc(account.nome||"Conta")}</strong><small>${esc(account.email||"")}</small><small>UID: ${esc(uid)}</small><div class="delete-v80-actions"><button class="danger" type="button" id="deletionManualDeleteV80">EXCLUIR CONTA E DADOS</button></div></article>`;
  result.querySelector("#deletionManualDeleteV80").onclick=()=>void deleteAccount(uid,"");
  setStatus("Conta localizada.");
 }catch(error){console.error("Localizar exclusão:",error);setStatus("Não foi possível localizar a conta agora.",true)}
}

async function purgeVisibleAccountData(uid){
 const accountSnap=await getDoc(doc(db,"usuarios",uid));
 const account=accountSnap.exists()?accountSnap.data():{};
 const ownerCollections=["publicacoes","videos","stories","atletas","atletas_pendentes","equipes","equipes_pendentes","comentarios_publicacoes","comentarios"];
 for(const name of ownerCollections){
  const snap=await getDocs(query(collection(db,name),where("ownerUid","==",uid))).catch(()=>null);
  for(const item of snap?.docs||[])await deleteDoc(item.ref).catch(error=>console.warn("Remoção",name,item.id,error));
 }
 const handles=await getDocs(query(collection(db,"handles"),where("uid","==",uid))).catch(()=>null);
 for(const item of handles?.docs||[])await deleteDoc(item.ref).catch(()=>{});
 for(const ref of [
  doc(db,"perfis",uid),
  doc(db,"config_perfis",uid),
  doc(db,"solicitacoes_planos",uid)
 ])await deleteDoc(ref).catch(()=>{});

 if(accountSnap.exists()){
  await setDoc(doc(db,"usuarios",uid),{
   uid,
   email:text(account.email||""),
   nome:"Conta em exclusão",
   papel:text(account.papel||"usuario")||"usuario",
   status:"exclusao_pendente",
   atualizadoEm:serverTimestamp()
  });
 }
 return true;
}

async function deleteAccount(uid,requestId=""){
 if(busy||!uid)return;
 const phrase=prompt("Esta ação é irreversível. Digite EXCLUIR para remover a conta, perfil, publicações, mídias e dados vinculados.");
 if(text(phrase).toUpperCase()!=="EXCLUIR"){setStatus("Exclusão cancelada.");return}
 if(!confirm("Confirma a exclusão DEFINITIVA desta conta?"))return;
 busy=true;setStatus("Excluindo conta e dados. Aguarde...");
 document.querySelectorAll("[data-del-account],#deletionManualDeleteV80").forEach(btn=>btn.disabled=true);
 try{
  const result=await adminDeleteAccount({uid,confirmation:"EXCLUIR",requestId});
  if(result?.data?.deleted!==true)throw new Error("DELETE_NOT_CONFIRMED");
  if(requestId)await deleteDoc(doc(db,"solicitacoes_exclusao",requestId)).catch(()=>{});
  setStatus("Conta, perfil e dados vinculados foram excluídos.");
  document.getElementById("deletionLookupResultV80")?.replaceChildren();
 }catch(error){
  console.error("Exclusão administrativa:",error);
  const code=String(error?.code||"");
  if(code.includes("not-found")||code.includes("unavailable")||code.includes("internal")){
   try{
    setStatus("Backend completo indisponível. Removendo o perfil público e bloqueando o acesso agora...");
    await purgeVisibleAccountData(uid);
    setStatus("Perfil removido do app e acesso bloqueado. A remoção final do Firebase Authentication e das mídias do provedor externo continua pendente no backend.",true);
    document.getElementById("deletionLookupResultV80")?.replaceChildren();
   }catch(fallbackError){
    console.error("Fallback de exclusão:",fallbackError);
    setStatus("Não foi possível concluir a exclusão nem o bloqueio de segurança.",true);
   }
  }else{
   setStatus("Não foi possível concluir a exclusão. Nenhuma confirmação falsa de sucesso foi exibida.",true);
  }
 }finally{
  busy=false;document.querySelectorAll("[data-del-account],#deletionManualDeleteV80").forEach(btn=>btn.disabled=false);
 }
}

function boot(user){
 if(!user||text(user.email).toLowerCase()!==ADMIN_EMAIL)return;
 let tries=0;const timer=setInterval(()=>{tries++;if(ensureUi()){clearInterval(timer);subscribeRequests()}else if(tries>80)clearInterval(timer)},100);
}
onAuthStateChanged(auth,boot);
