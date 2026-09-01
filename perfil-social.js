import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  collection, deleteDoc, doc, getDoc, getDocs, getFirestore, limit, orderBy,
  query, setDoc, Timestamp, updateDoc, where
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { uploadCloudinary } from "./cloudinary-upload.js?v=20260831-2";
import {
  attachProfileStory, createNotification, initSocialNetwork, mountMessageButton,
  openStoryViewer
} from "./social-network.js?v=20260901-2";

const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};
const app=getApps().length?getApp():initializeApp(cfg),auth=getAuth(app),db=getFirestore(app),uid=new URLSearchParams(location.search).get("uid");
const $=id=>document.getElementById(id);
const esc=v=>{const d=document.createElement("div");d.textContent=v??"";return d.innerHTML};
const fallback="data:image/svg+xml;charset=UTF-8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="#18221d"/><text x="150" y="180" text-anchor="middle" font-size="100">🏐</text></svg>');
let profile=null,currentUser=null,following=false,publishType="feed",selectedFile=null,selectedPreviewUrl=null,mediaItems=[],activeStories=[],allStories=[];
const city=v=>String(v??"").trim().replace(/^([A-Z]{2})\s*[-,]\s*/i,"").replace(/\s+/g," ").trim();
const ms=v=>v?.toMillis?.()??(v?.seconds?Number(v.seconds)*1000:new Date(v||0).getTime()||0);
const img=v=>v||fallback;

function installProfileStyles(){
  if(document.getElementById("profileSocialV5Styles"))return;
  const s=document.createElement("style");s.id="profileSocialV5Styles";s.textContent=`
  .pp-avatar.has-story{cursor:pointer}.pp-grid-item{cursor:pointer}.pp-grid-item:hover{filter:brightness(1.08)}.pp-grid-item .type{z-index:2}
  .pp-story-wrap{position:relative;display:inline-flex;flex-direction:column;gap:4px;align-items:center;cursor:pointer;flex:0 0 auto}.pp-story-wrap small{color:#8e978f;font-size:8px}.pp-story-delete{position:absolute;right:4px;top:4px;z-index:3;width:26px;height:26px;border-radius:50%;border:1px solid rgba(255,255,255,.35);background:rgba(0,0,0,.72);color:#fff;font-size:15px;cursor:pointer}.pp-story-delete:hover{background:#85271f}
  .pp-archive{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.pp-archive-item{position:relative;aspect-ratio:9/14;border-radius:10px;overflow:hidden;background:#030403;border:1px solid rgba(217,169,63,.16);cursor:pointer}.pp-archive-item img,.pp-archive-item video{display:block;width:100%;height:100%;object-fit:cover}.pp-archive-meta{position:absolute;left:0;right:0;bottom:0;padding:22px 7px 7px;background:linear-gradient(transparent,rgba(0,0,0,.88));color:#fff;font-size:8px}.pp-archive-badge{position:absolute;left:6px;top:6px;padding:4px 6px;border-radius:20px;background:rgba(0,0,0,.72);color:#ddd;font-size:7px;font-weight:900}.pp-archive-badge.active{background:#2c6e42;color:#dff9e8}.pp-archive-item .pp-story-delete{right:5px;top:5px}
  .pp-content-modal{position:fixed;inset:0;z-index:24000;background:rgba(0,0,0,.88);display:none;place-items:center;padding:16px}.pp-content-modal.open{display:grid}.pp-content-box{width:min(900px,100%);max-height:92vh;display:grid;grid-template-columns:minmax(0,1.4fr) minmax(260px,.7fr);background:#090e0b;border:1px solid rgba(217,169,63,.25);border-radius:16px;overflow:hidden}.pp-content-media{background:#000;min-height:420px;display:grid;place-items:center}.pp-content-media img,.pp-content-media video{display:block;width:auto;height:auto;max-width:100%;max-height:82vh;object-fit:contain;image-rendering:auto}.pp-content-side{padding:18px;display:flex;flex-direction:column}.pp-content-side h3{margin:0 0 10px;color:#f2cc72}.pp-content-side p{white-space:pre-wrap;color:#ddd;font-size:12px;line-height:1.5;flex:1}.pp-content-tools{display:flex;gap:8px}.pp-content-tools button{flex:1;border:1px solid rgba(217,169,63,.3);border-radius:9px;background:#121914;color:#f2cc72;padding:10px;font-weight:900;cursor:pointer}.pp-content-tools .danger{color:#ff9a8b;border-color:rgba(255,100,80,.35)}.pp-content-close{position:absolute;right:18px;top:15px;border:0;background:#111a;color:#fff;border-radius:50%;width:40px;height:40px;font-size:24px;cursor:pointer}
  .pp-history-list{display:grid;gap:9px;max-height:58vh;overflow:auto}.pp-history-card{padding:12px;border:1px solid rgba(217,169,63,.17);border-radius:11px;background:#111713}.pp-history-card strong{display:block;color:#f2cc72;font-size:12px}.pp-history-card span{display:block;color:#a9b0aa;font-size:10px;line-height:1.5;margin-top:4px}.pp-history-empty{padding:28px 10px;text-align:center;color:#8e978f;font-size:11px}
  @media(max-width:720px){.pp-content-box{grid-template-columns:1fr}.pp-content-media{min-height:45vh}.pp-content-side{max-height:38vh}.pp-archive{grid-template-columns:repeat(3,minmax(0,1fr))}}
  `;document.head.appendChild(s)
}

async function safeDocs(ref,...constraints){
  try{return await getDocs(query(ref,...constraints,orderBy("criadoEm","desc"),limit(100)))}
  catch{return await getDocs(query(ref,...constraints,limit(100)))}
}

async function getProfile(){
  if(!uid)return null;
  let s=await getDoc(doc(db,"perfis",uid));if(s.exists())return{uid,...s.data()};
  const legacy=await getDoc(doc(db,"atletas",uid));if(legacy.exists())return{uid:legacy.data().ownerUid||uid,...legacy.data()};
  const q=await getDocs(query(collection(db,"atletas"),where("ownerUid","==",uid),limit(1)));
  return q.empty?null:{uid,...q.docs[0].data()}
}

async function refreshCounts(){
  if(!uid)return;const count=async path=>{try{return(await getDocs(collection(db,path))).size}catch{return 0}};
  const[a,b]=await Promise.all([count(`seguidores/${uid}/usuarios`),count(`seguindo/${uid}/usuarios`)]);
  if($("followers"))$("followers").textContent=a;if($("following"))$("following").textContent=b
}
async function getFollowState(){if(!currentUser||currentUser.uid===uid){following=false;return}try{following=(await getDoc(doc(db,"seguidores",uid,"usuarios",currentUser.uid))).exists()}catch{following=false}}
async function toggleFollow(){
  if(!currentUser){location.href=`conta.html?tab=login&return=${encodeURIComponent(location.pathname+location.search)}`;return}
  if(currentUser.uid===uid)return;
  const a=doc(db,"seguidores",uid,"usuarios",currentUser.uid),b=doc(db,"seguindo",currentUser.uid,"usuarios",uid),button=$("followButton");if(button)button.disabled=true;
  try{
    if(following){await deleteDoc(a);await deleteDoc(b);following=false}
    else{await setDoc(a,{uid:currentUser.uid,criadoEm:Timestamp.now()});await setDoc(b,{uid,criadoEm:Timestamp.now()});following=true;await createNotification(uid,"follow",{sourceId:currentUser.uid})}
    await refreshCounts();renderActions()
  }catch(e){console.error(e);alert("Não foi possível atualizar o relacionamento.")}
  finally{if(button)button.disabled=false}
}

function ensureHistoryModal(){
  if($("historyModal"))return;
  document.body.insertAdjacentHTML("beforeend",'<div id="historyModal" class="pp-modal"><div class="pp-modal-card"><button id="closeHistoryModal" class="pp-close">×</button><h2>🏆 Histórico de campeonatos</h2><div id="historyList" class="pp-history-list"></div></div></div>');
  $("closeHistoryModal").onclick=()=>$("historyModal").classList.remove("open");
  $("historyModal").addEventListener("click",e=>{if(e.target.id==="historyModal")$("historyModal").classList.remove("open")})
}

function championshipText(entry){
  if(typeof entry==="string")return{title:entry,details:""};
  if(!entry||typeof entry!=="object")return{title:String(entry||"Campeonato"),details:""};
  const title=entry.nome||entry.campeonato||entry.titulo||entry.evento||"Campeonato";
  const details=[entry.data,entry.categoria,entry.modalidade,entry.colocacao||entry.resultado,entry.equipe||entry.time].filter(Boolean).join(" • ");
  return{title,details}
}
function openHistory(){
  ensureHistoryModal();
  const entries=Array.isArray(profile?.historicoCampeonatos)?profile.historicoCampeonatos:[];
  $("historyList").innerHTML=entries.length?entries.map(entry=>{const x=championshipText(entry);return `<article class="pp-history-card"><strong>${esc(x.title)}</strong>${x.details?`<span>${esc(x.details)}</span>`:""}</article>`}).join(""):'<div class="pp-history-empty">Nenhum campeonato registrado neste perfil ainda.</div>';
  $("historyModal").classList.add("open")
}

function renderActions(){
  const a=$("actions");if(!a)return;a.innerHTML="";
  if(!currentUser)a.innerHTML='<a class="pp-btn primary" href="conta.html?tab=login">ENTRAR PARA INTERAGIR</a>';
  else if(currentUser.uid===uid){a.innerHTML='<a class="pp-btn primary" href="meu-perfil.html?editar=1">✎ EDITAR MEU PERFIL</a><button type="button" id="publishButton" class="pp-btn">＋ PUBLICAR</button>';$("publishButton").onclick=openPublishModal}
  else{a.innerHTML=`<button id="followButton" class="pp-btn ${following?"following":"primary"}">${following?"✓ SEGUINDO":"SEGUIR"}</button>`;$("followButton").onclick=toggleFollow;mountMessageButton(a,uid,profile?.nome||"Atleta",profile?.fotoUrl||profile?.foto||fallback)}
  const history=document.createElement("button");history.type="button";history.className="pp-btn";history.id="historyButton";history.textContent="🏆 HISTÓRICO";history.onclick=openHistory;a.appendChild(history)
}

function renderPosts(items){
  mediaItems=items;const g=$("gallery");if(!g)return;
  g.innerHTML=items.length?items.map((x,i)=>x.kind==="image"?`<div class="pp-grid-item" data-media-index="${i}"><img src="${esc(x.url)}" loading="lazy" decoding="async" alt="Publicação de ${esc(profile?.nome||"Atleta")}"></div>`:`<div class="pp-grid-item" data-media-index="${i}"><video src="${esc(x.url)}" muted playsinline preload="metadata"></video><span class="type">▶</span></div>`).join(""):'<div class="pp-empty">Este atleta ainda não publicou conteúdo.</div>';
  g.querySelectorAll("[data-media-index]").forEach(el=>el.onclick=()=>openContent(Number(el.dataset.mediaIndex)))
}

async function getAllProfileStories(){
  if(!uid)return[];
  try{
    let snap;
    try{snap=await getDocs(query(collection(db,"stories"),where("ownerUid","==",uid),where("aprovado","==",true),orderBy("criadoEm","desc"),limit(120)))}
    catch{snap=await getDocs(query(collection(db,"stories"),where("ownerUid","==",uid),where("aprovado","==",true),limit(120)))}
    return snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>ms(b.criadoEm)-ms(a.criadoEm))
  }catch(e){console.warn("Arquivo de Stories:",e);return[]}
}

async function deleteStory(storyId){
  if(!currentUser||currentUser.uid!==uid)return;
  if(!confirm("Excluir este Story definitivamente?"))return;
  try{await deleteDoc(doc(db,"stories",storyId));await loadStorySections()}
  catch(e){console.error(e);alert("Não foi possível excluir o Story.")}
}

function storyThumb(story,index,archive=false){
  const url=story.mediaUrl||"",video=(story.mediaType||story.tipo)==="video",active=!ms(story.expiraEm)||ms(story.expiraEm)>Date.now();
  if(!archive){
    return `<div class="pp-story-wrap" data-story-index="${index}">${currentUser?.uid===uid?`<button class="pp-story-delete" type="button" data-delete-story="${esc(story.id)}" title="Excluir Story">×</button>`:""}${video?`<video class="pp-story" src="${esc(url)}" muted playsinline preload="metadata"></video>`:`<img class="pp-story" src="${esc(url)}" alt="Story" decoding="async">`}<small>${new Date(ms(story.criadoEm)).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</small></div>`
  }
  return `<article class="pp-archive-item" data-archive-index="${index}">${currentUser?.uid===uid?`<button class="pp-story-delete" type="button" data-delete-story="${esc(story.id)}" title="Excluir Story">×</button>`:""}<span class="pp-archive-badge${active?" active":""}">${active?"ATIVO":"ARQUIVO"}</span>${video?`<video src="${esc(url)}" muted playsinline preload="metadata"></video>`:`<img src="${esc(url)}" alt="Story arquivado" loading="lazy" decoding="async">`}<div class="pp-archive-meta">${new Date(ms(story.criadoEm)).toLocaleDateString("pt-BR")}</div></article>`
}

async function loadStorySections(){
  allStories=await getAllProfileStories();
  activeStories=allStories.filter(s=>!ms(s.expiraEm)||ms(s.expiraEm)>Date.now()).sort((a,b)=>ms(a.criadoEm)-ms(b.criadoEm));
  if($("stories"))$("stories").textContent=activeStories.length;
  const box=$("storyList");
  if(box){
    box.innerHTML=activeStories.length?activeStories.map((s,i)=>storyThumb(s,i,false)).join(""):'<div class="pp-empty">Nenhum Story ativo agora.</div>';
    box.querySelectorAll("[data-story-index]").forEach(el=>el.onclick=e=>{if(e.target.closest("[data-delete-story]"))return;openStoryViewer(activeStories,Number(el.dataset.storyIndex))})
  }
  const archive=$("storyArchiveList");
  if(archive){
    archive.innerHTML=allStories.length?allStories.map((s,i)=>storyThumb(s,i,true)).join(""):'<div class="pp-empty">Este atleta ainda não possui Stories no arquivo.</div>';
    archive.querySelectorAll("[data-archive-index]").forEach(el=>el.onclick=e=>{if(e.target.closest("[data-delete-story]"))return;openStoryViewer(allStories,Number(el.dataset.archiveIndex))})
  }
  document.querySelectorAll("[data-delete-story]").forEach(btn=>btn.onclick=e=>{e.preventDefault();e.stopPropagation();deleteStory(btn.dataset.deleteStory)});
  if($("avatar"))await attachProfileStory($("avatar"),uid)
}

function ensureExtraProfileUI(){
  const tabs=document.querySelector(".pp-tabs");
  if(tabs&&!tabs.querySelector('[data-tab="archive"]'))tabs.insertAdjacentHTML("beforeend",'<button class="pp-tab" data-tab="archive">▣ STORIES POSTADOS</button>');
  const section=tabs?.parentElement;
  if(section&&!$("storyArchiveList"))section.insertAdjacentHTML("beforeend",'<div id="storyArchiveList" class="pp-archive" hidden></div>');
}

async function loadMedia(){
  const empty={docs:[]};
  const[p,v]=await Promise.all([
    safeDocs(collection(db,"publicacoes"),where("ownerUid","==",uid),where("aprovado","==",true)).catch(()=>empty),
    safeDocs(collection(db,"videos"),where("ownerUid","==",uid),where("aprovado","==",true)).catch(()=>empty)
  ]);
  const photos=p.docs.map(d=>({id:d.id,collection:"publicacoes",kind:"image",url:d.data().imagemUrl||d.data().imagem,caption:d.data().legenda||d.data().texto||"",createdAt:d.data().criadoEm})).filter(x=>x.url);
  const vids=v.docs.map(d=>({id:d.id,collection:"videos",kind:"video",url:d.data().videoUrl,caption:d.data().legenda||"",createdAt:d.data().criadoEm})).filter(x=>x.url);
  const all=[...photos,...vids].sort((a,b)=>ms(b.createdAt)-ms(a.createdAt));
  if($("photos"))$("photos").textContent=photos.length;if($("videos"))$("videos").textContent=vids.length;
  renderPosts(all);await loadStorySections()
}

async function loadSupporters(){
  const el=$("profileSponsors");if(!el)return;
  try{const s=await getDocs(collection(db,"apoiadores")),arr=s.docs.map(d=>d.data()).filter(a=>a.ativo!==false).sort((a,b)=>(Number(a.ordem)||999)-(Number(b.ordem)||999));el.innerHTML=arr.length?arr.map(a=>`<a class="ps-sponsor" href="${esc(a.link||"#")}" target="_blank" rel="noopener"><img src="${esc(img(a.imagem))}" alt="Logo de ${esc(a.nome||"Apoiador")}"><span>${esc(a.nome||"Apoiador")}</span></a>`).join(""):'<div class="ps-empty">Em breve, novas marcas.</div>'}catch{el.innerHTML='<div class="ps-empty">Apoiadores indisponíveis.</div>'}
}

async function load(){
  if(!uid){$("name").textContent="Perfil não encontrado";return}
  try{
    profile=await getProfile();if(!profile){$("name").textContent="Perfil não encontrado";return}
    document.title=`${profile.nome||"Perfil"} | Banco de Atletas`;
    $("name").textContent=profile.nome||"Atleta";$("meta").textContent=[city(profile.cidade),profile.modalidade,profile.posicao,profile.categoria,profile.time].filter(Boolean).join(" • ");$("bio").textContent=profile.bio||"Atleta da rede esportiva.";$("avatar").src=img(profile.fotoUrl||profile.foto);if(profile.capaUrl)$("cover").style.backgroundImage=`url("${String(profile.capaUrl).replace(/"/g,"%22")}")`;
    ensureExtraProfileUI();ensureHistoryModal();bindTabs();
    await Promise.all([loadMedia(),loadSupporters(),refreshCounts(),getFollowState()]);renderActions()
  }catch(e){console.error(e);$("name").textContent="Não foi possível carregar este perfil"}
}

async function loadFollowers(type){
  try{const snap=await getDocs(collection(db,...(type==="followers"?["seguidores",uid,"usuarios"]:["seguindo",uid,"usuarios"]))),users=(await Promise.all(snap.docs.slice(0,100).map(async d=>{const p=await getDoc(doc(db,"perfis",d.id));return p.exists()?{uid:d.id,...p.data()}:null}))).filter(Boolean);$("modalTitle").textContent=type==="followers"?"Seguidores":"Seguindo";$("userList").innerHTML=users.map(u=>`<a class="pp-user" href="perfil-social.html?uid=${encodeURIComponent(u.uid)}"><img src="${esc(img(u.fotoUrl))}"><strong>${esc(u.nome||"Atleta")}</strong></a>`).join("")||'<div class="pp-empty">Nenhuma pessoa por enquanto.</div>';$("listModal").classList.add("open")}catch(e){console.error(e)}
}

function ensureContentModal(){
  if($("ppContentModal"))return;
  document.body.insertAdjacentHTML("beforeend",'<div id="ppContentModal" class="pp-content-modal"><button class="pp-content-close">×</button><div class="pp-content-box"><div class="pp-content-media"></div><div class="pp-content-side"><h3>Publicação</h3><p></p><div class="pp-content-tools"></div></div></div></div>');
  const m=$("ppContentModal");m.querySelector(".pp-content-close").onclick=()=>m.classList.remove("open");m.onclick=e=>{if(e.target===m)m.classList.remove("open")}
}
function openContent(index){
  ensureContentModal();const item=mediaItems[index],m=$("ppContentModal");if(!item)return;
  m.querySelector(".pp-content-media").innerHTML=item.kind==="video"?`<video src="${esc(item.url)}" controls autoplay playsinline></video>`:`<img src="${esc(item.url)}" alt="Publicação" decoding="async">`;
  m.querySelector(".pp-content-side p").textContent=item.caption||"";const tools=m.querySelector(".pp-content-tools");tools.innerHTML="";
  if(currentUser?.uid===uid){
    tools.innerHTML='<button data-edit>EDITAR LEGENDA</button><button class="danger" data-delete>EXCLUIR</button>';
    tools.querySelector("[data-edit]").onclick=async()=>{const value=prompt("Editar legenda:",item.caption||"");if(value===null)return;try{const data=item.collection==="publicacoes"?{legenda:value.slice(0,2200),texto:value.slice(0,2200)}:{legenda:value.slice(0,2200)};await updateDoc(doc(db,item.collection,item.id),data);m.classList.remove("open");await loadMedia()}catch(e){console.error(e);alert("Não foi possível editar.")}};
    tools.querySelector("[data-delete]").onclick=async()=>{if(!confirm("Excluir esta publicação?"))return;try{await deleteDoc(doc(db,item.collection,item.id));m.classList.remove("open");await loadMedia()}catch(e){console.error(e);alert("Não foi possível excluir.")}}
  }
  m.classList.add("open")
}

function openPublishModal(){const m=$("publishModal");if(m){m.classList.add("open");m.setAttribute("aria-hidden","false")}}
function closePublishModal(){const m=$("publishModal");if(m){m.classList.remove("open");m.setAttribute("aria-hidden","true")}}
function openMediaModal(type){publishType=type;closePublishModal();resetComposer();const m=$("mediaModal");if(!m)return;$("mediaTitle").textContent=type==="story"?"Adicionar mídia ao Story":"Adicionar mídia ao Feed";m.classList.add("open");m.setAttribute("aria-hidden","false")}
function closeMediaModal(){const m=$("mediaModal");if(m){m.classList.remove("open");m.setAttribute("aria-hidden","true")};resetComposer()}
function resetComposer(){selectedFile=null;if(selectedPreviewUrl){URL.revokeObjectURL(selectedPreviewUrl);selectedPreviewUrl=null}const chooser=$("mediaChooser"),composer=$("composer"),im=$("mediaPreviewImage"),vi=$("mediaPreviewVideo"),status=$("uploadStatus"),button=$("postMediaBtn");if(chooser)chooser.hidden=false;if(composer)composer.hidden=true;if(im){im.hidden=true;im.removeAttribute("src")}if(vi){vi.hidden=true;vi.pause?.();vi.removeAttribute("src");vi.load()}if($("captionInput"))$("captionInput").value="";if(status){status.hidden=true;status.textContent="";status.className="upload-status"}if(button){button.disabled=false;button.textContent="PUBLICAR"}}
function mediaSelected(file){
  if(!file)return;if(!currentUser||currentUser.uid!==uid){alert("Entre na sua conta para publicar.");return}
  const image=file.type.startsWith("image/"),video=file.type.startsWith("video/");if(!image&&!video){alert("Selecione uma imagem ou vídeo válido.");return}
  if(image&&file.size>25*1024*1024){alert("A foto deve ter no máximo 25 MB. Ela será enviada sem compactação de qualidade.");return}if(video&&file.size>45*1024*1024){alert("O vídeo deve ter no máximo 45 MB.");return}
  if(selectedPreviewUrl)URL.revokeObjectURL(selectedPreviewUrl);selectedFile=file;selectedPreviewUrl=URL.createObjectURL(file);$("mediaChooser").hidden=true;$("composer").hidden=false;const im=$("mediaPreviewImage"),vi=$("mediaPreviewVideo");if(image){im.hidden=false;im.src=selectedPreviewUrl;vi.hidden=true;vi.removeAttribute("src");vi.load()}else{vi.hidden=false;vi.src=selectedPreviewUrl;im.hidden=true;im.removeAttribute("src")}$("captionInput")?.focus()
}

async function publishSelectedMedia(){
  if(!selectedFile||!currentUser||currentUser.uid!==uid)return;
  const button=$("postMediaBtn"),status=$("uploadStatus"),caption=$("captionInput")?.value.trim()||"";if(!button||!status)return;button.disabled=true;button.textContent="PUBLICANDO...";status.hidden=false;status.className="upload-status";
  try{
    const isVideo=selectedFile.type.startsWith("video/");status.textContent="Enviando arquivo original em alta qualidade...";
    const up=await uploadCloudinary(selectedFile,{maxBytes:isVideo?45*1024*1024:25*1024*1024,allowImage:true,allowVideo:true,tags:["cadastro-de-atletas",publishType==="story"?"stories":isVideo?"videos":"publicacoes"]});
    status.textContent="Publicando...";const nome=profile?.nome||currentUser.displayName||"Atleta";
    if(publishType==="story"){
      const type=isVideo?"video":"image";
      await setDoc(doc(collection(db,"stories")),{ownerUid:uid,nome,mediaUrl:up.url,mediaPath:up.path,mediaType:type,legenda:caption,tipo:type,aprovado:true,status:"publicado",criadoEm:Timestamp.now(),expiraEm:Timestamp.fromDate(new Date(Date.now()+24*60*60*1000))})
    }else if(isVideo){await setDoc(doc(collection(db,"videos")),{ownerUid:uid,nome,videoUrl:up.url,videoPath:up.path,videoMime:up.mime,videoTamanho:up.size,legenda:caption,aprovado:true,status:"publicado",criadoEm:Timestamp.now()})}
    else{await setDoc(doc(collection(db,"publicacoes")),{ownerUid:uid,ownerEmail:currentUser.email||"",nome,texto:caption,imagem:up.url,imagemUrl:up.url,imagemPath:up.path,imagemMime:up.mime,imagemTamanho:up.size,legenda:caption,tipo:"imagem",armazenamento:"cloudinary",aprovado:true,status:"publicado",criadoEm:Timestamp.now()})}
    status.className="upload-status ok";status.textContent=publishType==="story"?"Story publicado por 24 horas e salvo no arquivo do perfil!":"Publicado no feed!";await loadMedia();setTimeout(closeMediaModal,800)
  }catch(e){console.error("Publicação:",e);status.className="upload-status error";status.textContent=e?.message||"Não foi possível publicar.";button.textContent="TENTAR NOVAMENTE"}
  finally{button.disabled=false;if(button.textContent==="PUBLICANDO...")button.textContent="PUBLICAR"}
}

function bindComposerCapture(){
  document.addEventListener("change",e=>{const input=e.target;if(input?.id!=="cameraInput"&&input?.id!=="galleryInput")return;e.stopImmediatePropagation();const file=input.files?.[0];if(file)mediaSelected(file);input.value=""},true);
  document.addEventListener("click",e=>{const b=e.target.closest?.(".publish-choice,#closePublish,#closeMedia,#cameraBtn,#galleryBtn,#changeMediaBtn,#postMediaBtn");if(!b)return;e.preventDefault();e.stopImmediatePropagation();if(b.classList.contains("publish-choice")){openMediaModal(b.dataset.publishType);return}if(b.id==="closePublish"){closePublishModal();return}if(b.id==="closeMedia"){closeMediaModal();return}if(b.id==="changeMediaBtn"){resetComposer();return}if(b.id==="postMediaBtn"){if(!b.disabled)publishSelectedMedia();return}if(b.id==="cameraBtn"||b.id==="galleryBtn"){const input=$(b.id==="cameraBtn"?"cameraInput":"galleryInput");try{input?.showPicker?input.showPicker():input?.click()}catch{input?.click()}}},true)
}

let tabsBound=false;
function bindTabs(){
  if(tabsBound)return;tabsBound=true;
  document.querySelector(".pp-tabs")?.addEventListener("click",e=>{
    const b=e.target.closest(".pp-tab");if(!b)return;
    document.querySelectorAll(".pp-tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");
    if($("gallery"))$("gallery").hidden=b.dataset.tab!=="posts";
    if($("storyList"))$("storyList").hidden=b.dataset.tab!=="stories";
    if($("storyArchiveList"))$("storyArchiveList").hidden=b.dataset.tab!=="archive"
  })
}

installProfileStyles();initSocialNetwork();bindComposerCapture();ensureContentModal();ensureExtraProfileUI();ensureHistoryModal();bindTabs();
if($("followersStat"))$("followersStat").onclick=()=>loadFollowers("followers");if($("followingStat"))$("followingStat").onclick=()=>loadFollowers("following");if($("closeModal"))$("closeModal").onclick=()=>$("listModal").classList.remove("open");$("listModal")?.addEventListener("click",e=>{if(e.target.id==="listModal")$("listModal").classList.remove("open")});
window.addEventListener("sn:story-deleted",()=>loadStorySections());
load();
onAuthStateChanged(auth,async u=>{currentUser=u;await getFollowState();await refreshCounts();renderActions();await loadStorySections()});
