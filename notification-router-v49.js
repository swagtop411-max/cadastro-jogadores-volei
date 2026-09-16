import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, getDoc, getFirestore, updateDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};
const app=getApps().length?getApp():initializeApp(cfg),auth=getAuth(app),db=getFirestore(app);
let user=auth.currentUser;
const adminThread=x=>String(x?.sourceId||"").startsWith("admin:");

async function readNotice(id){if(!user||!id)return null;try{const s=await getDoc(doc(db,"notificacoes",user.uid,"itens",id));return s.exists()?{id:s.id,...s.data()}:null}catch{return null}}
async function markRead(item){if(!user||!item||item.lida===true)return;try{await updateDoc(doc(db,"notificacoes",user.uid,"itens",item.id),{lida:true})}catch{}}
function messagePeer(item){
 const direct=String(item?.actorUid||"").trim();
 if(direct&&direct!==user?.uid)return direct;
 const source=String(item?.sourceId||"").trim();
 if(source&&user?.uid&&source.includes("__")){
  const parts=source.split("__").filter(Boolean);
  const other=parts.find(uid=>uid!==user.uid);
  if(other)return other;
 }
 return "";
}
function go(item){
 if(adminThread(item)){location.href=`index.html?adminNotice=${encodeURIComponent(item.id)}`;return}
 if(item.type==="message"){
  const peer=messagePeer(item);
  location.href=peer?`index.html?abrir=mensagens&uid=${encodeURIComponent(peer)}`:"index.html?abrir=mensagens";
  return;
 }
 if(["like","comment","mention"].includes(item.type)&&item.sourceId){location.href=`index.html?post=${encodeURIComponent(item.sourceId)}&activity=1#feed`;return}
 if(item.actorUid){location.href=`perfil-social.html?uid=${encodeURIComponent(item.actorUid)}`;return}
 location.href="index.html#feed";
}

document.addEventListener("click",event=>{
 const row=event.target.closest?.(".sn-row[data-sn-notification],.activity-item[data-activity-id]");if(!row||!user)return;
 const id=row.dataset.snNotification||row.dataset.activityId||"";if(!id)return;
 event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
 void(async()=>{const item=await readNotice(id);if(!item)return;await markRead(item);go(item)})();
},true);

onAuthStateChanged(auth,u=>{user=u});
