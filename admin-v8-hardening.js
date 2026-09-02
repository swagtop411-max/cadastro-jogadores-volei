import{getApp,getApps,initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getAuth}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import{collection,deleteDoc,doc,getDoc,getDocs,getFirestore,limit,query,serverTimestamp,setDoc,where}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};
const app=getApps().length?getApp():initializeApp(cfg),auth=getAuth(app),db=getFirestore(app),ADMIN_EMAIL="swagtop411@gmail.com";let busy=false;
function isAdmin(){return String(auth.currentUser?.email||"").trim().toLowerCase()===ADMIN_EMAIL}
function safeArray(v,fallback){return Array.isArray(v)?v:(fallback?[fallback]:[])}
function normalize(v){return String(v||"").trim()}

async function secureApprovePending(id){
 if(busy||!isAdmin())return;busy=true;
 try{
  const ref=doc(db,"atletas_pendentes",id),snap=await getDoc(ref);if(!snap.exists())return;
  const a=snap.data()||{},paid=a.planoId&&a.planoId!=="gratuito",question=paid&&!a.pagamentoConfirmado?`Confirmar o pagamento do plano ${a.plano||"pago"} e publicar este atleta?`:"Aprovar este cadastro e publicar o atleta?";
  if(!confirm(question))return;
  const publicData={ownerUid:String(a.ownerUid||""),nome:String(a.nome||""),cidade:String(a.cidade||""),uf:String(a.uf||""),modalidades:safeArray(a.modalidades,a.modalidade),posicoes:safeArray(a.posicoes,a.posicao),modalidade:Array.isArray(a.modalidades)?a.modalidades.join(", "):String(a.modalidade||""),posicao:Array.isArray(a.posicoes)?a.posicoes.join(", "):String(a.posicao||""),categoria:String(a.categoria||""),time:String(a.time||""),status:"ativo",aprovacao:"aprovado",historicoEquipes:Array.isArray(a.historicoEquipes)?a.historicoEquipes:[],historicoCampeonatos:Array.isArray(a.historicoCampeonatos)?a.historicoCampeonatos:[],observacoes:String(a.observacoes||""),foto:String(a.foto||""),plano:String(a.plano||"Gratuito"),planoId:String(a.planoId||"gratuito"),criadoEm:a.criadoEm||new Date().toISOString(),atualizadoEm:serverTimestamp()};
  const privateData={nascimento:String(a.nascimento||""),contato:String(a.contato||""),ownerEmail:String(a.ownerEmail||""),valorPlano:Number(a.valorPlano||0),planoStatus:"ativo",pagamentoConfirmado:paid?true:a.pagamentoConfirmado===true,atualizadoEm:serverTimestamp(),origem:"cadastro-atleta-v8"};
  await setDoc(doc(db,"atletas",id),publicData,{merge:false});await setDoc(doc(db,"atletas",id,"privado","dados"),privateData,{merge:true});await deleteDoc(ref);
  document.getElementById("btnAtualizarNovosCadastros")?.click();
  alert(paid?"Pagamento confirmado e atleta publicado sem expor dados privados.":"Atleta publicado sem expor dados privados.");
 }catch(error){console.error("Aprovação segura de atleta V8:",error);alert("Não foi possível aprovar o cadastro com segurança.")}finally{busy=false}
}

async function secureApproveTeam(id){
 if(busy||!isAdmin())return;busy=true;
 try{
  const ref=doc(db,"equipes_pendentes",id),snap=await getDoc(ref);if(!snap.exists())return;
  const a=snap.data()||{},paid=a.planoId&&a.planoId!=="gratuito",question=paid&&!a.pagamentoConfirmado?`Confirmar o pagamento do plano ${a.plano||"pago"} e publicar esta equipe?`:"Aprovar e publicar esta equipe?";
  if(!confirm(question))return;
  const publicData={ownerUid:String(a.ownerUid||""),nome:String(a.nome||""),uf:String(a.uf||""),cidade:String(a.cidade||""),modalidade:String(a.modalidade||""),categoria:String(a.categoria||""),logo:String(a.logo||""),atletas:Array.isArray(a.atletas)?a.atletas.slice(0,30):[],plano:String(a.plano||"Gratuito"),planoId:String(a.planoId||"gratuito"),status:"ativo",aprovacao:"aprovado",criadoEm:a.criadoEm||new Date().toISOString(),atualizadoEm:serverTimestamp()};
  const privateData={responsavel:String(a.responsavel||""),contato:String(a.contato||""),ownerEmail:String(a.ownerEmail||""),valorPlano:Number(a.valorPlano||0),planoStatus:"ativo",pagamentoConfirmado:paid?true:a.pagamentoConfirmado===true,atualizadoEm:serverTimestamp(),origem:"cadastro-equipe-v8"};
  await setDoc(doc(db,"equipes",id),publicData,{merge:false});await setDoc(doc(db,"equipes",id,"privado","dados"),privateData,{merge:true});await deleteDoc(ref);
  document.getElementById("btnAtualizarEquipesPendentes")?.click();
  alert(paid?"Pagamento confirmado e equipe publicada sem expor contato ou responsável.":"Equipe publicada sem expor contato ou responsável.");
 }catch(error){console.error("Aprovação segura de equipe V8:",error);alert("Não foi possível aprovar a equipe com segurança.")}finally{busy=false}
}

async function locatePending(card){const name=normalize(card?.querySelector(".atleta-info strong")?.textContent);if(!name)return null;const photo=normalize(card?.querySelector(".novo-card-photo[src]")?.getAttribute("src")),meta=normalize(card?.querySelector(".atleta-info span")?.textContent);const snap=await getDocs(query(collection(db,"atletas_pendentes"),where("nome","==",name),limit(20)));if(snap.empty)return null;const rows=snap.docs.map(d=>({doc:d,data:d.data()||{}}));if(rows.length===1)return rows[0].doc;let matches=rows;if(photo)matches=matches.filter(x=>normalize(x.data.foto)===photo);if(matches.length===1)return matches[0].doc;if(meta){const pieces=meta.split("·").map(normalize);matches=rows.filter(x=>(!pieces[0]||normalize(x.data.cidade)===pieces[0])&&(!pieces[1]||normalize(x.data.categoria)===pieces[1]));if(matches.length===1)return matches[0].doc}return null}

document.addEventListener("click",event=>{
 const athleteButton=event.target.closest?.("#novosCadastrosLista .aprovar");
 if(athleteButton){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();const card=athleteButton.closest(".novo-card");void(async()=>{try{const pending=await locatePending(card);if(!pending){alert("Não foi possível identificar este cadastro com segurança. Atualize a lista e tente novamente.");return}await secureApprovePending(pending.id)}catch(error){console.error(error);alert("Não foi possível localizar o cadastro pendente.")}})();return}
 const teamButton=event.target.closest?.("#equipesPendentesLista .aprovar-equipe");
 if(teamButton){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();const id=normalize(teamButton.dataset.id);if(!id){alert("Não foi possível identificar esta equipe.");return}void secureApproveTeam(id)}
},true);
