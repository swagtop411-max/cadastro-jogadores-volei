import "./site-v5.js?v=20260904-2";
import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { collection, documentId, getDocs, getFirestore, limit, orderBy, query, startAfter, where } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

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
const legacyMap=new Map(),profileMap=new Map();
let legacyCursor=null,profileCursor=null,legacyDone=false,profileDone=false,loadingMore=false;

function listField(value,fallbackValue=""){if(Array.isArray(value))return value.map(String).map(x=>x.trim()).filter(Boolean);if(String(value||"").trim())return String(value).split(",").map(x=>x.trim()).filter(Boolean);return fallbackValue?[String(fallbackValue).trim()].filter(Boolean):[]}
function normalizeAthlete(id,data,source){const a=data||{},positions=listField(a.posicoes,a.posicao),modalities=listField(a.modalidades,a.modalidade),ownerUid=String(a.ownerUid||a.uid||(source==="perfil-social"?id:"")).trim();return{id,uid:source==="perfil-social"?id:ownerUid,ownerUid,fonte:source,nome:String(a.nome||"").trim(),fotoUrl:String(a.fotoUrl||a.foto||"").trim(),cidade:String(a.cidade||"").trim(),uf:String(a.uf||"").trim(),modalidade:modalities.join(", "),categoria:String(a.categoria||a.nivel||"").trim(),posicao:positions.join(", "),time:String(a.time||"").trim(),bio:String(a.bio||"").trim(),status:String(a.status||"ativo").trim()}}
function rebuildProfiles(){const legacy=[...legacyMap.values()].filter(p=>p.nome&&norm(p.status)!=="inativo"),social=[...profileMap.values()].filter(p=>p.nome&&norm(p.status)!=="inativo"),merged=legacy.map(p=>({...p})),byUid=new Map(merged.filter(p=>p.ownerUid).map(p=>[p.ownerUid,p]));for(const p of social){const existing=byUid.get(p.ownerUid);if(existing){Object.assign(existing,{...existing,...p,id:existing.id,fonte:"perfil-social",uid:p.uid,ownerUid:p.ownerUid})}else merged.push({...p})}profiles=merged.sort((a,b)=>String(a.nome||"").localeCompare(String(b.nome||""),"pt-BR"));renderProfiles();renderMedia();syncLoadMore()}
function profileHref(p){if(p.fonte==="perfil-social"&&p.uid)return `perfil-social.html?uid=${encodeURIComponent(p.uid)}`;return `perfil.html?id=${encodeURIComponent(p.id)}`}
function profileSearchText(p){return norm([p.nome,p.cidade,p.uf,p.modalidade,p.posicao,p.categoria,p.time,p.bio].filter(Boolean).join(" "))}
function mediaSearchText(m){const p=profiles.find(x=>x.ownerUid&&x.ownerUid===m.ownerUid);return norm([m.caption,p?.nome,p?.cidade,p?.time,m.kind].filter(Boolean).join(" "))}

function renderProfiles(){
  const box=$("exploreProfiles"),section=$("profilesSection");if(!box||!section)return;
  section.hidden=type==="images"||type==="videos";
  if(section.hidden)return;
  const list=profiles.filter(p=>!queryText||profileSearchText(p).includes(queryText));
  $("profilesCount").textContent=`${list.length} perfil${list.length===1?"":"is"}`;
  box.innerHTML=list.length?list.map(p=>`<a class="profile-card" href="${esc(profileHref(p))}"><img src="${esc(p.fotoUrl||fallback)}" alt="${esc(p.nome||"Atleta")}" loading="lazy" decoding="async"><strong>${esc(p.nome||"Atleta")}</strong><small>${esc([p.cidade,p.modalidade,p.categoria].filter(Boolean).join(" • ")||"Perfil esportivo")}</small></a>`).join(""):'<div class="explore-empty">Nenhum atleta encontrado para essa busca.</div>';
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
    const p=profiles.find(x=>x.ownerUid&&x.ownerUid===item.ownerUid)||{};
    const mediaMarkup=item.kind==="video"?`<video src="${esc(item.url)}" muted playsinline preload="metadata"></video>`:`<img src="${esc(item.url)}" alt="Publicação de ${esc(p.nome||"atleta")}" loading="lazy" decoding="async">`;
    const href=p.id?profileHref(p):`perfil-social.html?uid=${encodeURIComponent(item.ownerUid)}`;
    return `<a class="explore-item" href="${esc(href)}">${mediaMarkup}<span class="explore-type">${item.kind==="video"?"▶":"▦"}</span><div class="explore-item-overlay"><strong>${esc(p.nome||item.nome||"Atleta")}</strong><span>${esc(item.caption||"")}</span></div></a>`;
  }).join(""):'<div class="explore-empty">Nenhuma publicação encontrada para essa busca.</div>';
}

function render(){renderProfiles();renderMedia()}
async function readPage(name,last=null,pageSize=80){const constraints=[orderBy(documentId())];if(last)constraints.push(startAfter(last));constraints.push(limit(pageSize));const snap=await getDocs(query(collection(db,name),...constraints));return{docs:snap.docs,last:snap.docs.at(-1)||null,done:snap.size<pageSize}}
function addLegacy(docs){for(const d of docs)legacyMap.set(d.id,normalizeAthlete(d.id,d.data(),"atletas"))}
function addSocial(docs){for(const d of docs)profileMap.set(d.id,normalizeAthlete(d.id,d.data(),"perfil-social"))}
function syncLoadMore(){const section=$("profilesSection");if(!section)return;let button=$("exploreLoadMoreAthletes");const show=!legacyDone||!profileDone;if(!show){button?.remove();return}if(!button){button=document.createElement("button");button.id="exploreLoadMoreAthletes";button.type="button";button.className="explore-load-more";button.textContent="CARREGAR MAIS ATLETAS";button.addEventListener("click",loadMoreAthletes);section.appendChild(button)}button.disabled=loadingMore;button.textContent=loadingMore?"CARREGANDO...":"CARREGAR MAIS ATLETAS"}
async function loadMoreAthletes(){if(loadingMore||legacyDone&&profileDone)return;loadingMore=true;syncLoadMore();try{const jobs=[];if(!legacyDone)jobs.push(readPage("atletas",legacyCursor).then(page=>{addLegacy(page.docs);legacyCursor=page.last;legacyDone=page.done}));if(!profileDone)jobs.push(readPage("perfis",profileCursor).then(page=>{addSocial(page.docs);profileCursor=page.last;profileDone=page.done}));await Promise.allSettled(jobs);rebuildProfiles()}finally{loadingMore=false;syncLoadMore()}}

async function load(){
  try{
    const [legacyResult,profileResult,postsSnap,videosSnap]=await Promise.allSettled([
      readPage("atletas"),
      readPage("perfis"),
      getDocs(query(collection(db,"publicacoes"),where("aprovado","==",true),where("visibilidade","==","publico"),limit(160))),
      getDocs(query(collection(db,"videos"),where("aprovado","==",true),where("visibilidade","==","publico"),limit(100)))
    ]);
    if(legacyResult.status==="fulfilled"){addLegacy(legacyResult.value.docs);legacyCursor=legacyResult.value.last;legacyDone=legacyResult.value.done}else legacyDone=true;
    if(profileResult.status==="fulfilled"){addSocial(profileResult.value.docs);profileCursor=profileResult.value.last;profileDone=profileResult.value.done}else profileDone=true;
    rebuildProfiles();
    const postsSnapValue=postsSnap.status==="fulfilled"?postsSnap.value:null,videosSnapValue=videosSnap.status==="fulfilled"?videosSnap.value:null;
    const posts=postsSnapValue?postsSnapValue.docs.map(d=>{const x=d.data();return{id:d.id,kind:"image",ownerUid:x.ownerUid||"",nome:x.nome||"",url:x.imagemUrl||x.imagem||"",caption:x.legenda||x.texto||"",createdAt:x.criadoEm}}).filter(x=>x.url&&x.ownerUid):[];
    const videos=videosSnapValue?videosSnapValue.docs.map(d=>{const x=d.data();return{id:d.id,kind:"video",ownerUid:x.ownerUid||"",nome:x.nome||"",url:x.videoUrl||"",caption:x.legenda||"",createdAt:x.criadoEm}}).filter(x=>x.url&&x.ownerUid):[];
    media=[...posts,...videos].sort((a,b)=>ms(b.createdAt)-ms(a.createdAt));
    render();syncLoadMore();
  }catch(error){
    console.error("Explorar:",error);
    $("exploreProfiles").innerHTML='<div class="explore-empty">Não foi possível carregar os atletas.</div>';
    $("exploreGrid").innerHTML='<div class="explore-empty">Não foi possível carregar as publicações agora.</div>';
  }
}

$("exploreQuery")?.addEventListener("input",event=>{queryText=norm(event.target.value);render()});
$("exploreType")?.addEventListener("change",event=>{type=event.target.value;render()});
load();