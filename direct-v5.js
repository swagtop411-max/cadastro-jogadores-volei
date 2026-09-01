import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { collection, deleteDoc, doc, getDoc, getDocs, getFirestore, limit, orderBy, query, setDoc, Timestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};
const app=getApps().length?getApp():initializeApp(cfg),auth=getAuth(app),db=getFirestore(app);
let activeOtherUid="";
let decorating=false;
let scheduled=0;
const conversationId=(a,b)=>[a,b].sort().join("__");

function installStyles(){
  if(document.getElementById("directV5Styles"))return;
  const style=document.createElement("style");
  style.id="directV5Styles";
  style.textContent=`
    .sn-msg{position:relative}.sn-msg.mine{padding-right:28px}.sn-msg-unsend{position:absolute;right:5px;top:5px;width:20px;height:20px;min-height:20px!important;padding:0!important;border:0!important;border-radius:50%!important;background:rgba(0,0,0,.16)!important;color:rgba(0,0,0,.58)!important;font-size:12px!important;line-height:20px!important;opacity:0;transition:.15s!important}.sn-msg.mine:hover .sn-msg-unsend,.sn-msg-unsend:focus-visible{opacity:1}.sn-msg-read{display:block!important;margin-top:3px!important;color:#8b938c!important;font-size:7px!important;text-align:right!important;opacity:1!important}.sn-msg.mine .sn-msg-read{color:#5f4c20!important}@media(max-width:700px){.sn-msg-unsend{opacity:.62}}
  `;
  document.head.appendChild(style);
}

function inferOtherUid(){
  if(activeOtherUid)return activeOtherUid;
  if(/perfil-social\.html$/i.test(location.pathname)){
    const uid=new URLSearchParams(location.search).get("uid")||"";
    if(uid&&uid!==auth.currentUser?.uid)return uid;
  }
  return "";
}

async function latestConversationState(chatId){
  try{const snap=await getDoc(doc(db,"conversas",chatId));return snap.exists()?snap.data():null}catch{return null}
}

async function rebuildConversationPreview(chatId){
  try{
    const snap=await getDocs(query(collection(db,"conversas",chatId,"mensagens"),orderBy("createdAt","desc"),limit(1)));
    const latest=snap.docs[0]?.data();
    await setDoc(doc(db,"conversas",chatId),latest?{
      lastMessage:String(latest.text||"").slice(0,500),
      lastSenderUid:latest.senderUid||"",
      lastMessageAt:latest.createdAt||Timestamp.now()
    }:{lastMessage:"",lastSenderUid:"",lastMessageAt:Timestamp.now()},{merge:true});
  }catch(error){console.warn("Atualizar prévia da conversa:",error)}
}

async function unsend(chatId,messageId,button){
  if(!auth.currentUser||!chatId||!messageId)return;
  if(!confirm("Desfazer o envio desta mensagem?"))return;
  button.disabled=true;
  try{
    await deleteDoc(doc(db,"conversas",chatId,"mensagens",messageId));
    await rebuildConversationPreview(chatId);
  }catch(error){console.error("Desfazer envio:",error);alert("Não foi possível desfazer o envio.");button.disabled=false}
}

async function decorateMessages(){
  if(decorating)return;
  const user=auth.currentUser,list=document.getElementById("snChatMessages"),otherUid=inferOtherUid();
  if(!user||!list||!otherUid)return;
  const chatId=conversationId(user.uid,otherUid);
  decorating=true;
  try{
    const snap=await getDocs(query(collection(db,"conversas",chatId,"mensagens"),orderBy("createdAt","asc"),limit(200)));
    const docs=snap.docs;
    const nodes=[...list.querySelectorAll(".sn-msg")];
    if(!nodes.length||nodes.length!==docs.length)return;
    nodes.forEach((node,index)=>{
      const data=docs[index].data();
      node.dataset.messageId=docs[index].id;
      if(data.senderUid===user.uid&&!node.querySelector(".sn-msg-unsend")){
        const button=document.createElement("button");
        button.type="button";button.className="sn-msg-unsend";button.title="Desfazer envio";button.setAttribute("aria-label","Desfazer envio");button.textContent="×";
        button.onclick=event=>{event.preventDefault();event.stopPropagation();unsend(chatId,docs[index].id,button)};
        node.appendChild(button);
      }
    });
    const state=await latestConversationState(chatId);
    list.querySelectorAll(".sn-msg-read").forEach(el=>el.remove());
    if(state?.lastSenderUid===user.uid&&(state.lastReadBy||[]).includes(otherUid)){
      for(let i=docs.length-1;i>=0;i--){
        if(docs[i].data().senderUid!==user.uid)continue;
        const node=nodes[i];if(node){const seen=document.createElement("small");seen.className="sn-msg-read";seen.textContent="Visto";node.appendChild(seen)}
        break;
      }
    }
  }catch(error){console.warn("Direct V5:",error)}finally{decorating=false}
}

function scheduleDecorate(){clearTimeout(scheduled);scheduled=setTimeout(decorateMessages,90)}

document.addEventListener("click",event=>{
  const inboxRow=event.target.closest?.("[data-sn-other]");
  if(inboxRow?.dataset.snOther){activeOtherUid=inboxRow.dataset.snOther;scheduleDecorate();return}
  if(event.target.closest?.("#snProfileMessageBtn")){
    const uid=new URLSearchParams(location.search).get("uid")||"";
    if(uid&&uid!==auth.currentUser?.uid)activeOtherUid=uid;
    scheduleDecorate();
  }
},true);

const observer=new MutationObserver(mutations=>{
  if(mutations.some(m=>m.target?.id==="snChatMessages"||m.target?.closest?.("#snChatMessages")))scheduleDecorate();
});
observer.observe(document.documentElement,{subtree:true,childList:true});
installStyles();
