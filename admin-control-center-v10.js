import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  collection,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { linkLegacyProfile } from "./admin-profile-link-v10.js?v=20260902-1";

const firebaseConfig={
  apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",
  authDomain:"jogadores-de-volei.firebaseapp.com",
  projectId:"jogadores-de-volei",
  storageBucket:"jogadores-de-volei.firebasestorage.app",
  messagingSenderId:"48728914064",
  appId:"1:48728914064:web:1dd7aeb705319886f74015"
};
const ADMIN_EMAIL="swagtop411@gmail.com";
const app=getApps().length?getApp():initializeApp(firebaseConfig);
const auth=getAuth(app),db=getFirestore(app);

const state={
  usuarios:[],access_logs:[],atletas:[],perfis:[],equipes:[],campeonatos:[],publicacoes:[],videos:[],stories:[],apoiadores:[],claims:[],
  accessLogsAvailable:true,loaded:false
};

const txt=value=>String(value??"").trim();
const esc=value=>{const d=document.createElement("div");d.textContent=value==null?"":String(value);return d.innerHTML};
const norm=value=>txt(value).toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
const tokens=value=>norm(value).split(" ").filter(part=>part.length>=3);
const millis=value=>{if(!value)return 0;if(typeof value.toMillis==="function")return value.toMillis();if(value?.seconds)return Number(value.seconds)*1000;const parsed=Date.parse(value);return Number.isFinite(parsed)?parsed:0};
const fmt=value=>{const ms=millis(value);return ms?new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"}).format(new Date(ms)):"Não registrado"};
const within=(value,days)=>{const ms=millis(value);return ms>0&&Date.now()-ms<=days*86400000};
const startToday=()=>{const d=new Date();d.setHours(0,0,0,0);return d.getTime()};

function nameSimilarity(a,b){
  const aa=tokens(a),bb=tokens(b);if(!aa.length||!bb.length)return 0;
  const A=new Set(aa),B=new Set(bb);let hit=0;for(const token of A)if(B.has(token))hit++;
  const coverage=hit/Math.min(A.size,B.size);
  const first=aa[0]===bb[0],last=aa.at(-1)===bb.at(-1);
  if(first&&last&&hit>=2)return Math.max(.95,coverage);
  if(last&&coverage>=.7)return Math.max(.8,coverage);
  return coverage;
}

function addStyles(){
  if(document.getElementById("adminControlV10Styles"))return;
  const style=document.createElement("style");style.id="adminControlV10Styles";style.textContent=`
  @media(min-width:701px){.admin-tabs{grid-template-columns:repeat(5,minmax(0,1fr))!important;row-gap:5px!important}}
  .control-v10{color:#152a3b}.control-v10-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:18px}.control-v10-kicker{font-size:10px;font-weight:900;letter-spacing:1.8px;color:#0785af}.control-v10 h2{margin:5px 0 7px;color:#0d2232;font-size:28px}.control-v10 p{color:#61798a;line-height:1.55}.control-v10-refresh{border:0;border-radius:11px;background:#087fa8;color:#fff;padding:12px 16px;font-weight:900;cursor:pointer;white-space:nowrap}
  .control-v10-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.control-v10-card{background:#fff;border:1px solid #d6e4ec;border-radius:15px;padding:15px;box-shadow:0 8px 24px rgba(22,55,75,.05)}.control-v10-card strong{display:block;font-size:26px;color:#087fa8}.control-v10-card span{display:block;margin-top:5px;color:#5d7484;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.6px}.control-v10-card small{display:block;margin-top:5px;color:#8295a1;font-size:9px;line-height:1.4}
  .control-v10-section{margin-top:18px;background:#fff;border:1px solid #d5e3eb;border-radius:17px;padding:17px}.control-v10-section h3{margin:0;color:#17384d;font-size:17px}.control-v10-sub{margin:4px 0 13px!important;font-size:11px}.control-v10-toolbar{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap}.control-v10-search{min-width:260px;padding:10px 12px;border:1px solid #c8d9e3;border-radius:10px;background:#fdfefe;color:#17384d}.control-v10-list{display:grid;gap:9px;margin-top:12px}.control-v10-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;border:1px solid #deeaef;border-radius:13px;padding:13px;background:#fbfdfe}.control-v10-row.warn{border-color:#efcf8b;background:#fffaf0}.control-v10-name{font-weight:900;color:#17384d}.control-v10-meta{margin-top:4px;color:#617989;font-size:10px;line-height:1.6;overflow-wrap:anywhere}.control-v10-uid{display:inline-block;margin-top:6px;padding:5px 7px;border-radius:7px;background:#edf5f8;color:#17637f;font:800 9px ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere}.control-v10-tags{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}.control-v10-tag{padding:4px 7px;border-radius:999px;background:#edf3f6;color:#526d7c;font-size:8px;font-weight:900}.control-v10-tag.ok{background:#e4f5ec;color:#146447}.control-v10-tag.warn{background:#fff0d1;color:#8a5707}.control-v10-tag.info{background:#e7f2ff;color:#175e8a}.control-v10-actions{display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap}.control-v10-actions button,.control-v10-actions a{padding:8px 9px;border-radius:9px;border:1px solid #bed3de;background:#fff;color:#17617d;font-size:9px;font-weight:900;text-decoration:none;cursor:pointer}.control-v10-actions .primary{background:#087fa8;color:#fff;border-color:#087fa8}.control-v10-actions .merge{background:#17384d;color:#fff;border-color:#17384d}.control-v10-empty{padding:18px;border:1px dashed #cadbe4;border-radius:12px;color:#6f8592;text-align:center;background:#f9fbfc}.control-v10-note{padding:12px 14px;border-radius:12px;background:#eef7fb;border:1px solid #d2e8f2;color:#486879;font-size:10px;line-height:1.55;margin-top:12px}.control-v10-note.warn{background:#fff6e4;border-color:#efd39c;color:#765318}.control-v10-status{margin:10px 0;color:#4d6b7c;font-size:11px}.control-v10-table-wrap{overflow:auto}.control-v10-table{width:100%;border-collapse:collapse;min-width:760px}.control-v10-table th,.control-v10-table td{text-align:left;border-bottom:1px solid #e3ebef;padding:9px 7px;font-size:10px;color:#506d7e;vertical-align:top}.control-v10-table th{color:#17384d;font-weight:900;background:#f7fafb;position:sticky;top:0}.control-v10-health{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:12px}.control-v10-health div{padding:12px;border-radius:12px;background:#f5f9fb;border:1px solid #dbe7ed}.control-v10-health strong{display:block;color:#17384d;font-size:12px}.control-v10-health span{display:block;color:#6a8190;font-size:9px;margin-top:4px}
  @media(max-width:850px){.control-v10-grid{grid-template-columns:repeat(2,1fr)}.control-v10-health{grid-template-columns:1fr}.control-v10-row{grid-template-columns:1fr}.control-v10-actions{justify-content:flex-start}.control-v10-head{display:block}.control-v10-refresh{margin-top:10px;width:100%}.control-v10-search{width:100%;min-width:0}.control-v10-actions>*{flex:1;text-align:center}}
  `;document.head.appendChild(style);
}

function ensureUI(){
  const nav=document.querySelector(".admin-tabs"),admin=document.getElementById("adminSection");
  if(!nav||!admin)return null;
  addStyles();
  let tab=document.getElementById("controlV10Tab");
  if(!tab){tab=document.createElement("button");tab.id="controlV10Tab";tab.type="button";tab.className="admin-tab";tab.dataset.tab="controleView";tab.textContent="🎛️ Controle";nav.appendChild(tab)}
  let view=document.getElementById("controleView");
  if(!view){
    view=document.createElement("section");view.id="controleView";view.className="admin-view";
    view.innerHTML=`<div class="control-v10"><div class="control-v10-head"><div><span class="control-v10-kicker">CENTRO DE CONTROLE · WEB + FUTURO APP</span><h2>Painel geral do sistema</h2><p>Contas, logins, acessos, perfis, possíveis duplicidades e saúde operacional em uma única visão.</p></div><button id="controlV10Refresh" class="control-v10-refresh" type="button">↻ ATUALIZAR TUDO</button></div><div id="controlV10Status" class="control-v10-status">Aguardando carregamento...</div><div id="controlV10Cards" class="control-v10-grid"></div><section class="control-v10-section"><div class="control-v10-toolbar"><div><h3>👤 Todas as contas cadastradas</h3><p class="control-v10-sub">Sem fila de aprovação. A conta aparece automaticamente assim que é criada ou volta a acessar o site.</p></div><input id="controlV10Search" class="control-v10-search" placeholder="Buscar nome, e-mail ou UID"></div><div id="controlV10Accounts" class="control-v10-list"></div></section><section class="control-v10-section"><h3>🧩 Perfis duplicados ou sem vínculo</h3><p class="control-v10-sub">Compara perfil social, cadastro legado e UID para encontrar pessoas que ficaram com duas identidades.</p><div id="controlV10Duplicates" class="control-v10-list"></div></section><section class="control-v10-section"><h3>🔐 Últimos acessos registrados</h3><p class="control-v10-sub">Histórico operacional de cadastro, login e início de sessão. Não registra senha, IP ou conteúdo privado.</p><div id="controlV10AccessNote"></div><div class="control-v10-table-wrap"><table class="control-v10-table"><thead><tr><th>Data</th><th>Usuário</th><th>Evento</th><th>Plataforma</th><th>Dispositivo</th><th>Página</th></tr></thead><tbody id="controlV10AccessBody"></tbody></table></div></section><section class="control-v10-section"><h3>🩺 Saúde e inventário do sistema</h3><div id="controlV10Health" class="control-v10-health"></div></section></div>`;
    const footer=admin.querySelector(".site-footer");if(footer)admin.insertBefore(view,footer);else admin.appendChild(view);
  }
  tab.onclick=()=>{
    document.querySelectorAll(".admin-tabs > .admin-tab").forEach(item=>item.classList.remove("active"));
    document.querySelectorAll(".admin-view").forEach(item=>item.classList.remove("active"));
    tab.classList.add("active");view.classList.add("active");
    if(!state.loaded)loadAll();
  };
  document.getElementById("controlV10Refresh")?.addEventListener("click",loadAll);
  document.getElementById("controlV10Search")?.addEventListener("input",renderAccounts);
  view.addEventListener("click",handleActions);
  return view;
}

async function readCollection(name){
  const cap=["usuarios","atletas","perfis"].includes(name)?800:400;
  const snap=await getDocs(query(collection(db,name),limit(cap)));
  return snap.docs.map(item=>({id:item.id,...item.data()}));
}

async function readAccessLogs(){
  try{
    const snap=await getDocs(query(collection(db,"access_logs"),orderBy("criadoEm","desc"),limit(500)));
    state.accessLogsAvailable=true;
    return snap.docs.map(item=>({id:item.id,...item.data()}));
  }catch(error){
    state.accessLogsAvailable=false;
    if(error?.code!=="permission-denied")console.warn("Logs de acesso indisponíveis:",error);
    return [];
  }
}

function profileNameFor(account,profile){return txt(profile?.nome)||txt(account?.nome)||"Conta sem nome"}

function duplicateCandidates(){
  const linkedUids=new Set(state.atletas.map(a=>txt(a.ownerUid)).filter(Boolean));
  const orphans=state.atletas.filter(a=>!txt(a.ownerUid));
  const rows=[];
  for(const profile of state.perfis){
    const uid=txt(profile.uid||profile.id);if(!uid||linkedUids.has(uid))continue;
    const account=state.usuarios.find(u=>txt(u.uid||u.id)===uid);
    const baseName=profileNameFor(account,profile);
    let best=null,bestScore=0;
    for(const athlete of orphans){
      let score=nameSimilarity(baseName,athlete.nome);
      const cityA=norm(profile.cidade||account?.cidade),cityB=norm(athlete.cidade);
      const teamA=norm(profile.time||account?.time),teamB=norm(athlete.time);
      if(cityA&&cityB&&(cityA.includes(cityB)||cityB.includes(cityA)))score+=.08;
      if(teamA&&teamB&&teamA===teamB)score+=.08;
      if(score>bestScore){best=athlete;bestScore=score}
    }
    if(best&&bestScore>=.72)rows.push({uid,account,profile,athlete:best,score:Math.min(1,bestScore)});
  }
  return rows.sort((a,b)=>b.score-a.score);
}

function loginInfoByUid(){
  const map=new Map();
  for(const log of state.access_logs){
    const uid=txt(log.uid);if(!uid)continue;
    let row=map.get(uid);if(!row){row={last:null,lastLogin:null,count:0};map.set(uid,row)}
    const when=millis(log.criadoEm);
    if(!row.last||when>millis(row.last.criadoEm))row.last=log;
    if(log.tipo==="login"||log.tipo==="cadastro"){
      row.count++;
      if(!row.lastLogin||when>millis(row.lastLogin.criadoEm))row.lastLogin=log;
    }
  }
  return map;
}

function latestTime(account,loginInfo){return account.ultimoLoginEm||loginInfo?.lastLogin?.criadoEm||account.ultimoAcessoEm||loginInfo?.last?.criadoEm||account.atualizadoEm||account.criadoEm}

function renderCards(){
  const logs=state.access_logs,nowToday=startToday();
  const linked=state.atletas.filter(a=>txt(a.ownerUid)).length;
  const orphans=state.atletas.length-linked;
  const duplicates=duplicateCandidates().length;
  const active7=new Set(logs.filter(l=>millis(l.criadoEm)>=Date.now()-7*86400000).map(l=>txt(l.uid)).filter(Boolean)).size;
  const loginToday=logs.filter(l=>(l.tipo==="login"||l.tipo==="cadastro")&&millis(l.criadoEm)>=nowToday).length;
  const new7=state.usuarios.filter(u=>within(u.criadoEm,7)).length;
  const content=state.publicacoes.length+state.videos.length;
  const cards=[
    [state.usuarios.length,"Contas cadastradas",`${new7} novas nos últimos 7 dias`],
    [loginToday,"Logins hoje",state.accessLogsAvailable?`${active7} contas ativas em 7 dias`:"Histórico aguardando regras"],
    [state.perfis.length,"Perfis sociais",`${linked} ligados a cadastro legado`],
    [orphans,"Perfis legados sem dono",`${duplicates} duplicidades prováveis`],
    [state.atletas.length,"Atletas no banco",`${linked} reivindicados / vinculados`],
    [state.equipes.length,"Equipes",state.campeonatos.length+" campeonatos"],
    [content,"Posts + vídeos",state.stories.length+" stories registrados"],
    [state.apoiadores.length,"Apoiadores",state.claims.filter(c=>norm(c.status)==="pendente").length+" reivindicações pendentes"]
  ];
  document.getElementById("controlV10Cards").innerHTML=cards.map(([value,label,small])=>`<div class="control-v10-card"><strong>${esc(value)}</strong><span>${esc(label)}</span><small>${esc(small)}</small></div>`).join("");
}

function renderAccounts(){
  const box=document.getElementById("controlV10Accounts");if(!box)return;
  const q=norm(document.getElementById("controlV10Search")?.value);
  const profiles=new Map(state.perfis.map(p=>[txt(p.uid||p.id),p]));
  const athletes=new Map(state.atletas.filter(a=>txt(a.ownerUid)).map(a=>[txt(a.ownerUid),a]));
  const logMap=loginInfoByUid();
  const duplicates=new Map(duplicateCandidates().map(d=>[d.uid,d]));
  const rows=state.usuarios
    .filter(account=>!q||norm([account.nome,account.email,account.uid,account.id].join(" ")).includes(q))
    .sort((a,b)=>millis(latestTime(b,logMap.get(txt(b.uid||b.id))))-millis(latestTime(a,logMap.get(txt(a.uid||a.id)))));
  if(!rows.length){box.innerHTML='<div class="control-v10-empty">Nenhuma conta corresponde à busca.</div>';return}
  box.innerHTML=rows.map(account=>{
    const uid=txt(account.uid||account.id),profile=profiles.get(uid),athlete=athletes.get(uid),dup=duplicates.get(uid),log=logMap.get(uid);
    const last=latestTime(account,log),count=Number(account.totalLogins||0)||log?.count||0;
    const verified=account.emailVerificado===true;
    return `<article class="control-v10-row ${dup?'warn':''}"><div><div class="control-v10-name">${esc(profileNameFor(account,profile))}</div><div class="control-v10-meta">${esc(account.email||"E-mail não informado")}<br>Cadastro: ${esc(fmt(account.criadoEm))} · Último acesso/login: ${esc(fmt(last))} · Logins registrados: ${esc(count)}${athlete?`<br>Cadastro esportivo vinculado: <strong>${esc(athlete.nome||athlete.id)}</strong>`:""}${dup?`<br>⚠ Provável perfil antigo: <strong>${esc(dup.athlete.nome)}</strong> · confiança ${Math.round(dup.score*100)}%`:""}</div><span class="control-v10-uid">UID: ${esc(uid)}</span><div class="control-v10-tags"><span class="control-v10-tag ${profile?'ok':''}">${profile?'PERFIL SOCIAL':'SEM PERFIL SOCIAL'}</span><span class="control-v10-tag ${athlete?'ok':'warn'}">${athlete?'VINCULADO':'SEM VÍNCULO LEGADO'}</span><span class="control-v10-tag ${verified?'ok':'info'}">${verified?'E-MAIL VERIFICADO':'VERIFICAÇÃO NÃO REGISTRADA'}</span>${dup?'<span class="control-v10-tag warn">DUPLICIDADE PROVÁVEL</span>':''}</div></div><div class="control-v10-actions">${profile?`<a href="perfil-social.html?uid=${encodeURIComponent(uid)}" target="_blank" rel="noopener">PERFIL SOCIAL</a>`:""}${athlete?`<a href="perfil.html?id=${encodeURIComponent(athlete.id)}" target="_blank" rel="noopener">CADASTRO LEGADO</a>`:""}${dup?`<button class="merge" type="button" data-control-merge="${esc(uid)}" data-control-profile="${esc(dup.athlete.id)}">UNIFICAR</button>`:""}<button type="button" data-control-copy="${esc(uid)}">COPIAR UID</button></div></article>`;
  }).join("");
}

function renderDuplicates(){
  const box=document.getElementById("controlV10Duplicates");if(!box)return;
  const duplicates=duplicateCandidates();
  const orphans=state.atletas.filter(a=>!txt(a.ownerUid));
  const socialUids=new Set(state.perfis.map(p=>txt(p.uid||p.id)));
  const accountsUids=new Set(state.usuarios.map(u=>txt(u.uid||u.id)));
  const isolated=orphans.filter(a=>!duplicates.some(d=>d.athlete.id===a.id));
  const html=[];
  for(const d of duplicates){
    html.push(`<article class="control-v10-row warn"><div><div class="control-v10-name">⚠ ${esc(profileNameFor(d.account,d.profile))} ↔ ${esc(d.athlete.nome)}</div><div class="control-v10-meta">Conta/social: UID ${esc(d.uid)}<br>Legado: ID ${esc(d.athlete.id)} · ${esc(d.athlete.cidade||"cidade não informada")} · ${esc(d.athlete.time||"time não informado")}<br>Probabilidade por nome e contexto: ${Math.round(d.score*100)}%</div></div><div class="control-v10-actions"><a href="perfil-social.html?uid=${encodeURIComponent(d.uid)}" target="_blank" rel="noopener">VER SOCIAL</a><a href="perfil.html?id=${encodeURIComponent(d.athlete.id)}" target="_blank" rel="noopener">VER LEGADO</a><button class="merge" type="button" data-control-merge="${esc(d.uid)}" data-control-profile="${esc(d.athlete.id)}">UNIFICAR PERFIS</button></div></article>`);
  }
  if(isolated.length){
    html.push(`<div class="control-v10-note">Além das duplicidades prováveis, existem <strong>${isolated.length}</strong> cadastros antigos sem ownerUid. Eles continuam disponíveis na aba Reivindicações para vínculo manual.</div>`);
  }
  if(!html.length)html.push('<div class="control-v10-empty">Nenhuma duplicidade provável encontrada neste momento.</div>');
  box.innerHTML=html.join("");
}

function renderAccess(){
  const note=document.getElementById("controlV10AccessNote"),body=document.getElementById("controlV10AccessBody");if(!note||!body)return;
  if(!state.accessLogsAvailable){
    note.innerHTML='<div class="control-v10-note warn"><strong>Histórico detalhado ainda bloqueado pelas regras atuais do Firestore.</strong> As contas já podem ser vistas. Depois de publicar as regras V10, login, cadastro e sessão passam a aparecer aqui automaticamente.</div>';
    body.innerHTML='<tr><td colspan="6">Aguardando ativação do registro detalhado de acessos.</td></tr>';return;
  }
  note.innerHTML='<div class="control-v10-note">Os eventos são operacionais e mínimos. A futura aplicação poderá gravar no mesmo formato usando <strong>plataforma = app</strong>, mantendo web e app no mesmo painel.</div>';
  const rows=state.access_logs.slice().sort((a,b)=>millis(b.criadoEm)-millis(a.criadoEm)).slice(0,100);
  body.innerHTML=rows.length?rows.map(log=>`<tr><td>${esc(fmt(log.criadoEm))}</td><td><strong>${esc(log.nome||"Usuário")}</strong><br>${esc(log.email||"")}<br><small>${esc(log.uid||"")}</small></td><td>${esc(log.tipo||"sessao")}</td><td>${esc(log.plataforma||"web")}</td><td>${esc(log.dispositivo||"-")}</td><td>${esc(log.pagina||"/")}</td></tr>`).join(""):'<tr><td colspan="6">Ainda não há eventos registrados.</td></tr>';
}

function renderHealth(){
  const box=document.getElementById("controlV10Health");if(!box)return;
  const platforms=state.access_logs.reduce((acc,row)=>{const key=txt(row.plataforma)||"web";acc[key]=(acc[key]||0)+1;return acc},{});
  const web=platforms.web||0,appCount=platforms.app||0;
  box.innerHTML=`<div><strong>${state.accessLogsAvailable?'✅ Registro de acessos ativo':'⚠ Registro detalhado pendente'}</strong><span>${state.accessLogsAvailable?state.access_logs.length+' eventos disponíveis no painel':'publique as regras V10 para habilitar o histórico'}</span></div><div><strong>🌐 Web: ${web} · 📱 App: ${appCount}</strong><span>mesmo modelo de dados pronto para o futuro aplicativo</span></div><div><strong>🔒 Mensagens privadas fora do painel</strong><span>o centro de controle mede contas e atividade sem expor o conteúdo do Direct</span></div>`;
}

function render(){renderCards();renderAccounts();renderDuplicates();renderAccess();renderHealth()}

async function handleActions(event){
  const copyButton=event.target.closest?.("[data-control-copy]");
  if(copyButton){
    try{await navigator.clipboard.writeText(copyButton.dataset.controlCopy||"");const old=copyButton.textContent;copyButton.textContent="✓ COPIADO";setTimeout(()=>copyButton.textContent=old,1200)}catch{}
    return;
  }
  const mergeButton=event.target.closest?.("[data-control-merge][data-control-profile]");if(!mergeButton)return;
  const uid=mergeButton.dataset.controlMerge||"",profileId=mergeButton.dataset.controlProfile||"";
  const account=state.usuarios.find(u=>txt(u.uid||u.id)===uid),athlete=state.atletas.find(a=>a.id===profileId);
  if(!confirm(`Unificar a conta ${account?.nome||account?.email||uid} com o cadastro antigo ${athlete?.nome||profileId}?\n\nO perfil social da conta será mantido como identidade principal e o cadastro esportivo antigo será ligado ao mesmo UID.`))return;
  mergeButton.disabled=true;mergeButton.textContent="UNIFICANDO...";
  try{
    const result=await linkLegacyProfile(profileId,uid);
    alert(`Perfis unificados com sucesso: ${result.athleteName}.`);
    document.getElementById("btnAtualizarReivindicacoes")?.click();
    await loadAll();
  }catch(error){console.error(error);alert(error?.message||"Não foi possível unificar os perfis.")}
  finally{mergeButton.disabled=false;mergeButton.textContent="UNIFICAR"}
}

async function loadAll(){
  ensureUI();const status=document.getElementById("controlV10Status");if(status)status.textContent="Atualizando contas, acessos e inventário do sistema...";
  const names=["usuarios","atletas","perfis","equipes","campeonatos","publicacoes","videos","stories","apoiadores","reivindicacoes_perfis"];
  const results=await Promise.allSettled(names.map(readCollection));
  names.forEach((name,index)=>{state[name]=results[index].status==="fulfilled"?results[index].value:[];if(results[index].status==="rejected")console.warn(`Coleção ${name} indisponível no painel:`,results[index].reason)});
  state.access_logs=await readAccessLogs();
  state.loaded=true;render();
  if(status)status.textContent=`Atualizado em ${new Intl.DateTimeFormat("pt-BR",{timeStyle:"medium"}).format(new Date())}.`;
}

document.addEventListener("bd:profile-linked",()=>loadAll());

onAuthStateChanged(auth,user=>{
  if(!user||txt(user.email).toLowerCase()!==ADMIN_EMAIL)return;
  const boot=()=>{if(ensureUI())loadAll();else setTimeout(boot,120)};boot();
});
