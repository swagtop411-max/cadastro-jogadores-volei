// Analytics + consentimento de cookies
const GA_ID="G-K033D1K41Y";
const CONSENT_KEY="bd_atletas_cookie_consent";
const isAdminPage=location.pathname.toLowerCase().endsWith("/admin.html");
let firebaseReady=false,db=null,addDocFn=null,collectionFn=null,serverTimestampFn=null;

function consent(){try{return localStorage.getItem(CONSENT_KEY)}catch{return null}}

async function initFirebaseStats(){
  if(firebaseReady)return;
  try{
    const [{initializeApp},{getFirestore,collection,addDoc,serverTimestamp}]=await Promise.all([
      import("https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js")
    ]);
    const firebaseConfig={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015",measurementId:GA_ID};
    initializeApp(firebaseConfig);
    db=getFirestore();collectionFn=collection;addDocFn=addDoc;serverTimestampFn=serverTimestamp;firebaseReady=true;
  }catch(e){console.warn("Analytics próprio indisponível:",e)}
}

function loadGA(){
  if(window.__ga4_loaded||consent()!=="accepted")return;
  window.__ga4_loaded=true;
  const s=document.createElement("script");s.async=true;s.src=`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  s.onload=()=>{window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments)};window.gtag("js",new Date());window.gtag("config",GA_ID,{anonymize_ip:true,send_page_view:true})};
  document.head.appendChild(s);
}

function visitorId(){try{let id=localStorage.getItem("bd_atletas_visitor");if(!id){id=crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;localStorage.setItem("bd_atletas_visitor",id)}return id}catch{return`anon-${Math.random().toString(36).slice(2)}`}}
function device(){return innerWidth<=700?"Celular":innerWidth<=1100?"Tablet":"Computador"}

async function saveOwnEvent(name,p={}){
  if(isAdminPage||consent()!=="accepted")return;
  await initFirebaseStats();
  if(!firebaseReady)return;
  try{await addDocFn(collectionFn(db,"site_stats"),{nome:String(name).slice(0,60),pagina:location.pathname.slice(0,200),visitante:visitorId(),dispositivo:device(),origem:String(p.origem||"site").slice(0,50),criadoEm:serverTimestampFn()})}catch(e){console.warn("Evento próprio não salvo:",e)}
}

export function trackEvent(name,p={}){
  if(consent()!=="accepted")return;
  loadGA();
  if(typeof window.gtag==="function")window.gtag("event",name,p);
  saveOwnEvent(name,p);
}

const style=document.createElement("style");
style.textContent=`
.admin-tab,.analytics-cta,.stats-link{pointer-events:auto!important;position:relative!important;z-index:20!important;cursor:pointer!important;touch-action:manipulation!important}
.admin-form #posicao{display:none!important}.admin-form #adminPosicoesBox{display:block!important;visibility:visible!important;opacity:1!important;width:100%!important}.admin-form #adminPosicoesBox .multi-options{display:grid!important}.admin-form #adminPosicoesBox .multi-option{display:flex!important}.admin-form #adminPosicoesBox input{display:block!important;visibility:visible!important;opacity:1!important;position:static!important;width:18px!important;height:18px!important}
.bd-cookie-banner{position:fixed!important;left:18px!important;right:18px!important;bottom:18px!important;z-index:2147483647!important;display:block!important;visibility:visible!important;opacity:1!important;background:#111814!important;color:#f5f0e3!important;border:1px solid rgba(217,169,63,.55)!important;border-radius:16px!important;box-shadow:0 18px 60px rgba(0,0,0,.65)!important;padding:18px!important;font-family:inherit!important}.bd-cookie-banner strong{display:block!important;color:#f2cc72!important;font-size:16px!important}.bd-cookie-banner p{margin:6px 0 12px!important;font-size:12px!important;line-height:1.5!important;color:#d5d1c7!important}.bd-cookie-actions{display:flex!important;gap:8px!important;flex-wrap:wrap!important}.bd-cookie-actions button,.bd-cookie-actions a{border-radius:9px!important;padding:10px 14px!important;font-size:11px!important;font-weight:900!important;text-decoration:none!important;cursor:pointer!important}.bd-cookie-accept{background:linear-gradient(135deg,#f2cc72,#bd8425)!important;color:#15130e!important;border:0!important}.bd-cookie-reject,.bd-cookie-manage{background:#0b100d!important;border:1px solid rgba(217,169,63,.55)!important;color:#f2cc72!important}.bd-legal-links{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin:22px auto 8px;padding:0 16px}.bd-legal-links a{color:#8f968e;font-size:10px;text-decoration:none}.bd-legal-links a:hover{color:#f2cc72;text-decoration:underline}
.commercial-banner{display:flex;align-items:center;justify-content:space-between;gap:22px;margin:20px 0 24px;padding:22px 24px;border:1px solid rgba(217,169,63,.34);border-radius:20px;background:radial-gradient(circle at 85% 20%,rgba(217,169,63,.14),transparent 35%),linear-gradient(135deg,#101512,#18221d);box-shadow:0 16px 40px rgba(0,0,0,.24);overflow:hidden;position:relative}.commercial-banner:before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(242,204,114,.05),transparent);pointer-events:none}.commercial-copy{position:relative;z-index:1}.commercial-kicker{display:block;color:#f2cc72;font-size:9px;font-weight:900;letter-spacing:2px;text-transform:uppercase}.commercial-banner h3{margin:5px 0 5px;color:#f8f1df;font-size:24px;line-height:1.05}.commercial-banner p{margin:0;color:#aeb4ad;font-size:12px;line-height:1.5;max-width:650px}.commercial-banner-link{position:relative;z-index:1;display:inline-flex;align-items:center;justify-content:center;gap:8px;flex:0 0 auto;padding:13px 19px;border-radius:11px;border:1px solid rgba(217,169,63,.55);background:linear-gradient(135deg,#f2cc72,#bd8425);color:#15130e;text-decoration:none;font-size:10px;font-weight:900;letter-spacing:1px;white-space:nowrap;box-shadow:0 8px 20px rgba(217,169,63,.14);transition:.2s}.commercial-banner-link:hover{transform:translateY(-2px);box-shadow:0 12px 26px rgba(217,169,63,.24)}
@media(max-width:700px){.bd-cookie-banner{left:10px!important;right:10px!important;bottom:10px!important;padding:15px!important}.bd-cookie-actions{display:grid!important;grid-template-columns:1fr!important}.bd-cookie-actions button,.bd-cookie-actions a{text-align:center!important;width:100%!important;box-sizing:border-box!important}.commercial-banner{flex-direction:column;align-items:flex-start;padding:18px;margin:16px 0 20px}.commercial-banner h3{font-size:21px}.commercial-banner-link{width:100%;box-sizing:border-box}}
`;
document.head.appendChild(style);

function mostrarBanner(){
  if(isAdminPage||consent())return;
  if(document.querySelector(".bd-cookie-banner"))return;
  const b=document.createElement("div");b.className="bd-cookie-banner";b.setAttribute("role","dialog");b.setAttribute("aria-label","Privacidade e cookies");
  b.innerHTML='<strong>🍪 Privacidade e cookies</strong><p>Usamos tecnologias necessárias para o funcionamento do site e, somente com sua autorização, analytics para entender como o site é utilizado. Você pode aceitar ou recusar.</p><div class="bd-cookie-actions"><button type="button" class="bd-cookie-accept">ACEITAR ANALYTICS</button><button type="button" class="bd-cookie-reject">REJEITAR ANALYTICS</button><a class="bd-cookie-manage" href="politica-cookies.html">POLÍTICA DE COOKIES</a></div>';
  (document.body||document.documentElement).appendChild(b);
  const fechar=async v=>{try{localStorage.setItem(CONSENT_KEY,v)}catch{}b.remove();if(v==="accepted"){loadGA();trackEvent("consent_granted",{origem:"cookie_banner"})}};
  b.querySelector(".bd-cookie-accept").addEventListener("click",()=>fechar("accepted"));
  b.querySelector(".bd-cookie-reject").addEventListener("click",()=>fechar("rejected"));
}

function inserirLinksLegais(){
  if(isAdminPage||document.querySelector(".bd-legal-links"))return;
  const alvo=document.querySelector(".site-footer");
  const box=document.createElement("nav");box.className="bd-legal-links";box.setAttribute("aria-label","Informações legais");
  box.innerHTML='<a href="politica-privacidade.html">Política de Privacidade</a><a href="termos-de-uso.html">Termos de Uso</a><a href="politica-cookies.html">Política de Cookies</a>';
  if(alvo&&alvo.parentNode)alvo.parentNode.insertBefore(box,alvo.nextSibling);else document.body.appendChild(box);
}

function inserirBannerComercial(){
  if(isAdminPage||document.querySelector(".commercial-banner"))return;
  const alvo=document.querySelector(".cadastro-cta");
  if(!alvo||!alvo.parentNode)return;
  const box=document.createElement("section");
  box.className="commercial-banner";
  box.setAttribute("aria-label","Espaço comercial para apoiadores");
  box.innerHTML='<div class="commercial-copy"><span class="commercial-kicker">ESPAÇO COMERCIAL • APOIE O ESPORTE</span><h3>Sua marca pode estar aqui.</h3><p>Divulgue sua empresa para atletas, equipes, treinadores e organizadores que acompanham o Banco de Dados de Atletas.</p></div><a class="commercial-banner-link" href="https://wa.me/5516988586327?text=Ol%C3%A1!%20Tenho%20interesse%20em%20ser%20apoiador%20do%20Banco%20de%20Dados%20de%20Atletas." target="_blank" rel="noopener noreferrer">🤝 SEJA UM APOIADOR</a>';
  alvo.parentNode.insertBefore(box,alvo.nextSibling);
}

function repararPosicoesAdmin(){if(!isAdminPage)return;const form=document.getElementById("atletaForm");if(!form)return;const antigo=document.getElementById("posicao");if(!antigo)return;let box=document.getElementById("adminPosicoesBox");if(!box){const label=antigo.closest("label");box=document.createElement("div");box.id="adminPosicoesBox";box.className="multi-box";box.innerHTML='<label>POSIÇÕES *</label><div class="multi-options"><label class="multi-option"><input type="checkbox" value="Levantador">Levantador</label><label class="multi-option"><input type="checkbox" value="Ponteiro">Ponteiro</label><label class="multi-option"><input type="checkbox" value="Oposto">Oposto</label><label class="multi-option"><input type="checkbox" value="Central">Central</label><label class="multi-option"><input type="checkbox" value="Líbero">Líbero</label><label class="multi-option"><input type="checkbox" value="Universal">Universal</label></div><small class="multi-help">Selecione uma ou mais posições.</small>';antigo.type="hidden";antigo.value="";if(label){label.parentNode.insertBefore(box,label);label.remove()}else antigo.parentNode.insertBefore(box,antigo)}else antigo.style.display="none";box.querySelectorAll("input[type=checkbox]").forEach(c=>{if(c.dataset.bound)return;c.dataset.bound="1";c.addEventListener("change",()=>{antigo.value=[...box.querySelectorAll("input:checked")].map(x=>x.value).join(", ")})})}

if(isAdminPage){import(`./estatisticas-admin.js?v=20260826-5`);if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(repararPosicoesAdmin,100));else setTimeout(repararPosicoesAdmin,100);new MutationObserver(()=>repararPosicoesAdmin()).observe(document.documentElement,{childList:true,subtree:true})}

document.addEventListener("DOMContentLoaded",()=>{
  if(isAdminPage)return;
  inserirLinksLegais();
  inserirBannerComercial();
  mostrarBanner();
  if(consent()==="accepted")trackEvent("page_view",{origem:"site"});
  const t=(q,e,p={})=>document.querySelectorAll(q).forEach(x=>x.addEventListener("click",()=>trackEvent(e,p),{passive:true}));
  t(".whatsapp-top-cta,.whatsapp-cadastro","whatsapp_click");t(".championship-cta","campeonatos_click");t(".hero-button","ver_atletas_click");t(".admin-cta","painel_admin_click");
  const c=document.querySelector('a[href*="cadastro-atleta"]');if(c)c.addEventListener("click",()=>trackEvent("cadastro_aberto"),{passive:true});
  const q=document.getElementById("btnPesquisar");if(q)q.addEventListener("click",()=>trackEvent("pesquisa_atletas"),{passive:true});
  const f=document.getElementById("cadastroAtletaForm");if(f)f.addEventListener("submit",()=>trackEvent("cadastro_enviado"));
  document.querySelectorAll(".commercial-banner-link").forEach(x=>x.addEventListener("click",()=>trackEvent("apoiador_banner_click",{local:"banner_comercial"}),{passive:true}));
  document.querySelectorAll(".sponsor-card").forEach(x=>x.addEventListener("click",()=>trackEvent("apoiador_click",{apoiador:(x.querySelector(".sponsor-name")?.textContent||"desconhecido").trim()}),{passive:true}));
});
