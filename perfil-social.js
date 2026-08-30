import{getApp,getApps,initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getAuth,onAuthStateChanged}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import{getStorage,ref,uploadBytesResumable,getDownloadURL,deleteObject}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";
import{getFirestore,getDoc,doc,collection,getDocs,query,where,orderBy,setDoc,deleteDoc,serverTimestamp,Timestamp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"},app=getApps().length?getApp():initializeApp(cfg),auth=getAuth(app),db=getFirestore(app),storage=getStorage(app),uid=new URLSearchParams(location.search).get("uid");
const $=id=>document.getElementById(id),esc=v=>{const d=document.createElement("div");d.textContent=v??"";return d.innerHTML},fallback="data:image/svg+xml;charset=UTF-8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="#18221d"/><text x="150" y="180" text-anchor="middle" font-size="100">🏐</text></svg>');
let profile=null,currentUser=null,following=false,publishType="feed",selectedFile=null,selectedPreviewUrl=null;
const city=v=>String(v??"").trim().replace(/^([A-Z]{2})\s*[-,]\s*/i,"").replace(/\s+/g," ").trim();
const img=v=>v||fallback;
async function safeDocs(ref,...constraints){try{return await getDocs(query(ref,...constraints,orderBy("criadoEm","desc")))}catch{return await getDocs(query(ref,...constraints))}}
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
 else if(currentUser.uid===uid)a.innerHTML='<a class="pp-btn primary" href="meu-perfil.html?editar=1">✎ EDITAR MEU PERFIL</a><button type="button" id="publishButton" class="pp-btn">＋ PUBLICAR</button>';
 else a.innerHTML='<button id="followButton" class="pp-btn '+(following?"following":"primary")+'">'+(following?"✓ SEGUINDO":"SEGUIR")+'</button>';
 $("followButton")?.addEventListener("click",toggleFollow);$("publishButton")?.addEventListener("click",()=>openPublishModal());
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
  safeDocs(collection(db,"videos"),where("ownerUid","==",uid)).catch(()=>empty),
  safeDocs(collection(db,"stories"),where("ownerUid","==",uid)).catch(()=>empty)
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

function openPublishModal(){const m=$("publishModal");if(!m)return;m.classList.add("open");m.setAttribute("aria-hidden","false")}
function closePublishModal(){const m=$("publishModal");if(!m)return;m.classList.remove("open");m.setAttribute("aria-hidden","true")}
function openMediaModal(type){publishType=type;closePublishModal();resetComposer();const m=$("mediaModal");if(!m)return;$("mediaTitle").textContent=type==="story"?"Adicionar mídia ao Story":"Adicionar mídia ao Feed";m.classList.add("open");m.setAttribute("aria-hidden","false")}
function closeMediaModal(){const m=$("mediaModal");if(!m)return;m.classList.remove("open");m.setAttribute("aria-hidden","true");resetComposer()}
document.addEventListener("click",e=>{
 const b=e.target.closest?.(".publish-choice,#closePublish,#closeMedia,#cameraBtn,#galleryBtn");
 if(!b)return;
 if(b.classList.contains("publish-choice")){e.preventDefault();openMediaModal(b.dataset.publishType);return}
 if(b.id==="closePublish"){e.preventDefault();closePublishModal();return}
 if(b.id==="closeMedia"){e.preventDefault();closeMediaModal();return}
 if(b.id==="cameraBtn"||b.id==="galleryBtn"){
  e.preventDefault();e.stopPropagation();
  const input=$(b.id==="cameraBtn"?"cameraInput":"galleryInput");
  if(!input){console.error("Input de mídia não encontrado:",b.id);return}
  try{if(typeof input.showPicker==="function")input.showPicker();else input.click()}catch(err){try{input.click()}catch(err2){console.error("Não foi possível abrir seletor de mídia:",err2)}}
 }
},true);
$("publishModal")?.addEventListener("click",e=>{if(e.target.id==="publishModal")closePublishModal()});
$("mediaModal")?.addEventListener("click",e=>{if(e.target.id==="mediaModal")closeMediaModal()});
function resetComposer(){
 selectedFile=null;
 if(selectedPreviewUrl){URL.revokeObjectURL(selectedPreviewUrl);selectedPreviewUrl=null}
 const chooser=$("mediaChooser"),composer=$("composer"),imgEl=$("mediaPreviewImage"),vidEl=$("mediaPreviewVideo"),caption=$("captionInput"),status=$("uploadStatus"),button=$("postMediaBtn");
 if(chooser)chooser.hidden=false;if(composer)composer.hidden=true;
 if(imgEl){imgEl.hidden=true;imgEl.removeAttribute("src")}
 if(vidEl){vidEl.hidden=true;vidEl.pause?.();vidEl.removeAttribute("src");vidEl.load()}
 if(caption)caption.value="";
 if(status){status.hidden=true;status.textContent="";status.className="upload-status"}
 if(button){button.disabled=false;button.textContent="PUBLICAR"}
}
function mediaSelected(file){
 if(!file)return;
 if(!currentUser||currentUser.uid!==uid){alert("Entre na sua conta para publicar.");return}
 if(!file.type.startsWith("image/")&&!file.type.startsWith("video/")){alert("Selecione uma imagem ou vídeo válido.");return}
 if(file.size>45*1024*1024){alert("A mídia deve ter no máximo 45 MB.");return}
 if(selectedPreviewUrl)URL.revokeObjectURL(selectedPreviewUrl);
 selectedFile=file;selectedPreviewUrl=URL.createObjectURL(file);
 $("mediaChooser").hidden=true;$("composer").hidden=false;
 const image=$("mediaPreviewImage"),video=$("mediaPreviewVideo");
 if(file.type.startsWith("image/")){image.hidden=false;image.src=selectedPreviewUrl;video.hidden=true;video.removeAttribute("src");video.load()}
 else{video.hidden=false;video.src=selectedPreviewUrl;image.hidden=true;image.removeAttribute("src")}
 $("captionInput")?.focus()
}
async function prepareImageFile(file){
 return new Promise((resolve,reject)=>{
  if(!file?.type.startsWith("image/"))return reject(new Error("Arquivo de imagem inválido."));
  const reader=new FileReader();
  reader.onerror=()=>reject(reader.error||new Error("Não foi possível ler a foto."));
  reader.onload=()=>{
   const image=new Image();
   image.onerror=()=>reject(new Error("Não foi possível preparar a foto."));
   image.onload=()=>{
    const sw=image.naturalWidth||image.width,sh=image.naturalHeight||image.height;
    const attempts=[[1600,.78],[1400,.72],[1200,.66],[1100,.60],[1000,.54],[900,.48],[800,.42]];
    let i=0;
    const attempt=()=>{
     if(i>=attempts.length)return reject(new Error("A foto não pôde ser reduzida para um tamanho seguro."));
     const[max,q]=attempts[i++],scale=Math.min(1,max/Math.max(sw,sh)),canvas=document.createElement("canvas");
     canvas.width=Math.max(1,Math.round(sw*scale));canvas.height=Math.max(1,Math.round(sh*scale));
     const ctx=canvas.getContext("2d");if(!ctx)return reject(new Error("Seu navegador não conseguiu processar a foto."));
     ctx.drawImage(image,0,0,canvas.width,canvas.height);
     canvas.toBlob(blob=>{
      if(!blob)return reject(new Error("Não foi possível converter a foto."));
      if(blob.size<=600000)return resolve(new File([blob],(file.name||"foto").replace(/\.[^.]+$/,"")+".jpg",{type:"image/jpeg",lastModified:Date.now()}));
      setTimeout(attempt,0)
     },"image/jpeg",q)
    };
    attempt()
   };
   image.src=reader.result
  };
  reader.readAsDataURL(file)
 })
}
function storagePathFor(file){
 const ext=file.type.startsWith("image/")?"jpg":((file.name||"mp4").split(".").pop()||"mp4").toLowerCase().replace(/[^a-z0-9]/g,"")||"mp4";
 return"usuarios/"+uid+"/publicacoes/"+Date.now()+"_"+Math.random().toString(36).slice(2,10)+"."+ext
}
async function uploadWithProgress(file,path,status){
 const storageRef=ref(storage,path);
 status.textContent="Enviando mídia... 0%";
 status.className="upload-status";
 return new Promise((resolve,reject)=>{
  let settled=false;
  let task=null;
  const finish=(fn,value)=>{if(settled)return;settled=true;clearTimeout(timeout);fn(value)};
  const timeout=setTimeout(()=>{try{task?.cancel()}catch{};finish(reject,new Error("O Firebase Storage não respondeu. Verifique se as regras do Storage foram publicadas e tente novamente."))},120000);
  try{
   /*
    * Upload direto: evita o travamento do upload resumable em navegadores
    * quando o Firebase Storage fica aguardando uma sessão resumable.
    * A barra continua funcional e o usuário recebe feedback claro.
    */
   task=uploadBytesResumable(storageRef,file,{contentType:file.type,cacheControl:"public,max-age=31536000"});
   task.on("state_changed",
    snap=>{
     const total=Number(snap.totalBytes||0);
     const sent=Number(snap.bytesTransferred||0);
     const pct=total?Math.min(99,Math.round(sent/total*100)):0;
     status.textContent="Enviando mídia... "+pct+"%";
    },
    err=>finish(reject,err),
    ()=>{status.textContent="Upload concluído. 100%";finish(resolve,storageRef)}
   );
  }catch(err){finish(reject,err)}
 })
}
async function publishSelectedMedia(){
 if(!selectedFile||!currentUser||currentUser.uid!==uid)return;
 const button=$("postMediaBtn"),status=$("uploadStatus"),caption=$("captionInput")?.value.trim()||"";
 if(!button||!status)return;
 button.disabled=true;button.textContent="PUBLICANDO...";status.hidden=false;status.className="upload-status";
 let uploadedRef=null;
 try{
  let file=selectedFile;
  const isImage=file.type.startsWith("image/"),isVideo=file.type.startsWith("video/");
  if(!isImage&&!isVideo)throw new Error("Tipo de mídia não suportado.");
  if(isImage){status.textContent="Preparando foto...";file=await prepareImageFile(file);if(file.size>600000)throw new Error("A foto ficou acima do tamanho seguro. Escolha outra imagem.")}
  const path=storagePathFor(file);uploadedRef=await uploadWithProgress(file,path,status);
  status.textContent="Gerando endereço da mídia...";const url=await getDownloadURL(uploadedRef);if(!url)throw new Error("O Firebase Storage não retornou o endereço da mídia.");
  status.textContent="Salvando publicação...";
  if(publishType==="story"){
   await setDoc(doc(collection(db,"stories")),{ownerUid:uid,nome:String(profile?.nome||currentUser.displayName||"Atleta"),mediaUrl:url,mediaPath:path,mediaType:isImage?"image":"video",legenda:String(caption),tipo:isImage?"image":"video",criadoEm:serverTimestamp(),expiraEm:Timestamp.fromDate(new Date(Date.now()+24*60*60*1000))});
  }else if(isImage){
   const postRef=doc(collection(db,"publicacoes"));
   await setDoc(postRef,{ownerUid:uid,ownerEmail:String(currentUser.email||""),nome:String(profile?.nome||currentUser.displayName||"Atleta"),texto:String(caption),imagem:url,imagemUrl:url,imagemPath:path,imagemMime:String(file.type||"image/jpeg"),imagemTamanho:Number(file.size||0),legenda:String(caption),tipo:"imagem",armazenamento:"storage",aprovado:true,status:"publicado",criadoEm:serverTimestamp()});
  }else{
   await setDoc(doc(collection(db,"videos")),{ownerUid:uid,nome:String(profile?.nome||currentUser.displayName||"Atleta"),videoUrl:url,videoPath:path,videoMime:String(file.type||"video/mp4"),videoTamanho:Number(file.size||0),legenda:String(caption),criadoEm:serverTimestamp()});
  }
  status.className="upload-status ok";status.textContent=publishType==="story"?"Story publicado com sucesso!":isImage?"Foto publicada com sucesso!":"Vídeo publicado com sucesso!";await loadMedia();setTimeout(closeMediaModal,900)
 }catch(e){
  console.error("ERRO AO PUBLICAR:",e);const code=String(e?.code||"");let message="Não foi possível publicar a mídia.";
  if(code.includes("storage/unauthorized"))message="Firebase Storage: envio não autorizado. Publique as regras do Storage e tente novamente.";
  else if(code.includes("storage/unauthenticated"))message="Firebase: sua sessão não está autenticada. Entre novamente na conta.";
  else if(code.includes("storage/canceled"))message="O envio da mídia foi cancelado.";
  else if(code.includes("storage/retry-limit-exceeded"))message="Firebase Storage: limite de tentativas atingido. Tente novamente.";
  else if(code.includes("permission-denied"))message="Firestore: a publicação foi recusada pelas regras.";
  else if(e?.message)message=e.message;
  status.className="upload-status error";status.textContent=message;button.textContent="TENTAR NOVAMENTE";
  if(uploadedRef){try{await deleteObject(uploadedRef)}catch{}}
 }finally{button.disabled=false;if(button.textContent==="PUBLICANDO...")button.textContent="PUBLICAR"}
}
/*
 * CONTROLES DE PUBLICAÇÃO - V3
 * Usa delegação de eventos para continuar funcionando mesmo após
 * re-renderizações/alterações do DOM e impede duplo clique no publicar.
 */
document.addEventListener("change",e=>{
 const input=e.target;
 if(input?.id==="cameraInput"||input?.id==="galleryInput"){
   const file=input.files?.[0];
   if(file)mediaSelected(file);
   input.value="";
 }
});
document.addEventListener("click",e=>{
 const button=e.target.closest?.("#changeMediaBtn,#postMediaBtn");
 if(!button)return;
 e.preventDefault();
 if(button.id==="changeMediaBtn"){resetComposer();return}
 if(button.id==="postMediaBtn"){if(button.disabled)return;void publishSelectedMedia()}
},false);
