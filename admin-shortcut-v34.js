import{getApp,getApps,initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getAuth,onAuthStateChanged}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const OWNER_EMAIL="swagtop411@gmail.com";
const GATE="oc_6f9c2a71_session";
const PANEL_PATH="z8k3v6n1.html";
const MENU_BUTTON_ID="v34AdminPanelShortcut";
const PROFILE_BUTTON_ID="v34AdminProfileShortcut";
const STYLE_ID="v34AdminShortcutStyles";
const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};
const app=getApps().length?getApp():initializeApp(cfg),auth=getAuth(app);
let authorizedSession=false;
let permissionCheck=0;

function normalize(value){return String(value||"").trim().toLowerCase()}
async function isAuthorized(user){
 if(!user||normalize(user.email)!==OWNER_EMAIL)return false;
 try{
  await user.getIdToken();
  return true;
 }catch(error){
  console.warn("Atalho ADM indisponível:",error?.code||error);
  return false;
 }
}
function installStyles(){
 if(document.getElementById(STYLE_ID))return;
 const style=document.createElement("style");style.id=STYLE_ID;style.textContent=`
 .v34-admin-profile-shortcut{width:100%;min-height:52px;margin:0 0 16px;border:1px solid #f4c84d;border-radius:15px;background:linear-gradient(135deg,#f4c84d,#e1ad2d);color:#102333;font:900 11px/1 Montserrat,Arial,sans-serif;letter-spacing:.7px;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 10px 28px rgba(244,200,77,.18);cursor:pointer}
 .v34-admin-profile-shortcut:active{transform:scale(.99)}
 .v34-admin-shortcut{color:#f4c84d!important;border-color:rgba(244,200,77,.35)!important}
 `;document.head.appendChild(style)
}
function topButton(){return document.getElementById("adminPanelCta")}
function removeShortcut(){
 authorizedSession=false;
 sessionStorage.removeItem(GATE);
 const top=topButton();if(top){top.hidden=true;top.removeAttribute("data-v34-ready")}
 document.getElementById(MENU_BUTTON_ID)?.remove();
 document.getElementById(PROFILE_BUTTON_ID)?.remove();
}
function openPanel(){
 const user=auth.currentUser;
 if(!authorizedSession||!user)return;
 sessionStorage.setItem(GATE,"ok");
 location.assign(PANEL_PATH);
}
async function validateAndOpen(button){
 if(button)button.disabled=true;
 try{
  const ok=await isAuthorized(auth.currentUser);
  if(!ok){removeShortcut();return}
  authorizedSession=true;
  openPanel();
 }finally{if(button)button.disabled=false}
}
function wireTopButton(){
 const top=topButton();if(!top||top.dataset.v34Ready==="1")return;
 top.dataset.v34Ready="1";
 top.hidden=false;
 top.href="#painel-adm";
 top.setAttribute("aria-label","Abrir painel administrativo privado");
 top.textContent="🎛️ PAINEL ADM";
 top.addEventListener("click",event=>{event.preventDefault();void validateAndOpen(top)});
}
function mountMenuButton(){
 const nav=document.querySelector("#siteMenuDrawer [data-v7-menu-nav]")||document.querySelector("[data-v7-menu-nav]");
 if(!nav||document.getElementById(MENU_BUTTON_ID))return;
 const button=document.createElement("button");
 button.id=MENU_BUTTON_ID;
 button.type="button";
 button.className="v34-admin-shortcut";
 button.innerHTML="🎛️ <span>PAINEL ADM</span>";
 button.setAttribute("aria-label","Abrir painel administrativo privado");
 button.addEventListener("click",event=>{event.preventDefault();window.closeSiteMenu?.();void validateAndOpen(button)});
 const account=nav.querySelector('a[href="conta.html"]');
 if(account)nav.insertBefore(button,account);else nav.appendChild(button);
}
function mountProfileButton(){
 const page=location.pathname.split("/").pop()||"index.html";
 if(page!=="meu-perfil.html"||document.getElementById(PROFILE_BUTTON_ID))return;
 const shell=document.querySelector(".profile-shell");
 const nav=document.querySelector(".profile-nav");
 if(!shell)return;
 const button=document.createElement("button");
 button.id=PROFILE_BUTTON_ID;
 button.type="button";
 button.className="v34-admin-profile-shortcut";
 button.innerHTML="🎛️ ABRIR PAINEL ADM";
 button.setAttribute("aria-label","Abrir painel administrativo privado");
 button.addEventListener("click",event=>{event.preventDefault();void validateAndOpen(button)});
 if(nav?.parentNode)nav.insertAdjacentElement("afterend",button);else shell.prepend(button);
}
function mountShortcut(){if(!authorizedSession)return;installStyles();wireTopButton();mountMenuButton();mountProfileButton()}

onAuthStateChanged(auth,user=>{
 const check=++permissionCheck;
 if(!user||normalize(user.email)!==OWNER_EMAIL){removeShortcut();return}
 void isAuthorized(user).then(ok=>{
  if(check!==permissionCheck)return;
  if(!ok){removeShortcut();return}
  authorizedSession=true;
  mountShortcut();
 });
});

const observer=new MutationObserver(()=>{if(authorizedSession)mountShortcut()});
observer.observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mountShortcut,{once:true});else mountShortcut();
