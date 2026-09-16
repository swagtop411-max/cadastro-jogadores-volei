import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};
const PUBLIC_PAGES=new Set([
  "conta.html",
  "termos-de-uso.html",
  "politica-privacidade.html",
  "politica-cookies.html",
  "exclusao-conta.html"
]);
const page=location.pathname.split("/").pop()||"index.html";

if(!PUBLIC_PAGES.has(page)){
  document.documentElement.dataset.authGate="checking";
  const style=document.createElement("style");
  style.id="authGateV53Style";
  style.textContent='html[data-auth-gate="checking"] body{visibility:hidden!important}';
  document.head.appendChild(style);

  const app=getApps().length?getApp():initializeApp(cfg);
  const auth=getAuth(app);

  await new Promise(resolve=>{
    let settled=false;
    const finish=(user)=>{
      if(settled)return;
      settled=true;
      if(user){
        document.documentElement.dataset.authGate="authenticated";
        style.remove();
        resolve();
        return;
      }
      document.documentElement.dataset.authGate="redirecting";
      const target="conta.html?tab=register&gate=1";
      location.replace(target);
    };
    const stop=onAuthStateChanged(auth,user=>{stop();finish(user)},()=>finish(null));
    setTimeout(()=>finish(auth.currentUser),6500);
  });
}
