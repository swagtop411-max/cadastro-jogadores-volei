import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { collection, getDocs, getFirestore, limit, orderBy, query } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};
const ADMIN_EMAIL="swagtop411@gmail.com";
const app=getApps().length?getApp():initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
const state={logs:[],accounts:[],filter:"all",ready:false};
const txt=v=>String(v??"").trim();
const millis=v=>{if(!v)return 0;if(typeof v.toMillis==="function")return v.toMillis();if(v?.seconds)return Number(v.seconds)*1000;const n=Date.parse(v);return Number.isFinite(n)?n:0};
const fmt=v=>{const ms=millis(v);return ms?new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"}).format(new Date(ms)):"-"};
const esc=v=>{const d=document.createElement("div");d.textContent=txt(v);return d.innerHTML};
const todayStart=()=>{const d=new Date();d.setHours(0,0,0,0);return d.getTime()};
const isExit=log=>log?.tipo==="sessao"&&txt(log?.pagina)==="/__saida__";
const eventKey=log=>isExit(log)?"saida":log?.tipo==="login"?"login":log?.tipo==="cadastro"?"cadastro":"sessao";
const eventLabel=log=>({saida:"SAÍDA",login:"ENTRADA",cadastro:"CADASTRO",sessao:"SESSÃO"})[eventKey(log)]||"EVENTO";
const eventClass=log=>({saida:"out",login:"login",cadastro:"signup",sessao:""})[eventKey(log)]||"";

function waitForControl(){
  const view=document.getElementById("controleView"),tab=document.getElementById("controlV10Tab");
  if(!view||!tab)return false;
  tab.textContent="🎛️ Controle Geral";
  tab.dataset.v32="1";
  installOverview(view);
  installAccessSection(view);
  return true;
}

function installOverview(view){
  const head=view.querySelector(".control-v10-head");
  if(!head||document.getElementById("controlV32Summary"))return;
  const summary=document.createElement("div");
  summary.id="controlV32Summary";
  summary.className="control-v32-summary";
  head.after(summary);
  const refresh=document.getElementById("controlV10Refresh");
  refresh?.addEventListener("click",()=>void loadV32(),{capture:true});
}

function installAccessSection(view){
  if(document.getElementById("controlV32Access"))return;
  const sections=[...view.querySelectorAll(".control-v10-section")];
  const target=sections.find(section=>/últimos acessos|ultimos acessos/i.test(section.querySelector("h3")?.textContent||""));
  if(!target)return;
  target.id="controlV32Access";
  target.innerHTML=`<div class="control-v32-tools"><div><h3>🔐 Entradas e saídas do app</h3><p class="control-v10-sub">Acompanhe cadastro, login, início de sessão e saídas feitas pelo botão Sair.</p></div><div class="control-v32-filters"><button type="button" class="control-v32-filter active" data-v32-filter="all">TODOS</button><button type="button" class="control-v32-filter" data-v32-filter="login">ENTRADAS</button><button type="button" class="control-v32-filter" data-v32-filter="saida">SAÍDAS</button><button type="button" class="control-v32-filter" data-v32-filter="today">HOJE</button></div></div><div id="controlV32AccessStatus" class="control-v10-status">Carregando acessos...</div><div class="control-v32-table-wrap"><table class="control-v32-table"><thead><tr><th>Data</th><th>Usuário</th><th>Evento</th><th>Plataforma</th><th>Dispositivo</th><th>Página</th></tr></thead><tbody id="controlV32AccessBody"></tbody></table></div><div class="control-v10-note">Saída é registrada quando a pessoa usa o botão <strong>Sair</strong>. Fechar o navegador ou encerrar o app pelo sistema operacional não gera um evento confiável, por isso o painel também mantém o último acesso e o início da sessão.</div>`;
  target.querySelectorAll("[data-v32-filter]").forEach(button=>button.addEventListener("click",()=>{state.filter=button.dataset.v32Filter||"all";target.querySelectorAll("[data-v32-filter]").forEach(x=>x.classList.toggle("active",x===button));renderAccess()}));
}

function renderSummary(){
  const root=document.getElementById("controlV32Summary");if(!root)return;
  const start=todayStart();
  const today=state.logs.filter(log=>millis(log.criadoEm)>=start);
  const entries=today.filter(log=>eventKey(log)==="login").length;
  const exits=today.filter(log=>eventKey(log)==="saida").length;
  const sessions=today.filter(log=>eventKey(log)==="sessao").length;
  const signedUp=today.filter(log=>eventKey(log)==="cadastro").length;
  const people=new Set(today.map(log=>txt(log.uid)).filter(Boolean)).size;
  root.innerHTML=`<div class="control-v32-card"><strong>${state.accounts.length}</strong><span>Contas</span><small>Usuários registrados</small></div><div class="control-v32-card"><strong>${entries}</strong><span>Entradas hoje</span><small>Logins realizados</small></div><div class="control-v32-card"><strong>${exits}</strong><span>Saídas hoje</span><small>Logout pelo app</small></div><div class="control-v32-card"><strong>${people}</strong><span>Pessoas hoje</span><small>UIDs com atividade</small></div><div class="control-v32-card"><strong>${sessions+signedUp}</strong><span>Sessões/cadastros</span><small>Movimentação de hoje</small></div>`;
}

function filteredLogs(){
  const start=todayStart();
  if(state.filter==="login")return state.logs.filter(log=>eventKey(log)==="login");
  if(state.filter==="saida")return state.logs.filter(log=>eventKey(log)==="saida");
  if(state.filter==="today")return state.logs.filter(log=>millis(log.criadoEm)>=start);
  return state.logs;
}

function renderAccess(){
  const body=document.getElementById("controlV32AccessBody"),status=document.getElementById("controlV32AccessStatus");if(!body)return;
  const rows=filteredLogs().slice(0,500);
  if(status)status.textContent=`${rows.length} evento${rows.length===1?"":"s"} exibido${rows.length===1?"":"s"} · até 500 registros mais recentes`;
  if(!rows.length){body.innerHTML='<tr><td colspan="6">Nenhum acesso encontrado neste filtro.</td></tr>';return}
  body.innerHTML=rows.map(log=>`<tr><td>${esc(fmt(log.criadoEm))}</td><td><strong>${esc(log.nome||"Usuário")}</strong><br><small>${esc(log.email||log.uid||"")}</small></td><td><span class="control-v32-event ${eventClass(log)}">${eventLabel(log)}</span></td><td>${esc(log.plataforma||"web")}</td><td>${esc(log.dispositivo||"-")}</td><td>${esc(isExit(log)?"Saída da conta":log.pagina||"/")}</td></tr>`).join("");
}

async function loadV32(){
  if(!state.ready)return;
  const status=document.getElementById("controlV32AccessStatus");if(status)status.textContent="Atualizando acessos...";
  try{
    const [logsSnap,accountsSnap]=await Promise.all([
      getDocs(query(collection(db,"access_logs"),orderBy("criadoEm","desc"),limit(500))),
      getDocs(query(collection(db,"usuarios"),limit(800)))
    ]);
    state.logs=logsSnap.docs.map(d=>({id:d.id,...d.data()}));
    state.accounts=accountsSnap.docs.map(d=>({id:d.id,...d.data()}));
    renderSummary();renderAccess();
  }catch(error){
    console.error("Controle V32:",error);
    if(status)status.textContent="Não foi possível carregar os acessos agora.";
  }
}

function bootForOwner(user){
  if(!user||txt(user.email).toLowerCase()!==ADMIN_EMAIL)return;
  import("./admin-control-center-v10.js?v=20260909-46").then(()=>{
    let attempts=0;
    const timer=setInterval(()=>{
      attempts++;
      if(waitForControl()||attempts>40){clearInterval(timer);if(attempts<=40){state.ready=true;void loadV32()}}
    },100);
  }).catch(error=>console.error("Controle legado V10:",error));
}

onAuthStateChanged(auth,bootForOwner);
