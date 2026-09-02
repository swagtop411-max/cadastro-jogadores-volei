import "./site-v5.js?v=20260901-5";
import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { collection, deleteDoc, doc, getDoc, getDocs, getFirestore, limit, query, setDoc, Timestamp, where } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { createNotification } from "./social-network.js?v=20260901-2";

const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};
const app=getApps().length?getApp():initializeApp(cfg),db=getFirestore(app),auth=getAuth(app);
const $=id=>document.getElementById(id);
const esc=value=>{const d=document.createElement("div");d.textContent=value??"";return d.innerHTML};
const fallback="data:image/svg+xml;charset=UTF-8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="#18221d"/><text x="80" y="100" text-anchor="middle" font-size="58">🏐</text></svg>');
const ms=value=>value?.toMillis?.()??(value?.seconds?Number(value.seconds)*1000:new Date(value||0).getTime()||0);
let currentUser=auth.currentUser;
let videos=[];
const profiles=new Map();
const liked=new Set();

async function profileOf(uid){
  if(!uid)return{uid:"",nome:"Atleta",fotoUrl:fallback};
  if(profiles.has(uid))return profiles.get(uid);
  try{const s=await getDoc(doc(db,"perfis",uid));const p=s.exists()?{uid,...s.data()}:{uid,nome:"Atleta",fotoUrl:fallback};p.fotoUrl=p.fotoUrl||fallback;profiles.set(uid,p);return p}catch{return{uid,nome:"Atleta",fotoUrl:fallback}}
}

function loginGate(){
  if(currentUser)return true;
  location.href=`conta.html?tab=login&return=${encodeURIComponent(location.pathname+location.search)}`;
  return false;
}

async function loadLiked(){
  liked.clear();
  if(!currentUser)return;
  await Promise.all(videos.map(async video=>{try{const s=await getDoc(doc(db,"curtidas_publicacoes",video.id,"usuarios",currentUser.uid));if(s.exists())liked.add(video.id)}catch{}}));
}

async function toggleLike(video,button){
  if(!loginGate())return;
  const ref=doc(db,"curtidas_publicacoes",video.id,"usuarios",currentUser.uid);
  button.disabled=true;
  try{
    if(liked.has(video.id)){await deleteDoc(ref);liked.delete(video.id)}
    else{await setDoc(ref,{uid:currentUser.uid,criadoEm:Timestamp.now()});liked.add(video.id);await createNotification(video.ownerUid,"like",{sourceId:video.id})}
    button.classList.toggle("active",liked.has(video.id));
    button.firstChild.textContent=liked.has(video.id)?"♥":"♡";
  }catch(error){console.error("Curtir Reel:",error)}finally{button.disabled=false}
}

async function share(video){
  const url=`${location.origin}/perfil-social.html?uid=${encodeURIComponent(video.ownerUid)}`;
  try{if(navigator.share)await navigator.share({title:"Vídeo de atleta",text:video.legenda||"Confira este vídeo",url});else{await navigator.clipboard.writeText(url);alert("Link copiado.")}}catch(error){if(error?.name!=="AbortError")console.warn(error)}
}

function pauseOthers(active){document.querySelectorAll(".reel-video").forEach(v=>{if(v!==active)v.pause()})}
function flash(card,symbol){const icon=card.querySelector(".reel-center-icon");icon.textContent=symbol;icon.classList.add("show");setTimeout(()=>icon.classList.remove("show"),350)}

async function render(){
  const feed=$("reelsFeed");if(!feed)return;
  if(!videos.length){feed.innerHTML='<div class="reels-empty"><div><strong>Nenhum Reel publicado ainda.</strong><span>Vídeos publicados pelos atletas aparecerão aqui.</span><br><a href="index.html">VOLTAR AO FEED</a></div></div>';return}
  const cards=[];
  for(const video of videos){
    const p=await profileOf(video.ownerUid);
    cards.push(`<article class="reel-card" data-reel-id="${esc(video.id)}"><video class="reel-video" src="${esc(video.videoUrl)}" muted playsinline loop preload="metadata"></video><button class="reel-play" type="button" aria-label="Reproduzir ou pausar"></button><div class="reel-center-icon">▶</div><div class="reel-gradient"></div><div class="reel-info"><a class="reel-author" href="perfil-social.html?uid=${encodeURIComponent(video.ownerUid)}"><img src="${esc(p.fotoUrl||fallback)}" alt=""><strong>${esc(p.nome||video.nome||"Atleta")}</strong></a>${video.legenda?`<p>${esc(video.legenda)}</p>`:""}</div><div class="reel-tools"><button class="reel-tool${liked.has(video.id)?" active":""}" type="button" data-reel-like="${esc(video.id)}">${liked.has(video.id)?"♥":"♡"}</button><button class="reel-tool" type="button" data-reel-share="${esc(video.id)}">↗</button><a class="reel-tool" href="perfil-social.html?uid=${encodeURIComponent(video.ownerUid)}" title="Perfil">◎</a></div></article>`);
  }
  feed.innerHTML=cards.join("");

  feed.querySelectorAll(".reel-card").forEach(card=>{
    const video=card.querySelector("video");
    card.querySelector(".reel-play").onclick=()=>{if(video.paused){pauseOthers(video);video.play().catch(()=>{});flash(card,"▶")}else{video.pause();flash(card,"Ⅱ")}};
    video.addEventListener("click",()=>card.querySelector(".reel-play").click());
  });
  feed.querySelectorAll("[data-reel-like]").forEach(button=>button.onclick=()=>{const video=videos.find(v=>v.id===button.dataset.reelLike);if(video)toggleLike(video,button)});
  feed.querySelectorAll("[data-reel-share]").forEach(button=>button.onclick=()=>{const video=videos.find(v=>v.id===button.dataset.reelShare);if(video)share(video)});

  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      const video=entry.target.querySelector("video");
      if(entry.isIntersecting&&entry.intersectionRatio>.72){pauseOthers(video);video.play().catch(()=>{})}else video.pause();
    });
  },{threshold:[0,.72,1]});
  feed.querySelectorAll(".reel-card").forEach(card=>observer.observe(card));
}

async function load(){
  try{
    const snap=await getDocs(query(collection(db,"videos"),where("aprovado","==",true),where("visibilidade","==","publico"),limit(120)));
    videos=snap.docs.map(d=>({id:d.id,...d.data()})).filter(v=>v.videoUrl&&v.ownerUid).sort((a,b)=>ms(b.criadoEm)-ms(a.criadoEm));
    await loadLiked();
    await render();
  }catch(error){console.error("Reels:",error);$("reelsFeed").innerHTML='<div class="reels-empty"><div><strong>Não foi possível carregar os vídeos.</strong><span>Tente novamente em alguns instantes.</span></div></div>'}
}

onAuthStateChanged(auth,async user=>{currentUser=user;if(videos.length){await loadLiked();await render()}});
load();
