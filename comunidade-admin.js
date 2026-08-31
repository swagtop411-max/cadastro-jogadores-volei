import{getApp,getApps,initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getAuth,onAuthStateChanged}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import{
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where
}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import{deleteObject,getStorage,ref as storageRef}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";

const cfg={
  apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",
  authDomain:"jogadores-de-volei.firebaseapp.com",
  projectId:"jogadores-de-volei",
  storageBucket:"jogadores-de-volei.firebasestorage.app",
  messagingSenderId:"48728914064",
  appId:"1:48728914064:web:1dd7aeb705319886f74015"
};

const app=getApps().length?getApp():initializeApp(cfg);
const db=getFirestore(app),auth=getAuth(app),storage=getStorage(app);
const ADMIN_EMAIL="swagtop411@gmail.com";
const list=document.getElementById("comunidadeAdminLista");
const status=document.getElementById("comunidadeAdminStatus");
const badge=document.getElementById("comunidadePendentesBadge");
const refs={
  post:collection(db,"publicacoes"),
  video:collection(db,"videos"),
  story:collection(db,"stories"),
  comment:collection(db,"comentarios_publicacoes")
};
let pending=[];
let privacyWatchersStarted=false;

const text=v=>v==null?"":String(v).trim();
const esc=v=>{const el=document.createElement("div");el.textContent=v==null?"":String(v);return el.innerHTML};
const dateValue=v=>{if(!v)return 0;if(typeof v.toMillis==="function")return v.toMillis();if(v.seconds)return Number(v.seconds)*1000;const p=Date.parse(v);return Number.isNaN(p)?0:p};
const formatDate=v=>dateValue(v)?new Intl.DateTimeFormat("pt-BR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(dateValue(v))):"Agora";
const mediaUrl=item=>text(item.imagemUrl||item.imagem||item.mediaUrl||item.videoUrl);
const label={post:"PUBLICAÇÃO",story:"STORY",video:"VÍDEO",comment:"COMENTÁRIO"};

function setStatus(message,type=""){
  if(!status)return;
  status.textContent=message;
  status.className=("status "+type).trim();
}

function updateBadge(){if(badge)badge.textContent=String(pending.length)}

async function isAdminUser(user){
  if(!user)return false;
  if(String(user.email||"").trim().toLowerCase()===ADMIN_EMAIL)return true;
  try{
    const token=await user.getIdTokenResult();
    return token?.claims?.admin===true;
  }catch{
    return false;
  }
}

function card(item,type){
  const media=mediaUrl(item),isVideo=type==="video"||String(item.mediaType||"").startsWith("video");
  const mediaMarkup=media
    ?(isVideo
      ?'<video class="community-moderation-image" src="'+esc(media)+'" controls preload="metadata"></video>'
      :'<img class="community-moderation-image" src="'+esc(media)+'" alt="Mídia enviada por '+esc(item.nome||"Atleta")+'" loading="lazy">')
    :"";
  const relation=type==="comment"
    ?"Comentário na publicação "+esc(item.publicacaoId||"")
    :(type==="story"?"Story para a rede":type==="video"?"Vídeo para o feed":"Publicação para o feed");
  return '<article class="community-moderation-card" data-type="'+type+'" data-id="'+esc(item.id)+'"><div><span class="community-moderation-type">'+label[type]+'</span><h3>'+esc(item.nome||"Atleta")+'</h3><p>'+esc(item.texto||item.legenda||"")+'</p><div class="community-moderation-meta">'+relation+' · '+esc(formatDate(item.criadoEm))+'</div>'+mediaMarkup+'</div><div class="community-moderation-actions"><button class="community-approve-button" type="button" data-community-action="approve">✓ APROVAR</button><button class="community-reject-button" type="button" data-community-action="reject">✕ RECUSAR</button></div></article>';
}

function render(){
  updateBadge();
  if(!list)return;
  if(!pending.length){
    list.innerHTML='<div class="community-admin-empty">Nenhum conteúdo aguardando moderação.</div>';
    return;
  }
  const order={post:1,story:2,video:3,comment:4};
  const groups={
    post:pending.filter(x=>x.type==="post"),
    story:pending.filter(x=>x.type==="story"),
    video:pending.filter(x=>x.type==="video"),
    comment:pending.filter(x=>x.type==="comment")
  };
  list.innerHTML=Object.keys(groups)
    .filter(k=>groups[k].length)
    .sort((a,b)=>order[a]-order[b])
    .map(k=>'<div class="community-admin-separator">'+label[k]+'S ('+groups[k].length+')</div><div class="community-admin-list">'+groups[k].map(x=>card(x.item,k)).join("")+'</div>')
    .join("");
}

async function loadModeration(){
  if(!list)return;
  list.innerHTML='<p class="subtitulo">Carregando pendências...</p>';
  try{
    const snaps=await Promise.all(
      Object.entries(refs).map(async([type,collectionRef])=>({
        type,
        snapshot:await getDocs(query(collectionRef,where("aprovado","==",false)))
      }))
    );
    pending=snaps
      .flatMap(({type,snapshot})=>snapshot.docs.map(d=>({type,id:d.id,item:{id:d.id,...d.data()}})))
      .filter(x=>x.item.status==="pendente")
      .sort((a,b)=>dateValue(a.item.criadoEm)-dateValue(b.item.criadoEm));
    render();
    setStatus(pending.length+" item(ns) aguardando moderação.","success");
  }catch(error){
    console.error("Erro ao carregar moderação:",error);
    list.innerHTML='<div class="community-admin-error">Não foi possível carregar as pendências. Confirme se as regras do Firestore foram publicadas.</div>';
    setStatus("Erro ao carregar a comunidade.","error");
  }
}

function privatePayload(data,fields){
  const payload={};
  for(const field of fields){
    if(Object.prototype.hasOwnProperty.call(data,field))payload[field]=data[field];
  }
  return payload;
}

async function migrateSensitiveDocument(collectionName,snapshot,fields){
  const data=snapshot.data()||{};
  const payload=privatePayload(data,fields);
  if(!Object.keys(payload).length)return;

  // Primeiro preserva os dados; só depois remove do documento público.
  await setDoc(
    doc(db,collectionName,snapshot.id,"privado","dados"),
    {...payload,privacidadeMigradaEm:serverTimestamp()},
    {merge:true}
  );

  const removals={};
  for(const field of Object.keys(payload))removals[field]=deleteField();
  removals.privacidadeV3=serverTimestamp();
  await updateDoc(snapshot.ref,removals);
}

async function sanitizeSnapshot(snapshot,collectionName,fields){
  for(const change of snapshot.docChanges()){
    if(change.type==="removed")continue;
    try{
      await migrateSensitiveDocument(collectionName,change.doc,fields);
    }catch(error){
      // Não remove nada se o armazenamento privado ainda não estiver autorizado.
      console.warn("Privacidade V3: não foi possível migrar",collectionName,change.doc.id,error?.code||error);
    }
  }
}

function startPrivacyWatchers(){
  if(privacyWatchersStarted)return;
  privacyWatchersStarted=true;

  const athletePrivate=[
    "nascimento","ownerEmail","ownerDisplayName","valorPlano","planoStatus","pagamentoConfirmado"
  ];
  const teamPrivate=[
    "contato","responsavel","ownerEmail","valorPlano","planoStatus","pagamentoConfirmado"
  ];

  onSnapshot(
    collection(db,"atletas"),
    snap=>void sanitizeSnapshot(snap,"atletas",athletePrivate),
    error=>console.warn("Privacidade V3 atletas:",error?.code||error)
  );

  onSnapshot(
    collection(db,"equipes"),
    snap=>void sanitizeSnapshot(snap,"equipes",teamPrivate),
    error=>console.warn("Privacidade V3 equipes:",error?.code||error)
  );
}

function mediaPathFor(type,item){
  if(type==="post")return text(item.imagemPath);
  if(type==="story")return text(item.mediaPath);
  if(type==="video")return text(item.videoPath);
  return "";
}

async function removeStoredMedia(type,item){
  const path=mediaPathFor(type,item);
  if(!path)return;
  try{
    await deleteObject(storageRef(storage,path));
  }catch(error){
    // Arquivo já inexistente não deve impedir a moderação do documento.
    if(error?.code!=="storage/object-not-found")console.warn("Falha ao remover mídia rejeitada:",error);
  }
}

async function cleanupExpiredStories(){
  try{
    const now=Timestamp.now();
    const snap=await getDocs(query(collection(db,"stories"),where("expiraEm","<=",now)));
    for(const storyDoc of snap.docs){
      const item=storyDoc.data()||{};
      await removeStoredMedia("story",item);
      await deleteDoc(storyDoc.ref);
    }
  }catch(error){
    console.warn("Limpeza de stories expirados:",error?.code||error);
  }
}

list?.addEventListener("click",async event=>{
  const button=event.target.closest("button[data-community-action]");
  const cardEl=event.target.closest("[data-type][data-id]");
  if(!button||!cardEl)return;

  const type=cardEl.dataset.type,id=cardEl.dataset.id;
  const approve=button.dataset.communityAction==="approve";
  if(!approve&&!window.confirm("Recusar e excluir este conteúdo? Essa ação não pode ser desfeita."))return;

  button.disabled=true;
  try{
    const collectionName={post:"publicacoes",story:"stories",video:"videos",comment:"comentarios_publicacoes"}[type];
    const current=pending.find(x=>x.type===type&&x.id===id)?.item||{};
    if(approve){
      await updateDoc(doc(db,collectionName,id),{
        aprovado:true,
        status:type==="comment"?"ativo":"publicado",
        aprovadoEm:serverTimestamp()
      });
    }else{
      await removeStoredMedia(type,current);
      await deleteDoc(doc(db,collectionName,id));
    }
    await loadModeration();
    setStatus(approve?"Conteúdo aprovado e publicado.":"Conteúdo recusado, removido e mídia limpa.","success");
  }catch(error){
    console.error("Erro ao moderar:",error);
    button.disabled=false;
    setStatus("Não foi possível concluir a moderação. Tente novamente.","error");
  }
});

document.getElementById("btnAtualizarComunidade")?.addEventListener("click",loadModeration);

onAuthStateChanged(auth,async user=>{
  if(!(await isAdminUser(user)))return;
  startPrivacyWatchers();
  void cleanupExpiredStories();
  void loadModeration();
});
