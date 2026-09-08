const MODE_KEY="bd_play_store_mode";
const APP_PACKAGE="br.com.cadastrodeatletas.app";

function detectedPlayApp(){
  const params=new URLSearchParams(location.search);
  if(params.get("app")==="1"){
    try{sessionStorage.setItem(MODE_KEY,"1")}catch{}
    return true;
  }
  if(String(document.referrer||"").startsWith(`android-app://${APP_PACKAGE}`)){
    try{sessionStorage.setItem(MODE_KEY,"1")}catch{}
    return true;
  }
  try{return sessionStorage.getItem(MODE_KEY)==="1"}catch{return false}
}

const PLAY_APP_MODE=detectedPlayApp();
window.__BD_PLAY_STORE_MODE__=PLAY_APP_MODE;

function ensureStyle(){
  if(!PLAY_APP_MODE||document.getElementById("playStoreModeV44Style"))return;
  const style=document.createElement("style");
  style.id="playStoreModeV44Style";
  style.textContent=`
    html.play-store-app [data-play-external-purchase],
    html.play-store-app .play-external-purchase{display:none!important}
    .play-store-plan-note{margin:10px 0 14px;padding:11px 13px;border:1px solid rgba(217,169,63,.25);border-radius:11px;background:rgba(217,169,63,.06);color:#c9c1ae;font-size:10px;line-height:1.55}
  `;
  document.head.appendChild(style);
}

function lockDigitalPlans(){
  if(!PLAY_APP_MODE)return;
  const inputs=[...document.querySelectorAll('input[name="profilePlano"]')];
  if(!inputs.length)return;

  let free=inputs.find(input=>input.value==="gratuito");
  for(const input of inputs){
    const paid=input.value!=="gratuito";
    if(paid){
      input.checked=false;
      input.disabled=true;
      const card=input.closest(".profile-plano")||input.closest("label")||input.parentElement;
      if(card){
        card.hidden=true;
        card.setAttribute("aria-hidden","true");
        card.dataset.playExternalPurchase="hidden";
      }
    }
  }
  if(free){free.disabled=false;free.checked=true;free.closest(".profile-plano")?.classList.add("selecionado")}

  const host=free?.closest(".profile-plans,.profile-planos,.planos-grid,.planos")||free?.closest(".field,.full")||free?.parentElement?.parentElement;
  if(host&&!host.querySelector(".play-store-plan-note")){
    const note=document.createElement("p");
    note.className="play-store-plan-note";
    note.textContent="No aplicativo Android distribuído pelo Google Play, esta versão utiliza o plano gratuito e não oferece compra de recursos digitais fora do faturamento do Google Play.";
    host.appendChild(note);
  }
}

function protectPlanChanges(event){
  if(!PLAY_APP_MODE)return;
  const input=event.target?.closest?.('input[name="profilePlano"]');
  if(!input||input.value==="gratuito")return;
  event.preventDefault();
  input.checked=false;
  const free=document.querySelector('input[name="profilePlano"][value="gratuito"]');
  if(free)free.checked=true;
}

if(PLAY_APP_MODE){
  document.documentElement.classList.add("play-store-app");
  ensureStyle();
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",lockDigitalPlans,{once:true});
  else lockDigitalPlans();
  document.addEventListener("change",protectPlanChanges,true);
  const observer=new MutationObserver(()=>lockDigitalPlans());
  observer.observe(document.documentElement,{childList:true,subtree:true});
}

export { PLAY_APP_MODE };
