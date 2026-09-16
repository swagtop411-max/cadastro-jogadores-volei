import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, getDoc, getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};
const app=getApps().length?getApp():initializeApp(cfg);
const auth=getAuth(app),db=getFirestore(app);
let existingPhoto="";
let ready=false;

const $=id=>document.getElementById(id);
const text=value=>String(value??"").trim();

function ensureStyles(){
 if(document.getElementById("profileRequiredV55Style"))return;
 const s=document.createElement("style");s.id="profileRequiredV55Style";s.textContent=`
 .v55-required-banner{margin:0 0 18px;padding:15px 17px;border:1px solid #f0c35a;border-radius:14px;background:#fff8e5;color:#362a0b;font:700 12px/1.5 Montserrat,Arial,sans-serif;box-shadow:0 10px 28px rgba(74,54,8,.09)}
 .v55-required-banner strong{display:block;margin-bottom:4px;font-size:13px}.v55-required-banner span{font-weight:500;color:#665522}.v55-required-banner b{color:#b36a00}
 .v55-required-missing{outline:2px solid #ef4444!important;outline-offset:2px!important}
 .v55-photo-required{box-shadow:0 0 0 4px rgba(239,68,68,.18)!important;outline-color:#ef4444!important}
 `;document.head.appendChild(s);
}

function status(message){
 const el=$("profileStatus");
 if(el){el.textContent=message;el.style.color="#dc2626";el.scrollIntoView({behavior:"smooth",block:"center"});}
}

function markMissing(ids=[]){
 ["name","contato"].forEach(id=>$(id)?.classList.remove("v55-required-missing"));
 $("avatar")?.classList.remove("v55-photo-required");
 ids.forEach(id=>{if(id==="avatar")$("avatar")?.classList.add("v55-photo-required");else $(id)?.classList.add("v55-required-missing")});
}

async function loadCurrentPhoto(){
 const user=auth.currentUser;if(!user)return;
 try{
  const [u,p]=await Promise.all([getDoc(doc(db,"usuarios",user.uid)).catch(()=>null),getDoc(doc(db,"perfis",user.uid)).catch(()=>null)]);
  existingPhoto=text(u?.exists?.()?u.data()?.fotoUrl:"")||text(p?.exists?.()?p.data()?.fotoUrl:"");
 }catch{existingPhoto=""}
}

function selectedPhoto(){return !!$("avatarInput")?.files?.[0]}

function validateRequiredSync(){
 if(!ready){status("Aguarde um instante enquanto verificamos seu perfil.");return false;}
 const nome=text($("name")?.value),contato=text($("contato")?.value),hasPhoto=selectedPhoto()||!!existingPhoto;
 const missing=[];
 if(nome.length<2)missing.push("name");
 if(contato.length<8)missing.push("contato");
 if(!hasPhoto)missing.push("avatar");
 markMissing(missing);
 if(!missing.length)return true;
 const labels=[];if(missing.includes("name"))labels.push("nome");if(missing.includes("contato"))labels.push("contato");if(missing.includes("avatar"))labels.push("foto do perfil");
 status(`Para finalizar o cadastro, preencha obrigatoriamente: ${labels.join(", ")}.`);
 return false;
}

function installBanner(){
 const card=document.querySelector(".profile-card");if(!card||document.getElementById("v55RequiredBanner"))return;
 const banner=document.createElement("div");banner.id="v55RequiredBanner";banner.className="v55-required-banner";
 banner.innerHTML="<strong>Complete seu cadastro para entrar na rede</strong><span>São obrigatórios: <b>nome</b>, <b>contato</b> e <b>foto do perfil</b>. Depois de salvar esses dados, o restante do site/app será liberado.</span>";
 card.before(banner);
}

function installGuard(){
 if(document.documentElement.dataset.profileRequiredV55==="1")return;
 document.documentElement.dataset.profileRequiredV55="1";
 document.addEventListener("click",event=>{
  const save=event.target.closest?.("#saveProfile");if(!save)return;
  if(validateRequiredSync())return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
 },true);
 $("avatarInput")?.addEventListener("change",()=>{if(selectedPhoto())$("avatar")?.classList.remove("v55-photo-required")});
 $("name")?.addEventListener("input",()=>$("name")?.classList.remove("v55-required-missing"));
 $("contato")?.addEventListener("input",()=>$("contato")?.classList.remove("v55-required-missing"));
}

async function boot(){
 ensureStyles();installBanner();installGuard();await loadCurrentPhoto();ready=true;
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
