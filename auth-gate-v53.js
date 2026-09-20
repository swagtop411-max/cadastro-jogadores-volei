import appCheckReady from "./firebase-app-check-init-v60.js";
import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, getDoc, getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};
const PUBLIC_PAGES=new Set([
  "conta.html",
  "termos-de-uso.html",
  "politica-privacidade.html",
  "politica-cookies.html",
  "exclusao-conta.html"
]);
const PROFILE_SETUP_PAGES=new Set(["meu-perfil.html"]);
const ADMIN_EXEMPT_PAGES=new Set(["admin.html","controle-privado-91b73f.html","vault-7c3e91a6f4.html","z8k3v6n1.html","p4x7m9q2.html"]);
const page=location.pathname.split("/").pop()||"index.html";
const params=new URLSearchParams(location.search);

if(page==="conta.html"&&params.get("gate")==="1"){
  const forceRegister=()=>document.querySelector('[data-account-tab="register"]')?.click();
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",forceRegister,{once:true});
  for(const delay of[80,280,700,1400])setTimeout(forceRegister,delay);
}

function profileComplete(data={},publicData={}){
  const nome=String(data.nome||publicData.nome||"").trim();
  const contato=String(data.contato||"").trim();
  const foto=String(data.fotoUrl||publicData.fotoUrl||"").trim();
  return nome.length>=2&&contato.length>=8&&foto.length>0;
}

function showProfileGateError(){
  const show=()=>{
    if(document.getElementById("profileGateError"))return;
    const panel=document.createElement("section");panel.id="profileGateError";
    panel.style.cssText="visibility:visible!important;position:fixed;inset:0;z-index:2147483647;display:grid;place-content:center;gap:20px;padding:24px;background:#020d4b;color:white;text-align:center;font:16px/1.5 Arial";
    panel.innerHTML='<h1>Não foi possível confirmar seu cadastro agora</h1><p>Seus dados não foram apagados. Tente novamente ou abra seu perfil.</p><button type="button">Tentar novamente</button><a style="color:white" href="meu-perfil.html?editar=1">Abrir meu perfil</a>';
    panel.querySelector("button").onclick=()=>location.reload();
    document.body.appendChild(panel);
  };
  if(document.body)show();else document.addEventListener("DOMContentLoaded",show,{once:true});
}

async function profileRead(promise){
  let timer;
  try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("profile-read-timeout")),12000);})]);}
  finally{clearTimeout(timer);}
}

async function ensureRequiredProfile(user,db){
  if(!user||PUBLIC_PAGES.has(page)||ADMIN_EXEMPT_PAGES.has(page))return true;
  if(PROFILE_SETUP_PAGES.has(page)){
    import("./profile-required-v55.js?v=20260916-55").catch(error=>console.warn("Perfil obrigatório V55:",error));
    return true;
  }
  try{
    await profileRead(appCheckReady);
    const snap=await profileRead(getDoc(doc(db,"usuarios",user.uid)));
    const data=snap.exists()?snap.data():{};
    if(profileComplete(data))return true;
    const publicSnap=await profileRead(getDoc(doc(db,"perfis",user.uid)));
    if(profileComplete(data,publicSnap.exists()?publicSnap.data():{}))return true;
  }catch(error){
    console.warn("Verificação de perfil obrigatório:",error);
    showProfileGateError();
    return false;
  }
  const returnTo=encodeURIComponent(`${location.pathname}${location.search}${location.hash}`);
  location.replace(`meu-perfil.html?novo=1&obrigatorio=1&return=${returnTo}`);
  return false;
}

if(!PUBLIC_PAGES.has(page)){
  document.documentElement.dataset.authGate="checking";
  const style=document.createElement("style");
  style.id="authGateV55Style";
  style.textContent='html[data-auth-gate="checking"] body{visibility:hidden!important}';
  document.head.appendChild(style);

  const app=getApps().length?getApp():initializeApp(cfg);
  const auth=getAuth(app),db=getFirestore(app);

  await new Promise(resolve=>{
    let settled=false;
    const finish=async user=>{
      if(settled)return;
      settled=true;
      await (window.__athleteLaunchReady || Promise.resolve());
      if(user){
        const allowed=await ensureRequiredProfile(user,db);
        if(!allowed){resolve();return;}
        document.documentElement.dataset.authGate="authenticated";
        style.remove();
        document.getElementById("profileGateError")?.remove();
        resolve();
        return;
      }
      document.documentElement.dataset.authGate="redirecting";
      location.replace("conta.html?tab=register&gate=1");
      resolve();
    };
    const stop=onAuthStateChanged(auth,user=>{stop();finish(user)},()=>{showProfileGateError();resolve();});
    setTimeout(()=>{if(settled)return;if(auth.currentUser)finish(auth.currentUser);else showProfileGateError();},12000);
  });
}

