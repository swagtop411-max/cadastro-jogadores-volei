await import("./firebase-app-check-v11.js?v=20260904-2");
import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, getDoc, getFirestore, setDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};
const ADMIN_EMAIL="swagtop411@gmail.com";
const app=getApps().length?getApp():initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);

const text=v=>String(v??"").trim();
function safeName(account,uid){
  const n=text(account?.nome);if(n.length>=2)return n.slice(0,100);
  const prefix=text(account?.email).split("@")[0].replace(/[._-]+/g," ").trim();
  if(prefix.length>=2)return prefix.slice(0,100);
  return `Atleta ${uid.slice(0,6)}`;
}
function uidFromRow(row){return text(row?.querySelector(".control-v10-uid")?.textContent).replace(/^UID:\s*/i,"")}
function profileUrl(uid){return `perfil-social.html?uid=${encodeURIComponent(uid)}`}

async function ensureProfileForUid(uid){
  const ref=doc(db,"perfis",uid),existing=await getDoc(ref);
  if(existing.exists())return existing.data();
  const accountSnap=await getDoc(doc(db,"usuarios",uid));
  const account=accountSnap.exists()?accountSnap.data()||{}:{};
  const payload={
    uid,
    nome:safeName(account,uid),
    cidade:text(account.cidade).slice(0,100),
    uf:text(account.uf).toUpperCase().slice(0,2),
    modalidade:text(account.modalidade).slice(0,80),
    posicao:text(account.posicao).slice(0,80),
    categoria:text(account.categoria).slice(0,40),
    time:text(account.time).slice(0,100),
    bio:text(account.bio).slice(0,500),
    fotoUrl:text(account.fotoUrl).slice(0,2000),fotoPath:text(account.fotoPath).slice(0,1000),
    capaUrl:text(account.capaUrl).slice(0,2000),capaPath:text(account.capaPath).slice(0,1000),
    historicoCampeonatos:Array.isArray(account.historicoCampeonatos)?account.historicoCampeonatos.slice(0,30):[],
    handle:"",instagramUrl:text(account.instagramUrl).slice(0,300),completo:false
  };
  await setDoc(ref,payload,{merge:false});
  return payload;
}

function enhanceRows(){
  document.querySelectorAll("#controlV10Accounts .control-v10-row").forEach(row=>{
    const uid=uidFromRow(row);if(!uid)return;
    const actions=row.querySelector(".control-v10-actions");if(!actions||actions.querySelector("[data-v13-open-profile]"))return;
    const social=actions.querySelector('a[href^="perfil-social.html?uid="]');
    if(social){social.textContent="ABRIR PERFIL";social.classList.add("primary");social.dataset.v13OpenProfile="1";return}
    const button=document.createElement("button");
    button.type="button";button.className="primary";button.dataset.v13OpenProfile=uid;button.textContent="CRIAR E ABRIR PERFIL";
    actions.prepend(button);
  });
}

async function handleClick(event){
  const button=event.target.closest?.("button[data-v13-open-profile]");if(!button)return;
  const uid=text(button.dataset.v13OpenProfile);if(!uid)return;
  const win=window.open("about:blank","_blank");
  const old=button.textContent;button.disabled=true;button.textContent="CRIANDO PERFIL...";
  try{
    await ensureProfileForUid(uid);
    if(win)win.location.href=profileUrl(uid);else location.href=profileUrl(uid);
    button.textContent="ABRIR PERFIL";
    button.onclick=()=>window.open(profileUrl(uid),"_blank","noopener");
    setTimeout(()=>document.getElementById("controlV10Refresh")?.click(),300);
  }catch(error){
    console.error("Perfil ADM V13:",error);if(win)win.close();
    alert(error?.code==="permission-denied"?"As regras do Firestore ainda não permitem criar o perfil básico. Publique as regras V13 e tente novamente.":"Não foi possível criar o perfil agora.");
    button.textContent=old;
  }finally{button.disabled=false}
}

function boot(){
  document.addEventListener("click",handleClick,true);
  const observer=new MutationObserver(()=>enhanceRows());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  enhanceRows();
}

onAuthStateChanged(auth,user=>{if(user&&text(user.email).toLowerCase()===ADMIN_EMAIL&&!window.__BD_ADMIN_PROFILE_BROWSER_V13__){window.__BD_ADMIN_PROFILE_BROWSER_V13__=true;boot()}});
