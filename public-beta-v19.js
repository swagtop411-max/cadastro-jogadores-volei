const BETA_KEY="bd_public_beta_v19";
const INSTALL_EVENT_KEY="bd_install_prompt_v19";
const params=new URLSearchParams(location.search);
const betaRequested=params.get("beta")==="1"||params.get("teste")==="1"||location.pathname.endsWith("teste-social.html");
if(betaRequested)localStorage.setItem(BETA_KEY,"1");
const betaActive=localStorage.getItem(BETA_KEY)==="1";
let installPrompt=null;

function ensureManifest(){
 if(document.querySelector('link[rel="manifest"]'))return;
 const link=document.createElement("link");link.rel="manifest";link.href="/manifest.webmanifest?v=20260907-19";document.head.appendChild(link);
}
function ensureMobileMeta(){
 const metas=[
  ["theme-color","#071827"],
  ["apple-mobile-web-app-capable","yes"],
  ["apple-mobile-web-app-status-bar-style","black-translucent"],
  ["apple-mobile-web-app-title","Banco de Atletas"]
 ];
 for(const [name,content]of metas){if(document.querySelector(`meta[name="${name}"]`))continue;const meta=document.createElement("meta");meta.name=name;meta.content=content;document.head.appendChild(meta)}
}
async function registerServiceWorker(){
 if(!("serviceWorker"in navigator)||!window.isSecureContext)return;
 try{await navigator.serviceWorker.register("/sw.js?v=20260907-19",{scope:"/"})}catch(error){console.warn("PWA V19: service worker indisponível",error)}
}
function isStandalone(){return window.matchMedia?.("(display-mode: standalone)")?.matches||navigator.standalone===true}
function isIOS(){return /iphone|ipad|ipod/i.test(navigator.userAgent)}
function toast(message){let el=document.getElementById("betaV19Toast");if(!el){el=document.createElement("div");el.id="betaV19Toast";el.className="beta-v19-toast";document.body.appendChild(el)}el.textContent=message;el.classList.add("show");clearTimeout(el._timer);el._timer=setTimeout(()=>el.classList.remove("show"),2600)}
function feedback(){
 const page=location.pathname.split("/").pop()||"index.html";
 const text=`Olá! Estou participando do teste Beta do Banco de Atletas.%0A%0APágina: ${encodeURIComponent(page)}%0A%0AMeu feedback: `;
 window.open(`https://wa.me/5516988586327?text=${text}`,"_blank","noopener,noreferrer");
}
async function installApp(){
 if(isStandalone()){toast("O app já está instalado neste aparelho.");return}
 if(installPrompt){installPrompt.prompt();const result=await installPrompt.userChoice.catch(()=>null);if(result?.outcome==="accepted")toast("Instalação iniciada. 🏐");installPrompt=null;syncInstallButtons();return}
 if(isIOS()){toast("No iPhone: toque em Compartilhar e depois em “Adicionar à Tela de Início”.");return}
 toast("Abra o menu do navegador e escolha “Instalar app” ou “Adicionar à tela inicial”.");
}
function syncInstallButtons(){document.querySelectorAll("[data-beta-install]").forEach(button=>{button.hidden=isStandalone();button.disabled=false})}
function styles(){if(document.getElementById("publicBetaV19Styles"))return;const style=document.createElement("style");style.id="publicBetaV19Styles";style.textContent=`
.beta-v19-dock{position:fixed;left:50%;bottom:max(12px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:29000;display:flex;align-items:center;gap:7px;width:min(620px,calc(100% - 20px));padding:8px;border:1px solid rgba(255,255,255,.18);border-radius:18px;background:rgba(7,24,39,.94);box-shadow:0 20px 60px rgba(0,0,0,.3);backdrop-filter:blur(18px);color:#fff}.beta-v19-label{display:flex;align-items:center;gap:8px;min-width:0;flex:1;padding:0 6px}.beta-v19-label b{display:inline-flex;padding:5px 7px;border-radius:999px;background:#17b890;color:#041914;font:900 8px/1 Arial,sans-serif}.beta-v19-label span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:800 9px/1.2 Arial,sans-serif;color:#d8e7ed}.beta-v19-btn{min-height:40px;border:1px solid rgba(255,255,255,.18);border-radius:12px;background:#122f40;color:#fff;padding:0 11px;font:900 8px/1 Arial,sans-serif;cursor:pointer;white-space:nowrap}.beta-v19-btn.primary{background:#069ac4;border-color:#12a9d3}.beta-v19-close{width:38px;padding:0;font-size:16px}.beta-v19-toast{position:fixed;left:50%;bottom:84px;transform:translate(-50%,12px);z-index:30000;max-width:min(520px,calc(100% - 28px));padding:10px 14px;border-radius:999px;background:#071827;color:#fff;border:1px solid rgba(255,255,255,.18);box-shadow:0 14px 40px rgba(0,0,0,.25);font:800 10px/1.35 Arial,sans-serif;text-align:center;opacity:0;pointer-events:none;transition:.2s}.beta-v19-toast.show{opacity:1;transform:translate(-50%,0)}@media(max-width:560px){.beta-v19-dock{display:grid;grid-template-columns:1fr auto auto;padding:7px}.beta-v19-label span{display:none}.beta-v19-btn{padding:0 9px}.beta-v19-toast{bottom:78px}}
`;document.head.appendChild(style)}
function mountBetaDock(){
 if(!betaActive||document.getElementById("betaV19Dock"))return;
 styles();const dock=document.createElement("div");dock.id="betaV19Dock";dock.className="beta-v19-dock";dock.setAttribute("role","region");dock.setAttribute("aria-label","Teste Beta público");dock.innerHTML=`<div class="beta-v19-label"><b>BETA</b><span>Você está testando a versão pública</span></div><button class="beta-v19-btn primary" type="button" data-beta-install>INSTALAR APP</button><button class="beta-v19-btn" type="button" data-beta-feedback>ENVIAR FEEDBACK</button><button class="beta-v19-btn beta-v19-close" type="button" data-beta-close aria-label="Ocultar barra Beta">×</button>`;document.body.appendChild(dock);dock.querySelector("[data-beta-install]").onclick=installApp;dock.querySelector("[data-beta-feedback]").onclick=feedback;dock.querySelector("[data-beta-close]").onclick=()=>dock.remove();syncInstallButtons()
}
window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();installPrompt=event;sessionStorage.setItem(INSTALL_EVENT_KEY,"1");syncInstallButtons()});
window.addEventListener("appinstalled",()=>{installPrompt=null;toast("App instalado com sucesso! 🏐");syncInstallButtons()});
ensureManifest();ensureMobileMeta();registerServiceWorker();
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mountBetaDock,{once:true});else mountBetaDock();
window.BDBetaV19={install:installApp,feedback,isActive:()=>betaActive,isStandalone};
