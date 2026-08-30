import{getApp,getApps,initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getAuth,onAuthStateChanged}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import{getFirestore,getDoc,doc,collection,getDocs,query,where,orderBy,setDoc,deleteDoc,serverTimestamp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"},app=getApps().length?getApp():initializeApp(cfg),auth=getAuth(app),db=getFirestore(app),uid=new URLSearchParams(location.search).get("uid");
const $=id=>document.getElementById(id),esc=v=>{const d=document.createElement("div");d.textContent=v??"";return d.innerHTML},fallback="data:image/svg+xml;charset=UTF-8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="#18221d"/><text x="150" y="180" text-anchor="middle" font-size="100">🏐</text></svg>');
let profile=null,currentUser=null,following=false;
const city=v=>String(v??"").trim().replace(/^([A-Z]{2})\s*[-,]\s*/i,"").replace(/\s+/g," ").trim();
const img=v=>v||fallback;
async function safeDocs(q1,q2){try{return await getDocs(query(q1,orderBy("criadoEm","desc")))}catch{return await getDocs(query(q1,q2))}}
async function getProfile(){
 if(!uid)return null;
 let snap=await getDoc(doc(db,"perfis",uid));
 if(snap.exists())return{uid,souce:"perfis",...snap.data()};
 const legacy=await getDoc(doc(db,"atletas",uid));
 if(legacy.exists())return{uid:legacy.data().ownerUid||uid,source:"atletas",...legacy.data()};
 const q=await getDocs(query(collection(db,"atletas"),where("ownerUid","==",uid)));
 if(!q.empty)return{uid,source:"atletas",...q.docs[0].data()};
 return null;
}
async function refreshCounts(){
 if(!uid)return;
 const count=async path=>{try{return(await getDocs(collection(db,path))).size}catch{return 0}};
 const [followers,followingCount]=await Promise.all([count("seguidores/"+uid+"/usuarios"),count("seguindo/"+uid+"/usuarios")]);
 $("followers").textContent=followers;$("following").textContent=followingCount;
}
async function getFollowState(){if(!currentUser||currentUser.uid===uid)return;try{following=(await getDoc(doc(db,"seguidores",uid,"usuarios",currentUser.uid))).exists()}catch{following=false}}
async function toggleFollow(){
 if(!currentUser){location.href="conta.html?tab=login&return="+encodeURIComponent(location.pathname+location.search);return}
 if(currentUser.uid===uid)return;
 const a=doc(db,"seguidores",uid,"usuarios",currentUser.uid),b=doc(db,"seguindo",currentUser.uid,"usuarios",uid),button=$("followButton");
 if(button)button.disabled=true;
 try{if(following){await deleteDoc(a);await deleteDoc(b);following=false}else{await setDoc(a,{uid:currentUser.uid,criadoEm:serverTimestamp()});await setDoc(b,{uid,criadoEm:serverTimestamp()});following=true}await refreshCounts();renderActions()}catch(e){console.error(e);alert("Não foi possível atualizar o relacionamento agora.")}finally{if(button)button.disabled=false}
}
function renderActions(){
 const a=$("actions");if(!a)return;
 if(!currentUser)a.innerHTML='<a class="pp-btn primary" href="conta.html?tab=login">ENTRAR PARA SEGUIR</a>';
 else if(currentUser.uid===uid)a.innerHTML='<a class="pp-btn primary" href="meu-perfil.html?editar=1">✎ EDITAR MEU PERFIL</a><a class="pp-btn" href="meu-perfil.html#publicar">＋ PUBLICAR</a>';
 else a.innerHTML='<button id="followButton" class="pp-btn '+(following?"following":"primary")+'">'+(following?"✓ SEGUINDO":"SEGUIR")+'</button>';
 $("followButton")?.addEventListener("click",toggleFollow);
}
function renderPosts(items){
 $("gallery").innerHTML=items.length?items.map(x=>x.t==="img"?'<div class="pp-grid-item"><img src="'+esc(x.url)+'" loading="lazy" alt="Publicação de '+esc(profile?.nome||"Atleta")+'"></div>':'<div class="pp-grid-item"><video src="'+esc(x.url)+'" controls preload="metadata"></video><span class="type">▶</span></div>').join(""):'<div class="pp-empty">Este atleta ainda não publicou conteúdo.</div>';
}
function renderStories(stories){
 const active=stories.filter(x=>(x.expira?.toDate?.()||new Date(0))>new Date());
 $("stories").textContent=active.length;
 $("storyList").innerHTML=active.length?active.map(x=>'<img class="pp-story" src="'+esc(x.url)+'" loading="lazy" alt="Story de '+esc(profile?.nome||"Atleta")+'">').join(""):'<div class="pp-empty">Nenhum story ativo.</div>';
}
async function loadMedia(){
 const empty={docs:[]};
 const [photos,videos,stories]=await Promise.all([
  safeDocs(collection(db,"publicacoes"),where("ownerUid","==",uid),where("aprovado","==",true)).catch(()=>empty),
  safeDocs(collection(db,"videos"),where("ownerUid","==",uid),where("ownerUid","==",uid)).catch(()=>empty),
  safeDocs(collection(db,"stories"),where("ownerUid","==",uid),where("ownerUid","==",uid)).catch(()=>empty)
 ]);
 const p=photos.docs.map(d=>({t:"img",url:d.data().imagemUrl||d.data().imagem})).filter(x=>x.url);
 const v=videos.docs.map(d=>({t:"video",url:d.data().videoUrl})).filter(x=>x.url);
 const s=stories.docs.map(d=>({url:d.data().mediaUrl,expira:d.data().expiraEm})).filter(x=>x.url);
 $("photos").textContent=p.length;$("videos").textContent=v.length;renderPosts([...p,...v]);renderStories(s);
}
async function loadSupporters(){
 const el=$("profileSponsors");if(!el)return;
 try{
  const s=await getDocs(collection(db,"apoiadores"));
  const arr=s.docs.map(d=>d.data()).filter(a=>a.ativo!==false).sort((a,b)=>(Number(a.ordem)||999)-(Number(b.ordem)||999));
  el.innerHTML=arr.length?arr.map(a=>'<a class="ps-sponsor" href="'+esc(a.link||"#")+'" target="_blank" rel="noopener"><img src="'+esc(img(a.imagem))+'" alt="Logo de '+esc(a.nome||"Apoiador")+'"><span>'+esc(a.nome||"Apoiador")+'</span></a>').join(""):'<div class="ps-empty">Em breve, novas marcas.</div>';
 }catch(e){console.error("Apoiadores:",e);el.innerHTML='<div class="ps-empty">Apoiadores indisponíveis.</div>'}
}
async function load(){
 if(!uid){$("name").textContent="Perfil não encontrado";return}
 try{
  const p=await getProfile();
  if(!p){$("name").textContent="Perfil não encontrado";$("meta").textContent="Este perfil não está disponível.";return}
  profile=p;document.title=(p.nome||"Perfil")+" | Banco de Atletas";
  $("name").textContent=p.nome||"Atleta";
  $("meta").textContent=[city(p.cidade),p.modalidade,p.posicao,p.categoria,p.time].filter(Boolean).join(" • ");
  $("bio").textContent=p.bio||"Atleta da rede esportiva.";
  $("avatar").src=img(p.fotoUrl||p.foto);
  if(p.capaUrl)$("cover").style.backgroundImage='url("'+String(p.capaUrl).replace(/"/g,'&quot;')+'")';
  await Promise.all([loadMedia(),loadSupporters(),getFollowState(),refreshCounts()]);
  renderActions();
 }catch(e){console.error("Falha ao carregar perfil:",e);$("name").textContent="Não foi possível carregar este perfil";$("meta").textContent="Verifique sua conexão e atualize a página."}
}
async function loadFollowers(type){
 try{
  const snap=await getDocs(collection(db,...(type==="followers"?["seguidores",uid,"usuarios"]:["seguindo",uid,"usuarios"])));
  const users=(await Promise.all(snap.docs.slice(0,100).map(async d=>{const p=await getDoc(doc(db,"perfis",d.id));return p.exists()?{uid:d.id,...p.data()}:null}))).filter(Boolean);
  $("modalTitle").textContent=type==="followers"?"Seguidores":"Seguindo";
  $("userList").innerHTML=users.map(u=>'<a class="pp-user" href="perfil-social.html?uid='+encodeURIComponent(u.uid)+'"><img src="'+esc(img(u.fotoUrl))+'"><strong>'+esc(u.nome||"Atleta")+'</strong></a>').join("")||'<div class="pp-empty">Nenhuma pessoa por enquanto.</div>';
  $("listModal").classList.add("open");
 }catch(e){console.error(e)}
}
document.querySelectorAll(".pp-tab").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".pp-tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");const st=b.dataset.tab==="stories";$("gallery").hidden=st;$("storyList").hidden=!st}));
$("followersStat").onclick=()=>loadFollowers("followers");$("followingStat").onclick=()=>loadFollowers("following");$("closeModal").onclick=()=>$("listModal").classList.remove("open");$("listModal").addEventListener("click",e=>{if(e.target.id==="listModal")$("listModal").classList.remove("open")});
load();
onAuthStateChanged(auth,async u=>{currentUser=u;try{await getFollowState();await refreshCounts()}catch{}renderActions()});
