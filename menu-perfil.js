import "./site-v5.js?v=20260901-8";
import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { addDoc, collection, deleteField, doc, getDoc, getDocs, getFirestore, query, serverTimestamp, setDoc, updateDoc, where } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { uploadCloudinary } from "./cloudinary-upload.js?v=20260831-1";

(function installMyProfileV7Cleanup(){
  if(document.getElementById("myProfileV7Cleanup"))return;
  const style=document.createElement("style");style.id="myProfileV7Cleanup";style.textContent=`
  body.site-v5.profile-page{padding-left:0!important;padding-right:0!important;background:#f5f7fb!important;color:#172033!important}
  body.site-v5.profile-page .profile-side-left,body.site-v5.profile-page .profile-side-right{display:none!important}
  body.site-v5.profile-page .header{position:sticky!important;top:0!important;left:auto!important;right:auto!important;width:100%!important;height:66px!important;min-height:66px!important;padding:10px 24px!important;display:flex!important;grid-template-columns:none!important;justify-content:flex-start!important;background:rgba(255,255,255,.94)!important;border-bottom:1px solid #e4e7ec!important}
  body.site-v5.profile-page .header-center,body.site-v5.profile-page .header-actions{display:none!important}
  body.site-v5.profile-page .profile-shell{max-width:1050px!important;margin:0 auto!important;padding:28px 18px 65px!important}
  body.site-v5.profile-page .profile-card,body.site-v5.profile-page .media-card{background:#fff!important;border:1px solid #e4e7ec!important;box-shadow:0 10px 35px rgba(15,23,42,.07)!important;color:#172033!important}
  body.site-v5.profile-page .cover-editor{background:#f8fafc!important}
  body.site-v5.profile-page .cover-preview{background:linear-gradient(135deg,#dbeafe,#ecfdf5)!important;border-color:#e4e7ec!important}
  body.site-v5.profile-page .avatar{border-color:#fff!important;outline-color:#bfdbfe!important;background:#eef2f7!important}
  body.site-v5.profile-page .profile-top h1,body.site-v5.profile-page .media-card h2{color:#172033!important}
  body.site-v5.profile-page .profile-grid{border-color:#e4e7ec!important}
  body.site-v5.profile-page .field input,body.site-v5.profile-page .field select,body.site-v5.profile-page .field textarea,body.site-v5.profile-page .upload-box textarea{background:#fff!important;color:#172033!important;border-color:#d0d5dd!important}
  body.site-v5.profile-page .upload-box{background:#f8fafc!important;border-color:#d0d5dd!important}
  body.site-v5.profile-page .upload-box p,body.site-v5.profile-page .empty{color:#667085!important}
  body.site-v5.profile-page .gallery img,body.site-v5.profile-page .gallery video,body.site-v5.profile-page .story-list img,body.site-v5.profile-page .story-list video{background:#f2f4f7!important}
  @media(max-width:700px){body.site-v5.profile-page .profile-shell{padding:18px 10px 45px!important}}
  `;document.head.appendChild(style)
})();

const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};
const app=getApps().length?getApp():initializeApp(cfg),auth=getAuth(app),db=getFirestore(app);
let currentUser=null,socialPublishType="feed",capturedSocialFile=null;
const $=id=>document.getElementById(id),text=v=>v==null?"":String(v).trim();

function atualizarMinhaContaMenu(){document.querySelectorAll("[data-menu-account]").forEach(el=>{el.innerHTML="◉ MINHA CONTA <span>›</span>";el.setAttribute("href","conta.html");el.setAttribute("aria-label","Abrir minha conta")})}
function status(id,message,error=false){const el=$(id);if(!el)return;el.textContent=message;el.className="status"+(error?" erro":"")}
function socialStatus(message,error=false){const el=$("uploadStatus");if(!el)return;el.hidden=false;el.textContent=message;el.className=`upload-status${error?" error":""}`}
function historyFromForm(){const seen=new Set(),out=[];for(const row of document.querySelectorAll("#campeonatosLista .campeonato-row")){const item={campeonato:text(row.querySelector(".campeonato-nome")?.value),colocacao:text(row.querySelector(".campeonato-colocacao")?.value),ano:text(row.querySelector(".campeonato-ano")?.value)};if(!item.campeonato&&!item.colocacao&&!item.ano)continue;const key=`${item.campeonato}|${item.colocacao}|${item.ano}`.toLowerCase();if(seen.has(key))continue;seen.add(key);out.push(item)}return out.slice(0,30)}
function planData(userData){const id=document.querySelector('input[name="profilePlano"]:checked')?.value||"gratuito",prices={gratuito:0,bronze:9.9,prata:19.9,ouro:34.9,premium:49.9},names={gratuito:"Gratuito",bronze:"Bronze",prata:"Prata",ouro:"Ouro",premium:"Premium"},same=id===text(userData?.planoId||"gratuito"),confirmed=id!=="gratuito"&&same&&userData?.pagamentoConfirmado===true;return{plano:names[id],planoId:id,valorPlano:prices[id],planoStatus:id==="gratuito"||confirmed?"ativo":"aguardando_pagamento",pagamentoConfirmado:confirmed}}
async function uploadFile(file,folder,maxBytes){const isStory=folder==="stories",isVideoFolder=folder==="videos";return uploadCloudinary(file,{maxBytes,allowImage:!isVideoFolder,allowVideo:isVideoFolder||isStory,tags:["cadastro-de-atletas",folder]})}

async function secureSaveProfile(){
 if(!currentUser||!$("saveProfile"))return;
 const button=$("saveProfile"),nome=text($("name")?.value),cidade=text($("city")?.value),uf=text($("uf")?.value).toUpperCase(),categoria=text($("categoria")?.value)||"Iniciante",historico=historyFromForm();
 if(nome.length<2||cidade.length<2||!uf){status("profileStatus","Preencha nome, cidade e estado.",true);return}
 if(historico.some(x=>!x.campeonato||!x.colocacao||!x.ano)){status("profileStatus","Complete nome, colocação e ano de todos os campeonatos.",true);return}
 button.disabled=true;status("profileStatus","Salvando seu perfil...");
 try{
  const [pubSnap,userSnap]=await Promise.all([getDoc(doc(db,"perfis",currentUser.uid)),getDoc(doc(db,"usuarios",currentUser.uid))]),oldPublic=pubSnap.exists()?pubSnap.data():{},userData=userSnap.exists()?userSnap.data():{};
  const avatarFile=$("avatarInput")?.files?.[0],coverFile=$("coverInput")?.files?.[0];
  const avatarUp=avatarFile?await uploadFile(avatarFile,"perfil",5*1024*1024):null,coverUp=coverFile?await uploadFile(coverFile,"capa",8*1024*1024):null;
  const fotoUrl=avatarUp?.url||oldPublic.fotoUrl||"",fotoPath=avatarUp?.path||oldPublic.fotoPath||"",capaUrl=coverUp?.url||oldPublic.capaUrl||"",capaPath=coverUp?.path||oldPublic.capaPath||"";
  const modalidade=text($("modalidade")?.value),posicao=text($("posicao")?.value),time=text($("time")?.value),bio=text($("bio")?.value),plan=planData(userData);
  const publicProfile={uid:currentUser.uid,nome,cidade,uf,modalidade,posicao,categoria,time,bio,fotoUrl,fotoPath,capaUrl,capaPath,historicoCampeonatos:historico};
  const privateProfile={uid:currentUser.uid,nome,email:currentUser.email||userData.email||"",papel:userData.papel||"usuario",status:"ativo",nascimento:text($("birth")?.value),cidade,uf,modalidade,posicao,categoria,time,contato:text($("contato")?.value),bio,historicoCampeonatos:historico,fotoUrl,fotoPath,capaUrl,capaPath,...plan,atualizadoEm:serverTimestamp()};
  if(!userSnap.exists())privateProfile.criadoEm=serverTimestamp();if(userData.legadoAtletaId)privateProfile.legadoAtletaId=userData.legadoAtletaId;
  await setDoc(doc(db,"usuarios",currentUser.uid),privateProfile,{merge:true});await setDoc(doc(db,"perfis",currentUser.uid),publicProfile,{merge:false});
  const legacy=await getDocs(query(collection(db,"atletas"),where("ownerUid","==",currentUser.uid)));if(!legacy.empty)await updateDoc(legacy.docs[0].ref,{nome,cidade,uf,modalidade,posicao,categoria,time,historicoCampeonatos:historico,foto:fotoUrl,nascimento:deleteField(),ownerEmail:deleteField(),atualizadoEm:serverTimestamp()});
  if($("avatar")&&fotoUrl)$("avatar").src=fotoUrl;if($("coverPreview")&&capaUrl)$("coverPreview").style.backgroundImage=`url("${capaUrl.replace(/"/g,"%22")}")`;if($("displayName"))$("displayName").textContent=nome;status("profileStatus","Perfil salvo com segurança.")
 }catch(error){console.error("Perfil Cloudinary:",error);status("profileStatus",error?.message||"Não foi possível salvar o perfil.",true)}finally{button.disabled=false}
}

async function publishMedia(file,kind){
 if(!currentUser||!file)return;const caption=text($("captionInput")?.value);status("mediaStatus","Enviando mídia...");
 try{
  if(kind==="photo"){
   const up=await uploadFile(file,"publicacoes",10*1024*1024);await addDoc(collection(db,"publicacoes"),{ownerUid:currentUser.uid,ownerEmail:currentUser.email||"",nome:text($("name")?.value)||currentUser.displayName||"Atleta",texto:caption,imagem:up.url,imagemUrl:up.url,imagemPath:up.path,imagemMime:up.mime,imagemTamanho:up.size,legenda:caption,tipo:"imagem",armazenamento:"cloudinary",aprovado:true,status:"publicado",criadoEm:serverTimestamp()})
  }else if(kind==="video"){
   const up=await uploadFile(file,"videos",45*1024*1024);await addDoc(collection(db,"videos"),{ownerUid:currentUser.uid,nome:text($("name")?.value)||currentUser.displayName||"Atleta",videoUrl:up.url,videoPath:up.path,videoMime:up.mime,videoTamanho:up.size,legenda:caption,aprovado:true,status:"publicado",criadoEm:serverTimestamp()})
  }else{
   const up=await uploadFile(file,"stories",45*1024*1024),mediaType=up.mime.startsWith("video/")?"video":"image";await addDoc(collection(db,"stories"),{ownerUid:currentUser.uid,nome:text($("name")?.value)||currentUser.displayName||"Atleta",mediaUrl:up.url,mediaPath:up.path,mediaType,legenda:caption,tipo:mediaType,aprovado:true,status:"publicado",criadoEm:serverTimestamp(),expiraEm:new Date(Date.now()+24*60*60*1000)})
  }
  status("mediaStatus","Publicado com sucesso.");if($("captionInput"))$("captionInput").value=""
 }catch(error){console.error("Publicação Cloudinary:",error);status("mediaStatus",error?.message||"Não foi possível publicar a mídia.",true)}
}

function installProfileV3(){
 const save=$("saveProfile");if(save)save.onclick=secureSaveProfile;
 const photo=$("photoInput"),video=$("videoInput"),story=$("storyInput");
 if(photo)photo.onchange=async()=>{const file=photo.files?.[0];photo.value="";if(file)await publishMedia(file,"photo")};
 if(video)video.onchange=async()=>{const file=video.files?.[0];video.value="";if(file)await publishMedia(file,"video")};
 if(story)story.onchange=async()=>{const file=story.files?.[0];story.value="";if(file)await publishMedia(file,"story")};
}

function selectedSocialFile(){return capturedSocialFile||$("cameraInput")?.files?.[0]||$("galleryInput")?.files?.[0]||null}
function clearCapturedMedia(){capturedSocialFile=null}

async function publishFromPublicProfile(){
 if(!currentUser){socialStatus("Entre na sua conta para publicar.",true);return}
 const uid=new URLSearchParams(location.search).get("uid");if(!uid||currentUser.uid!==uid){socialStatus("Você só pode publicar no seu próprio perfil.",true);return}
 const file=selectedSocialFile();if(!file){socialStatus("Selecione uma mídia antes de publicar.",true);return}
 const button=$("postMediaBtn"),caption=text($("captionInput")?.value),nome=text($("name")?.textContent)||currentUser.displayName||"Atleta";if(button)button.disabled=true;socialStatus("Publicando...");
 try{
  const isVideo=file.type.startsWith("video/"),up=await uploadCloudinary(file,{maxBytes:isVideo?45*1024*1024:10*1024*1024,allowImage:true,allowVideo:true,tags:["cadastro-de-atletas",socialPublishType==="story"?"stories":isVideo?"videos":"publicacoes"]});
  if(socialPublishType==="story"){
   const mediaType=isVideo?"video":"image";await addDoc(collection(db,"stories"),{ownerUid:currentUser.uid,nome,mediaUrl:up.url,mediaPath:up.path,mediaType,tipo:mediaType,legenda:caption,aprovado:true,status:"publicado",criadoEm:serverTimestamp(),expiraEm:new Date(Date.now()+24*60*60*1000)})
  }else if(isVideo){
   await addDoc(collection(db,"videos"),{ownerUid:currentUser.uid,nome,videoUrl:up.url,videoPath:up.path,videoMime:up.mime,videoTamanho:up.size,legenda:caption,aprovado:true,status:"publicado",criadoEm:serverTimestamp()})
  }else{
   await addDoc(collection(db,"publicacoes"),{ownerUid:currentUser.uid,ownerEmail:currentUser.email||"",nome,texto:caption||"Foto publicada pelo atleta.",imagem:up.url,imagemUrl:up.url,imagemPath:up.path,imagemMime:up.mime,imagemTamanho:up.size,legenda:caption,tipo:"imagem",armazenamento:"cloudinary",aprovado:true,status:"publicado",criadoEm:serverTimestamp()})
  }
  socialStatus("Publicado com sucesso.");clearCapturedMedia();setTimeout(()=>location.reload(),450)
 }catch(error){console.error("Perfil social Cloudinary:",error);socialStatus(error?.message||"Não foi possível publicar a mídia.",true)}finally{if(button)button.disabled=false}
}

function installPublicProfileCloudinary(){
 if(!$("postMediaBtn"))return;
 document.addEventListener("change",event=>{const input=event.target;if(input?.id==="cameraInput"||input?.id==="galleryInput"){const file=input.files?.[0];if(file)capturedSocialFile=file}},true);
 document.addEventListener("click",event=>{
  const choice=event.target.closest?.(".publish-choice");if(choice?.dataset?.publishType)socialPublishType=choice.dataset.publishType;
  if(event.target.closest?.("#changeMediaBtn,#closeMedia"))clearCapturedMedia();
  const postButton=event.target.closest?.("#postMediaBtn");if(!postButton)return;event.preventDefault();event.stopImmediatePropagation();void publishFromPublicProfile()
 },true)
}

onAuthStateChanged(auth,user=>{currentUser=user;atualizarMinhaContaMenu();setTimeout(installProfileV3,0);setTimeout(installProfileV3,400)});
installPublicProfileCloudinary();setTimeout(installProfileV3,0);
