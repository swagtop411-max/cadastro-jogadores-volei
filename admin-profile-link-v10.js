import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig={
  apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",
  authDomain:"jogadores-de-volei.firebaseapp.com",
  projectId:"jogadores-de-volei",
  storageBucket:"jogadores-de-volei.firebasestorage.app",
  messagingSenderId:"48728914064",
  appId:"1:48728914064:web:1dd7aeb705319886f74015"
};
const ADMIN_EMAIL="swagtop411@gmail.com";
const app=getApps().length?getApp():initializeApp(firebaseConfig);
const auth=getAuth(app),db=getFirestore(app);

const text=value=>String(value??"").trim();
const validUf=value=>/^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/.test(text(value).toUpperCase());
const validCategory=value=>["Iniciante","Intermediário","Avançado"].includes(text(value));

function splitCity(raw,rawUf){
  let city=text(raw),uf=text(rawUf).toUpperCase();
  const prefix=city.match(/^([A-Z]{2})\s*-\s*(.+)$/i);
  if(prefix){if(!uf)uf=prefix[1].toUpperCase();city=prefix[2].trim()}
  const suffix=city.match(/^(.+?)\s*-\s*([A-Z]{2})$/i);
  if(suffix&&validUf(suffix[2])){if(!uf)uf=suffix[2].toUpperCase();city=suffix[1].trim()}
  return {city,uf};
}

function publicProfilePatch(current,athlete,uid){
  const place=splitCity(current?.cidade||athlete?.cidade,current?.uf||athlete?.uf);
  const category=validCategory(current?.categoria)?current.categoria:(validCategory(athlete?.categoria)?athlete.categoria:"Iniciante");
  const history=Array.isArray(current?.historicoCampeonatos)&&current.historicoCampeonatos.length
    ? current.historicoCampeonatos
    : (Array.isArray(athlete?.historicoCampeonatos)?athlete.historicoCampeonatos:[]);
  return {
    uid,
    nome:text(current?.nome)||text(athlete?.nome)||"Atleta",
    cidade:place.city||"Não informada",
    uf:validUf(place.uf)?place.uf:"SP",
    modalidade:text(current?.modalidade)||text(athlete?.modalidade)||(Array.isArray(athlete?.modalidades)?athlete.modalidades.join(", "):"Vôlei de praia"),
    posicao:text(current?.posicao)||text(athlete?.posicao)||(Array.isArray(athlete?.posicoes)?athlete.posicoes.join(", "):"Universal"),
    categoria:category,
    time:text(current?.time)||text(athlete?.time),
    bio:text(current?.bio)||text(athlete?.observacoes),
    fotoUrl:text(current?.fotoUrl)||text(athlete?.foto),
    fotoPath:text(current?.fotoPath),
    capaUrl:text(current?.capaUrl),
    capaPath:text(current?.capaPath),
    historicoCampeonatos:history.slice(0,30)
  };
}

async function assertAdmin(){
  const user=auth.currentUser;
  if(!user||text(user.email).toLowerCase()!==ADMIN_EMAIL)throw new Error("Apenas o administrador pode fazer vínculos manuais.");
  return user;
}

export async function linkLegacyProfile(profileId,uid){
  await assertAdmin();
  profileId=text(profileId);uid=text(uid);
  if(!profileId||!uid)throw new Error("Informe o ID do perfil legado e o UID da conta.");

  const athleteRef=doc(db,"atletas",profileId);
  const [athleteSnap,userSnap,socialSnap,ownedSnap]=await Promise.all([
    getDoc(athleteRef),
    getDoc(doc(db,"usuarios",uid)),
    getDoc(doc(db,"perfis",uid)),
    getDocs(query(collection(db,"atletas"),where("ownerUid","==",uid)))
  ]);
  if(!athleteSnap.exists())throw new Error("O perfil legado não foi encontrado em atletas.");
  if(!userSnap.exists()&&!socialSnap.exists())throw new Error("Esse UID ainda não possui conta registrada nem perfil social. Peça para o usuário entrar no site uma vez e tente novamente.");

  const athlete=athleteSnap.data()||{};
  const currentOwner=text(athlete.ownerUid);
  if(currentOwner&&currentOwner!==uid)throw new Error("Esse perfil legado já está vinculado a outra conta.");

  const conflicts=ownedSnap.docs.filter(item=>item.id!==profileId);
  if(conflicts.length){
    const names=conflicts.map(item=>text(item.data()?.nome)||item.id).join(", ");
    throw new Error(`Esse UID já está ligado a outro cadastro de atleta: ${names}. Revise antes de continuar.`);
  }

  await updateDoc(athleteRef,{
    ownerUid:uid,
    ownerEmail:deleteField(),
    ownerDisplayName:deleteField(),
    atualizadoEm:serverTimestamp()
  });

  // O perfil social é a identidade principal. Mantemos o que o usuário já preencheu
  // e usamos o cadastro legado apenas para completar campos esportivos ausentes.
  const currentSocial=socialSnap.exists()?socialSnap.data():{};
  const patch=publicProfilePatch(currentSocial,athlete,uid);
  await setDoc(doc(db,"perfis",uid),patch,{merge:true});

  // Limpa solicitações antigas do mesmo perfil ou UID. O ownerUid passa a ser a fonte
  // oficial do vínculo, evitando documentos de reivindicação duplicados.
  try{
    const claims=await getDocs(collection(db,"reivindicacoes_perfis"));
    const related=claims.docs.filter(item=>{
      const data=item.data()||{};
      return text(data.perfilId)===profileId||text(data.solicitanteUid)===uid;
    });
    await Promise.all(related.map(item=>deleteDoc(item.ref)));
  }catch(error){console.warn("Vínculo concluído, mas não foi possível limpar solicitações antigas:",error)}

  return {
    profileId,
    uid,
    athleteName:text(athlete.nome)||text(currentSocial.nome)||"Atleta",
    accountEmail:text(userSnap.data()?.email)||""
  };
}

function setManualStatus(message,type=""){
  const output=document.getElementById("vinculoManualStatus");
  if(!output)return;
  output.textContent=message;
  output.className=`status ${type}`.trim();
}

// Captura antes do listener legado de admin.js. Isso elimina o erro "perfilId is not defined"
// sem depender da ordem em que os módulos administrativos terminaram de carregar.
document.addEventListener("submit",async event=>{
  if(event.target?.id!=="vinculoManualForm")return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const form=event.target;
  const button=form.querySelector('button[type="submit"]');
  const profileId=document.getElementById("vinculoPerfilId")?.value||"";
  const uid=document.getElementById("vinculoUid")?.value||"";
  if(button){button.disabled=true;button.textContent="VINCULANDO..."}
  setManualStatus("Conferindo conta, perfil legado e possíveis duplicidades...");
  try{
    const result=await linkLegacyProfile(profileId,uid);
    setManualStatus(`✓ ${result.athleteName} foi vinculado ao UID ${result.uid}. O perfil social da conta agora é a identidade principal.`,"ok");
    document.dispatchEvent(new CustomEvent("bd:profile-linked",{detail:result}));
    document.getElementById("btnAtualizarReivindicacoes")?.click();
  }catch(error){
    console.error("Falha no vínculo manual:",error);
    setManualStatus(error?.message||"Não foi possível concluir o vínculo.","erro");
  }finally{
    if(button){button.disabled=false;button.textContent="VINCULAR PERFIL"}
  }
},true);
