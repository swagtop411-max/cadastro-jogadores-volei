import{getApp,getApps,initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";import{getAuth,onAuthStateChanged}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};
const app=getApps().length?getApp():initializeApp(cfg),auth=getAuth(app);
function atualizarMeuPerfilMenu(user){
 document.querySelectorAll("[data-menu-account]").forEach(el=>{
   if(user){
     el.innerHTML="👤 MEU PERFIL <span>›</span>";
     el.setAttribute("href","perfil-social.html?uid="+encodeURIComponent(user.uid));
     el.setAttribute("aria-label","Abrir meu perfil público");
     el.dataset.loggedIn="true";
   }else{
     el.innerHTML="◉ MINHA CONTA <span>›</span>";
     el.setAttribute("href","conta.html");
     el.removeAttribute("aria-label");
     delete el.dataset.loggedIn;
   }
 });
}
onAuthStateChanged(auth,atualizarMeuPerfilMenu);