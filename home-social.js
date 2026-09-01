import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  addDoc, collection, deleteDoc, doc, getCountFromServer, getDoc, getDocs,
  getFirestore, limit, orderBy, query, setDoc, Timestamp, where
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { createNotification, renderStoriesBar, initSocialNetwork } from "./social-network.js?v=20260831-1";

const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};
const app=getApps().length?getApp():initializeApp(cfg),auth=getAuth(app),db=getFirestore(app);
let user=null,profileComplete=false,posts=[],videos=[],liked=new Set(),saved=new Set(),following=new Set(),loaded=false;
const profileCache=new Map();
const $=id=>document.getElementById(id);
const esc=v=>{const d=document.createElement("div");d.textContent=v??"";return d.innerHTML};
const ms=v=>v?.toMillis?.()??(v?.seconds?Number(v.seconds)*1000:new Date(v||0).getTime()||0);
const date=v=>ms(v)?new Date(ms(v)).toLocaleString("pt-BR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):"";
const fallback="data:image/svg+xml;charset=UTF-8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="#18221d"/><text x="80" y="100" text-anchor="middle" font-size="58">🏐</text></svg>');

function installFeedStyles(){
 if(document.getElementById("instagramFeedStyles"))return;
 const s=document.createElement("style");s.id="instagramFeedStyles";s.textContent=`
 .home-social{max-width:780px!important;margin:0 auto 32px!important}.home-social-grid{display:block!important}.home-feed-column{width:100%!important}.social-stories-wrap{border:1px solid rgba(217,169,63,.18);border-radius:16px;padding:12px 12px 8px;background:#0a0f0c;margin-bottom:16px}.social-stories{display:flex!important;gap:14px!important;overflow-x:auto!important;scrollbar-width:none!important}.social-stories::-webkit-scrollbar{display:none}.story-item{flex:0 0 72px;text-align:center;color:#ddd;font:800 9px Arial;cursor:pointer}.story-item span{display:block;margin-top:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.home-feed{display:grid;gap:18px}.social-post{overflow:hidden;border:1px solid rgba(217,169,63,.2);border-radius:16px;background:#090e0b;box-shadow:0 12px 36px rgba(0,0,0,.22)}.social-post-head{display:flex;align-items:center;gap:10px;padding:12px 14px}.feed-avatar{width:38px;height:38px;border-radius:50%;object-fit:cover;border:1px solid rgba(242,204,114,.45)}.social-author{color:#f5f0e4!important;text-decoration:none!important;font:900 12px Arial}.feed-author-copy{flex:1;min-width:0}.feed-author-copy small{display:block;color:#777f78;font-size:9px;margin-top:3px}.social-date{color:#777f78;font-size:9px}.social-media-frame{position:relative;width:100%;background:#020302;display:flex;align-items:center;justify-content:center;max-height:760px;overflow:hidden}.social-media-frame img,.social-media-frame video{display:block;width:100%;height:auto;max-height:760px;object-fit:contain;background:#000}.social-feed-video{min-height:260px}.feed-kind{position:absolute;right:10px;top:10px;padding:5px 8px;border-radius:30px;background:rgba(0,0,0,.55);color:#fff;font-size:10px}.social-post-body{padding:10px 14px 13px}.social-actions{display:flex;align-items:center;gap:8px}.social-actions button{border:0;background:transparent;color:#eee;font-size:20px;cursor:pointer;padding:5px}.social-actions button b{font-size:11px}.social-actions .home-save{margin-left:auto}.social-actions .active{color:#f0c45d}.social-likes{margin:4px 0 6px;font-size:11px}.social-text{font-size:12px;line-height:1.45;margin:3px 0 7px;color:#e5e3dc;white-space:pre-wrap}.view-comments{border:0;background:transparent;color:#858e87;padding:0;cursor:pointer;font-size:10px}.social-comments-modal{position:fixed;inset:0;z-index:23000;background:rgba(0,0,0,.78);display:none;place-items:center;padding:15px}.social-comments-modal.open{display:grid}.social-comments-box{width:min(520px,100%);max-height:80vh;display:flex;flex-direction:column;background:#0a0f0c;border:1px solid rgba(217,169,63,.25);border-radius:16px;overflow:hidden}.comments-head{display:flex;align-items:center;justify-content:space-between;padding:13px 15px;border-bottom:1px solid rgba(217,169,63,.15)}.comments-head h3{margin:0;color:#f2cc72}.social-comments-close{border:0;background:transparent;color:#f2cc72;font-size:24px}.social-comments-list{overflow:auto;flex:1;padding:10px}.social-comment{display:flex;gap:8px;padding:9px}.social-comment img{width:31px;height:31px;border-radius:50%;object-fit:cover}.social-comment div{min-width:0}.social-comment strong{display:block;font-size:10px}.social-comment span{font-size:11px;color:#ddd}.social-comment-form{display:flex;gap:7px;padding:10px;border-top:1px solid rgba(217,169,63,.15)}.social-comment-form input{flex:1;min-width:0;border:1px solid rgba(217,169,63,.25);border-radius:20px;background:#111713;color:#fff;padding:10px 13px}.social-comment-form button{border:0;border-radius:20px;background:#e7ba55;color:#111;padding:0 15px;font-weight:900}.social-login-gate{padding:28px;text-align:center;border:1px solid rgba(217,169,63,.18);border-radius:15px;background:#0a0f0c}.social-login-gate strong,.social-login-gate span{display:block}.social-login-gate span{margin-top:5px;color:#89918b;font-size:11px}.social-login-gate a{display:inline-block;margin-top:11px;color:#f2cc72}.feed-heart-pop{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;font-size:80px;opacity:0;transform:scale(.5);transition:.25s}.feed-heart-pop.show{opacity:.9;transform:scale(1)}
 @media(max-width:700px){.home-social{max-width:none!important;margin-left:-8px!important;margin-right:-8px!important}.social-post{border-radius:0}.social-media-frame img,.social-media-frame video{max-height:70vh}}
 `;document.head.appendChild(s);
}

async function profileOf(uid){
 if(!uid)return{nome:"Atleta",fotoUrl:fallback};if(profileCache.has(uid))return profileCache.get(uid);
 try{const s=await getDoc(doc(db,"perfis",uid));const p=s.exists()?{uid,...s.data()}:{uid,nome:"Atleta"};p.fotoUrl=p.fotoUrl||fallback;profileCache.set(uid,p);return p}catch{return{uid,nome:"Atleta",fotoUrl:fallback}}
}

function gate(){if(user)return true;location.href=`conta.html?tab=login&return=${encodeURIComponent(location.pathname+location.search+location.hash)}`;return false}
function action(){if(!gate())return false;if(!profileComplete){location.href="meu-perfil.html?novo=1";return false}return true}

async function countLikes(id){try{return(await getCountFromServer(collection(db,"curtidas_publicacoes",id,"usuarios"))).data().count||0}catch{return 0}}
async function countComments(id){try{return(await getCountFromServer(query(collection(db,"comentarios_publicacoes"),where("publicacaoId","==",id),where("aprovado","==",true)))).data().count||0}catch{return 0}}

async function loadFollowing(){following=new Set();if(!user)return;try{const s=await getDocs(collection(db,"seguindo",user.uid,"usuarios"));following=new Set(s.docs.map(d=>d.id))}catch{}}
async function loadPersonalState(){liked=new Set();saved=new Set();if(!user)return;const all=[...posts,...videos];await Promise.all(all.map(async p=>{try{if((await getDoc(doc(db,"curtidas_publicacoes",p.id,"usuarios",user.uid))).exists())liked.add(p.id)}catch{}try{if((await getDoc(doc(db,"salvos",user.uid,"publicacoes",p.id))).exists())saved.add(p.id)}catch{}}))}

function mediaOf(p){return p._kind==="video"?(p.videoUrl||p.mediaUrl||""):(p.imagemUrl||p.imagem||"")}
function postMedia(p){const url=mediaOf(p);if(!url)return"";if(p._kind==="video")return `<div class="social-media-frame" data-double-like><video class="social-feed-video" src="${esc(url)}" controls playsinline preload="metadata"></video><span class="feed-kind">▶ vídeo</span><span class="feed-heart-pop">❤</span></div>`;return `<div class="social-media-frame" data-double-like><img src="${esc(url)}" alt="Publicação de ${esc(p.nome||"atleta")}" loading="lazy" decoding="async"><span class="feed-heart-pop">❤</span></div>`}

async function renderFeed(){
 const box=$("homeFeed");if(!box)return;
 const all=[...posts.map(x=>({...x,_kind:"image"})),...videos.map(x=>({...x,_kind:"video"}))].sort((a,b)=>{
   const fa=following.has(a.ownerUid)?1:0,fb=following.has(b.ownerUid)?1:0;
   return fb-fa || ms(b.criadoEm)-ms(a.criadoEm);
 });
 if(!all.length){box.innerHTML='<div class="social-login-gate"><strong>O feed está começando</strong><span>Publique o primeiro momento da rede esportiva.</span></div>';return}
 const html=[];
 for(const p of all){
  const [lc,cc,author]=await Promise.all([countLikes(p.id),countComments(p.id),profileOf(p.ownerUid)]);
  html.push(`<article class="social-post" id="post-${esc(p.id)}" data-post-id="${esc(p.id)}" data-owner="${esc(p.ownerUid||"")}"><div class="social-post-head"><a href="perfil-social.html?uid=${encodeURIComponent(p.ownerUid||"")}"><img class="feed-avatar" src="${esc(author.fotoUrl||fallback)}" alt=""></a><div class="feed-author-copy"><a class="social-author" href="perfil-social.html?uid=${encodeURIComponent(p.ownerUid||"")}">${esc(author.nome||p.nome||"Atleta")}</a><small>${following.has(p.ownerUid)?"Seguindo":"Rede esportiva"}</small></div><span class="social-date">${esc(date(p.criadoEm))}</span></div>${postMedia(p)}<div class="social-post-body"><div class="social-actions"><button class="home-like ${liked.has(p.id)?"active":""}" type="button" aria-label="Curtir">${liked.has(p.id)?"❤":"♡"} <b>${lc}</b></button><button class="home-comment" type="button" aria-label="Comentar">💬 <b>${cc}</b></button><button class="home-share" type="button" aria-label="Compartilhar">↗</button><button class="home-save ${saved.has(p.id)?"active":""}" type="button" aria-label="Salvar">${saved.has(p.id)?"🔖":"♧"}</button></div><p class="social-likes">${lc?`<strong>${lc} curtida${lc===1?"":"s"}</strong>`:""}</p><p class="social-text">${esc(p.texto||p.legenda||"")}</p><button class="view-comments" type="button">${cc?`Ver todos os ${cc} comentários`:"Adicionar comentário"}</button></div></article>`);
 }
 box.innerHTML=html.join("");setupVideoAutoplay();
}

function setupVideoAutoplay(){
 const obs=new IntersectionObserver(entries=>entries.forEach(e=>{const v=e.target;if(e.isIntersecting&&e.intersectionRatio>.65){v.muted=true;v.play().catch(()=>{})}else v.pause()}),{threshold:[0,.65,1]});
 document.querySelectorAll(".social-feed-video").forEach(v=>obs.observe(v));
}

async function openComments(id){
 if(!action())return;let modal=$("socialCommentsModal");if(!modal){modal=document.createElement("div");modal.id="socialCommentsModal";modal.className="social-comments-modal";modal.innerHTML='<div class="social-comments-box"><div class="comments-head"><h3>Comentários</h3><button class="social-comments-close">×</button></div><div class="social-comments-list"></div><form class="social-comment-form"><input maxlength="500" placeholder="Adicione um comentário..." required><button>Publicar</button></form></div>';document.body.appendChild(modal);modal.querySelector(".social-comments-close").onclick=()=>modal.classList.remove("open");modal.onclick=e=>{if(e.target===modal)modal.classList.remove("open")}}
 modal.classList.add("open");const list=modal.querySelector(".social-comments-list");list.innerHTML='<div class="social-login-gate">Carregando comentários...</div>';
 try{let snap;try{snap=await getDocs(query(collection(db,"comentarios_publicacoes"),where("publicacaoId","==",id),where("aprovado","==",true),orderBy("criadoEm","asc"),limit(150)))}catch{snap=await getDocs(query(collection(db,"comentarios_publicacoes"),where("publicacaoId","==",id),where("aprovado","==",true),limit(150)))}const rows=[];for(const d of snap.docs){const x=d.data(),p=await profileOf(x.ownerUid);rows.push(`<div class="social-comment"><img src="${esc(p.fotoUrl||fallback)}" alt=""><div><strong>${esc(p.nome||x.nome||"Atleta")}</strong><span>${esc(x.texto||"")}</span></div></div>`)}list.innerHTML=rows.join("")||'<div class="social-login-gate">Ainda não há comentários.</div>'}catch{list.innerHTML='<div class="social-login-gate">Comentários indisponíveis.</div>'}
 const form=modal.querySelector("form");form.onsubmit=async e=>{e.preventDefault();const input=form.querySelector("input"),texto=input.value.trim();if(texto.length<1)return;const p=posts.find(x=>x.id===id)||videos.find(x=>x.id===id);const me=await profileOf(user.uid),btn=form.querySelector("button");btn.disabled=true;try{await addDoc(collection(db,"comentarios_publicacoes"),{ownerUid:user.uid,ownerEmail:user.email||"",publicacaoId:id,nome:me.nome||user.displayName||"Atleta",texto,parentCommentId:"",aprovado:true,status:"publicado",criadoEm:Timestamp.now()});input.value="";list.insertAdjacentHTML("beforeend",`<div class="social-comment"><img src="${esc(me.fotoUrl||fallback)}"><div><strong>${esc(me.nome||"Atleta")}</strong><span>${esc(texto)}</span></div></div>`);if(p?.ownerUid)await createNotification(p.ownerUid,"comment",{sourceId:id,text:texto.slice(0,120)});await renderFeed()}catch(err){console.error(err);alert("Não foi possível publicar o comentário.")}finally{btn.disabled=false}};
}

async function likePost(id,card,forceLike=false){if(!action())return;const ref=doc(db,"curtidas_publicacoes",id,"usuarios",user.uid),post=posts.find(x=>x.id===id)||videos.find(x=>x.id===id);try{if(liked.has(id)&&!forceLike){await deleteDoc(ref);liked.delete(id)}else if(!liked.has(id)){await setDoc(ref,{uid:user.uid,criadoEm:Timestamp.now()});liked.add(id);if(post?.ownerUid)await createNotification(post.ownerUid,"like",{sourceId:id})}if(card){const pop=card.querySelector(".feed-heart-pop");if(forceLike&&pop){pop.classList.add("show");setTimeout(()=>pop.classList.remove("show"),500)}}await renderFeed()}catch(e){console.error(e);alert("Não foi possível registrar a curtida.")}}

async function toggleSave(id){if(!action())return;const ref=doc(db,"salvos",user.uid,"publicacoes",id);try{if(saved.has(id)){await deleteDoc(ref);saved.delete(id)}else{const p=posts.find(x=>x.id===id)||videos.find(x=>x.id===id);await setDoc(ref,{postId:id,kind:p?._kind||"post",createdAt:Timestamp.now()});saved.add(id)}await renderFeed()}catch(e){console.error(e);alert("Não foi possível salvar a publicação.")}}
async function sharePost(id){const p=posts.find(x=>x.id===id)||videos.find(x=>x.id===id),url=`${location.origin}${location.pathname}#post-${encodeURIComponent(id)}`;if(navigator.share){try{await navigator.share({title:"Banco de Atletas",text:p?.texto||p?.legenda||"Publicação",url})}catch{}}else if(navigator.clipboard){await navigator.clipboard.writeText(url);alert("Link copiado.")}}

async function load(){
 try{let s;try{s=await getDocs(query(collection(db,"publicacoes"),where("aprovado","==",true),orderBy("criadoEm","desc"),limit(40)))}catch{s=await getDocs(query(collection(db,"publicacoes"),where("aprovado","==",true),limit(40)))}posts=s.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.status!=="removido")}catch(e){console.error("Feed fotos:",e);posts=[]}
 try{let s;try{s=await getDocs(query(collection(db,"videos"),where("aprovado","==",true),orderBy("criadoEm","desc"),limit(30)))}catch{s=await getDocs(query(collection(db,"videos"),where("aprovado","==",true),limit(30)))}videos=s.docs.map(d=>({id:d.id,...d.data(),_kind:"video"})).filter(x=>x.status!=="removido")}catch(e){console.error("Feed vídeos:",e);videos=[]}
 await loadFollowing();await loadPersonalState();await renderFeed();if($("homeStories"))await renderStoriesBar($("homeStories"));loaded=true;
 const h=location.hash.match(/^#post-(.+)$/);if(h)requestAnimationFrame(()=>document.getElementById(`post-${decodeURIComponent(h[1])}`)?.scrollIntoView({block:"center"}));
}

function bindFeed(){const box=$("homeFeed");if(!box)return;box.addEventListener("click",async e=>{const card=e.target.closest("[data-post-id]");if(!card)return;const id=card.dataset.postId,b=e.target.closest("button");if(b?.classList.contains("home-share")){await sharePost(id);return}if(b?.classList.contains("home-save")){await toggleSave(id);return}if(b?.classList.contains("home-like")){await likePost(id,card);return}if(b?.classList.contains("home-comment")||b?.classList.contains("view-comments")){await openComments(id);return}});box.addEventListener("dblclick",e=>{const card=e.target.closest("[data-post-id]"),media=e.target.closest("[data-double-like]");if(card&&media)likePost(card.dataset.postId,card,true)})}

installFeedStyles();initSocialNetwork();bindFeed();
$("menuRanking")?.addEventListener("click",()=>{$("siteMenuDrawer")?.classList.remove("open");window.abrirRanking?window.abrirRanking():$("btnAbrirRanking")?.click()});
$("menuEquipes")?.addEventListener("click",e=>{e.preventDefault();window.abrirEquipes?window.abrirEquipes():$("btnAbrirEquipes")?.click();$("siteMenuDrawer")?.classList.remove("open")});
onAuthStateChanged(auth,async u=>{user=u;profileComplete=false;if(u){try{const p=await getDoc(doc(db,"perfis",u.uid));profileComplete=p.exists()&&!!p.data()?.nome&&!!p.data()?.cidade&&!!p.data()?.uf}catch{}}if(!loaded)await load();else{await loadFollowing();await loadPersonalState();await renderFeed();if($("homeStories"))await renderStoriesBar($("homeStories"))}});
