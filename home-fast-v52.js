import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { collection, doc, getDoc, getDocs, getFirestore, limit, orderBy, query, where } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};
const app=getApps().length?getApp():initializeApp(cfg),db=getFirestore(app);
const $=id=>document.getElementById(id);
const esc=value=>{const el=document.createElement("div");el.textContent=value==null?"":String(value);return el.innerHTML};
const millis=v=>v?.toMillis?.()??(v?.seconds?Number(v.seconds)*1000:new Date(v||0).getTime()||0);
const fmt=v=>{const n=millis(v);return n?new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(n)):""};
const fallback="data:image/svg+xml;charset=UTF-8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="#dfe9ef"/><text x="80" y="100" text-anchor="middle" font-size="58">🏐</text></svg>');
const timeout=(promise,ms,label)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(label||"timeout")),ms))]);
const waiting=el=>!!el&&!el.querySelector(".social-post,.story-item")&&/carregando|preparando/i.test(el.textContent||"");

function installStyles(){
 if($("homeFastV52Styles"))return;
 const s=document.createElement("style");s.id="homeFastV52Styles";s.textContent=`
 .v52-feed-card{overflow:hidden;border:1px solid #dce5eb;border-radius:18px;background:#fff;margin-bottom:16px}.v52-head{display:flex;align-items:center;gap:10px;padding:12px 14px}.v52-head img{width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid #b9deea}.v52-head a{color:#142b3b;text-decoration:none;font:900 12px Arial}.v52-head small{display:block;margin-top:3px;color:#718391;font-size:9px}.v52-date{margin-left:auto;color:#718391;font-size:9px}.v52-media{display:grid;place-items:center;width:100%;max-height:760px;overflow:hidden;background:#e9eff3}.v52-media img,.v52-media video{display:block;width:100%;height:auto;max-height:760px;object-fit:contain;background:#e9eff3}.v52-body{padding:11px 14px 14px;color:#294456;font-size:12px;line-height:1.5}.v52-body p{margin:0;white-space:pre-wrap}.v52-rescue{padding:20px;border:1px solid #d7e4ea;border-radius:15px;background:#f7fbfd;color:#4f6878;text-align:center}.v52-rescue strong{display:block;color:#193d52;margin-bottom:5px}.v52-rescue button{margin-top:12px;min-height:40px;padding:0 15px;border:0;border-radius:999px;background:#0898c2;color:#fff;font-weight:900;cursor:pointer}.v52-story{flex:0 0 72px;text-align:center;cursor:pointer}.v52-story-ring{width:64px;height:64px;margin:auto;padding:3px;border-radius:50%;background:linear-gradient(135deg,#05a2cc,#f3c84b)}.v52-story-ring img{width:100%;height:100%;box-sizing:border-box;border:3px solid #f3f8fa;border-radius:50%;object-fit:cover}.v52-story span{display:block;margin-top:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#20384a;font:800 9px Arial}
 `;document.head.appendChild(s);
}

async function ensureAppCheck(){
 try{await timeout(import("./firebase-app-check-v11.js?v=20260915-52"),3500,"app-check-import-timeout")}catch(error){console.warn("Home V52 App Check:",error)}
 try{if(globalThis.__BD_APP_CHECK_PROMISE__)await timeout(globalThis.__BD_APP_CHECK_PROMISE__,4500,"app-check-token-timeout")}catch(error){console.warn("Home V52 token:",error)}
}

async function fetchPublic(name,max){
 const base=[where("aprovado","==",true),where("visibilidade","==","publico")];
 try{
  const snap=await timeout(getDocs(query(collection(db,name),...base,orderBy("criadoEm","desc"),limit(max))),8000,`${name}-timeout`);
  return snap.docs.map(d=>({id:d.id,...d.data()}));
 }catch(error){
  console.warn(`Home V52 ${name} ordenado:`,error);
  const snap=await timeout(getDocs(query(collection(db,name),...base,limit(max))),8000,`${name}-fallback-timeout`);
  return snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>millis(b.criadoEm)-millis(a.criadoEm));
 }
}

const profileCache=new Map();
async function profile(uid,fallbackName="Atleta"){
 if(!uid)return{nome:fallbackName,fotoUrl:fallback};
 if(profileCache.has(uid))return profileCache.get(uid);
 try{const snap=await timeout(getDoc(doc(db,"perfis",uid)),3500,"profile-timeout");const p=snap.exists()?snap.data():{};const out={nome:p.nome||fallbackName||"Atleta",fotoUrl:p.fotoUrl||fallback};profileCache.set(uid,out);return out}catch{return{nome:fallbackName||"Atleta",fotoUrl:fallback}}
}

function mediaHtml(item){
 const video=item.videoUrl||((item.mediaType||item.tipo)==="video"?item.mediaUrl:"");
 if(video)return `<div class="v52-media"><video src="${esc(video)}" controls playsinline preload="metadata"></video></div>`;
 const image=item.imagemUrl||item.imagem||item.mediaUrl||"";
 return image?`<div class="v52-media"><img src="${esc(image)}" alt="Publicação" loading="lazy" decoding="async"></div>`:"";
}

async function renderFeedFast(){
 const box=$("homeFeed");if(!box||!waiting(box))return;
 box.innerHTML='<div class="v52-rescue"><strong>Carregando a rede esportiva...</strong><span>Buscando as publicações sem bloquear a página.</span></div>';
 try{
  const [photos,videos]=await Promise.all([fetchPublic("publicacoes",12),fetchPublic("videos",6)]);
  const items=[...photos.map(x=>({...x,_kind:"image"})),...videos.map(x=>({...x,_kind:"video"}))].sort((a,b)=>millis(b.criadoEm)-millis(a.criadoEm));
  if(!items.length){box.innerHTML='<div class="v52-rescue"><strong>Nenhuma publicação disponível agora.</strong></div>';return}
  box.innerHTML=items.map(item=>`<article class="v52-feed-card" data-v52-owner="${esc(item.ownerUid||"")}" data-v52-post-name="${esc(item.nomePublicacao||"")}"><div class="v52-head"><img data-v52-avatar src="${fallback}" alt=""><div><a href="perfil-social.html?uid=${encodeURIComponent(item.ownerUid||"")}" data-v52-name>${esc(item.nomePublicacao||item.nome||"Atleta")}</a><small>Rede esportiva</small></div><span class="v52-date">${esc(fmt(item.criadoEm))}</span></div>${mediaHtml(item)}${(item.texto||item.legenda)?`<div class="v52-body"><p>${esc(item.texto||item.legenda)}</p></div>`:""}</article>`).join("");
  for(const card of box.querySelectorAll("[data-v52-owner]")){
   const uid=card.dataset.v52Owner;if(!uid)continue;
   void profile(uid,card.querySelector("[data-v52-name]")?.textContent||"Atleta").then(p=>{const img=card.querySelector("[data-v52-avatar]"),name=card.querySelector("[data-v52-name]");if(img)img.src=p.fotoUrl;if(name&&!card.dataset.v52PostName)name.textContent=p.nome});
  }
 }catch(error){
  console.error("Home V52 feed:",error);
  box.innerHTML='<div class="v52-rescue"><strong>Não foi possível carregar o feed.</strong><span>A conexão com a rede esportiva demorou além do esperado.</span><button type="button" data-v52-retry> TENTAR NOVAMENTE </button></div>';
  box.querySelector("[data-v52-retry]")?.addEventListener("click",()=>{box.innerHTML='<div class="social-loading">Carregando publicações...</div>';void run(true)});
 }
}

async function renderStoriesFast(){
 const box=$("homeStories");if(!box||!waiting(box))return;
 try{
  const stories=(await fetchPublic("stories",24)).filter(s=>!millis(s.expiraEm)||millis(s.expiraEm)>Date.now());
  if(!stories.length){box.innerHTML='<div class="sn-empty">Nenhum story ativo agora.</div>';return}
  const groups=new Map();for(const s of stories){if(!groups.has(s.ownerUid))groups.set(s.ownerUid,[]);groups.get(s.ownerUid).push(s)}
  const rows=[];for(const [uid,list] of groups){const p=await profile(uid,list[0]?.nome||"Atleta");rows.push({uid,list,p})}
  box.innerHTML=rows.map((g,i)=>`<article class="v52-story" data-v52-story="${i}"><div class="v52-story-ring"><img src="${esc(g.p.fotoUrl||fallback)}" alt=""></div><span>${esc((g.p.nome||"Atleta").split(" ")[0])}</span></article>`).join("");
  box.querySelectorAll("[data-v52-story]").forEach(el=>el.addEventListener("click",async()=>{try{const mod=await import("./social-network.js?v=20260915-52");mod.openStoryViewer?.(rows[Number(el.dataset.v52Story)].list,0)}catch(error){console.warn("Story V52:",error)}}));
 }catch(error){console.warn("Home V52 stories:",error);box.innerHTML='<div class="sn-empty">Stories indisponíveis no momento.</div>'}
}

async function run(force=false){
 const feed=$("homeFeed"),stories=$("homeStories");
 if(!force&&!waiting(feed)&&!waiting(stories))return;
 installStyles();
 await ensureAppCheck();
 await Promise.allSettled([renderFeedFast(),renderStoriesFast()]);
}

setTimeout(()=>void run(false),1800);
window.addEventListener("bd:home-retry",()=>void run(true));
