import {getApp,getApps,initializeApp} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {getAuth,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {collection,getFirestore,limit,onSnapshot,query,where} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const PAGE=location.pathname.split('/').pop()||'index.html';
const ACTIVE=localStorage.getItem('bd_public_beta_v19')==='1'||new URLSearchParams(location.search).get('beta')==='1';
const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};

if(ACTIVE){
 const app=getApps().length?getApp():initializeApp(cfg),auth=getAuth(app),db=getFirestore(app);
 let currentUser=null,unsubUnread=null,lastUnread=0;
 const bellSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>';

 function bellElement(){return document.getElementById('betaActivityBell')}
 function setBadge(count){
  lastUnread=Math.max(0,Number(count)||0);
  const badge=document.querySelector('#betaActivityBell .beta-activity-badge');
  if(!badge)return;
  badge.hidden=lastUnread<1;
  badge.textContent=lastUnread>99?'99+':String(lastUnread);
  bellElement()?.setAttribute('aria-label',lastUnread?`Atividades, ${lastUnread} não lidas`:'Atividades');
 }
 function mountBell(){
  if(PAGE==='atividade.html'||!currentUser||bellElement())return;
  const feedHost=PAGE==='index.html'?document.querySelector('.beta-mobile-hero'):null;
  if(PAGE==='index.html'&&!feedHost)return;
  const bell=document.createElement('a');
  bell.id='betaActivityBell';
  bell.href='/atividade.html?beta=1';
  bell.className=feedHost?'beta-activity-bell':'beta-activity-bell beta-activity-floating';
  bell.setAttribute('aria-label','Atividades');
  bell.innerHTML=`${bellSvg}<span class="beta-activity-badge" hidden>0</span>`;
  (feedHost||document.body).appendChild(bell);
  setBadge(lastUnread);
 }
 function stopUnread(){unsubUnread?.();unsubUnread=null}
 function watchUnread(user){
  stopUnread();
  if(!user){setBadge(0);return}
  const q=query(collection(db,'notificacoes',user.uid,'itens'),where('lida','==',false),limit(100));
  unsubUnread=onSnapshot(q,snap=>setBadge(snap.size),error=>console.warn('Beta Atividades V28:',error));
 }
 function syncUser(user){
  currentUser=user||null;
  if(!currentUser){stopUnread();bellElement()?.remove();setBadge(0);return}
  mountBell();
  watchUnread(currentUser);
 }
 function boot(){
  document.documentElement.classList.add('beta-activity-v28');
  if(PAGE==='atividade.html')document.body.classList.add('beta-activity-screen');
  onAuthStateChanged(auth,syncUser);
  const observer=new MutationObserver(()=>mountBell());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('bd:activity-count',event=>setBadge(event.detail?.unread||0));
  window.addEventListener('beforeunload',()=>{stopUnread();observer.disconnect()},{once:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
}
