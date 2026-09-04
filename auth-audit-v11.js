await import("./firebase-app-check-v11.js?v=20260904-2");
import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { addDoc, collection, doc, getDoc, getFirestore, serverTimestamp, setDoc, Timestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};
const app=getApps().length?getApp():initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
const TTL_MS=90*24*60*60*1000;
function deviceCategory(){const width=window.innerWidth||0;return width<=700?"celular":width<=1100?"tablet":"computador"}
async function ensureAccountDocument(user){if(!user?.uid)return;const ref=doc(db,"usuarios",user.uid);try{const snap=await getDoc(ref);if(snap.exists())return;await setDoc(ref,{uid:user.uid,nome:user.displayName||"Usuário",email:user.email||"",papel:"usuario",status:"ativo",criadoEm:serverTimestamp(),atualizadoEm:serverTimestamp()})}catch(error){console.warn("Conta administrativa não sincronizada:",error?.code||error)}}
async function saveAccessLog(user,type){if(!user?.uid)return;try{const now=Timestamp.now();await addDoc(collection(db,"access_logs"),{uid:user.uid,email:user.email||"",nome:user.displayName||"Usuário",tipo:type,plataforma:"web",dispositivo:deviceCategory(),pagina:String(location.pathname||"/").slice(0,200),fonte:"cliente",confiavel:false,criadoEm:now,expiraEm:Timestamp.fromMillis(now.toMillis()+TTL_MS)})}catch(error){if(error?.code!=="permission-denied")console.warn("Telemetria de acesso não registrada:",error)}}
export async function recordAuthEvent(user,type="sessao"){if(!user?.uid)return;const safeType=["cadastro","login","sessao"].includes(type)?type:"sessao";await ensureAccountDocument(user);await saveAccessLog(user,safeType)}
async function registerSession(user){if(!user?.uid)return;await ensureAccountDocument(user);const key=`bd_auth_session_v11_${user.uid}`;try{if(sessionStorage.getItem(key)==="1")return;sessionStorage.setItem(key,"1")}catch{}await recordAuthEvent(user,"sessao")}
onAuthStateChanged(auth,user=>{if(user)registerSession(user).catch(error=>console.warn("Sessão não registrada:",error))});
