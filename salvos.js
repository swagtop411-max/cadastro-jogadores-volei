import "./site-v5.js?v=20260909-46";
import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { collection, deleteDoc, doc, getDoc, getDocs, getFirestore, limit, query } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};
const app=getApps().length?getApp():initializeApp(cfg),db=getFirestore(app),auth=getAuth(app),grid=document.getElementById("savedGrid");
const esc=value=>{const d=document.createElement("div");d.textContent=value??"";return d.innerHTML};
let user=null;

async function resolvePost(saved){
  const id=saved.id;
  const preferred=saved.kind==="video"?"videos":"publicacoes";
  const candidates=preferred==="videos"?["videos","publicacoes"]:["publicacoes","videos"];
  for(const name of candidates){
    try{
      const snapshot=await getDoc(doc(db,name,id));
      if(!snapshot.exists())continue;
      const data=snapshot.data();
      return{
        id,
        collection:name,
        kind:name==="videos"?"video":"image",
        ownerUid:data.ownerUid||"",
        url:name==="videos"?(data.videoUrl||""):(data.imagemUrl||data.imagem||""),
        caption:data.legenda||data.texto||"",
        nome:data.nome||"Atleta"
      };
    }catch(error){
      console.warn(`Salvos: falha ao resolver ${name}/${id}`,error?.code||error);
    }
  }
  return null;
}

async function removeSaved(id,button){
  if(!user)return;
  button.disabled=true;
  try{
    await deleteDoc(doc(db,"salvos",user.uid,"publicacoes",id));
    button.closest(".saved-item")?.remove();
    if(!grid.querySelector(".saved-item"))renderEmpty();
  }catch(error){
    console.error(error);
    button.disabled=false;
    alert("Não foi possível remover dos salvos.");
  }
}

function renderEmpty(message="Você ainda não salvou nenhuma publicação."){
  if(!grid)return;
  grid.innerHTML=`<div class="saved-empty"><strong>Nada guardado por enquanto.</strong><span>${esc(message)}</span><br><a href="explorar.html">EXPLORAR CONTEÚDOS</a></div>`;
}

async function load(){
  if(!user||!grid)return;
  try{
    const snap=await getDocs(query(collection(db,"salvos",user.uid,"publicacoes"),limit(300)));
    const entries=await Promise.all(snap.docs.map(async item=>resolvePost({id:item.id,...item.data()})));
    const items=entries.filter(Boolean).filter(item=>item.url&&item.ownerUid);
    if(!items.length){renderEmpty();return}
    grid.innerHTML=items.map(item=>`<article class="saved-item"><a href="perfil-social.html?uid=${encodeURIComponent(item.ownerUid)}" aria-label="Abrir perfil de ${esc(item.nome)}">${item.kind==="video"?`<video src="${esc(item.url)}" muted playsinline preload="metadata"></video>`:`<img src="${esc(item.url)}" alt="Publicação salva" loading="lazy" decoding="async">`}</a><button class="saved-remove" type="button" data-remove-saved="${esc(item.id)}">REMOVER</button><div class="saved-meta"><strong>${esc(item.nome)}</strong></div></article>`).join("");
    grid.querySelectorAll("[data-remove-saved]").forEach(button=>{
      button.addEventListener("click",()=>removeSaved(button.dataset.removeSaved,button));
    });
  }catch(error){
    console.error("Salvos:",error);
    renderEmpty("Não foi possível carregar sua coleção agora.");
  }
}

onAuthStateChanged(auth,current=>{
  user=current;
  if(!current){
    location.href=`conta.html?tab=login&return=${encodeURIComponent(location.pathname)}`;
    return;
  }
  void load();
});