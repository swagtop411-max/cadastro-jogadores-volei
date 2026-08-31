import{getApp,getApps,initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getAuth,onAuthStateChanged}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import{
  addDoc,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  setDoc,
  Timestamp,
  where
}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const cfg={
  apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",
  authDomain:"jogadores-de-volei.firebaseapp.com",
  projectId:"jogadores-de-volei",
  storageBucket:"jogadores-de-volei.firebasestorage.app",
  messagingSenderId:"48728914064",
  appId:"1:48728914064:web:1dd7aeb705319886f74015"
};
const app=getApps().length?getApp():initializeApp(cfg),auth=getAuth(app),db=getFirestore(app);
let user=null,profileComplete=false,posts=[],videoPosts=[],liked=new Set(),loaded=false;

const $=id=>document.getElementById(id);
const esc=v=>{const d=document.createElement("div");d.textContent=v??"";return d.innerHTML};
const txt=v=>v==null?"":String(v);
const date=v=>{if(!v)return"";if(typeof v.toMillis==="function")return new Date(v.toMillis()).toLocaleDateString("pt-BR");if(v.seconds)return new Date(Number(v.seconds)*1000).toLocaleDateString("pt-BR");const d=new Date(v);return Number.isNaN(d.getTime())?"":d.toLocaleDateString("pt-BR")};
const mediaUrl=v=>{const s=txt(v).trim();if(/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(s))return s;try{const u=new URL(s,location.href);return u.protocol==="https:"?u.href:""}catch{return""}};

function gate(){
  const old=document.querySelector(".home-social-auth-modal");
  if(old)return;
  const m=document.createElement("div");
  m.className="home-social-auth-modal open";
  m.innerHTML='<div class="home-social-auth-box"><h3>FAÇA PARTE DA REDE</h3><p>Para curtir, comentar, publicar, seguir atletas e participar da comunidade, você precisa criar sua conta ou entrar.</p><a href="conta.html?tab=register">CRIAR CONTA</a><a href="conta.html">ENTRAR</a><br><button>Continuar navegando</button></div>';
  m.querySelector("button").onclick=()=>m.remove();
  document.body.appendChild(m);
}

function action(){
  if(!user){gate();return false}
  if(!profileComplete){location.href="meu-perfil.html?novo=1";return false}
  return true;
}

function renderStories(arr){
  const box=$("homeStories");if(!box)return;
  const now=Date.now();
  const active=arr.filter(s=>{
    const exp=s.expiraEm;
    if(!exp)return true;
    const ms=typeof exp.toMillis==="function"?exp.toMillis():(exp.seconds?Number(exp.seconds)*1000:Date.parse(exp));
    return !ms||ms>now;
  });
  if(!active.length){
    box.innerHTML='<div class="social-login-gate"><strong>Ainda não há stories</strong><span>Os próximos momentos da comunidade aparecerão aqui.</span></div>';
    return;
  }
  box.innerHTML=active.map(s=>{
    const source=mediaUrl(s.imagemUrl||s.imagem||s.mediaUrl);if(!source)return"";
    const media=String(s.mediaType||s.tipo||"").startsWith("video")
      ?'<video src="'+esc(source)+'" muted playsinline preload="metadata"></video>'
      :'<img src="'+esc(source)+'" alt="" loading="lazy">';
    return '<article class="story-item"><div class="story-ring">'+media+'</div><span>'+esc(s.nome||s.autorNome||"Atleta")+'</span></article>';
  }).join("");
}

async function countLikes(id){
  try{return (await getCountFromServer(collection(db,"curtidas_publicacoes",id,"usuarios"))).data().count||0}catch{return 0}
}

async function countComments(id){
  try{return (await getCountFromServer(query(collection(db,"comentarios_publicacoes"),where("publicacaoId","==",id),where("aprovado","==",true)))).data().count||0}catch{return 0}
}

async function getLikesForPosts(){
  liked=new Set();
  if(!user)return;
  const all=[...posts,...videoPosts];
  await Promise.all(all.map(async p=>{
    try{const s=await getDoc(doc(db,"curtidas_publicacoes",p.id,"usuarios",user.uid));if(s.exists())liked.add(p.id)}catch{}
  }));
}

function postMedia(p){
  const source=mediaUrl(p.imagemUrl||p.imagem);
  const video=mediaUrl(p.videoUrl||p.mediaUrl);
  if(p._kind==="video"&&video)return '<div class="social-media-frame video-frame"><video class="social-feed-video" src="'+esc(video)+'" controls playsinline preload="metadata"></video></div>';
  if(source)return '<div class="social-media-frame"><img src="'+esc(source)+'" alt="Publicação de '+esc(p.nome||"atleta")+'" loading="lazy"></div>';
  return "";
}

async function renderFeed(){
  const box=$("homeFeed");if(!box)return;
  const all=[...posts.map(p=>({...p,_kind:"image"})),...videoPosts.map(v=>({...v,_kind:"video"}))]
    .sort((a,b)=>(b.criadoEm?.seconds||0)-(a.criadoEm?.seconds||0));
  if(!all.length){
    box.innerHTML='<div class="social-login-gate"><strong>O feed está começando</strong><span>Seja uma das primeiras pessoas a publicar na nova rede.</span><a href="conta.html?tab=register">CRIAR CONTA</a></div>';
    return;
  }
  const cards=await Promise.all(all.map(async p=>{
    const[lc,cc]=await Promise.all([countLikes(p.id),countComments(p.id)]);
    const likedNow=liked.has(p.id);
    const author=p.ownerUid
      ?'<a class="social-author" href="perfil-social.html?uid='+encodeURIComponent(p.ownerUid)+'">'+esc(p.nome||p.autorNome||"Atleta")+'</a>'
      :'<span class="social-author">'+esc(p.nome||p.autorNome||"Atleta")+'</span>';
    return '<article class="social-post" id="post-'+esc(p.id)+'" data-post-id="'+esc(p.id)+'"><div class="social-post-head">'+author+'<span class="social-date">'+esc(date(p.criadoEm))+'</span></div>'+postMedia(p)+'<div class="social-post-body"><div class="social-actions"><button class="home-like" type="button" aria-label="Curtir">'+(likedNow?"❤️":"♡")+' <b>'+lc+'</b></button><button class="home-comment" type="button" aria-label="Comentar">💬 <b>'+cc+'</b></button><button class="home-share" type="button" aria-label="Compartilhar">↗</button></div><p class="social-likes">'+(lc?'<strong>'+lc+' curtida'+(lc===1?"":"s")+'</strong>':'')+'</p><p class="social-text">'+esc(p.texto||p.legenda||"")+'</p><button class="view-comments" type="button">Ver comentários'+(cc?" ("+cc+")":"")+'</button></div></article>';
  }));
  box.innerHTML=cards.join("");
}

async function openComments(id){
  if(!action())return;
  let modal=$("socialCommentsModal");
  if(!modal){
    modal=document.createElement("div");
    modal.id="socialCommentsModal";
    modal.className="social-comments-modal";
    modal.innerHTML='<div class="social-comments-box"><button class="social-comments-close" type="button">×</button><h3>Comentários</h3><div class="social-comments-list"></div><form class="social-comment-form"><input maxlength="500" placeholder="Adicione um comentário..." required><button>Publicar</button></form></div>';
    document.body.appendChild(modal);
    modal.querySelector(".social-comments-close").onclick=()=>modal.classList.remove("open");
    modal.addEventListener("click",e=>{if(e.target===modal)modal.classList.remove("open")});
  }
  modal.classList.add("open");
  const list=modal.querySelector(".social-comments-list");
  list.innerHTML='<div class="comment-loading">Carregando comentários...</div>';
  try{
    let snap;
    try{snap=await getDocs(query(collection(db,"comentarios_publicacoes"),where("publicacaoId","==",id),where("aprovado","==",true),orderBy("criadoEm","asc"),limit(100)))}
    catch{snap=await getDocs(query(collection(db,"comentarios_publicacoes"),where("publicacaoId","==",id),where("aprovado","==",true),limit(100)))}
    list.innerHTML=snap.docs.map(d=>{const x=d.data();return '<div class="social-comment"><strong>'+esc(x.nome||"Atleta")+'</strong><span>'+esc(x.texto||"")+'</span></div>'}).join("")||'<div class="comment-loading">Ainda não há comentários.</div>';
  }catch{
    list.innerHTML='<div class="comment-loading">Os comentários estão indisponíveis no momento.</div>';
  }
  const form=modal.querySelector("form");
  form.onsubmit=async e=>{
    e.preventDefault();
    const input=form.querySelector("input"),texto=input.value.trim();
    if(texto.length<3)return;
    const p=posts.find(x=>x.id===id)||videoPosts.find(x=>x.id===id);if(!p)return;
    const btn=form.querySelector("button");btn.disabled=true;
    try{
      await addDoc(collection(db,"comentarios_publicacoes"),{
        ownerUid:user.uid,
        ownerEmail:user.email||"",
        publicacaoId:id,
        nome:user.displayName||"Atleta",
        texto,
        parentCommentId:"",
        aprovado:false,
        status:"pendente",
        criadoEm:Timestamp.now()
      });
      input.value="";
      list.insertAdjacentHTML("beforeend",'<div class="social-comment pending"><strong>'+esc(user.displayName||"Atleta")+'</strong><span>'+esc(texto)+'</span><small>aguardando aprovação</small></div>');
    }catch(err){console.error(err);alert("Não foi possível enviar o comentário.")}
    finally{btn.disabled=false}
  };
}

async function sharePost(id){
  const p=posts.find(x=>x.id===id)||videoPosts.find(x=>x.id===id);
  const url=location.origin+location.pathname+"#post-"+encodeURIComponent(id);
  if(navigator.share){
    try{await navigator.share({title:"Banco de Atletas",text:p?.texto||p?.legenda||"Publicação de atleta",url})}catch{}
  }else if(navigator.clipboard){
    await navigator.clipboard.writeText(url);
    alert("Link da publicação copiado.");
  }
}

async function load(){
  try{
    let snap;
    try{snap=await getDocs(query(collection(db,"publicacoes"),where("aprovado","==",true),orderBy("criadoEm","desc"),limit(8)))}
    catch{snap=await getDocs(query(collection(db,"publicacoes"),where("aprovado","==",true),limit(8)))}
    posts=snap.docs.map(d=>({id:d.id,...d.data()})).filter(p=>p.status!=="removido").sort((a,b)=>(b.criadoEm?.seconds||0)-(a.criadoEm?.seconds||0));
  }catch(e){
    console.error("Feed:",e);
    if($("homeFeed"))$("homeFeed").innerHTML='<div class="social-login-gate"><strong>Não foi possível carregar o feed</strong><span>Atualize a página e tente novamente.</span></div>';
    posts=[];
  }

  try{
    const s=await getDocs(query(collection(db,"stories"),where("aprovado","==",true),orderBy("criadoEm","desc"),limit(8)));
    renderStories(s.docs.map(d=>({id:d.id,...d.data()})));
  }catch{renderStories([])}

  try{
    const s=await getDocs(query(collection(db,"videos"),where("aprovado","==",true),orderBy("criadoEm","desc"),limit(8)));
    videoPosts=s.docs.map(d=>({id:d.id,...d.data()}));
  }catch{videoPosts=[]}

  await getLikesForPosts();
  await renderFeed();
  loaded=true;

  const hash=location.hash.match(/^#post-(.+)$/);
  if(hash)requestAnimationFrame(()=>document.getElementById("post-"+decodeURIComponent(hash[1]))?.scrollIntoView({block:"center"}));
}

$("homeFeed")?.addEventListener("click",async e=>{
  const b=e.target.closest("button"),card=e.target.closest("[data-post-id]");
  if(!b||!card)return;
  const id=card.dataset.postId;

  if(b.classList.contains("home-share")){await sharePost(id);return}
  if(!action())return;

  if(b.classList.contains("home-like")){
    const likeRef=doc(db,"curtidas_publicacoes",id,"usuarios",user.uid);
    try{
      if(liked.has(id)){await deleteDoc(likeRef);liked.delete(id)}
      else{await setDoc(likeRef,{uid:user.uid,criadoEm:Timestamp.now()});liked.add(id)}
      await renderFeed();
    }catch(err){console.error(err);alert("Não foi possível registrar a curtida.")}
  }else if(b.classList.contains("home-comment")||b.classList.contains("view-comments")){
    await openComments(id);
  }
});

$("menuRanking")?.addEventListener("click",()=>{
  $("siteMenuDrawer")?.classList.remove("open");
  if(window.abrirRanking)window.abrirRanking();else $("btnAbrirRanking")?.click();
});

$("menuEquipes")?.addEventListener("click",e=>{
  e.preventDefault();e.stopPropagation();
  if(window.abrirEquipes)window.abrirEquipes();else $("btnAbrirEquipes")?.click();
  $("siteMenuDrawer")?.classList.remove("open");
  $("siteMenuDrawer")?.setAttribute("aria-hidden","true");
});

onAuthStateChanged(auth,async u=>{
  user=u;
  profileComplete=false;
  if(u){
    try{
      const p=await getDoc(doc(db,"perfis",u.uid));
      profileComplete=p.exists()&&!!p.data()?.nome&&!!p.data()?.cidade&&!!p.data()?.uf;
    }catch(e){console.warn("Perfil:",e)}
  }
  if(!loaded)await load();
  else{await getLikesForPosts();await renderFeed()}
});
