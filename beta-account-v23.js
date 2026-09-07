import {getApp,getApps,initializeApp} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {getAuth,onAuthStateChanged,signOut} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const active=localStorage.getItem("bd_public_beta_v19")==="1"||new URLSearchParams(location.search).get("beta")==="1";
if(!active)throw new Error("Beta Account V23 inativo");

const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};
const app=getApps().length?getApp():initializeApp(cfg),auth=getAuth(app);
const params=new URLSearchParams(location.search);
const page=location.pathname.split("/").pop()||"index.html";

function ensureCss(){if(document.getElementById("betaAccountV23Css"))return;const link=document.createElement("link");link.id="betaAccountV23Css";link.rel="stylesheet";link.href="/beta-account-v23.css?v=20260907-23";document.head.appendChild(link)}
ensureCss();

async function handleForcedAccountFlow(user){
 if(page!=="conta.html"||!user)return false;
 const forceRegister=params.get("forceRegister")==="1";
 const forceLogin=params.get("forceLogin")==="1";
 if(!forceRegister&&!forceLogin)return false;
 try{await signOut(auth)}catch(error){console.warn("Beta V23: não foi possível encerrar a sessão anterior",error)}
 const target=forceRegister?"/conta.html?tab=register&beta=1&fresh=1":"/conta.html?tab=login&beta=1&fresh=1";
 location.replace(target);
 return true;
}

function accountLinks(user){
 if(user)return `<a class="beta-account-btn" href="/conta.html?tab=login&beta=1&forceLogin=1">TROCAR CONTA</a><a class="beta-account-btn primary" href="/conta.html?tab=register&beta=1&forceRegister=1">CRIAR NOVA CONTA</a>`;
 return `<a class="beta-account-btn" href="/conta.html?tab=login&beta=1">ENTRAR</a><a class="beta-account-btn primary" href="/conta.html?tab=register&beta=1">CRIAR CONTA</a>`;
}

function mountProfileAccount(user){
 if(page!=="meu-perfil.html")return;
 let bar=document.getElementById("betaAccountBarV23");
 if(!bar){bar=document.createElement("section");bar.id="betaAccountBarV23";bar.className="beta-account-bar-v23";const shell=document.querySelector(".profile-shell")||document.querySelector("main")||document.body;shell.prepend(bar)}
 const name=user?.displayName?.trim()||"Usuário";
 bar.innerHTML=user?`<div class="beta-account-copy"><span>CONTA ATUAL</span><strong>${escapeHtml(name)}</strong><p>Quer cadastrar outra pessoa neste aparelho? Troque de conta ou crie uma nova.</p></div><div class="beta-account-actions">${accountLinks(user)}</div>`:`<div class="beta-account-copy"><span>ENTRE PARA A REDE</span><strong>Crie seu perfil de atleta</strong><p>Cadastre uma conta para publicar, seguir atletas e aparecer na rede.</p></div><div class="beta-account-actions">${accountLinks(null)}</div>`;
}

function escapeHtml(value){const div=document.createElement("div");div.textContent=String(value??"");return div.innerHTML}

function syncBetaPanel(user){
 const panel=document.getElementById("betaMirrorPanel");
 if(!panel)return false;
 let section=panel.querySelector("[data-beta-account-v23]");
 if(!section){section=document.createElement("div");section.dataset.betaAccountV23="1";section.className="beta-account-panel-v23";panel.appendChild(section)}
 section.innerHTML=`<strong>CONTA</strong><span>${user?"Você está conectado. Também pode trocar de conta ou cadastrar outra pessoa.":"Entre ou crie sua conta para participar da rede."}</span><div class="beta-account-panel-actions">${accountLinks(user)}</div>`;
 return true;
}

function sync(user){mountProfileAccount(user);syncBetaPanel(user)}

onAuthStateChanged(auth,async user=>{
 if(await handleForcedAccountFlow(user))return;
 sync(user);
 let tries=0;const timer=setInterval(()=>{tries++;if(syncBetaPanel(user)||tries>30)clearInterval(timer)},150);
});
