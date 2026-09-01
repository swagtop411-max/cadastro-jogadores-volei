import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { addDoc, collection, getDoc, doc, getFirestore, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { uploadCloudinary } from "./cloudinary-upload.js?v=20260831-2";

const firebaseConfig={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};
const app=getApps().length?getApp():initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id),text=v=>v==null?"":String(v).trim();
function setStatus(message,type=""){const el=$("publishStatus");if(!el)return;el.textContent=message;el.className=`inline-status ${type}`.trim()}

async function handleSubmit(event){
 const form=$("publishForm");if(!form||event.target!==form)return;event.preventDefault();event.stopImmediatePropagation();
 const button=form.querySelector('button[type="submit"]'),user=auth.currentUser,body=text($("postText")?.value),file=$("postPhoto")?.files?.[0]||null;
 if(!user){setStatus("Entre na sua conta para publicar.","error");return}
 if(body.length<1&&!file){setStatus("Escreva uma legenda ou selecione uma foto.","error");return}
 if(file&&!file.type.startsWith("image/")){setStatus("Selecione uma imagem JPG, PNG ou WEBP.","error");return}
 if(file&&file.size>25*1024*1024){setStatus("A foto deve ter no máximo 25 MB. Ela será enviada sem compactação de qualidade.","error");return}
 if(button)button.disabled=true;setStatus(file?"Enviando foto original em alta qualidade...":"Publicando...");
 try{
  let upload=null;if(file)upload=await uploadCloudinary(file,{maxBytes:25*1024*1024,allowImage:true,allowVideo:false,tags:["cadastro-de-atletas","publicacoes","comunidade"]});
  let nome=user.displayName||"Atleta";try{const p=await getDoc(doc(db,"perfis",user.uid));if(p.exists()&&p.data().nome)nome=p.data().nome}catch{}
  await addDoc(collection(db,"publicacoes"),{ownerUid:user.uid,ownerEmail:user.email||"",nome,texto:body,imagem:upload?.url||"",imagemUrl:upload?.url||"",imagemPath:upload?.path||"",imagemMime:upload?.mime||"image/jpeg",imagemTamanho:Number(upload?.size||0),legenda:body,tipo:"imagem",armazenamento:upload?"cloudinary":"nenhum",aprovado:true,status:"publicado",criadoEm:serverTimestamp()});
  form.reset();if($("postCounter"))$("postCounter").textContent="0";const preview=$("photoPreview");if(preview){preview.classList.add("hidden");preview.innerHTML=""}setStatus("Publicado no feed!","success");
 }catch(error){console.error("Comunidade Cloudinary:",error);setStatus(error?.message||"Não foi possível publicar.","error")}finally{if(button)button.disabled=false}
}
document.addEventListener("submit",handleSubmit,true);
