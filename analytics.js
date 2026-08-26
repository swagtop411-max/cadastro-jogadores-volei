// Google Analytics 4 - Banco de Dados de Atletas
const GA_ID = "G-K033D1K41Y";
const GA_PROPERTY = "https://analytics.google.com/analytics/web/";

if (!window.__ga4_loaded) {
  window.__ga4_loaded = true;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { anonymize_ip: true, send_page_view: true });
}

const mobileAdminStyle = document.createElement("style");
mobileAdminStyle.textContent = `
  @media (max-width: 700px) {
    .admin-tabs { display:grid!important; grid-template-columns:repeat(2,minmax(0,1fr))!important; overflow:visible!important; width:100%!important; }
    .admin-tab { width:100%!important; min-width:0!important; white-space:normal!important; min-height:48px!important; padding:10px 8px!important; }
    .stats-grid,.stats-links { grid-template-columns:1fr!important; }
    .stats-link { min-height:62px!important; }
    .internal-stats-grid { grid-template-columns:repeat(2,minmax(0,1fr))!important; }
    .internal-stats-section { padding:14px!important; }
  }
  @media (max-width:430px) { .internal-stats-grid { grid-template-columns:1fr!important; } }
`;
document.head.appendChild(mobileAdminStyle);

export function trackEvent(name, params = {}) {
  if (typeof window.gtag === "function") window.gtag("event", name, params);
}

function escStats(v) { const d=document.createElement("div"); d.textContent=v??""; return d.innerHTML; }
function topCounts(items, field, limit=6) {
  const map=new Map();
  items.forEach(item=>{const value=String(item?.[field]||"").trim(); if(value) map.set(value,(map.get(value)||0)+1);});
  return [...map.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],"pt-BR")).slice(0,limit);
}
function renderStatList(title, entries, empty="Nenhum dado disponível") {
  const max=Math.max(1,...entries.map(x=>x[1]));
  return `<div class="internal-stat-box"><div class="internal-stat-title">${escStats(title)}</div>${entries.length?entries.map(([name,count])=>`<div class="internal-stat-row"><div class="internal-stat-row-head"><span>${escStats(name)}</span><strong>${count}</strong></div><div class="internal-bar"><i style="width:${Math.max(5,Math.round(count/max*100))}%"></i></div></div>`).join(""):`<p class="internal-empty">${empty}</p>`}</div>`;
}

async function loadInternalAthleteStats() {
  const root=document.getElementById("internalAthleteStats");
  if(!root||root.dataset.loaded==="1"||root.dataset.loading==="1") return;
  root.dataset.loading="1";
  root.innerHTML=`<div class="internal-loading">⏳ Carregando estatísticas do banco de atletas...</div>`;
  try {
    const {initializeApp,getApps}=await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js");
    const {getFirestore,collection,getDocs}=await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js");
    const config={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015",measurementId:"G-K033D1K41Y"};
    const app=getApps().length?getApps()[0]:initializeApp(config),db=getFirestore(app);
    const snap=await getDocs(collection(db,"atletas"));
    const atletas=snap.docs.map(d=>({id:d.id,...d.data()}));
    const ativos=atletas.filter(a=>a.status!=="inativo").length, inativos=atletas.length-ativos;
    const cidades=new Set(atletas.map(a=>String(a.cidade||"").trim()).filter(Boolean)).size;
    const semCidade=atletas.filter(a=>!String(a.cidade||"").trim()).length;
    const avaliados=atletas.filter(a=>Number(a.avaliacaoTecnica?.media||0)>0);
    const mediaTecnica=avaliados.length?(avaliados.reduce((s,a)=>s+Number(a.avaliacaoTecnica.media),0)/avaliados.length).toFixed(1):"0,0";
    const recentes=[...atletas].sort((a,b)=>(b.criadoEm?.seconds||0)-(a.criadoEm?.seconds||0)).slice(0,5);
    root.innerHTML=`<div class="internal-stats-section">
      <div class="internal-stats-head"><div><span class="internal-kicker">DADOS DO BANCO</span><h3>📊 Estatísticas dos atletas</h3><p>Informações calculadas diretamente dos cadastros armazenados no sistema.</p></div><button type="button" id="refreshInternalStats" class="internal-refresh">↻ Atualizar</button></div>
      <div class="internal-stats-grid"><div class="internal-kpi"><span>👥</span><strong>${atletas.length}</strong><small>Atletas cadastrados</small></div><div class="internal-kpi"><span>🟢</span><strong>${ativos}</strong><small>Atletas ativos</small></div><div class="internal-kpi"><span>📍</span><strong>${cidades}</strong><small>Cidades representadas</small></div><div class="internal-kpi"><span>⭐</span><strong>${mediaTecnica}</strong><small>Média técnica dos avaliados</small></div></div>
      <div class="internal-stats-columns">${renderStatList("Por posição",topCounts(atletas,"posicao"))}${renderStatList("Por categoria",topCounts(atletas,"categoria"))}${renderStatList("Por cidade",topCounts(atletas,"cidade",8))}${renderStatList("Por equipe atual",topCounts(atletas,"time",8))}</div>
      <div class="internal-summary"><strong>Resumo:</strong> ${ativos} ativos · ${inativos} inativos · ${cidades} cidades · ${avaliados.length} avaliados tecnicamente${semCidade?` · ${semCidade} sem cidade informada`:""}.</div>
      <div class="internal-recent"><div class="internal-stat-title">🕒 Últimos cadastros</div>${recentes.length?recentes.map(a=>`<div class="internal-recent-item"><div><strong>${escStats(a.nome||"Sem nome")}</strong><small>${escStats(a.cidade||"Cidade não informada")} · ${escStats(a.categoria||"Categoria não informada")}</small></div><span>${a.status==="inativo"?"🔴":"🟢"}</span></div>`).join(""):`<p class="internal-empty">Nenhum atleta cadastrado.</p>`}</div>
      <div class="internal-footer-actions"><span>🌐 Dados de visitas e acessos ficam no Google Analytics.</span><a href="${GA_PROPERTY}" target="_blank" rel="noopener noreferrer" class="internal-ga-link">Abrir Google Analytics ↗</a></div>
    </div>`;
    root.dataset.loaded="1"; root.dataset.loading="0";
    document.getElementById("refreshInternalStats")?.addEventListener("click",()=>{root.dataset.loaded="0";loadInternalAthleteStats();});
  } catch(error) {
    console.error("Estatísticas internas:",error); root.dataset.loading="0";
    root.innerHTML=`<div class="internal-error">⚠️ Não foi possível carregar as estatísticas agora. Tente novamente.</div>`;
  }
}

function installInternalStats() {
  const view=document.getElementById("estatisticasView");
  if(!view||document.getElementById("internalAthleteStats")) return;
  const oldGrid=view.querySelector(".stats-grid"),oldLinks=view.querySelector(".stats-links");
  if(oldGrid) oldGrid.style.display="none"; if(oldLinks) oldLinks.style.display="none";
  const root=document.createElement("div"); root.id="internalAthleteStats"; view.querySelector(".stats-panel")?.appendChild(root); loadInternalAthleteStats();
}

const internalStyle=document.createElement("style");
internalStyle.textContent=`
.internal-stats-section{margin-top:18px;background:linear-gradient(145deg,#0d110f,#151c18);border:1px solid rgba(217,169,63,.2);border-radius:20px;padding:22px;color:#eee;box-shadow:0 18px 45px rgba(0,0,0,.22)}
.internal-stats-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px}.internal-kicker{font-size:9px;letter-spacing:2px;color:#f2cc72;font-weight:900}.internal-stats-head h3{margin:5px 0;color:#f8f1df;font-size:23px}.internal-stats-head p{margin:0;color:#9da39c;font-size:12px;line-height:1.5}.internal-refresh{border:1px solid rgba(217,169,63,.35);background:#111614;color:#f2cc72;border-radius:10px;padding:10px 14px;font-weight:900;cursor:pointer;white-space:nowrap}
.internal-stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}.internal-kpi{background:#111614;border:1px solid rgba(217,169,63,.14);border-radius:15px;padding:16px}.internal-kpi span{font-size:22px}.internal-kpi strong{display:block;font-size:28px;color:#f8f1df;margin:5px 0}.internal-kpi small{color:#9da39c;font-size:11px}
.internal-stats-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.internal-stat-box,.internal-recent{background:#111614;border:1px solid rgba(217,169,63,.12);border-radius:15px;padding:16px}.internal-stat-title{font-size:13px;font-weight:900;color:#f2cc72;margin-bottom:12px}.internal-stat-row{margin:11px 0}.internal-stat-row-head{display:flex;justify-content:space-between;gap:10px;font-size:11px;color:#ddd}.internal-stat-row-head strong{color:#f2cc72}.internal-bar{height:6px;background:#252b27;border-radius:20px;overflow:hidden;margin-top:6px}.internal-bar i{display:block;height:100%;background:linear-gradient(90deg,#f2cc72,#bd8425);border-radius:20px}.internal-empty{color:#858c84;font-size:11px}.internal-summary{margin-top:12px;padding:13px;border-radius:12px;background:rgba(242,204,114,.07);border:1px solid rgba(242,204,114,.12);color:#c9cec7;font-size:11px}.internal-recent{margin-top:12px}.internal-recent-item{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06)}.internal-recent-item:last-child{border-bottom:0}.internal-recent-item strong{display:block;font-size:12px;color:#f4f0e5}.internal-recent-item small{display:block;color:#8f968f;font-size:10px;margin-top:3px}.internal-footer-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.07);font-size:10px;color:#8f968f}.internal-ga-link{color:#f2cc72;text-decoration:none;font-weight:900}.internal-loading,.internal-error{padding:24px;text-align:center;color:#bfc5be;background:#111614;border-radius:14px}.internal-error{color:#f1b3a9}
`; document.head.appendChild(internalStyle);

document.addEventListener("DOMContentLoaded",()=>{
  const trackClick=(selector,eventName,extra={})=>document.querySelectorAll(selector).forEach(el=>el.addEventListener("click",()=>trackEvent(eventName,extra)));
  trackClick(".whatsapp-top-cta, .whatsapp-cadastro","whatsapp_click",{origem:"site"});
  trackClick(".championship-cta","campeonatos_click",{origem:"site"});
  trackClick(".hero-button","ver_atletas_click",{origem:"site"});
  trackClick(".admin-cta","painel_admin_click",{origem:"site"});
  const cadastroLink=document.querySelector('a[href*="cadastro-atleta"]'); if(cadastroLink) cadastroLink.addEventListener("click",()=>trackEvent("cadastro_aberto",{origem:"site"}));
  const searchButton=document.getElementById("btnPesquisar"); if(searchButton) searchButton.addEventListener("click",()=>trackEvent("pesquisa_atletas",{origem:"site"}));
  const cadastroForm=document.getElementById("cadastroAtletaForm"); if(cadastroForm) cadastroForm.addEventListener("submit",()=>trackEvent("cadastro_enviado",{origem:"cadastro_atleta"}));

  // CORREÇÃO PRINCIPAL: no painel, "VER ESTATÍSTICAS" abre a aba interna.
  document.querySelectorAll(".analytics-cta").forEach(link=>link.addEventListener("click",event=>{
    event.preventDefault(); event.stopPropagation(); trackEvent("estatisticas_abertas",{origem:"painel_admin"});
    const statsTab=document.querySelector('[data-tab="estatisticasView"]'), statsView=document.getElementById("estatisticasView");
    if(statsTab&&statsView){document.querySelectorAll(".admin-tab").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".admin-view").forEach(x=>x.classList.remove("active"));statsTab.classList.add("active");statsView.classList.add("active");installInternalStats();statsView.scrollIntoView({behavior:"smooth",block:"start"});}
  }));

  // Links externos só são usados quando o administrador escolhe um relatório.
  document.querySelectorAll(".stats-link").forEach(link=>link.addEventListener("click",()=>trackEvent("analytics_externo_click",{relatorio:link.querySelector("span")?.textContent?.trim()||"analytics"})));
  const statsTab=document.querySelector('[data-tab="estatisticasView"]'); if(statsTab) statsTab.addEventListener("click",()=>setTimeout(installInternalStats,0));
  if(document.getElementById("estatisticasView")) installInternalStats();
});
