from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]

def read(name): return (ROOT/name).read_text(encoding='utf-8')
def write(name,text): (ROOT/name).write_text(text,encoding='utf-8')
def exact(name,old,new,count=1):
    text=read(name); n=text.count(old)
    if n!=count: raise SystemExit(f'{name}: esperado {count} ocorrência(s), encontrou {n}: {old[:100]!r}')
    write(name,text.replace(old,new,count))
    print('OK exact',name)
def regex(name,pattern,repl,count=1,flags=re.S):
    text=read(name); out,n=re.subn(pattern,lambda _m: repl,text,count=count,flags=flags)
    if n!=count: raise SystemExit(f'{name}: regex esperado {count}, encontrou {n}: {pattern[:100]!r}')
    write(name,out); print('OK regex',name)

# ------------------------------------------------------------------
# Firestore: usuário não pode forjar plano/pagamento/métricas.
# ------------------------------------------------------------------
rules=read('firestore.rules')
user_block=r'''    match /usuarios/{uid} {
      allow read: if isAdmin() || isOwner(uid);
      allow create: if isOwner(uid)
        && request.resource.data.uid == uid
        && request.resource.data.papel == 'usuario'
        && request.resource.data.email == authEmail()
        && request.resource.data.status == 'ativo'
        && request.resource.data.keys().hasOnly([
          'uid','nome','email','papel','status','criadoEm','atualizadoEm','nascimento','cidade','uf',
          'modalidade','modalidades','posicao','posicoes','categoria','time','contato','bio',
          'historicoCampeonatos','fotoUrl','fotoPath','capaUrl','capaPath','instagramUrl'
        ]);
      allow update: if isAdmin() || (
        isOwner(uid)
        && request.resource.data.uid == resource.data.uid
        && request.resource.data.email == resource.data.email
        && request.resource.data.papel == resource.data.papel
        && request.resource.data.status == resource.data.status
        && request.resource.data.get('criadoEm', null) == resource.data.get('criadoEm', null)
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
          'nome','nascimento','cidade','uf','modalidade','modalidades','posicao','posicoes','categoria',
          'time','contato','bio','historicoCampeonatos','fotoUrl','fotoPath','capaUrl','capaPath',
          'instagramUrl','atualizadoEm'
        ])
      );
      allow delete: if isAdmin();
    }

    match /access_logs/{eventId} {
      allow read, delete: if isAdmin();
      allow create: if signedIn()
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.email == authEmail()
        && request.resource.data.nome is string && request.resource.data.nome.size() <= 100
        && request.resource.data.tipo in ['cadastro','login','sessao']
        && request.resource.data.plataforma in ['web','app']
        && request.resource.data.dispositivo is string && request.resource.data.dispositivo.size() <= 30
        && request.resource.data.pagina is string && request.resource.data.pagina.size() <= 200
        && request.resource.data.fonte == 'cliente'
        && request.resource.data.confiavel == false
        && request.resource.data.criadoEm is timestamp
        && request.resource.data.expiraEm is timestamp
        && request.resource.data.expiraEm > request.resource.data.criadoEm
        && request.resource.data.keys().hasOnly(['uid','email','nome','tipo','plataforma','dispositivo','pagina','fonte','confiavel','criadoEm','expiraEm']);
      allow update: if false;
    }

    match /site_stats/{eventId} {
      allow read, delete: if isAdmin();
      allow create: if request.resource.data.nome is string && request.resource.data.nome.size() >= 1 && request.resource.data.nome.size() <= 60
        && request.resource.data.pagina is string && request.resource.data.pagina.size() <= 200
        && request.resource.data.visitante is string && request.resource.data.visitante.size() <= 120
        && request.resource.data.dispositivo in ['Celular','Tablet','Computador']
        && request.resource.data.origem is string && request.resource.data.origem.size() <= 50
        && request.resource.data.fonte == 'cliente'
        && request.resource.data.confiavel == false
        && request.resource.data.criadoEm is timestamp
        && request.resource.data.expiraEm is timestamp
        && request.resource.data.expiraEm > request.resource.data.criadoEm
        && request.resource.data.keys().hasOnly(['nome','pagina','visitante','dispositivo','origem','fonte','confiavel','criadoEm','expiraEm']);
      allow update: if false;
    }

    match /solicitacoes_planos/{uid} {
      allow read: if isAdmin() || isOwner(uid);
      allow create, update: if isOwner(uid)
        && request.resource.data.uid == uid
        && validPlanoAtleta(request.resource.data.plano,request.resource.data.planoId,request.resource.data.valor)
        && request.resource.data.status == 'pendente'
        && request.resource.data.criadoEm is timestamp
        && request.resource.data.atualizadoEm is timestamp
        && request.resource.data.keys().hasOnly(['uid','plano','planoId','valor','status','criadoEm','atualizadoEm']);
      allow delete: if isAdmin() || (isOwner(uid) && resource.data.status == 'pendente');
    }
'''
pattern=r"    match /usuarios/\{uid\} \{.*?\n    match /perfis/\{uid\} \{"
m=re.search(pattern,rules,re.S)
if not m: raise SystemExit('firestore.rules: bloco usuarios/access_logs não localizado')
rules=rules[:m.start()]+user_block+'\n    match /perfis/{uid} {'+rules[m.end():]
# Campos públicos estruturados do perfil.
rules=rules.replace("['uid','nome','cidade','uf','modalidade','posicao','categoria','time','bio','fotoUrl','fotoPath','capaUrl','capaPath','historicoCampeonatos']","['uid','nome','cidade','uf','modalidade','posicao','categoria','time','bio','fotoUrl','fotoPath','capaUrl','capaPath','historicoCampeonatos','handle','instagramUrl']")
# Validação opcional de handle e instagram nos dois fluxos create/update.
needle="        && request.resource.data.historicoCampeonatos is list && request.resource.data.historicoCampeonatos.size() <= 30;"
addition="        && request.resource.data.historicoCampeonatos is list && request.resource.data.historicoCampeonatos.size() <= 30\n        && request.resource.data.get('handle','') is string && request.resource.data.get('handle','').size() <= 40\n        && request.resource.data.get('instagramUrl','') is string && request.resource.data.get('instagramUrl','').size() <= 300;"
if rules.count(needle)!=2: raise SystemExit(f'firestore.rules: validação perfil esperada 2, encontrada {rules.count(needle)}')
rules=rules.replace(needle,addition)
# Índice único de handles controlado pelo próprio UID.
insert_after="""    match /perfis/{uid}/privado/{documento} {
      allow read: if isAdmin() || isOwner(uid);
      allow create, update, delete: if isAdmin();
    }
"""
handles="""
    match /handles/{handle} {
      allow read: if true;
      allow create: if signedIn()
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.handle == handle
        && request.resource.data.handle is string && request.resource.data.handle.size() >= 3 && request.resource.data.handle.size() <= 40
        && request.resource.data.atualizadoEm is timestamp
        && request.resource.data.keys().hasOnly(['uid','handle','atualizadoEm']);
      allow update: if signedIn() && resource.data.uid == request.auth.uid
        && request.resource.data.uid == resource.data.uid
        && request.resource.data.handle == handle
        && request.resource.data.atualizadoEm is timestamp
        && request.resource.data.keys().hasOnly(['uid','handle','atualizadoEm']);
      allow delete: if isAdmin() || (signedIn() && resource.data.uid == request.auth.uid);
    }
"""
if insert_after not in rules: raise SystemExit('firestore.rules: ponto handles não encontrado')
rules=rules.replace(insert_after,insert_after+handles,1)
write('firestore.rules',rules)
print('OK firestore.rules core hardening')

# ------------------------------------------------------------------
# Auth telemetry V11: não atualiza plano, pagamento ou contadores do usuário.
# ------------------------------------------------------------------
auth_v11='''import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
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
'''
write('auth-audit-v11.js',auth_v11)
# Troca consumidores para V11.
exact('conta.js','import { recordAuthEvent } from "./auth-audit-v10.js?v=20260902-1";','import { recordAuthEvent } from "./auth-audit-v11.js?v=20260902-1";')
exact('site-v7-autoload.js',"  import('./auth-audit-v10.js?v=20260902-1').catch(error=>console.warn('Auditoria de sessão V10:',error));","  import('./auth-audit-v11.js?v=20260902-1').catch(error=>console.warn('Telemetria de sessão V11:',error));")

# ------------------------------------------------------------------
# Analytics próprio: Firebase singleton + telemetria marcada como não autoritativa.
# ------------------------------------------------------------------
exact('analytics.js','const [{initializeApp},{getFirestore,collection,addDoc,serverTimestamp}]=await Promise.all([','const [{getApp,getApps,initializeApp},{getFirestore,collection,addDoc,Timestamp}]=await Promise.all([')
exact('analytics.js','    initializeApp(firebaseConfig);\n    db=getFirestore();collectionFn=collection;addDocFn=addDoc;serverTimestampFn=serverTimestamp;firebaseReady=true;','    const app=getApps().length?getApp():initializeApp(firebaseConfig);\n    db=getFirestore(app);collectionFn=collection;addDocFn=addDoc;serverTimestampFn=Timestamp;firebaseReady=true;')
exact('analytics.js','try{await addDocFn(collectionFn(db,"site_stats"),{nome:String(name).slice(0,60),pagina:location.pathname.slice(0,200),visitante:visitorId(),dispositivo:device(),origem:String(p.origem||"site").slice(0,50),criadoEm:serverTimestampFn()})}catch(e){console.warn("Evento próprio não salvo:",e)}','try{const now=serverTimestampFn.now();await addDocFn(collectionFn(db,"site_stats"),{nome:String(name).slice(0,60),pagina:location.pathname.slice(0,200),visitante:visitorId(),dispositivo:device(),origem:String(p.origem||"site").slice(0,50),fonte:"cliente",confiavel:false,criadoEm:now,expiraEm:serverTimestampFn.fromMillis(now.toMillis()+90*86400000)})}catch(e){console.warn("Evento próprio não salvo:",e)}')

# ------------------------------------------------------------------
# Perfil: Cloudinary, campos seguros, handle e solicitação de plano.
# ------------------------------------------------------------------
exact('meu-perfil.js','import{getApp,getApps,initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";import{getAuth,onAuthStateChanged}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";import{getFirestore,doc,getDoc,setDoc,collection,addDoc,query,where,orderBy,getDocs,serverTimestamp,deleteField}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";import{getStorage,ref,uploadBytes,getDownloadURL}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";','import{getApp,getApps,initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";import{getAuth,onAuthStateChanged}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";import{getFirestore,doc,getDoc,setDoc,collection,addDoc,query,where,orderBy,getDocs,serverTimestamp,deleteField,deleteDoc,Timestamp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";import{uploadCloudinary}from"./cloudinary-upload.js?v=20260901-8";')
exact('meu-perfil.js','const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};const app=getApps().length?getApp():initializeApp(cfg),auth=getAuth(app),db=getFirestore(app),storage=getStorage(app);const $=id=>document.getElementById(id);let user=null,profile=null;','const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};const app=getApps().length?getApp():initializeApp(cfg),auth=getAuth(app),db=getFirestore(app);const $=id=>document.getElementById(id);let user=null,profile=null;')
regex('meu-perfil.js',r'async function upload\(file,folder\)\{.*?\}\nfunction pontosColocacao', '''async function upload(file,folder){if(!file)throw Error("Selecione um arquivo.");const max=folder==="capa"?8*1024*1024:10*1024*1024;const up=await uploadCloudinary(file,{maxBytes:max,allowImage:true,allowVideo:false,tags:["cadastro-de-atletas","perfil",folder]});return{url:up.url,path:up.path,mime:up.mime,size:up.size}}
function profileHandle(nome,uid){const base=String(nome||"atleta").trim().toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,28)||"atleta";return `${base}-${String(uid||"").slice(0,6).toLowerCase()}`}
function pontosColocacao''')
new_save='''async function saveProfile(){
 const nome=$("name").value.trim(),rawCidade=$("city").value.trim(),selectedUf=$("uf").value,loc=normalizeLocation(rawCidade,selectedUf),cidade=loc.cidade,uf=loc.uf;
 if(nome.length<2||cidade.length<2||!uf){status("Preencha nome, cidade e estado.");return}
 const historicoCampeonatos=getHistoricoCampeonatosFromForm();if(historicoCampeonatos.some(x=>!x.campeonato||!x.colocacao||!x.ano)){status("Complete nome, colocação e ano de todos os campeonatos adicionados.");return}
 try{
  $("saveProfile").disabled=true;status("Salvando seu perfil com segurança...");
  let fotoUrl=profile?.fotoUrl||"",fotoPath=profile?.fotoPath||"",capaUrl=profile?.capaUrl||"",capaPath=profile?.capaPath||"";
  const cover=$("coverInput")?.files?.[0];if(cover){const up=await upload(cover,"capa");capaUrl=up.url;capaPath=up.path;$("coverPreview").style.backgroundImage=`url("${capaUrl}")`}
  const file=$("avatarInput")?.files?.[0];if(file){const up=await upload(file,"perfil");fotoUrl=up.url;fotoPath=up.path;$("avatar").src=fotoUrl}
  const nascimento=$("birth").value,contato=$("contato").value.trim(),modalidade=$("modalidade").value.trim(),posicao=$("posicao").value.trim(),categoria=$("categoria").value,time=$("time").value.trim(),bio=$("bio").value.trim();
  const handle=profileHandle(nome,user.uid),instagramUrl=String(profile?.instagramUrl||"").slice(0,300);
  const usuarioRef=doc(db,"usuarios",user.uid),usuarioSnap=await getDoc(usuarioRef),base=usuarioSnap.exists()?usuarioSnap.data():{};
  await setDoc(usuarioRef,{uid:user.uid,nome,email:user.email||base.email||"",papel:base.papel||"usuario",status:base.status||"ativo",criadoEm:base.criadoEm||serverTimestamp(),atualizadoEm:serverTimestamp(),nascimento,cidade,uf,modalidade,posicao,categoria,time,contato,bio,historicoCampeonatos,fotoUrl,fotoPath,capaUrl,capaPath,instagramUrl},{merge:true});
  const antigoHandle=String(profile?.handle||"");
  const perfilPublico={uid:user.uid,nome,cidade,uf,modalidade,posicao,categoria,time,bio,fotoUrl,fotoPath,capaUrl,capaPath,historicoCampeonatos,handle,instagramUrl};
  await setDoc(doc(db,"perfis",user.uid),perfilPublico,{merge:true});
  await setDoc(doc(db,"handles",handle),{uid:user.uid,handle,atualizadoEm:Timestamp.now()},{merge:true});
  if(antigoHandle&&antigoHandle!==handle){try{const old=await getDoc(doc(db,"handles",antigoHandle));if(old.exists()&&old.data()?.uid===user.uid)await deleteDoc(old.ref)}catch{}}
  const legadoOwned=await getDocs(query(collection(db,"atletas"),where("ownerUid","==",user.uid)));if(!legadoOwned.empty)await setDoc(legadoOwned.docs[0].ref,{ownerUid:user.uid,nome,cidade,uf,modalidade,posicao,categoria,time,historicoCampeonatos,atualizadoEm:serverTimestamp()},{merge:true});
  const planInput=document.querySelector('input[name="profilePlano"]:checked'),planId=planInput?.value||"gratuito",planMap={gratuito:["Gratuito",0],bronze:["Bronze",9.9],prata:["Prata",19.9],ouro:["Ouro",34.9],premium:["Premium",49.9]},[planName,planValue]=planMap[planId]||planMap.gratuito,currentPlan=String(base.planoId||"gratuito");
  if(planId!==currentPlan){const now=Timestamp.now();await setDoc(doc(db,"solicitacoes_planos",user.uid),{uid:user.uid,plano:planName,planoId:planId,valor:planValue,status:"pendente",criadoEm:now,atualizadoEm:now});status(`Perfil salvo. A alteração para o plano ${planName} ficou aguardando confirmação administrativa.`)}else status("Perfil salvo com segurança. Seu histórico também foi atualizado no ranking.");
  profile={...(profile||{}),...perfilPublico,nascimento,contato};renderHistoricoCampeonatos();$("displayName").textContent=nome;
 }catch(e){console.error(e);status("Não foi possível salvar. Verifique sua conexão e tente novamente.")}finally{$("saveProfile").disabled=false}
}
'''
regex('meu-perfil.js',r'async function saveProfile\(\)\{.*?\n\nasync function loadClaimableProfiles',new_save+'\nasync function loadClaimableProfiles')

# ------------------------------------------------------------------
# Aprovação administrativa: remover dados privados dos documentos públicos.
# ------------------------------------------------------------------
secure_athlete='''async function aprovarNovoCadastro(id){try{const ref=doc(db,"atletas_pendentes",id),snap=await getDoc(ref);if(!snap.exists())return;const a=snap.data(),pago=a.planoId&&a.planoId!=="gratuito";if(pago&&!a.pagamentoConfirmado){if(!confirm("Confirmar que o pagamento do plano "+(a.plano||"pago")+" foi recebido e publicar este atleta?"))return}else if(!confirm("Aprovar este cadastro e publicar o atleta?"))return;const publicData={ownerUid:a.ownerUid||"",nome:a.nome||"",cidade:a.cidade||"",uf:a.uf||"",modalidades:Array.isArray(a.modalidades)?a.modalidades:(a.modalidade?[a.modalidade]:[]),posicoes:Array.isArray(a.posicoes)?a.posicoes:(a.posicao?String(a.posicao).split(",").map(v=>v.trim()).filter(Boolean):[]),modalidade:Array.isArray(a.modalidades)?a.modalidades.join(", "):(a.modalidade||""),posicao:Array.isArray(a.posicoes)?a.posicoes.join(", "):(a.posicao||""),categoria:a.categoria||"",time:a.time||"",status:"ativo",aprovacao:"aprovado",historicoEquipes:Array.isArray(a.historicoEquipes)?a.historicoEquipes:[],historicoCampeonatos:Array.isArray(a.historicoCampeonatos)?a.historicoCampeonatos:[],observacoes:a.observacoes||"",instagramUrl:a.instagramUrl||"",foto:a.foto||"",plano:a.plano||"Gratuito",planoId:a.planoId||"gratuito",criadoEm:a.criadoEm||new Date().toISOString(),atualizadoEm:serverTimestamp()};const privateData={nascimento:String(a.nascimento||""),contato:String(a.contato||""),ownerEmail:String(a.ownerEmail||""),valorPlano:Number(a.valorPlano||0),planoStatus:"ativo",pagamentoConfirmado:pago?true:a.pagamentoConfirmado===true,atualizadoEm:serverTimestamp(),origem:"cadastro-atleta-v11"};await setDoc(doc(db,"atletas",id),publicData,{merge:false});await setDoc(doc(db,"atletas",id,"privado","dados"),privateData,{merge:true});await deleteDoc(ref);await loadNovosCadastros();await loadAtletas();alert(pago?"Pagamento confirmado e atleta publicado com dados privados protegidos.":"Atleta publicado com dados privados protegidos.")}catch(e){console.error(e);alert("Não foi possível aprovar o cadastro. Verifique as regras do Firestore.")}}
'''
regex('admin.js',r'async function aprovarNovoCadastro\(id\)\{.*?\nasync function recusarNovoCadastro',secure_athlete+'async function recusarNovoCadastro')
secure_team='''async function aprovarEquipe(id){try{const ref=doc(db,"equipes_pendentes",id),s=await getDoc(ref);if(!s.exists())return;const a=s.data(),pago=a.planoId&&a.planoId!=="gratuito";if(pago&&!a.pagamentoConfirmado){if(!confirm("Confirmar que o pagamento do plano "+(a.plano||"pago")+" foi recebido e publicar esta equipe?"))return}else if(!confirm("Aprovar e publicar esta equipe?"))return;const publicData={ownerUid:a.ownerUid||"",nome:a.nome||"",uf:a.uf||"",cidade:a.cidade||"",modalidade:a.modalidade||"",categoria:a.categoria||"",logo:a.logo||"",atletas:Array.isArray(a.atletas)?a.atletas.slice(0,30):[],plano:a.plano||"Gratuito",planoId:a.planoId||"gratuito",status:"ativo",aprovacao:"aprovado",criadoEm:a.criadoEm||new Date().toISOString(),atualizadoEm:serverTimestamp()};const privateData={responsavel:String(a.responsavel||""),contato:String(a.contato||""),ownerEmail:String(a.ownerEmail||""),valorPlano:Number(a.valorPlano||0),planoStatus:"ativo",pagamentoConfirmado:pago?true:a.pagamentoConfirmado===true,atualizadoEm:serverTimestamp(),origem:"cadastro-equipe-v11"};await setDoc(doc(db,"equipes",id),publicData,{merge:false});await setDoc(doc(db,"equipes",id,"privado","dados"),privateData,{merge:true});await deleteDoc(ref);await loadEquipesPendentes();await loadMonetizacao();alert(pago?"Pagamento confirmado e equipe publicada com dados privados protegidos.":"Equipe publicada com dados privados protegidos.")}catch(e){console.error(e);alert("Não foi possível aprovar a equipe. Verifique as regras do Firestore.")}}
'''
regex('admin.js',r'async function aprovarEquipe\(id\)\{.*?\nasync function recusarEquipe',secure_team+'async function recusarEquipe')

# ------------------------------------------------------------------
# Cadastro de atleta: Instagram estruturado, mantendo fallback legado.
# ------------------------------------------------------------------
exact('cadastro-direto.js','observacoes:embedInstagram($("cadObs")?.value.trim()||"",instagram),foto:up.url','observacoes:embedInstagram($("cadObs")?.value.trim()||"",instagram),instagramUrl:instagram,foto:up.url')
# Regras pendentes permitem instagramUrl opcional.
rules=read('firestore.rules')
rules=rules.replace("'modalidades','posicoes','modalidade','posicao','observacoes','historicoCampeonatos'","'modalidades','posicoes','modalidade','posicao','observacoes','instagramUrl','historicoCampeonatos'",1)
rules=rules.replace("&& request.resource.data.observacoes is string && request.resource.data.observacoes.size() <= 500\n        && request.resource.data.foto is string","&& request.resource.data.observacoes is string && request.resource.data.observacoes.size() <= 500\n        && request.resource.data.get('instagramUrl','') is string && request.resource.data.get('instagramUrl','').size() <= 300\n        && request.resource.data.foto is string",1)
# Documento público de atleta aceita instagramUrl, sem dados financeiros privados.
rules=rules.replace("'time','historicoEquipes','historicoCampeonatos','observacoes','foto','ownerUid','atualizadoEm'","'time','historicoEquipes','historicoCampeonatos','observacoes','instagramUrl','foto','ownerUid','atualizadoEm'",1)
write('firestore.rules',rules)

# ------------------------------------------------------------------
# Carregar ferramentas V11 do ADM.
# ------------------------------------------------------------------
exact('site-v7-autoload.js',"      import('./admin-control-center-v10.js?v=20260902-1')","      import('./admin-control-center-v10.js?v=20260902-1'),\n      import('./admin-data-migration-v11.js?v=20260902-1'),\n      import('./admin-commerce-v11.js?v=20260902-1')")

# ------------------------------------------------------------------
# Auditoria automatizada acompanha o novo modelo.
# ------------------------------------------------------------------
audit=read('scripts/audit-v8.mjs')
audit=audit.replace("'admin-v8-hardening.js','admin-claims-v9.js','admin-profile-link-v10.js','admin-control-center-v10.js','auth-audit-v10.js'","'admin-v8-hardening.js','admin-claims-v9.js','admin-profile-link-v10.js','admin-control-center-v10.js','auth-audit-v11.js','admin-data-migration-v11.js','admin-commerce-v11.js'")
audit=audit.replace("requireText('auth-audit-v10.js','export async function recordAuthEvent','registrador central de eventos autenticados');\nrequireText('auth-audit-v10.js','collection(db,\"access_logs\")','logs de acesso em coleção dedicada');\nrequireText('auth-audit-v10.js','sessionStorage','sessão registrada uma vez por aba/sessão');","requireText('auth-audit-v11.js','export async function recordAuthEvent','registrador central de eventos autenticados V11');\nrequireText('auth-audit-v11.js','fonte:\"cliente\"','telemetria identificada como cliente');\nrequireText('auth-audit-v11.js','confiavel:false','telemetria não tratada como auditoria autoritativa');\nrequireText('auth-audit-v11.js','expiraEm','retenção preparada para TTL');\nrequireText('auth-audit-v11.js','sessionStorage','sessão registrada uma vez por aba/sessão');")
audit=audit.replace("requireText('site-v7-autoload.js','auth-audit-v10.js','auditoria de sessão carregada globalmente');","requireText('site-v7-autoload.js','auth-audit-v11.js','telemetria V11 carregada globalmente');")
audit=audit.replace("requireText('firestore.rules',\"'ultimoLoginEm','ultimoAcessoEm','totalLogins'\",'metadados de atividade permitidos em usuarios');","forbidText('firestore.rules',\"'ultimoLoginEm','ultimoAcessoEm','totalLogins'\",'métricas mutáveis pelo usuário em usuarios');\nrequireText('firestore.rules','match /site_stats/{eventId}','regras de analytics próprio');\nrequireText('firestore.rules','match /solicitacoes_planos/{uid}','solicitação segura de plano');\nrequireText('firestore.rules','match /handles/{handle}','índice seguro de handles');")
audit += "\n// V11 core hardening.\nforbidText('meu-perfil.js','firebase-storage','Firebase Storage no editor de perfil');\nrequireText('meu-perfil.js','solicitacoes_planos','alteração de plano vira solicitação administrativa');\nrequireText('admin.js','cadastro-atleta-v11','aprovação base do atleta sem dados privados públicos');\nrequireText('admin.js','cadastro-equipe-v11','aprovação base da equipe sem dados privados públicos');\nrequireText('analytics.js','confiavel:false','analytics próprio marcado como telemetria');\n"
write('scripts/audit-v8.mjs',audit)

print('V11 CORE PATCH PREPARADO ✓')
