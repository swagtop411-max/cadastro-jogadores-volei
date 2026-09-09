import {getApp,getApps,initializeApp} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {getAuth,onAuthStateChanged,signOut} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {doc,getDoc,getFirestore} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import {getFunctions,httpsCallable} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js";

const LEGAL_VERSION="2026-09-09";
const PAGE=location.pathname.split("/").pop()||"index.html";
const SOCIAL_PAGES=new Set(["index.html","perfil-social.html","comunidade.html","explorar.html","reels.html","salvos.html","hashtags.html","meu-perfil.html","atividade.html","conta.html"]);
const PUBLIC_LEGAL_PAGES=new Set(["termos-de-uso.html","politica-privacidade.html","politica-cookies.html","exclusao-conta.html"]);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

window.BD_LEGAL_VERSION=LEGAL_VERSION;
if(!SOCIAL_PAGES.has(PAGE)||PUBLIC_LEGAL_PAGES.has(PAGE)){
  window.__BD_LEGAL_CONSENT_READY__=true;
}else{
  const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};
  const app=getApps().length?getApp():initializeApp(cfg);
  const auth=getAuth(app),db=getFirestore(app),functions=getFunctions(app,"southamerica-east1");
  const acceptLegalTerms=httpsCallable(functions,"acceptLegalTerms");
  let currentUser=null,busy=false,serial=0;

  function installStyles(){
    if(document.getElementById("legalConsentV47Css"))return;
    const style=document.createElement("style");
    style.id="legalConsentV47Css";
    style.textContent=`
      .legal-consent-v47{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:18px;background:rgba(1,12,20,.9);backdrop-filter:blur(12px);font-family:Montserrat,Arial,sans-serif}.legal-consent-v47[hidden]{display:none!important}.legal-consent-v47-card{width:min(560px,100%);max-height:92vh;overflow:auto;box-sizing:border-box;padding:24px;border:1px solid #1f6683;border-radius:22px;background:linear-gradient(145deg,#08243a,#061827);color:#effaff;box-shadow:0 28px 100px rgba(0,0,0,.55)}.legal-consent-v47-kicker{display:block;color:#24c9ee;font-size:9px;font-weight:900;letter-spacing:1.5px}.legal-consent-v47 h2{margin:7px 0 9px;font-size:28px;line-height:1.05}.legal-consent-v47 p{margin:0;color:#b5cbd7;font-size:12px;line-height:1.6}.legal-consent-v47-links{display:flex;gap:8px;flex-wrap:wrap;margin:15px 0}.legal-consent-v47-links a{display:inline-flex;align-items:center;min-height:39px;padding:0 11px;border:1px solid #2b6680;border-radius:10px;color:#8be5f7;text-decoration:none;font-size:9px;font-weight:900}.legal-consent-v47-checks{display:grid;gap:9px;margin:17px 0}.legal-consent-v47-check{display:flex;gap:9px;align-items:flex-start;padding:12px;border:1px solid #194e67;border-radius:12px;background:#041a2a;color:#d9eaf1;font-size:11px;line-height:1.45}.legal-consent-v47-check input{width:19px;height:19px;margin:0;flex:0 0 auto;accent-color:#18c7f1}.legal-consent-v47-actions{display:grid;grid-template-columns:1fr auto;gap:8px}.legal-consent-v47-accept{min-height:50px;border:0;border-radius:13px;background:#f4c84d;color:#102333;font-size:10px;font-weight:900;cursor:pointer}.legal-consent-v47-exit{min-height:50px;padding:0 14px;border:1px solid #2a5b72;border-radius:13px;background:transparent;color:#b6d4e0;font-size:9px;font-weight:900;cursor:pointer}.legal-consent-v47-accept:disabled,.legal-consent-v47-exit:disabled{opacity:.5;cursor:not-allowed}.legal-consent-v47-status{min-height:18px;margin-top:10px;color:#85def1;font-size:10px;line-height:1.4}.legal-consent-v47-status.error{color:#ffb8b8}@media(max-width:560px){.legal-consent-v47{padding:10px;align-items:end}.legal-consent-v47-card{padding:19px;border-radius:20px 20px 14px 14px}.legal-consent-v47-actions{grid-template-columns:1fr}.legal-consent-v47 h2{font-size:25px}}
    `;
    document.head.appendChild(style);
  }

  function ensureModal(){
    installStyles();
    let modal=document.getElementById("legalConsentV47");
    if(modal)return modal;
    modal=document.createElement("div");
    modal.id="legalConsentV47";
    modal.className="legal-consent-v47";
    modal.hidden=true;
    modal.setAttribute("role","dialog");
    modal.setAttribute("aria-modal","true");
    modal.setAttribute("aria-labelledby","legalConsentV47Title");
    modal.innerHTML=`<section class="legal-consent-v47-card"><span class="legal-consent-v47-kicker">SEGURANÇA • PRIVACIDADE • COMUNIDADE</span><h2 id="legalConsentV47Title">Termos atualizados</h2><p>Para continuar usando os recursos sociais, confirme a versão atual dos Termos de Uso e da Política de Privacidade.</p><div class="legal-consent-v47-links"><a href="/termos-de-uso.html" target="_blank" rel="noopener">LER TERMOS DE USO ↗</a><a href="/politica-privacidade.html" target="_blank" rel="noopener">LER POLÍTICA DE PRIVACIDADE ↗</a></div><div class="legal-consent-v47-checks"><label class="legal-consent-v47-check"><input id="legalAcceptV47" type="checkbox"><span>Li e aceito os Termos de Uso e a Política de Privacidade, versão ${LEGAL_VERSION}.</span></label><label class="legal-consent-v47-check"><input id="legalAdultV47" type="checkbox"><span>Confirmo que tenho 18 anos ou mais.</span></label></div><div class="legal-consent-v47-actions"><button id="legalConfirmV47" class="legal-consent-v47-accept" type="button" disabled>ACEITAR E CONTINUAR</button><button id="legalExitV47" class="legal-consent-v47-exit" type="button">SAIR DA CONTA</button></div><div id="legalStatusV47" class="legal-consent-v47-status" role="status" aria-live="polite"></div></section>`;
    document.body.appendChild(modal);
    const accept=modal.querySelector("#legalAcceptV47"),adult=modal.querySelector("#legalAdultV47"),button=modal.querySelector("#legalConfirmV47"),exit=modal.querySelector("#legalExitV47");
    const sync=()=>button.disabled=busy||!accept.checked||!adult.checked;
    accept.addEventListener("change",sync);adult.addEventListener("change",sync);
    button.addEventListener("click",()=>recordAcceptance(true));
    exit.addEventListener("click",async()=>{exit.disabled=true;try{await signOut(auth)}finally{location.href="/conta.html?tab=login&app=1"}});
    return modal;
  }

  function setStatus(message,error=false){
    const el=document.getElementById("legalStatusV47");
    if(!el)return;
    el.textContent=message;
    el.classList.toggle("error",error);
  }

  function setReady(ready){
    window.__BD_LEGAL_CONSENT_READY__=ready;
    document.documentElement.dataset.legalConsent=ready?"accepted":"required";
    window.dispatchEvent(new CustomEvent("bd:legal-consent",{detail:{ready,version:LEGAL_VERSION}}));
  }

  async function recordAcceptance(adultConfirmed){
    if(!currentUser||busy)return false;
    const modal=ensureModal();
    const button=modal.querySelector("#legalConfirmV47"),exit=modal.querySelector("#legalExitV47");
    busy=true;button.disabled=true;exit.disabled=true;setStatus("Registrando seu aceite com segurança...");
    try{
      await globalThis.__BD_APP_CHECK_PROMISE__?.catch?.(()=>null);
      const result=await acceptLegalTerms({version:LEGAL_VERSION,adultConfirmed:adultConfirmed===true});
      if(result?.data?.version!==LEGAL_VERSION)throw new Error("Não foi possível confirmar a versão legal vigente.");
      setReady(true);modal.hidden=true;setStatus("");
      return true;
    }catch(error){
      console.error("Aceite legal V47:",error);
      setStatus(error?.message||"Não foi possível registrar o aceite agora. Tente novamente.",true);
      return false;
    }finally{
      busy=false;exit.disabled=false;
      const accept=modal.querySelector("#legalAcceptV47"),adult=modal.querySelector("#legalAdultV47");
      button.disabled=!accept.checked||!adult.checked;
    }
  }

  async function waitForUserRecord(uid,attempts=20){
    for(let attempt=0;attempt<attempts;attempt++){
      try{const snap=await getDoc(doc(db,"usuarios",uid));if(snap.exists())return true}catch{}
      await sleep(150);
    }
    return false;
  }

  async function checkUser(user){
    const token=++serial;currentUser=user||null;
    if(!user){setReady(true);document.getElementById("legalConsentV47")?.setAttribute("hidden","");return}
    setReady(false);
    try{
      const snap=await getDoc(doc(db,"usuarios",user.uid));
      if(token!==serial)return;
      const data=snap.exists()?snap.data():{};
      const accepted=data.termosAceitosVersao===LEGAL_VERSION&&data.politicaPrivacidadeAceitaVersao===LEGAL_VERSION;
      if(accepted){setReady(true);document.getElementById("legalConsentV47")?.setAttribute("hidden","");return}
    }catch(error){
      console.warn("Não foi possível consultar o aceite legal:",error);
    }
    if(token!==serial)return;

    const registerAccepted=PAGE==="conta.html"&&document.getElementById("acceptTerms")?.checked&&document.getElementById("confirmAdult")?.checked;
    if(registerAccepted){
      const accountReady=await waitForUserRecord(user.uid);
      if(token!==serial)return;
      if(accountReady){const ok=await recordAcceptance(true);if(ok)return}
    }
    const modal=ensureModal();modal.hidden=false;
  }

  window.bdEnsureLegalConsent=async()=>{
    if(window.__BD_LEGAL_CONSENT_READY__)return true;
    if(!currentUser)return false;
    const modal=ensureModal();modal.hidden=false;return false;
  };

  onAuthStateChanged(auth,checkUser);
}
