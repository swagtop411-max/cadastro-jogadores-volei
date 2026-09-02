import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getFirestore,
  increment,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig={
  apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",
  authDomain:"jogadores-de-volei.firebaseapp.com",
  projectId:"jogadores-de-volei",
  storageBucket:"jogadores-de-volei.firebasestorage.app",
  messagingSenderId:"48728914064",
  appId:"1:48728914064:web:1dd7aeb705319886f74015"
};

const app=getApps().length?getApp():initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getFirestore(app);

function deviceCategory(){
  const width=window.innerWidth||0;
  if(width<=700)return "celular";
  if(width<=1100)return "tablet";
  return "computador";
}

function providerOf(user){
  const provider=user?.providerData?.find?.(item=>item?.providerId)?.providerId||"password";
  return String(provider).slice(0,40);
}

async function ensureAccountDocument(user){
  if(!user?.uid)return;
  const ref=doc(db,"usuarios",user.uid);
  try{
    const snap=await getDoc(ref);
    if(snap.exists())return;
    await setDoc(ref,{
      uid:user.uid,
      nome:user.displayName||"Usuário",
      email:user.email||"",
      papel:"usuario",
      status:"ativo",
      criadoEm:serverTimestamp(),
      atualizadoEm:serverTimestamp()
    });
  }catch(error){
    console.warn("Não foi possível sincronizar a conta no cadastro administrativo:",error?.code||error);
  }
}

async function updateAccountActivity(user,type){
  if(!user?.uid)return;
  await ensureAccountDocument(user);
  const patch={
    atualizadoEm:serverTimestamp(),
    ultimoAcessoEm:serverTimestamp(),
    emailVerificado:user.emailVerified===true,
    provedor:providerOf(user),
    ultimaPlataforma:"web"
  };
  if(type==="login"||type==="cadastro"){
    patch.ultimoLoginEm=serverTimestamp();
    patch.totalLogins=increment(1);
  }
  try{
    await setDoc(doc(db,"usuarios",user.uid),patch,{merge:true});
  }catch(error){
    // Compatibilidade: enquanto as novas regras ainda não tiverem sido publicadas,
    // a conta continua funcionando e o documento-base permanece disponível ao ADM.
    if(error?.code!=="permission-denied")console.warn("Atividade da conta não sincronizada:",error);
  }
}

async function saveAccessLog(user,type){
  if(!user?.uid)return;
  try{
    await addDoc(collection(db,"access_logs"),{
      uid:user.uid,
      email:user.email||"",
      nome:user.displayName||"Usuário",
      tipo:type,
      plataforma:"web",
      dispositivo:deviceCategory(),
      pagina:String(location.pathname||"/").slice(0,200),
      criadoEm:serverTimestamp()
    });
  }catch(error){
    if(error?.code!=="permission-denied")console.warn("Log de acesso não registrado:",error);
  }
}

export async function recordAuthEvent(user,type="sessao"){
  if(!user?.uid)return;
  const safeType=["cadastro","login","sessao"].includes(type)?type:"sessao";
  await updateAccountActivity(user,safeType);
  await saveAccessLog(user,safeType);
}

async function registerSession(user){
  if(!user?.uid)return;
  await ensureAccountDocument(user);
  const key=`bd_auth_session_v10_${user.uid}`;
  let already=false;
  try{already=sessionStorage.getItem(key)==="1"}catch{}
  if(already){
    try{
      await setDoc(doc(db,"usuarios",user.uid),{
        atualizadoEm:serverTimestamp(),
        ultimoAcessoEm:serverTimestamp(),
        emailVerificado:user.emailVerified===true,
        provedor:providerOf(user),
        ultimaPlataforma:"web"
      },{merge:true});
    }catch{}
    return;
  }
  try{sessionStorage.setItem(key,"1")}catch{}
  await recordAuthEvent(user,"sessao");
}

onAuthStateChanged(auth,user=>{
  if(user)registerSession(user).catch(error=>console.warn("Sessão não registrada:",error));
});
