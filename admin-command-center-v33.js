import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  addDoc, collection, collectionGroup, doc, getCountFromServer, getDocs, getFirestore,
  limit, orderBy, query, serverTimestamp, setDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};
const ADMIN_EMAIL="swagtop411@gmail.com";
const app=getApps().length?getApp():initializeApp(cfg),auth=getAuth(app),db=getFirestore(app);
const state={accounts:[],logs:[],reports:[],posts:[],videos:[],stories:[],teams:[],champs:[],blocks:[],conversations:[],messages:[],counts:{},ready:false};
const $=id=>document.getElementById(id);
const text=v=>String(v??"").trim();
const esc=v=>{const d=document.createElement("div");d.textContent=text(v);return d.innerHTML};
const ms=v=>{if(!v)return 0;if(typeof v.toMillis==="function")return v.toMillis();if(v?.seconds)return Number(v.seconds)*1000;const n=Date.parse(v);return Number.isFinite(n)?n:0};
const fmt=v=>{const n=ms(v);return n?new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"}).format(new Date(n)):"-"};
const ago=millis=>Date.now()-millis;
const stamp=o=>o?.criadoEm||o?.createdAt||o?.created_at||o?.atualizadoEm||o?.data||null;
const recent=(o,hours)=>{const n=ms(stamp(o));return n>0&&ago(n)<=hours*3600000};
const statusOf=a=>text(a?.status||"ativo").toLowerCase();

async function safeList(name,cap=1000){try{const s=await getDocs(query(collection(db,name),limit(cap)));return s.docs.map(d=>({id:d.id,_path:d.ref.path,...d.data()}))}catch(error){console.warn(`V33 ${name}:`,error?.code||error);return[]}}
async function safeOrdered(name,field,cap=1000){try{const s=await getDocs(query(collection(db,name),orderBy(field,"desc"),limit(cap)));return s.docs.map(d=>({id:d.id,_path:d.ref.path,...d.data()}))}catch{return safeList(name,cap)}}
async function safeCount(name){try{return (await getCountFromServer(collection(db,name))).data().count}catch{return null}}
async function safeBlockList(){try{const s=await getDocs(query(collectionGroup(db,"usuarios"),limit(1500)));return s.docs.filter(d=>d.ref.path.startsWith("bloqueios/")).map(d=>({id:d.id,_path:d.ref.path,...d.data()}))}catch(error){console.warn("V33 bloqueios:",error?.code||error);return[]}}

function mount(){
  if($("commandV33"))return true;
  const view=$("controleView");if(!view)return false;
  const root=document.createElement("section");root.id="commandV33";root.className="command-v33";
  root.innerHTML=`
    <div class="command-v33-head"><div><span>CENTRAL DE COMANDO · V33</span><h2>Visão operacional do Cadastro de Atletas</h2><p>Atividade, crescimento, conteúdo, moderação, equipes, campeonatos e comunicação administrativa.</p></div><button id="commandV33Refresh" type="button">↻ ATUALIZAR CENTRAL</button></div>
    <div id="commandV33Kpis" class="command-v33-kpis"></div>
    <div class="command-v33-grid two">
      <section class="command-v33-panel"><div class="command-v33-title"><div><h3>⚡ Usuários ativos recentemente</h3><p>Atividade baseada em login, cadastro e sessão. Sem conteúdo privado.</p></div></div><div id="commandV33Active" class="command-v33-list"></div></section>
      <section class="command-v33-panel"><div class="command-v33-title"><div><h3>📈 Crescimento de contas</h3><p>Novas contas nos últimos 14 dias.</p></div></div><div id="commandV33Growth" class="command-v33-growth"></div></section>
    </div>
    <div class="command-v33-grid two">
      <section class="command-v33-panel"><div class="command-v33-title"><div><h3>🛡️ Moderação</h3><p>Denúncias pendentes e bloqueios entre usuários.</p></div><button class="ghost" data-v33-scroll="reports">VER FILA</button></div><div id="commandV33Moderation" class="command-v33-list"></div></section>
      <section class="command-v33-panel"><div class="command-v33-title"><div><h3>🌐 Conteúdo e comunidade</h3><p>Publicações, vídeos, Stories e volume de conversas. O texto das conversas não é aberto.</p></div></div><div id="commandV33Content" class="command-v33-metrics"></div></section>
    </div>
    <section id="commandV33AccountsPanel" class="command-v33-panel"><div class="command-v33-title"><div><h3>👥 Contas e ações rápidas</h3><p>Abra o perfil, veja atividade, copie o UID ou envie um aviso administrativo.</p></div><input id="commandV33Search" type="search" placeholder="Buscar nome, e-mail ou UID"></div><div id="commandV33Accounts" class="command-v33-table-wrap"></div></section>
    <section id="commandV33ReportsPanel" class="command-v33-panel"><div class="command-v33-title"><div><h3>🚨 Fila de denúncias</h3><p>Resolver e descartar sem acessar conversas privadas.</p></div></div><div id="commandV33Reports" class="command-v33-list"></div></section>
    <div class="command-v33-grid two">
      <section class="command-v33-panel"><div class="command-v33-title"><div><h3>🏐 Equipes e campeonatos</h3><p>Inventário operacional.</p></div></div><div id="commandV33Sports" class="command-v33-list"></div></section>
      <section class="command-v33-panel"><div class="command-v33-title"><div><h3>📣 Mensagens administrativas</h3><p>Histórico de avisos enviados pelo Controle. Não usa o Direct pessoal.</p></div></div><div id="commandV33Messages" class="command-v33-list"></div></section>
    </div>
    <div id="commandV33Modal" class="command-v33-modal" hidden><div class="command-v33-backdrop" data-v33-close></div><div class="command-v33-dialog"><button class="command-v33-close" type="button" data-v33-close>×</button><div id="commandV33ModalBody"></div></div></div>`;
  const anchor=$("controlV32Summary")||view.querySelector(".control-v10-head");anchor?.after(root);
  $("commandV33Refresh")?.addEventListener("click",()=>void loadAll());
  $("commandV33Search")?.addEventListener("input",renderAccounts);
  root.addEventListener("click",handleClick);
  return true;
}

function renderKpis(){
  const logs24=state.logs.filter(x=>recent(x,24)),logs7=state.logs.filter(x=>recent(x,24*7));
  const active24=new Set(logs24.map(x=>text(x.uid)).filter(Boolean)).size,active7=new Set(logs7.map(x=>text(x.uid)).filter(Boolean)).size;
  const new7=state.accounts.filter(x=>recent(x,24*7)).length,new30=state.accounts.filter(x=>recent(x,24*30)).length;
  const pending=state.reports.filter(x=>text(x.status||"pendente").toLowerCase()==="pendente").length;
  const content24=[...state.posts,...state.videos,...state.stories].filter(x=>recent(x,24)).length;
  const cards=[
    [state.counts.usuarios??state.accounts.length,"CONTAS","Total registrado"],[active24,"ATIVOS 24H",`${active7} em 7 dias`],[new7,"NOVAS 7D",`${new30} em 30 dias`],
    [content24,"CONTEÚDO 24H","Posts + vídeos + Stories"],[pending,"DENÚNCIAS","Pendentes agora"],[state.blocks.length,"BLOQUEIOS","Relações registradas"],
    [state.counts.equipes??state.teams.length,"EQUIPES","Cadastradas"],[state.counts.campeonatos??state.champs.length,"CAMPEONATOS","Inventário"],[state.counts.conversas??state.conversations.length,"CONVERSAS","Somente volume"]
  ];
  $("commandV33Kpis").innerHTML=cards.map(([v,l,s])=>`<div class="command-v33-kpi"><strong>${Number(v)||0}</strong><span>${esc(l)}</span><small>${esc(s)}</small></div>`).join("");
}

function latestByUid(){const map=new Map();for(const log of state.logs){const uid=text(log.uid);if(!uid)continue;const old=map.get(uid);if(!old||ms(log.criadoEm)>ms(old.criadoEm))map.set(uid,log)}return map}
function renderActive(){
  const map=latestByUid(),rows=[...map.values()].filter(x=>recent(x,24*7)).sort((a,b)=>ms(b.criadoEm)-ms(a.criadoEm)).slice(0,16);
  $("commandV33Active").innerHTML=rows.length?rows.map(x=>`<div class="command-v33-row"><div><strong>${esc(x.nome||"Usuário")}</strong><span>${esc(x.email||x.uid||"")}</span><small>${esc(x.plataforma||"web")} · ${esc(x.dispositivo||"-")} · ${esc(fmt(x.criadoEm))}</small></div><button data-v33-user="${esc(x.uid)}">DETALHES</button></div>`).join(""):'<div class="command-v33-empty">Nenhuma atividade recente registrada.</div>';
}
function renderGrowth(){
  const days=[];for(let i=13;i>=0;i--){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-i);const next=new Date(d);next.setDate(d.getDate()+1);const count=state.accounts.filter(a=>{const n=ms(a.criadoEm);return n>=d.getTime()&&n<next.getTime()}).length;days.push({d,count})}
  const max=Math.max(1,...days.map(x=>x.count));
  $("commandV33Growth").innerHTML=`<div class="command-v33-bars">${days.map(x=>`<div class="command-v33-bar"><i style="height:${Math.max(5,Math.round(x.count/max*100))}%"></i><b>${x.count}</b><span>${x.d.getDate()}/${x.d.getMonth()+1}</span></div>`).join("")}</div>`;
}
function renderModeration(){
  const pending=state.reports.filter(x=>text(x.status||"pendente").toLowerCase()==="pendente");
  const blockedOwners=new Set(state.blocks.map(x=>x._path.split("/")[1]).filter(Boolean)).size;
  $("commandV33Moderation").innerHTML=`<div class="command-v33-statline"><strong>${pending.length}</strong><span>denúncias pendentes</span></div><div class="command-v33-statline"><strong>${state.blocks.length}</strong><span>bloqueios registrados por ${blockedOwners} conta(s)</span></div><div class="command-v33-statline"><strong>${state.accounts.filter(x=>statusOf(x)!=="ativo").length}</strong><span>contas com status diferente de ativo</span></div>`;
}
function renderContent(){
  const activeStories=state.stories.filter(x=>{const exp=ms(x.expiraEm);return exp> Date.now()}).length;
  const metrics=[[state.counts.publicacoes??state.posts.length,"Publicações"],[state.counts.videos??state.videos.length,"Vídeos"],[activeStories,"Stories ativos"],[state.counts.conversas??state.conversations.length,"Conversas"],[state.counts.equipes??state.teams.length,"Equipes"],[state.counts.campeonatos??state.champs.length,"Campeonatos"]];
  $("commandV33Content").innerHTML=metrics.map(([n,l])=>`<div><strong>${Number(n)||0}</strong><span>${esc(l)}</span></div>`).join("");
}
function renderAccounts(){
  const q=text($("commandV33Search")?.value).toLowerCase();const latest=latestByUid();
  let rows=[...state.accounts].sort((a,b)=>ms(b.criadoEm)-ms(a.criadoEm));if(q)rows=rows.filter(a=>`${a.nome||""} ${a.email||""} ${a.uid||a.id}`.toLowerCase().includes(q));rows=rows.slice(0,250);
  $("commandV33Accounts").innerHTML=`<table class="command-v33-table"><thead><tr><th>Conta</th><th>Status</th><th>Última atividade</th><th>Ações</th></tr></thead><tbody>${rows.map(a=>{const uid=text(a.uid||a.id),last=latest.get(uid);return `<tr><td><strong>${esc(a.nome||"Sem nome")}</strong><br><small>${esc(a.email||"")}</small><br><code>${esc(uid)}</code></td><td><span class="command-v33-badge ${statusOf(a)==="ativo"?"ok":"warn"}">${esc(a.status||"ativo")}</span></td><td>${last?`${esc(fmt(last.criadoEm))}<br><small>${esc(last.plataforma||"web")} · ${esc(last.dispositivo||"-")}</small>`:"Sem registro"}</td><td><div class="command-v33-actions"><a href="perfil-social.html?uid=${encodeURIComponent(uid)}" target="_blank" rel="noopener">PERFIL</a><button data-v33-user="${esc(uid)}">ATIVIDADE</button><button data-v33-copy="${esc(uid)}">UID</button><button class="primary" data-v33-message="${esc(uid)}">AVISAR</button></div></td></tr>`}).join("")}</tbody></table>`;
}
function renderReports(){
  const rows=[...state.reports].sort((a,b)=>ms(b.criadoEm)-ms(a.criadoEm)).slice(0,100);
  $("commandV33Reports").innerHTML=rows.length?rows.map(r=>`<div class="command-v33-row report ${text(r.status||"pendente")}"><div><strong>${esc((r.alvoTipo||"alvo").toUpperCase())} · ${esc(r.motivo||"Sem motivo")}</strong><span>${esc(r.detalhes||"")}</span><small>ID: ${esc(r.alvoId||"")} · por ${esc(r.reportadoPorUid||"")} · ${esc(fmt(r.criadoEm))} · ${esc(r.status||"pendente")}</small></div>${text(r.status||"pendente")==="pendente"?`<div class="command-v33-actions"><button class="primary" data-v33-report="resolve:${esc(r.id)}">RESOLVER</button><button data-v33-report="discard:${esc(r.id)}">DESCARTAR</button></div>`:""}</div>`).join(""):'<div class="command-v33-empty">Nenhuma denúncia registrada.</div>';
}
function renderSports(){
  const teamRows=[...state.teams].slice(0,5).map(t=>`<div class="command-v33-mini"><strong>👥 ${esc(t.nome||"Equipe")}</strong><span>${esc(t.cidade||"")} ${esc(t.uf||"")}</span></div>`).join("");
  const champs=[...state.champs].sort((a,b)=>ms(a.data)-ms(b.data)).slice(0,5).map(c=>`<div class="command-v33-mini"><strong>🏆 ${esc(c.nome||"Campeonato")}</strong><span>${esc(c.local||"")} · ${esc(c.data||"")}</span></div>`).join("");
  $("commandV33Sports").innerHTML=`<div class="command-v33-split"><div><h4>${state.counts.equipes??state.teams.length} equipes</h4>${teamRows||'<small>Nenhuma equipe.</small>'}</div><div><h4>${state.counts.campeonatos??state.champs.length} campeonatos</h4>${champs||'<small>Nenhum campeonato.</small>'}</div></div>`;
}
function renderMessages(){
  const rows=[...state.messages].sort((a,b)=>ms(b.criadoEm)-ms(a.criadoEm)).slice(0,15);
  $("commandV33Messages").innerHTML=rows.length?rows.map(m=>`<div class="command-v33-mini"><strong>📣 ${esc(m.targetNome||m.targetEmail||m.targetUid||"Conta")}</strong><span>${esc(m.texto||"")}</span><small>${esc(fmt(m.criadoEm))}</small></div>`).join(""):'<div class="command-v33-empty">Nenhum aviso administrativo enviado.</div>';
}
function renderAll(){renderKpis();renderActive();renderGrowth();renderModeration();renderContent();renderAccounts();renderReports();renderSports();renderMessages()}

async function loadAll(){
  if(!state.ready)return;const btn=$("commandV33Refresh");if(btn){btn.disabled=true;btn.textContent="ATUALIZANDO..."}
  try{
    const [accounts,logs,reports,posts,videos,stories,teams,champs,blocks,conversations,messages,counts]=await Promise.all([
      safeOrdered("usuarios","criadoEm",1000),safeOrdered("access_logs","criadoEm",1000),safeOrdered("denuncias","criadoEm",500),safeOrdered("publicacoes","criadoEm",1000),safeOrdered("videos","criadoEm",1000),safeOrdered("stories","criadoEm",1000),safeList("equipes",1000),safeList("campeonatos",1000),safeBlockList(),safeList("conversas",1000),safeOrdered("avisos_admin","criadoEm",300),
      Promise.all(["usuarios","publicacoes","videos","equipes","campeonatos","conversas"].map(async name=>[name,await safeCount(name)]))
    ]);
    Object.assign(state,{accounts,logs,reports,posts,videos,stories,teams,champs,blocks,conversations,messages});state.counts=Object.fromEntries(counts);renderAll();
  }catch(error){console.error("Central V33:",error);$("commandV33Kpis").innerHTML='<div class="command-v33-empty">Não foi possível atualizar a Central agora.</div>'}
  finally{if(btn){btn.disabled=false;btn.textContent="↻ ATUALIZAR CENTRAL"}}
}

function openModal(html){const modal=$("commandV33Modal"),body=$("commandV33ModalBody");if(!modal||!body)return;body.innerHTML=html;modal.hidden=false;document.body.style.overflow="hidden"}
function closeModal(){const modal=$("commandV33Modal");if(modal)modal.hidden=true;document.body.style.overflow=""}
function account(uid){return state.accounts.find(a=>text(a.uid||a.id)===uid)}
function userLogs(uid){return state.logs.filter(l=>text(l.uid)===uid).sort((a,b)=>ms(b.criadoEm)-ms(a.criadoEm)).slice(0,30)}
function showUser(uid){const a=account(uid),logs=userLogs(uid);openModal(`<h2>👤 ${esc(a?.nome||"Conta")}</h2><p>${esc(a?.email||"")}<br><code>${esc(uid)}</code></p><div class="command-v33-modal-actions"><a href="perfil-social.html?uid=${encodeURIComponent(uid)}" target="_blank" rel="noopener">ABRIR PERFIL</a><button data-v33-copy="${esc(uid)}">COPIAR UID</button><button class="primary" data-v33-message="${esc(uid)}">ENVIAR AVISO</button></div><h3>Últimos eventos</h3><div class="command-v33-list">${logs.length?logs.map(l=>`<div class="command-v33-mini"><strong>${esc(l.pagina==="/__saida__"?"SAÍDA":(l.tipo||"SESSÃO").toUpperCase())}</strong><span>${esc(l.plataforma||"web")} · ${esc(l.dispositivo||"-")} · ${esc(l.pagina||"/")}</span><small>${esc(fmt(l.criadoEm))}</small></div>`).join(""):'<div class="command-v33-empty">Sem atividade registrada.</div>'}</div>`)}
function messageModal(uid){const a=account(uid);openModal(`<h2>📣 Aviso administrativo</h2><p>Destino: <strong>${esc(a?.nome||a?.email||uid)}</strong></p><textarea id="commandV33MessageText" maxlength="500" placeholder="Digite um aviso objetivo para esta conta..."></textarea><div id="commandV33MessageStatus" class="command-v33-status"></div><div class="command-v33-modal-actions"><button data-v33-close>CANCELAR</button><button class="primary" data-v33-send="${esc(uid)}">ENVIAR AVISO</button></div>`)}
async function sendMessage(uid){const input=$("commandV33MessageText"),status=$("commandV33MessageStatus"),value=text(input?.value);if(value.length<3){if(status)status.textContent="Escreva uma mensagem com pelo menos 3 caracteres.";return}const user=auth.currentUser,a=account(uid);if(!user)return;const btn=document.querySelector(`[data-v33-send="${CSS.escape(uid)}"]`);if(btn)btn.disabled=true;try{const audit=await addDoc(collection(db,"avisos_admin"),{targetUid:uid,targetNome:text(a?.nome),targetEmail:text(a?.email),texto:value,actorUid:user.uid,actorEmail:text(user.email),status:"enviado",criadoEm:serverTimestamp()});await setDoc(doc(db,"notificacoes",uid,"itens",audit.id),{targetUid:uid,actorUid:user.uid,actorNome:"Administração",actorFoto:"",type:"admin",sourceId:`admin:${audit.id}`,text:value,lida:false,createdAt:serverTimestamp()});if(status)status.textContent="Aviso enviado com sucesso.";setTimeout(()=>{closeModal();void loadAll()},650)}catch(error){console.error("Aviso ADM:",error);if(status)status.textContent="Não foi possível enviar o aviso."}finally{if(btn)btn.disabled=false}}
async function reportAction(action,id){const r=state.reports.find(x=>x.id===id);if(!r)return;const next=action==="resolve"?"resolvido":"descartado";if(!confirm(`${next==="resolvido"?"Resolver":"Descartar"} esta denúncia?`))return;try{await updateDoc(doc(db,"denuncias",id),{status:next,atualizadoEm:serverTimestamp()});r.status=next;renderReports();renderModeration()}catch(error){console.error("Denúncia V33:",error);alert("Não foi possível atualizar a denúncia.")}}
async function handleClick(event){const close=event.target.closest?.("[data-v33-close]");if(close){closeModal();return}const scroll=event.target.closest?.("[data-v33-scroll]");if(scroll){$("commandV33ReportsPanel")?.scrollIntoView({behavior:"smooth",block:"start"});return}const user=event.target.closest?.("[data-v33-user]");if(user){showUser(user.dataset.v33User);return}const msg=event.target.closest?.("[data-v33-message]");if(msg){messageModal(msg.dataset.v33Message);return}const send=event.target.closest?.("[data-v33-send]");if(send){await sendMessage(send.dataset.v33Send);return}const copy=event.target.closest?.("[data-v33-copy]");if(copy){await navigator.clipboard?.writeText(copy.dataset.v33Copy||"");copy.textContent="COPIADO";setTimeout(()=>copy.textContent="UID",900);return}const report=event.target.closest?.("[data-v33-report]");if(report){const[action,id]=text(report.dataset.v33Report).split(":");await reportAction(action,id)}}

function boot(user){if(!user||text(user.email).toLowerCase()!==ADMIN_EMAIL)return;let tries=0;const timer=setInterval(()=>{tries++;if(mount()){clearInterval(timer);state.ready=true;void loadAll()}else if(tries>60)clearInterval(timer)},120)}
onAuthStateChanged(auth,boot);
