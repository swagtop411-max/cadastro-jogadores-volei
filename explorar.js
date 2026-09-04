import "./site-v5.js?v=20260904-2";
import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { collection, getDocs, getFirestore, limit, query, where } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};
const app=getApps().length?getApp():initializeApp(cfg),db=getFirestore(app);
const $=id=>document.getElementById(id);
const esc=value=>{const d=document.createElement("div");d.textContent=value??"";return d.innerHTML};
const norm=value=>String(value??"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ");
const ms=value=>value?.toMillis?.()??(value?.seconds?Number(value.seconds)*1000:new Date(value||0).getTime()||0);
const fallback="data:image/svg+xml;charset=UTF-8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><rect width="180" height="180" fill="#18221d"/><text x="90" y="112" text-anchor="middle" font-size="64">🏐</text></svg>');

let profiles=[];
let media=[];
let queryText="";
let type="all";

function profileSearchText(p){return norm([p.nome,p.cidade,p.uf,p.modalidade,p.posicao,p.categoria,p.time,p.bio].filter(Boolean).join(" "))}
function mediaSearchText(m){const p=profiles.find(x=>x.uid===m.ownerUid);return norm([m.caption,p?.nome,p?.cidade,p?.time,m.kind].filter(Boolean).join(" "))}

function renderProfiles(){
  const box=$("exploreProfiles"),section=$("profilesSection");if(!box||!section)return;
  section.hidden=type==="images"||type==="videos";
  if(section.hidden)return;
  const list=profiles.filter(p=>!queryText||profileSearchText(p).includes(queryText)).slice(0,25);
  $("profilesCount").textContent=`${list.length} perfil${list.length===1?"":"is"}`;
  box.innerHTML=list.length?list.map(p=>`<a class="profile-card" href="perfil-social.html?uid=${encodeURIComponent(p.uid)}"><img src="${esc(p.fotoUrl||fallback)}" alt="${esc(p.nome||"Atleta")}" loading="lazy" decoding="async"><strong>${esc(p.nome||"Atleta")}</strong><small>${esc([p.cidade,p.modalidade,p.categoria].filter(Boolean).join(" • ")||"Perfil esportivo")}</small></a>`).join(""):'<div class="explore-empty">Nenhum atleta encontrado para essa busca.</div>';
}

function renderMedia(){
  const box=$("exploreGrid"),section=$("mediaSection");if(!box||!section)return;
  section.hidden=type==="profiles";
  if(section.hidden)return;
  const list=media.filter(item=>{
    if(type==="images"&&item.kind!=="image")return false;
    if(type==="videos"&&item.kind!=="video")return false;
    return !queryText||mediaSearchText(item).includes(queryText);
  }).slice(0,90);
  $("mediaCount").textContent=`${list.length} conteúdo${list.length===1?"":"s"}`;
  box.innerHTML=list.length?list.map(item=>{
    const p=profiles.find(x=>x.uid===item.ownerUid)||{};
    const mediaMarkup=item.kind==="video"?`<video src="${esc(item.url)}" muted playsinline preload="metadata"></video>`:`<img src="${esc(item.url)}" alt="Publicação de ${esc(p.nome||"atleta")}" loading="lazy" decoding="async">`;
    return `<a class="explore-item" href="perfil-social.html?uid=${encodeURIComponent(item.ownerUid)}">${mediaMarkup}<span class="explore-type">${item.kind==="video"?"▶":"▦"}</span><div class="explore-item-overlay"><strong>${esc(p.nome||item.nome||"Atleta")}</strong><span>${esc(item.caption||"")}</span></div></a>`;
  }).join(""):'<div class="explore-empty">Nenhuma publicação encontrada para essa busca.</div>';
}

function render(){renderProfiles();renderMedia()}

async function load(){
  try{
    const [profilesSnap,postsSnap,videosSnap]=await Promise.all([
      getDocs(query(collection(db,"perfis"),limit(160))),
      getDocs(query(collection(db,"publicacoes"),where("aprovado","==",true),where("visibilidade","==","publico"),limit(160))),
      getDocs(query(collection(db,"videos"),where("aprovado","==",true),where("visibilidade","==","publico"),limit(100)))
    ]);
    profiles=profilesSnap.docs.map(d=>({uid:d.id,...d.data()})).sort((a,b)=>String(a.nome||"").localeCompare(String(b.nome||""),"pt-BR"));
    const posts=postsSnap.docs.map(d=>{const x=d.data();return{id:d.id,kind:"image",ownerUid:x.ownerUid||"",nome:x.nome||"",url:x.imagemUrl||x.imagem||"",caption:x.legenda||x.texto||"",createdAt:x.criadoEm}}).filter(x=>x.url&&x.ownerUid);
    const videos=videosSnap.docs.map(d=>{const x=d.data();return{id:d.id,kind:"video",ownerUid:x.ownerUid||"",nome:x.nome||"",url:x.videoUrl||"",caption:x.legenda||"",createdAt:x.criadoEm}}).filter(x=>x.url&&x.ownerUid);
    media=[...posts,...videos].sort((a,b)=>ms(b.createdAt)-ms(a.createdAt));
    render();
  }catch(error){
    console.error("Explorar:",error);
    $("exploreProfiles").innerHTML='<div class="explore-empty">Não foi possível carregar os atletas.</div>';
    $("exploreGrid").innerHTML='<div class="explore-empty">Não foi possível carregar as publicações agora.</div>';
  }
}

$("exploreQuery")?.addEventListener("input",event=>{queryText=norm(event.target.value);render()});
$("exploreType")?.addEventListener("change",event=>{type=event.target.value;render()});
load();
