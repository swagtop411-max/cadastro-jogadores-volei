await import("./firebase-app-check-v11.js?v=20260904-2");
import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { collection, getDocs, getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

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
let model={accounts:[],athletes:[],profiles:[],claims:[]};

const esc=value=>{const d=document.createElement("div");d.textContent=value==null?"":String(value);return d.innerHTML};
const txt=value=>value==null?"":String(value).trim();
const norm=value=>txt(value).toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
const millis=value=>{if(!value)return 0;if(typeof value.toMillis==="function")return value.toMillis();if(value.seconds)return Number(value.seconds)*1000;const n=Date.parse(value);return Number.isFinite(n)?n:0};
const fmtDate=value=>{const n=millis(value);return n?new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"}).format(new Date(n)):"Data não registrada"};

function addStyles(){
  if(document.getElementById("adminClaimsV9Styles"))return;
  const style=document.createElement("style");style.id="adminClaimsV9Styles";style.textContent=`
  .claim-v9-shell{margin:0 0 22px;padding:20px;border-radius:18px;border:1px solid #cddde7;background:linear-gradient(145deg,#f7fbfd,#edf5f8);color:#173247;box-shadow:0 10px 30px rgba(8,38,57,.08)}
  .claim-v9-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:15px}.claim-v9-head h3{margin:4px 0 5px;color:#102f45;font-size:21px}.claim-v9-head p{margin:0;color:#5d7484;font-size:12px;line-height:1.5}.claim-v9-kicker{font-size:9px;font-weight:900;letter-spacing:1.6px;color:#0785af}.claim-v9-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.claim-v9-search{min-width:230px;padding:10px 12px;border:1px solid #c4d5df;border-radius:10px;background:#fff;color:#183449}.claim-v9-refresh{padding:10px 12px;border:0;border-radius:10px;background:#087fa8;color:#fff;font-weight:900;cursor:pointer}
  .claim-v9-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:13px 0}.claim-v9-stat{padding:11px;border-radius:12px;background:#fff;border:1px solid #d7e4eb}.claim-v9-stat strong{display:block;color:#0c7499;font-size:20px}.claim-v9-stat span{display:block;margin-top:3px;color:#60798a;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.7px}
  .claim-v9-section{margin-top:16px}.claim-v9-section-title{display:flex;justify-content:space-between;align-items:end;gap:10px;margin-bottom:8px}.claim-v9-section-title h4{margin:0;color:#15384f;font-size:14px}.claim-v9-section-title span{color:#6a8190;font-size:10px}.claim-v9-list{display:grid;gap:9px}.claim-v9-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;padding:13px;border:1px solid #d6e3ea;border-radius:13px;background:#fff}.claim-v9-name{font-weight:900;color:#17384d}.claim-v9-meta{margin-top:4px;color:#627a89;font-size:10px;line-height:1.55;overflow-wrap:anywhere}.claim-v9-uid{display:inline-flex;margin-top:7px;padding:6px 8px;border-radius:8px;background:#eef5f8;color:#0d5f7b;font:800 10px ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere}.claim-v9-tags{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}.claim-v9-tag{padding:4px 7px;border-radius:999px;background:#edf3f6;color:#536d7d;font-size:8px;font-weight:900}.claim-v9-tag.ok{background:#e4f6ee;color:#16684e}.claim-v9-tag.warn{background:#fff3dd;color:#8c5b0d}.claim-v9-tag.claim{background:#e7f3ff;color:#16618e}.claim-v9-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.claim-v9-actions button,.claim-v9-actions a{border:1px solid #bad1dd;border-radius:9px;background:#fff;color:#17617d;padding:8px 9px;text-decoration:none;font-size:9px;font-weight:900;cursor:pointer}.claim-v9-actions .primary{background:#087fa8;border-color:#087fa8;color:#fff}.claim-v9-empty{padding:18px;border:1px dashed #c3d6e0;border-radius:12px;color:#68808f;text-align:center;background:rgba(255,255,255,.55)}.claim-v9-status{margin-top:10px;color:#496a7d;font-size:11px}.claim-v9-status.error{color:#a33b2f}
  @media(max-width:760px){.claim-v9-head{display:block}.claim-v9-tools{margin-top:12px}.claim-v9-search{width:100%;min-width:0}.claim-v9-stats{grid-template-columns:1fr 1fr}.claim-v9-card{grid-template-columns:1fr}.claim-v9-actions{justify-content:flex-start}.claim-v9-actions button,.claim-v9-actions a{flex:1;text-align:center}}
  `;document.head.appendChild(style);
}

function ensureUI(){
  const view=document.getElementById("reivindicacoesView");if(!view)return null;
  let shell=document.getElementById("adminClaimsV9");if(shell)return shell;
  addStyles();shell=document.createElement("section");shell.id="adminClaimsV9";shell.className="claim-v9-shell";
  shell.innerHTML=`<div class="claim-v9-head"><div><span class="claim-v9-kicker">VÍNCULO DE CONTAS</span><h3>Contas, UIDs e perfis sem dono</h3><p>Use esta central quando um atleta criou o cadastro sem login. O cadastro antigo possui um ID de atleta, mas o UID só existe depois que ele cria uma conta.</p></div><div class="claim-v9-tools"><input id="claimV9Search" class="claim-v9-search" placeholder="Buscar nome, e-mail, UID ou cidade"><button id="claimV9Refresh" class="claim-v9-refresh" type="button">↻ ATUALIZAR</button></div></div><div id="claimV9Stats" class="claim-v9-stats"></div><div class="claim-v9-section"><div class="claim-v9-section-title"><h4>👤 CONTAS CADASTRADAS / UIDs</h4><span>contas registradas no Firestore</span></div><div id="claimV9Accounts" class="claim-v9-list"><div class="claim-v9-empty">Carregando contas...</div></div></div><div class="claim-v9-section"><div class="claim-v9-section-title"><h4>🏐 PERFIS ANTIGOS SEM DONO</h4><span>cadastros aprovados sem ownerUid</span></div><div id="claimV9Orphans" class="claim-v9-list"></div></div><div id="claimV9Status" class="claim-v9-status"></div>`;
  view.prepend(shell);
  shell.querySelector("#claimV9Refresh")?.addEventListener("click",loadAll);
  shell.querySelector("#claimV9Search")?.addEventListener("input",render);
  shell.addEventListener("click",handleAction);
  return shell;
}

function bestSuggestion(account,orphans){
  const key=norm(account.nome);if(!key)return null;
  const exact=orphans.filter(a=>norm(a.nome)===key);if(exact.length===1)return exact[0];
  if(exact.length>1)return exact[0];
  const parts=new Set(key.split(" ").filter(x=>x.length>2));
  let best=null,bestScore=0;
  for(const athlete of orphans){const other=new Set(norm(athlete.nome).split(" ").filter(x=>x.length>2));let hit=0;for(const p of parts)if(other.has(p))hit++;const score=parts.size?hit/parts.size:0;if(score>=.7&&score>bestScore){best=athlete;bestScore=score}}
  return best;
}

function render(){
  const shell=ensureUI();if(!shell)return;
  const q=norm(document.getElementById("claimV9Search")?.value);
  const profilesByUid=new Map(model.profiles.map(p=>[p.id,p]));
  const athleteByUid=new Map(model.athletes.filter(a=>txt(a.ownerUid)).map(a=>[txt(a.ownerUid),a]));
  const claimsByUid=new Map();for(const c of model.claims){const uid=txt(c.solicitanteUid);if(!uid)continue;const old=claimsByUid.get(uid);if(!old||millis(c.atualizadoEm||c.criadoEm)>millis(old.atualizadoEm||old.criadoEm))claimsByUid.set(uid,c)}
  const orphans=model.athletes.filter(a=>!txt(a.ownerUid));
  const filteredAccounts=model.accounts.filter(a=>!q||norm([a.nome,a.email,a.id,a.uid].join(" ")).includes(q));
  const filteredOrphans=orphans.filter(a=>!q||norm([a.nome,a.cidade,a.id].join(" ")).includes(q));
  document.getElementById("claimV9Stats").innerHTML=`<div class="claim-v9-stat"><strong>${model.accounts.length}</strong><span>contas / UIDs</span></div><div class="claim-v9-stat"><strong>${orphans.length}</strong><span>perfis sem dono</span></div><div class="claim-v9-stat"><strong>${model.claims.filter(c=>String(c.status||"").toLowerCase()==="pendente").length}</strong><span>reivindicações pendentes</span></div><div class="claim-v9-stat"><strong>${athleteByUid.size}</strong><span>perfis vinculados</span></div>`;

  const accountBox=document.getElementById("claimV9Accounts");
  accountBox.innerHTML=filteredAccounts.length?filteredAccounts.map(account=>{
    const uid=txt(account.uid||account.id),linked=athleteByUid.get(uid),claim=claimsByUid.get(uid),social=profilesByUid.get(uid),suggestion=!linked?bestSuggestion(account,orphans):null;
    const status=String(claim?.status||"").toLowerCase();
    const tags=[social?'<span class="claim-v9-tag ok">PERFIL SOCIAL</span>':'<span class="claim-v9-tag">SEM PERFIL SOCIAL</span>',linked?'<span class="claim-v9-tag ok">VINCULADO</span>':'<span class="claim-v9-tag warn">SEM VÍNCULO</span>',claim?`<span class="claim-v9-tag claim">REIVINDICAÇÃO: ${esc(status||"registrada")}</span>`:"",suggestion?'<span class="claim-v9-tag warn">SUGESTÃO ENCONTRADA</span>':""].join("");
    const target=linked||suggestion||null;
    return `<article class="claim-v9-card"><div><div class="claim-v9-name">${esc(account.nome||"Conta sem nome")}</div><div class="claim-v9-meta">${esc(account.email||"E-mail não informado")}<br>${esc(fmtDate(account.criadoEm))}${linked?`<br>Perfil vinculado: <strong>${esc(linked.nome||linked.id)}</strong> · ID ${esc(linked.id)}`:""}${suggestion?`<br>Sugestão de perfil antigo: <strong>${esc(suggestion.nome)}</strong> · ${esc(suggestion.cidade||"cidade não informada")} · ID ${esc(suggestion.id)}`:""}${claim?`<br>Pedido: perfil ${esc(claim.perfilNome||claim.perfilId||"")} · ID ${esc(claim.perfilId||"")}`:""}</div><span class="claim-v9-uid">UID: ${esc(uid)}</span><div class="claim-v9-tags">${tags}</div></div><div class="claim-v9-actions"><button type="button" data-v9-copy="${esc(uid)}">COPIAR UID</button>${target?`<a href="perfil.html?id=${encodeURIComponent(target.id)}" target="_blank" rel="noopener">ABRIR PERFIL</a>`:""}${!linked&&target?`<button class="primary" type="button" data-v9-use-uid="${esc(uid)}" data-v9-use-profile="${esc(target.id)}">USAR NO VÍNCULO</button>`:""}</div></article>`
  }).join(""):'<div class="claim-v9-empty">Nenhuma conta corresponde à busca.</div>';

  const orphanBox=document.getElementById("claimV9Orphans");
  orphanBox.innerHTML=filteredOrphans.length?filteredOrphans.map(a=>`<article class="claim-v9-card"><div><div class="claim-v9-name">${esc(a.nome||"Atleta sem nome")}</div><div class="claim-v9-meta">${esc(a.cidade||"Cidade não informada")} · ${esc(a.categoria||"Categoria não informada")}<br>ID do perfil antigo: ${esc(a.id)}</div><span class="claim-v9-uid">PERFIL ID: ${esc(a.id)}</span></div><div class="claim-v9-actions"><a href="perfil.html?id=${encodeURIComponent(a.id)}" target="_blank" rel="noopener">ABRIR PERFIL</a><button type="button" data-v9-copy="${esc(a.id)}">COPIAR ID</button></div></article>`).join(""):'<div class="claim-v9-empty">Nenhum perfil antigo sem dono corresponde à busca.</div>';
}

async function copy(value){try{await navigator.clipboard.writeText(value);return true}catch{try{const ta=document.createElement("textarea");ta.value=value;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();return true}catch{return false}}}

async function handleAction(event){
  const copyButton=event.target.closest?.("[data-v9-copy]");if(copyButton){const ok=await copy(copyButton.dataset.v9Copy||"");const old=copyButton.textContent;copyButton.textContent=ok?"✓ COPIADO":"COPIE MANUALMENTE";setTimeout(()=>copyButton.textContent=old,1500);return}
  const useButton=event.target.closest?.("[data-v9-use-uid][data-v9-use-profile]");if(!useButton)return;
  const uid=document.getElementById("vinculoUid"),profile=document.getElementById("vinculoPerfilId");
  if(!uid||!profile){document.getElementById("claimV9Status").textContent="O formulário de vínculo manual ainda não foi carregado. Abra novamente a aba Reivindicações.";return}
  uid.value=useButton.dataset.v9UseUid||"";profile.value=useButton.dataset.v9UseProfile||"";uid.dispatchEvent(new Event("input",{bubbles:true}));profile.dispatchEvent(new Event("input",{bubbles:true}));
  const form=uid.closest("form")||profile.parentElement;form?.scrollIntoView({behavior:"smooth",block:"center"});
  document.getElementById("claimV9Status").textContent="✓ UID e ID do perfil preenchidos no vínculo manual. Confira o atleta e conclua a vinculação.";
}

async function loadAll(){
  const shell=ensureUI();if(!shell)return;const status=document.getElementById("claimV9Status");status.className="claim-v9-status";status.textContent="Atualizando contas e vínculos...";
  try{
    const [usersSnap,athletesSnap,profilesSnap,claimsSnap]=await Promise.all([
      getDocs(collection(db,"usuarios")),
      getDocs(collection(db,"atletas")),
      getDocs(collection(db,"perfis")),
      getDocs(collection(db,"reivindicacoes_perfis"))
    ]);
    model={
      accounts:usersSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>millis(b.criadoEm)-millis(a.criadoEm)),
      athletes:athletesSnap.docs.map(d=>({id:d.id,...d.data()})),
      profiles:profilesSnap.docs.map(d=>({id:d.id,...d.data()})),
      claims:claimsSnap.docs.map(d=>({id:d.id,...d.data()}))
    };
    render();status.textContent=`✓ ${model.accounts.length} conta(s), ${model.athletes.length} atleta(s) e ${model.claims.length} reivindicação(ões) carregados.`;
  }catch(error){console.error("Central de vínculos V9:",error);status.className="claim-v9-status error";status.textContent=`Não foi possível carregar a central de UIDs (${error?.code||"erro"}). Verifique se a conta ADM está autenticada e se as regras do Firestore estão publicadas.`}
}

function watchView(){
  const observer=new MutationObserver(()=>{if(ensureUI()){observer.disconnect();void loadAll()}});observer.observe(document.documentElement,{childList:true,subtree:true});if(ensureUI()){observer.disconnect();void loadAll()}
}

onAuthStateChanged(auth,async user=>{
  if(!user||String(user.email||"").trim().toLowerCase()!==ADMIN_EMAIL)return;
  watchView();
});
