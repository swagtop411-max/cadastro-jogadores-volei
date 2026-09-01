import{getApp,getApps,initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getAuth}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import{deleteDoc,doc,getDoc,getFirestore,serverTimestamp,setDoc}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};
const app=getApps().length?getApp():initializeApp(cfg),auth=getAuth(app),db=getFirestore(app),ADMIN_EMAIL="swagtop411@gmail.com";
let busy=false;

async function isAdmin(){const user=auth.currentUser;if(!user)return false;if(String(user.email||"").trim().toLowerCase()===ADMIN_EMAIL)return true;try{return(await user.getIdTokenResult()).claims?.admin===true}catch{return false}}
function safeArray(v,fallback){return Array.isArray(v)?v:(fallback?[fallback]:[])}
async function secureApprovePending(id){
 if(busy||!(await isAdmin()))return;busy=true;
 try{
  const ref=doc(db,"atletas_pendentes",id),snap=await getDoc(ref);if(!snap.exists())return;
  const a=snap.data()||{},paid=a.planoId&&a.planoId!=="gratuito";
  const question=paid&&!a.pagamentoConfirmado?`Confirmar o pagamento do plano ${a.plano||"pago"} e publicar este atleta?`:"Aprovar este cadastro e publicar o atleta?";
  if(!confirm(question))return;
  const publicData={
   ownerUid:String(a.ownerUid||""),nome:String(a.nome||""),cidade:String(a.cidade||""),uf:String(a.uf||""),
   modalidades:safeArray(a.modalidades,a.modalidade),posicoes:safeArray(a.posicoes,a.posicao),
   modalidade:Array.isArray(a.modalidades)?a.modalidades.join(", "):String(a.modalidade||""),
   posicao:Array.isArray(a.posicoes)?a.posicoes.join(", "):String(a.posicao||""),
   categoria:String(a.categoria||""),time:String(a.time||""),status:"ativo",aprovacao:"aprovado",
   historicoEquipes:Array.isArray(a.historicoEquipes)?a.historicoEquipes:[],historicoCampeonatos:Array.isArray(a.historicoCampeonatos)?a.historicoCampeonatos:[],
   observacoes:String(a.observacoes||""),foto:String(a.foto||""),plano:String(a.plano||"Gratuito"),planoId:String(a.planoId||"gratuito"),
   criadoEm:a.criadoEm||new Date().toISOString(),atualizadoEm:serverTimestamp()
  };
  const privateData={nascimento:String(a.nascimento||""),contato:String(a.contato||""),ownerEmail:String(a.ownerEmail||""),valorPlano:Number(a.valorPlano||0),planoStatus:"ativo",pagamentoConfirmado:paid?true:a.pagamentoConfirmado===true,atualizadoEm:serverTimestamp(),origem:"cadastro-atleta-v8"};
  await setDoc(doc(db,"atletas",id),publicData,{merge:false});
  await setDoc(doc(db,"atletas",id,"privado","dados"),privateData,{merge:true});
  await deleteDoc(ref);
  document.getElementById("btnAtualizarNovosCadastros")?.click();
  alert(paid?"Pagamento confirmado e atleta publicado sem expor dados privados.":"Atleta publicado sem expor dados privados.");
 }catch(error){console.error("Aprovação segura V8:",error);alert("Não foi possível aprovar o cadastro com segurança.")}
 finally{busy=false}
}

document.addEventListener("click",event=>{
 const button=event.target.closest?.("#novosCadastrosLista .aprovar");if(!button)return;
 event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
 const card=button.closest(".novo-card"),id=card?.querySelector(".recusar")?.onclick?null:null;
 // O admin.js não expõe o ID no DOM. Encontramos o documento pelo nome/foto visíveis apenas como fallback seguro.
 const name=card?.querySelector(".atleta-info strong")?.textContent?.trim();
 if(!name){alert("Não foi possível identificar este cadastro.");return}
 void (async()=>{
   try{
    const{collection,getDocs,limit,query,where}=await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js");
    const snap=await getDocs(query(collection(db,"atletas_pendentes"),where("nome","==",name),limit(10)));
    if(snap.empty){alert("Cadastro pendente não encontrado.");return}
    if(snap.size>1){alert("Há mais de um cadastro pendente com este nome. Use a rotina administrativa padrão até diferenciarmos os registros.");return}
    await secureApprovePending(snap.docs[0].id);
   }catch(error){console.error(error);alert("Não foi possível localizar o cadastro pendente.")}
 })();
},true);
