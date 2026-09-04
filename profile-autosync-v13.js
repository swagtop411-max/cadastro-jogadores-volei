await import("./firebase-app-check-v11.js?v=20260904-2");
import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, getDoc, getFirestore, setDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig={
  apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",
  authDomain:"jogadores-de-volei.firebaseapp.com",
  projectId:"jogadores-de-volei",
  storageBucket:"jogadores-de-volei.firebasestorage.app",
  messagingSenderId:"48728914064",
  appId:"1:48728914064:web:1dd7aeb705319886f74015"
};

const app=getApps().length?getApp():initializeApp(firebaseConfig);
const auth=getAuth(app),db=getFirestore(app);
let syncing=false;

function safeName(user,account={}){
  const direct=String(account.nome||user?.displayName||"").trim();
  if(direct.length>=2)return direct.slice(0,100);
  const prefix=String(user?.email||account.email||"").split("@")[0].replace(/[._-]+/g," ").trim();
  if(prefix.length>=2)return prefix.slice(0,100);
  return "Atleta";
}

export async function ensureSocialProfile(user=auth.currentUser){
  if(!user||syncing)return null;
  syncing=true;
  try{
    const profileRef=doc(db,"perfis",user.uid);
    const existing=await getDoc(profileRef);
    if(existing.exists())return {created:false,profile:{id:existing.id,...existing.data()}};

    let account={};
    try{
      const accountSnap=await getDoc(doc(db,"usuarios",user.uid));
      if(accountSnap.exists())account=accountSnap.data()||{};
    }catch(error){console.warn("Perfil automático: conta complementar indisponível",error)}

    const profile={
      uid:user.uid,
      nome:safeName(user,account),
      cidade:String(account.cidade||"").trim().slice(0,100),
      uf:String(account.uf||"").trim().toUpperCase().slice(0,2),
      modalidade:String(account.modalidade||"").trim().slice(0,80),
      posicao:String(account.posicao||"").trim().slice(0,80),
      categoria:String(account.categoria||"").trim().slice(0,40),
      time:String(account.time||"").trim().slice(0,100),
      bio:String(account.bio||"").trim().slice(0,500),
      fotoUrl:String(account.fotoUrl||"").trim().slice(0,2000),
      fotoPath:String(account.fotoPath||"").trim().slice(0,1000),
      capaUrl:String(account.capaUrl||"").trim().slice(0,2000),
      capaPath:String(account.capaPath||"").trim().slice(0,1000),
      historicoCampeonatos:Array.isArray(account.historicoCampeonatos)?account.historicoCampeonatos.slice(0,30):[],
      handle:"",
      instagramUrl:String(account.instagramUrl||"").trim().slice(0,300),
      completo:false
    };
    await setDoc(profileRef,profile,{merge:false});
    document.dispatchEvent(new CustomEvent("bd:social-profile-created",{detail:{uid:user.uid}}));
    return {created:true,profile:{id:user.uid,...profile}};
  }catch(error){
    if(error?.code!=="permission-denied")console.warn("Não foi possível criar o perfil social básico:",error);
    return null;
  }finally{syncing=false}
}

if(!window.__BD_PROFILE_AUTOSYNC_V13__){
  window.__BD_PROFILE_AUTOSYNC_V13__=true;
  onAuthStateChanged(auth,user=>{if(user)ensureSocialProfile(user)});
}
