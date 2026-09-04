import "./site-v5.js?v=20260904-2";
import { getApp,getApps,initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth,onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { collection,doc,getDoc,getDocs,getFirestore,limit,query,where } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};
const app=getApps().length?getApp():initializeApp(cfg),auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id),esc=v=>{const d=document.createElement("div");d.textContent=v==null?"":String(v);return d.innerHTML};
const norm=v=>String(v||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/^#+/,"").replace(/[^a-z0-9_-]/g,"").slice(0,60);
const ms=v=>v?.toMillis?.()??(v?.seconds?Number(v.seconds)*1000:new Date(v||0).getTime()||0);
const fallback="data:image/svg+xml;charset=UTF-8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="#18221d"/><text x="80" y="100" text-anchor="middle" font-size="58">🏐</text></svg>');
let user=auth.currentUser,results=[],profileCache=new Map(),following=new Set(),blocked=new Set(),privacy=new Map();

function tagsOf(item){const stored=Array.isArray(item.hashtags)?item.hashtags.map(norm).filter(Boolean):[];const parsed=(String(item.legenda||item.texto||"").match(/#[\p{L}\p{N}_-]+/gu)||[]).map(norm).filter(Boolean);return[...new Set([...stored,...parsed])]}
async function profileOf(uid){if(profileCache.has(uid))return profileCache.get(uid);try{const s=await getDoc(doc(db,"perfis",uid)),p=s.exists()?{uid,...s.data()}:{uid,nome:"Atleta",fotoUrl:fallback};p.fotoUrl=p.fotoUrl||fallback;profileCache.set(uid,p);return p}catch{return{uid,nome:"Atleta",fotoUrl:fallback}}}
async function loadViewerState(){following=new Set();blocked=new Set();if(!user)return;try{const s=await getDocs(collection(db,"seguindo",user.uid,"usuarios"));following=new Set(s.docs.map(d=>d.id))}catch{}try{const s=await getDocs(collection(db,"bloqueios",user.uid,"usuarios"));blocked=new Set(s.docs.map(d=>d.id))}catch{}}
async function privateOf(uid){if(privacy.has(uid))return privacy.get(uid);try{const s=await getDoc(doc(db,"config_perfis",uid)),v=s.exists()&&s.data().privado===true;privacy.set(uid,v);return v}catch{return false}}
async function visible(item){if(!item.ownerUid)return true;if(user?.uid===item.ownerUid)return true;if(blocked.has(item.ownerUid))return false;const isPrivate=await privateOf(item.ownerUid);return !isPrivate||following.has(item.ownerUid)}
function coverOf(item){if(item.kind==="video")return item.videoUrl||"";if(Array.isArray(item.midias)&&item.midias.length)return item.midias[0]?.url||item.imagemUrl||item.imagem||"";return item.imagemUrl||item.imagem||""}
function typeOf(item){if(item.kind==="video")return"video";if(Array.isArray(item.midias)&&item.midias.length>1)return"carousel";return"image"}

async function searchTag(tag){
 const grid=$("tagGrid"),status=$("tagStatus"),count=$("tagCount");grid.innerHTML='<div class="tag-empty">Buscando na rede...</div>';status.textContent=`Buscando #${tag}...`;count.textContent="";
 try{
  const [p,v]=await Promise.all([
   getDocs(query(collection(db,"publicacoes"),where("aprovado","==",true),where("visibilidade","==","publico"),limit(150))),
   getDocs(query(collection(db,"videos"),where("aprovado","==",true),where("visibilidade","==","publico"),limit(100)))
  ]);
  const candidates=[...p.docs.map(d=>({id:d.id,kind:"post",...d.data()})),...v.docs.map(d=>({id:d.id,kind:"video",...d.data()}))].filter(x=>x.status!=="removido"&&tagsOf(x).includes(tag)).sort((a,b)=>ms(b.criadoEm)-ms(a.criadoEm));
  const filtered=[];for(const item of candidates)if(await visible(item))filtered.push(item);results=filtered;
  $("tagTitle").textContent=`#${tag.toUpperCase()}`;status.textContent=filtered.length?`Conteúdos publicados com #${tag}`:`Nenhuma publicação encontrada com #${tag}.`;count.textContent=`${filtered.length} resultado${filtered.length===1?"":"s"}`;
  if(!filtered.length){grid.innerHTML='<div class="tag-empty">Essa hashtag ainda está quieta. Quando alguém usar a tag em uma legenda, o conteúdo aparece aqui.</div>';return}
  grid.innerHTML=filtered.map((x,i)=>{const url=coverOf(x),type=typeOf(x),badge=type==="video"?"▶":type==="carousel"?`▦ ${x.midias.length}`:"";return `<article class="tag-item" data-index="${i}">${type==="video"?`<video src="${esc(url)}" muted playsinline preload="metadata"></video>`:`<img src="${esc(url)}" alt="Conteúdo #${esc(tag)}" loading="lazy" decoding="async">`}${badge?`<span class="tag-badge">${esc(badge)}</span>`:""}<span class="tag-caption">${esc(x.legenda||x.texto||"")}</span></article>`}).join("");grid.querySelectorAll("[data-index]").forEach(el=>el.onclick=()=>openItem(Number(el.dataset.index)))
 }catch(e){console.error(e);grid.innerHTML='<div class="tag-empty">Não foi possível carregar essa hashtag agora.</div>';status.textContent="Busca indisponível."}
}

function carouselHtml(midias){return `<div style="position:relative;width:100%;overflow:hidden" data-tag-carousel data-index="0"><div style="display:flex;transition:.25s" data-track>${midias.map(m=>`<div style="flex:0 0 100%;min-height:420px;display:grid;place-items:center;background:#000">${String(m.tipo||"").startsWith("video")?`<video src="${esc(m.url||"")}" controls playsinline style="max-width:100%;max-height:82vh"></video>`:`<img src="${esc(m.url||"")}" alt="" style="max-width:100%;max-height:82vh;object-fit:contain">`}</div>`).join("")}</div><button type="button" data-prev style="position:absolute;left:10px;top:50%;width:38px;height:38px;border:0;border-radius:50%;background:#0009;color:#fff;font-size:22px">‹</button><button type="button" data-next style="position:absolute;right:10px;top:50%;width:38px;height:38px;border:0;border-radius:50%;background:#0009;color:#fff;font-size:22px">›</button><span data-count style="position:absolute;right:10px;top:10px;padding:5px 8px;border-radius:20px;background:#0009;color:#fff;font-size:9px">1/${midias.length}</span></div>`}
function bindCarousel(box,midias){const sync=()=>{const i=Math.max(0,Math.min(Number(box.dataset.index||0),midias.length-1));box.dataset.index=String(i);box.querySelector("[data-track]").style.transform=`translateX(${-100*i}%)`;box.querySelector("[data-count]").textContent=`${i+1}/${midias.length}`;box.querySelector("[data-prev]").disabled=i===0;box.querySelector("[data-next]").disabled=i===midias.length-1};box.querySelector("[data-prev]").onclick=()=>{box.dataset.index=String(Number(box.dataset.index)-1);sync()};box.querySelector("[data-next]").onclick=()=>{box.dataset.index=String(Number(box.dataset.index)+1);sync()};sync()}
async function openItem(index){const item=results[index],modal=$("tagModal"),media=modal.querySelector(".tag-media"),side=modal.querySelector(".tag-side"),author=await profileOf(item.ownerUid);if(Array.isArray(item.midias)&&item.midias.length>1){media.innerHTML=carouselHtml(item.midias);bindCarousel(media.querySelector("[data-tag-carousel]"),item.midias)}else if(item.kind==="video")media.innerHTML=`<video src="${esc(item.videoUrl||"")}" controls autoplay playsinline></video>`;else media.innerHTML=`<img src="${esc(item.imagemUrl||item.imagem||"")}" alt="Publicação">`;const a=side.querySelector(".tag-author");a.href=`perfil-social.html?uid=${encodeURIComponent(item.ownerUid||"")}`;a.querySelector("img").src=author.fotoUrl||fallback;a.querySelector("strong").textContent=author.nome||item.nome||"Atleta";side.querySelector("p").textContent=item.legenda||item.texto||"";modal.classList.add("open");modal.setAttribute("aria-hidden","false")}

function closeModal(){const m=$("tagModal");m.classList.remove("open");m.setAttribute("aria-hidden","true");m.querySelectorAll("video").forEach(v=>v.pause())}
$("tagModal").querySelector(".tag-close").onclick=closeModal;$("tagModal").onclick=e=>{if(e.target.id==="tagModal")closeModal()};
$("tagForm").onsubmit=e=>{e.preventDefault();const tag=norm($("tagInput").value);if(!tag)return;const url=new URL(location.href);url.searchParams.set("tag",tag);history.pushState({},"",url);searchTag(tag)};
window.addEventListener("popstate",()=>{const tag=norm(new URLSearchParams(location.search).get("tag"));if(tag){$("tagInput").value=tag;searchTag(tag)}});
onAuthStateChanged(auth,async u=>{user=u;await loadViewerState();const tag=norm(new URLSearchParams(location.search).get("tag"));if(tag){$("tagInput").value=tag;await searchTag(tag)}});
if(!new URLSearchParams(location.search).get("tag"))loadViewerState();
