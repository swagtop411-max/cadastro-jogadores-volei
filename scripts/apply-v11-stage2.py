from pathlib import Path
import re, json
ROOT=Path(__file__).resolve().parents[1]
def read(n): return (ROOT/n).read_text(encoding='utf-8')
def write(n,s): (ROOT/n).write_text(s,encoding='utf-8')
def exact(n,o,x,count=1):
 s=read(n); c=s.count(o)
 if c!=count: raise SystemExit(f'{n}: esperado {count}, achou {c}: {o[:120]!r}')
 write(n,s.replace(o,x,count)); print('OK',n,o[:45])
def regex(n,p,x,count=1,flags=re.S):
 s=read(n); out,c=re.subn(p,lambda m:x,s,count=count,flags=flags)
 if c!=count: raise SystemExit(f'{n}: regex esperado {count}, achou {c}: {p[:100]!r}')
 write(n,out); print('OK regex',n)

# ------------------------------------------------------------
# 1) Firestore: privacidade social server-side.
# ------------------------------------------------------------
r=read('firestore.rules')
old='''    function socialTargetAllowed(id) {
      return signedIn() && approvedSocialTarget(id) && !isBlocked(request.auth.uid,targetOwner(id));
    }
    function profilePrivate(uid) {
      return exists(/databases/$(database)/documents/config_perfis/$(uid)) &&
        get(/databases/$(database)/documents/config_perfis/$(uid)).data.privado == true;
    }
'''
new='''    function profilePrivate(uid) {
      return exists(/databases/$(database)/documents/config_perfis/$(uid)) &&
        get(/databases/$(database)/documents/config_perfis/$(uid)).data.privado == true;
    }
    function followsProfile(uid) {
      return signedIn() && exists(/databases/$(database)/documents/seguidores/$(uid)/usuarios/$(request.auth.uid));
    }
    function canReadSocialOwner(uid, visibility) {
      return visibility == 'publico' || isAdmin() || isOwner(uid) || followsProfile(uid);
    }
    function socialTargetReadable(id) {
      return (
        exists(/databases/$(database)/documents/publicacoes/$(id)) &&
        get(/databases/$(database)/documents/publicacoes/$(id)).data.aprovado == true &&
        canReadSocialOwner(
          get(/databases/$(database)/documents/publicacoes/$(id)).data.ownerUid,
          get(/databases/$(database)/documents/publicacoes/$(id)).data.get('visibilidade','privado')
        )
      ) || (
        exists(/databases/$(database)/documents/videos/$(id)) &&
        get(/databases/$(database)/documents/videos/$(id)).data.aprovado == true &&
        canReadSocialOwner(
          get(/databases/$(database)/documents/videos/$(id)).data.ownerUid,
          get(/databases/$(database)/documents/videos/$(id)).data.get('visibilidade','privado')
        )
      );
    }
    function socialTargetAllowed(id) {
      return signedIn() && socialTargetReadable(id) && !isBlocked(request.auth.uid,targetOwner(id));
    }
    function storyReadable(id) {
      return exists(/databases/$(database)/documents/stories/$(id))
        && get(/databases/$(database)/documents/stories/$(id)).data.aprovado == true
        && canReadSocialOwner(
          get(/databases/$(database)/documents/stories/$(id)).data.ownerUid,
          get(/databases/$(database)/documents/stories/$(id)).data.get('visibilidade','privado')
        );
    }
'''
if old not in r: raise SystemExit('firestore: helpers privacy not found')
r=r.replace(old,new,1)
# Destaques seguem privacidade do proprietário.
r=re.sub(r'(match /destaques/\{uid\}/itens/\{highlightId\} \{\n\s*)allow read: if true;',r"\1allow read: if canReadSocialOwner(uid, profilePrivate(uid) ? 'privado' : 'publico');",r,count=1)
# Publicações.
r=r.replace("allow read: if resource.data.aprovado == true || isAdmin() || (signedIn() && resource.data.ownerUid == request.auth.uid);","allow read: if resource.data.aprovado == true && canReadSocialOwner(resource.data.ownerUid, resource.data.get('visibilidade','privado'));",1)
r=r.replace("        && request.resource.data.tipo in ['imagem','carrossel']\n        && request.resource.data.aprovado == true", "        && request.resource.data.tipo in ['imagem','carrossel']\n        && request.resource.data.visibilidade in ['publico','privado']\n        && ((profilePrivate(request.auth.uid) && request.resource.data.visibilidade == 'privado') || (!profilePrivate(request.auth.uid) && request.resource.data.visibilidade == 'publico'))\n        && request.resource.data.aprovado == true",1)
r=r.replace("'hashtags','mencoes','armazenamento','aprovado','status','criadoEm']);","'hashtags','mencoes','armazenamento','visibilidade','aprovado','status','criadoEm']);",1)
r=r.replace("affectedKeys().hasOnly(['legenda','texto','hashtags','mencoes'])","affectedKeys().hasOnly(['legenda','texto','hashtags','mencoes','visibilidade'])\n        && (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['visibilidade']) || ((profilePrivate(request.auth.uid) && request.resource.data.visibilidade == 'privado') || (!profilePrivate(request.auth.uid) && request.resource.data.visibilidade == 'publico')))",1)
# Comentários e curtidas respeitam o alvo.
r=r.replace("allow read: if resource.data.aprovado == true || isAdmin();","allow read: if isAdmin() || (resource.data.aprovado == true && socialTargetReadable(resource.data.publicacaoId));",1)
r=r.replace("match /curtidas_publicacoes/{publicacaoId}/usuarios/{uid} {\n      allow read: if true;","match /curtidas_publicacoes/{publicacaoId}/usuarios/{uid} {\n      allow read: if socialTargetReadable(publicacaoId);",1)
# Stories.
r=r.replace("allow read: if isAdmin() || resource.data.aprovado == true || (signedIn() && resource.data.ownerUid == request.auth.uid);","allow read: if resource.data.aprovado == true && canReadSocialOwner(resource.data.ownerUid, resource.data.get('visibilidade','privado'));",1)
r=r.replace("        && request.resource.data.keys().hasOnly(['ownerUid','nome','mediaUrl','mediaPath','mediaType','legenda','tipo','criadoEm','expiraEm','aprovado','status'])","        && request.resource.data.keys().hasOnly(['ownerUid','nome','mediaUrl','mediaPath','mediaType','legenda','tipo','visibilidade','criadoEm','expiraEm','aprovado','status'])",1)
r=r.replace("        && request.resource.data.tipo in ['image','video']\n        && request.resource.data.criadoEm is timestamp", "        && request.resource.data.tipo in ['image','video']\n        && request.resource.data.visibilidade in ['publico','privado']\n        && ((profilePrivate(request.auth.uid) && request.resource.data.visibilidade == 'privado') || (!profilePrivate(request.auth.uid) && request.resource.data.visibilidade == 'publico'))\n        && request.resource.data.criadoEm is timestamp",1)
r=r.replace("affectedKeys().hasOnly(['legenda'])","affectedKeys().hasOnly(['legenda','visibilidade'])\n        && (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['visibilidade']) || ((profilePrivate(request.auth.uid) && request.resource.data.visibilidade == 'privado') || (!profilePrivate(request.auth.uid) && request.resource.data.visibilidade == 'publico')))",1)
r=r.replace("allow create, update: if isOwner(viewerUid)\n        && request.resource.data.viewerUid == viewerUid","allow create, update: if isOwner(viewerUid)\n        && storyReadable(storyId)\n        && request.resource.data.viewerUid == viewerUid",1)
# Vídeos.
r=r.replace("allow read: if isAdmin() || resource.data.aprovado == true || (signedIn() && resource.data.ownerUid == request.auth.uid);","allow read: if resource.data.aprovado == true && canReadSocialOwner(resource.data.ownerUid, resource.data.get('visibilidade','privado'));",1)
r=r.replace("        && request.resource.data.get('legenda','') is string && request.resource.data.get('legenda','').size() <= 2200\n        && request.resource.data.get('hashtags',[])", "        && request.resource.data.get('legenda','') is string && request.resource.data.get('legenda','').size() <= 2200\n        && request.resource.data.visibilidade in ['publico','privado']\n        && ((profilePrivate(request.auth.uid) && request.resource.data.visibilidade == 'privado') || (!profilePrivate(request.auth.uid) && request.resource.data.visibilidade == 'publico'))\n        && request.resource.data.get('hashtags',[])",1)
r=r.replace("'legenda','hashtags','mencoes','aprovado','status','criadoEm']);","'legenda','hashtags','mencoes','visibilidade','aprovado','status','criadoEm']);",1)
r=r.replace("affectedKeys().hasOnly(['legenda','hashtags','mencoes'])","affectedKeys().hasOnly(['legenda','hashtags','mencoes','visibilidade'])\n        && (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['visibilidade']) || ((profilePrivate(request.auth.uid) && request.resource.data.visibilidade == 'privado') || (!profilePrivate(request.auth.uid) && request.resource.data.visibilidade == 'publico')))",1)
# Campeonatos com URL estruturada.
r=r.replace("['nome','organizador','data','local','descricao','imagem','publicado','status','aprovacao','criadoEm'])","['nome','organizador','data','local','descricao','imagem','linkOrganizador','publicado','status','aprovacao','criadoEm'])",2)
r=r.replace("        && request.resource.data.descricao is string && request.resource.data.descricao.size() <= 700\n        && request.resource.data.imagem is string", "        && request.resource.data.descricao is string && request.resource.data.descricao.size() <= 700\n        && request.resource.data.get('linkOrganizador','') is string && request.resource.data.get('linkOrganizador','').size() <= 500\n        && request.resource.data.imagem is string",1)
write('firestore.rules',r)

# ------------------------------------------------------------
# 2) Criação de conteúdo com visibilidade consistente.
# ------------------------------------------------------------
# Perfil social.
s=read('perfil-social.js')
marker='async function legacyByOwner(ownerUid)'
helper='async function ownVisibility(){if(!currentUser)return"publico";try{const s=await getDoc(doc(db,"config_perfis",currentUser.uid));return s.exists()&&s.data()?.privado===true?"privado":"publico"}catch{return"publico"}}\n'
if helper not in s:
 if marker not in s: raise SystemExit('perfil-social helper insertion point')
 s=s.replace(marker,helper+marker,1)
s=s.replace('const nome=profile?.nome||currentUser.displayName||"Atleta";if(publishType==="story")','const nome=profile?.nome||currentUser.displayName||"Atleta",visibilidade=await ownVisibility();if(publishType==="story")',1)
s=s.replace('legenda:caption,tipo:type,aprovado:true','legenda:caption,tipo:type,visibilidade,aprovado:true',1)
s=s.replace('videoTamanho:up.size,legenda:caption,aprovado:true','videoTamanho:up.size,legenda:caption,visibilidade,aprovado:true',1)
s=s.replace('tipo:"imagem",armazenamento:"cloudinary",aprovado:true','tipo:"imagem",armazenamento:"cloudinary",visibilidade,aprovado:true',1)
write('perfil-social.js',s)
# Comunidade.
s=read('comunidade.js')
marker='function mediaMarkup(item)'
helper='async function ownVisibility(){if(!currentUser)return"publico";try{const s=await getDoc(doc(db,"config_perfis",currentUser.uid));return s.exists()&&s.data()?.privado===true?"privado":"publico"}catch{return"publico"}}\n'
if helper not in s: s=s.replace(marker,helper+marker,1)
s=s.replace('const upload=file?await uploadCloudinary(file,{maxBytes:25*1024*1024,allowImage:true,allowVideo:false,tags:["cadastro-de-atletas","publicacoes","comunidade"]}):null,me=await profileOf(currentUser.uid),now=Timestamp.now();','const upload=file?await uploadCloudinary(file,{maxBytes:25*1024*1024,allowImage:true,allowVideo:false,tags:["cadastro-de-atletas","publicacoes","comunidade"]}):null,me=await profileOf(currentUser.uid),now=Timestamp.now(),visibilidade=await ownVisibility();',1)
s=s.replace('armazenamento:upload?"cloudinary":"nenhum",aprovado:true','armazenamento:upload?"cloudinary":"nenhum",visibilidade,aprovado:true',1)
# Feed público consulta apenas documentos públicos.
s=s.replace('where("aprovado","==",true),orderBy("criadoEm","desc")','where("aprovado","==",true),where("visibilidade","==","publico"),orderBy("criadoEm","desc")')
s=s.replace('where("aprovado","==",true),limit(max)','where("aprovado","==",true),where("visibilidade","==","publico"),limit(max)')
write('comunidade.js',s)
# Home feed.
s=read('home-social.js')
s=s.replace('where("aprovado","==",true),orderBy("criadoEm","desc")','where("aprovado","==",true),where("visibilidade","==","publico"),orderBy("criadoEm","desc")')
s=s.replace('where("aprovado","==",true),limit(max)','where("aprovado","==",true),where("visibilidade","==","publico"),limit(max)')
write('home-social.js',s)
# Explorar / Reels / Hashtags: todas as consultas globais aprovadas passam a ser públicas.
for fn in ['explorar.js','reels.js','hashtags.js']:
 s=read(fn)
 s=s.replace('where("aprovado","==",true),orderBy("criadoEm","desc")','where("aprovado","==",true),where("visibilidade","==","publico"),orderBy("criadoEm","desc")')
 s=s.replace('where("aprovado","==",true),limit(','where("aprovado","==",true),where("visibilidade","==","publico"),limit(')
 write(fn,s)
# Stories globais públicos; por proprietário continuam autorizados pelas regras.
s=read('social-network.js')
s=s.replace('else q=query(collection(socialDb,"stories"),where("aprovado","==",true),limit(max));','else q=query(collection(socialDb,"stories"),where("aprovado","==",true),where("visibilidade","==","publico"),limit(max));',1)
# Inbox perfis em paralelo.
old='''  const rows = [];
  for (const d of docs.sort((a,b)=>millis(b.data().lastMessageAt)-millis(a.data().lastMessageAt))) {
    const data = d.data();
    const otherUid = (data.participants || []).find(x => x !== currentUser.uid);
    if (!otherUid) continue;
    const p = await profileOf(otherUid);'''
new='''  const rows = [];
  const sorted=docs.sort((a,b)=>millis(b.data().lastMessageAt)-millis(a.data().lastMessageAt));
  const otherUids=[...new Set(sorted.map(d=>(d.data().participants||[]).find(x=>x!==currentUser.uid)).filter(Boolean))];
  await Promise.all(otherUids.map(profileOf));
  for (const d of sorted) {
    const data = d.data();
    const otherUid = (data.participants || []).find(x => x !== currentUser.uid);
    if (!otherUid) continue;
    const p = profileCache.get(otherUid)||await profileOf(otherUid);'''
if old not in s: raise SystemExit('social-network inbox pattern')
s=s.replace(old,new,1)
write('social-network.js',s)

# Social V6: handles sob demanda, carrossel privado e sincronização ao mudar privacidade.
s=read('social-v6.js')
s=s.replace('let user=auth.currentUser,directoryPromise=null,activeDirectOtherUid="",scheduleTimer=0,directDecorating=false;','let user=auth.currentUser,activeDirectOtherUid="",scheduleTimer=0,directDecorating=false;')
s=s.replace('const profileCache=new Map(),privacyCache=new Map(),blockCache=new Map(),followCache=new Map(),carouselCache=new Map(),highlightCache=new Map();','const profileCache=new Map(),privacyCache=new Map(),blockCache=new Map(),followCache=new Map(),handleCache=new Map(),carouselCache=new Map(),highlightCache=new Map();')
regex('social-v6.js',r'async function directory\(\)\{.*?\}\nasync function profileOf', '''async function profileByHandle(handle){const key=String(handle||"").toLowerCase();if(handleCache.has(key))return handleCache.get(key);try{const h=await getDoc(doc(db,"handles",key));if(!h.exists()){handleCache.set(key,null);return null}const p=await profileOf(h.data()?.uid||"");handleCache.set(key,p);return p}catch{handleCache.set(key,null);return null}}
async function profileOf''')
s=read('social-v6.js')
regex('social-v6.js',r'async function richen\(el\)\{.*?\}\nfunction scanRich', '''async function richen(el){if(!(el instanceof HTMLElement)||el.dataset.v6Rich==="1")return;const raw=el.textContent||"";if(!/[#@]/.test(raw)){el.dataset.v6Rich="1";return}el.dataset.v6Rich="1";el.classList.add("v6-rich");const parts=raw.split(/(#[\\p{L}\\p{N}_-]+|@[a-z0-9_-]+)/giu),mentions=[...new Set(parts.filter(x=>x?.startsWith("@")).map(x=>x.slice(1).toLowerCase()))],resolved=new Map();await Promise.all(mentions.map(async h=>resolved.set(h,await profileByHandle(h))));el.textContent="";for(const part of parts){if(!part)continue;if(part[0]==="#"){const a=document.createElement("a");a.href=`hashtags.html?tag=${encodeURIComponent(part.slice(1).toLowerCase())}`;a.textContent=part;el.appendChild(a);continue}if(part[0]==="@"){const p=resolved.get(part.slice(1).toLowerCase());if(p?.uid){const a=document.createElement("a");a.href=`perfil-social.html?uid=${encodeURIComponent(p.uid)}`;a.textContent=part;el.appendChild(a);continue}}el.appendChild(document.createTextNode(part))}}
function scanRich''')
s=read('social-v6.js')
regex('social-v6.js',r'async function notifyMentions\(caption,sourceId\)\{.*?\}\nasync function publishCarousel', '''async function notifyMentions(caption,sourceId){const handles=mentionsOf(caption);if(!user||!handles.length)return;for(const h of handles){const p=await profileByHandle(h);if(p&&p.uid!==user.uid)await createNotification(p.uid,"mention",{sourceId,text:`mencionou você: @${h}`}).catch(()=>{})}}
async function publishCarousel''')
s=read('social-v6.js')
s=s.replace('const cover=midias.find(x=>x.tipo==="image"),me=await profileOf(user.uid),ref=doc(collection(db,"publicacoes"));await setDoc(ref,{','const cover=midias.find(x=>x.tipo==="image"),me=await profileOf(user.uid),privacy=await privacyOf(user.uid),visibilidade=privacy.privado?"privado":"publico",ref=doc(collection(db,"publicacoes"));await setDoc(ref,{',1)
s=s.replace('armazenamento:"cloudinary",aprovado:true,status:"publicado"','armazenamento:"cloudinary",visibilidade,aprovado:true,status:"publicado"',1)
# Sincroniza conteúdo do dono quando privacidade muda.
helper='''async function syncOwnVisibility(privado){if(!user)return;const value=privado?"privado":"publico";for(const name of ["publicacoes","videos","stories"]){try{const snap=await getDocs(query(collection(db,name),where("ownerUid","==",user.uid),limit(300)));await Promise.all(snap.docs.map(d=>updateDoc(d.ref,{visibilidade:value}).catch(()=>{})))}catch(e){console.warn(`Visibilidade ${name}:`,e)}}}
'''
marker='function ensurePrivacyModal()'
if helper not in s: s=s.replace(marker,helper+marker,1)
old='await setDoc(doc(db,"config_perfis",user.uid),{uid:user.uid,privado,atualizadoEm:Timestamp.now()},{merge:true});privacyCache.set(user.uid,{uid:user.uid,privado});'
new='if(privado){await syncOwnVisibility(true);await setDoc(doc(db,"config_perfis",user.uid),{uid:user.uid,privado:true,atualizadoEm:Timestamp.now()},{merge:true})}else{await setDoc(doc(db,"config_perfis",user.uid),{uid:user.uid,privado:false,atualizadoEm:Timestamp.now()},{merge:true});await syncOwnVisibility(false)}privacyCache.set(user.uid,{uid:user.uid,privado});'
if old not in s: raise SystemExit('social-v6 privacy save pattern')
s=s.replace(old,new,1)
write('social-v6.js',s)

# ------------------------------------------------------------
# 3) Desempenho e dados locais.
# ------------------------------------------------------------
# Centro ADM não varre coleções sem limite.
exact('admin-control-center-v10.js','async function readCollection(name){\n  const snap=await getDocs(collection(db,name));\n  return snap.docs.map(item=>({id:item.id,...item.data()}));\n}','async function readCollection(name){\n  const cap=["usuarios","atletas","perfis"].includes(name)?800:400;\n  const snap=await getDocs(query(collection(db,name),limit(cap)));\n  return snap.docs.map(item=>({id:item.id,...item.data()}));\n}')
# Rascunho do atleta deixa de persistir após a sessão.
s=read('cadastro-direto.js').replace('localStorage.getItem(DRAFT_KEY)','sessionStorage.getItem(DRAFT_KEY)').replace('localStorage.setItem(DRAFT_KEY,JSON.stringify(draftData()))','sessionStorage.setItem(DRAFT_KEY,JSON.stringify(draftData()))').replace('localStorage.removeItem(DRAFT_KEY)','sessionStorage.removeItem(DRAFT_KEY)')
write('cadastro-direto.js',s)
# Lista pública reduz carga automática máxima.
s=read('public.js').replace('max=1500','max=600')
write('public.js',s)
# Ranking ganha cache de sessão de 5 min e teto operacional.
s=read('ranking.js')
s=s.replace('collection, getDocs, getFirestore','collection, getDocs, getFirestore, limit, query')
s=s.replace('let loadPromise = null;','let loadPromise = null;\nconst RANK_CACHE_KEY="bd_ranking_v11",RANK_CACHE_MS=5*60*1000;')
old='''      const [athletesSnap, profilesSnap] = await Promise.all([
        getDocs(collection(db, "atletas")),
        getDocs(collection(db, "perfis"))
      ]);'''
new='''      let cached=null;try{cached=JSON.parse(sessionStorage.getItem(RANK_CACHE_KEY)||"null")}catch{}
      if(cached?.at&&Date.now()-cached.at<RANK_CACHE_MS&&Array.isArray(cached.athletes)){athletes=cached.athletes;buildFilters();render();return}
      const [athletesSnap, profilesSnap] = await Promise.all([
        getDocs(query(collection(db, "atletas"),limit(1000))),
        getDocs(query(collection(db, "perfis"),limit(1000)))
      ]);'''
if old not in s: raise SystemExit('ranking load pattern')
s=s.replace(old,new,1)
needle='''      buildFilters();
      render();'''
s=s.replace(needle,'''      try{sessionStorage.setItem(RANK_CACHE_KEY,JSON.stringify({at:Date.now(),athletes}))}catch{}
      buildFilters();
      render();''',1)
write('ranking.js',s)

# ------------------------------------------------------------
# 4) Campeonatos estruturados.
# ------------------------------------------------------------
s=read('campeonatos-public.js')
s=s.replace('const parsed = extractLink(item.descricao);','const parsed = extractLink(item.descricao);\n          parsed.link = safeUrl(item.linkOrganizador || parsed.link);')
s=s.replace('descricao: embedLink(descricao, link),\n      imagem: upload.url,','descricao: embedLink(descricao, link),\n      linkOrganizador: link,\n      imagem: upload.url,',1)
write('campeonatos-public.js',s)
s=read('campeonatos-admin.js')
s=s.replace('const parsed = parseDescription(c.descricao);','const parsed = parseDescription(c.descricao);\n  parsed.link = String(c.linkOrganizador || parsed.link || "");',1)
s=s.replace('descricao: String(c.descricao || ""),\n        imagem: String(c.imagem || ""),','descricao: String(c.descricao || ""),\n        linkOrganizador: String(c.linkOrganizador || parseDescription(c.descricao).link || ""),\n        imagem: String(c.imagem || ""),',1)
write('campeonatos-admin.js',s)
# Regra publicada de campeonatos aceita campo estruturado criado pelo ADM.
r=read('firestore.rules')
r=r.replace("match /campeonatos/{campeonatoId} { allow read: if isAdmin() || resource.data.publicado == true; allow create, update, delete: if isAdmin(); }","match /campeonatos/{campeonatoId} { allow read: if isAdmin() || resource.data.publicado == true; allow create, update, delete: if isAdmin(); }")
write('firestore.rules',r)

# ------------------------------------------------------------
# 5) App Check preparado (ativação depende da site key do Console).
# ------------------------------------------------------------
appcheck='''import{getApp,getApps,initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";import{initializeAppCheck,ReCaptchaV3Provider}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app-check.js";
const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};
const key=document.querySelector('meta[name="firebase-app-check-site-key"]')?.content?.trim()||window.BD_APP_CHECK_SITE_KEY||"";if(key){try{const app=getApps().length?getApp():initializeApp(cfg);initializeAppCheck(app,{provider:new ReCaptchaV3Provider(key),isTokenAutoRefreshEnabled:true});document.documentElement.dataset.appCheck="active"}catch(e){console.warn("App Check não inicializado:",e);document.documentElement.dataset.appCheck="error"}}else document.documentElement.dataset.appCheck="pending-site-key";
'''
write('firebase-app-check-v11.js',appcheck)
s=read('site-v7-autoload.js')
needle='''async function boot(){
  ensureBaseHeader();'''
replacement='''async function boot(){
  ensureBaseHeader();
  import('./firebase-app-check-v11.js?v=20260902-1').catch(error=>console.warn('App Check V11:',error));'''
if needle not in s: raise SystemExit('autoload boot pattern')
s=s.replace(needle,replacement,1)
write('site-v7-autoload.js',s)

# ------------------------------------------------------------
# 6) PWA e SEO.
# ------------------------------------------------------------
manifest={
 "id":"/","name":"Banco de Dados de Atletas","short_name":"Banco de Atletas","description":"Rede esportiva para atletas, equipes, campeonatos e oportunidades do vôlei.","lang":"pt-BR","start_url":"/","scope":"/","display":"standalone","background_color":"#e9eff5","theme_color":"#071827","orientation":"any","categories":["sports","social"],
 "icons":[{"src":"/assets/app-icon.svg","sizes":"any","type":"image/svg+xml","purpose":"any maskable"}],
 "shortcuts":[{"name":"Feed","short_name":"Feed","url":"/#feed"},{"name":"Atletas","short_name":"Atletas","url":"/atletas.html"},{"name":"Campeonatos","short_name":"Campeonatos","url":"/proximos-campeonatos.html"}]
}
write('manifest.webmanifest',json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
icon='''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#071827"/><circle cx="256" cy="256" r="154" fill="#fff"/><path d="M256 102c43 38 68 82 73 132-44-23-91-31-142-23 12-46 35-82 69-109zm-80 128c31 9 58 28 80 57-36 20-65 50-86 90-35-37-57-83-62-137 22-8 45-11 68-10zm164 18c37 24 62 57 75 99-41 27-87 43-139 46 7-39 24-75 51-106 5-13 9-26 13-39zm-82 64c8 30 8 61 0 94-47-2-89-17-127-45 29-25 61-42 96-51 10 1 20 1 31 2z" fill="#0785af"/></svg>'''
write('assets/app-icon.svg',icon)
s=read('site-v8.js')
needle='ensure("og:type","website");ensure("twitter:card","summary_large_image")'
s=s.replace(needle,'ensure("og:type","website");ensure("og:image",location.origin+"/assets/hero-banner.webp");ensure("twitter:card","summary_large_image");ensure("twitter:image",location.origin+"/assets/hero-banner.webp")',1)
write('site-v8.js',s)

# ------------------------------------------------------------
# 7) Corrige update de perfil em usuário legado sem criadoEm.
# ------------------------------------------------------------
s=read('meu-perfil.js')
old='await setDoc(usuarioRef,{uid:user.uid,nome,email:user.email||base.email||"",papel:base.papel||"usuario",status:base.status||"ativo",criadoEm:base.criadoEm||serverTimestamp(),atualizadoEm:serverTimestamp(),nascimento,cidade,uf,modalidade,posicao,categoria,time,contato,bio,historicoCampeonatos,fotoUrl,fotoPath,capaUrl,capaPath,instagramUrl},{merge:true});'
new='const usuarioPayload={uid:user.uid,nome,email:user.email||base.email||"",papel:base.papel||"usuario",status:base.status||"ativo",atualizadoEm:serverTimestamp(),nascimento,cidade,uf,modalidade,posicao,categoria,time,contato,bio,historicoCampeonatos,fotoUrl,fotoPath,capaUrl,capaPath,instagramUrl};if(!usuarioSnap.exists())usuarioPayload.criadoEm=serverTimestamp();await setDoc(usuarioRef,usuarioPayload,{merge:true});'
if old not in s: raise SystemExit('meu-perfil usuario payload')
s=s.replace(old,new,1)
write('meu-perfil.js',s)

# ------------------------------------------------------------
# 8) Auditoria V11 passa a bloquear regressões desta etapa.
# ------------------------------------------------------------
a=read('scripts/audit-v8.mjs')
a += '''\n// V11 stage 2: privacidade, performance e PWA.\nrequireText('firestore.rules','socialTargetReadable','leitura social protegida por privacidade');\nrequireText('firestore.rules',"request.resource.data.visibilidade in ['publico','privado']",'visibilidade social obrigatória');\nrequireText('home-social.js','where(\\"visibilidade\\",\\"==\\",\\"publico\\")','Home consulta apenas conteúdo público');\nrequireText('social-network.js','where(\\"visibilidade\\",\\"==\\",\\"publico\\")','Stories globais consultam apenas conteúdo público');\nforbidText('social-v6.js','getDocs(collection(db,\\"perfis\\"))','diretório completo de perfis para menções');\nrequireText('social-v6.js','collection(db,\\"handles\\")','menções resolvidas por índice de handles');\nrequireText('cadastro-direto.js','sessionStorage.getItem(DRAFT_KEY)','rascunho sensível limitado à sessão');\nforbidText('cadastro-direto.js','localStorage.getItem(DRAFT_KEY)','rascunho persistente com dados sensíveis');\nrequireText('firebase-app-check-v11.js','initializeAppCheck','cliente preparado para Firebase App Check');\nrequireText('manifest.webmanifest','app-icon.svg','ícone instalável PWA');\nrequireText('site-v8.js','og:image','imagem social para compartilhamento');\nrequireText('campeonatos-public.js','linkOrganizador: link','link de campeonato estruturado');\n'''
write('scripts/audit-v8.mjs',a)
print('V11 STAGE2 PREPARADO ✓')
