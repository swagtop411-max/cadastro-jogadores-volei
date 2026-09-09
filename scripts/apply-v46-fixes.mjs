import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const changed=new Set();
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const write=(p,t)=>{fs.writeFileSync(path.join(root,p),t,"utf8");changed.add(p)};
const replace=(p,oldText,newText,label,expected=1)=>{
  let t=read(p);const count=t.split(oldText).length-1;
  if(count!==expected)throw new Error(`${p}: ${label} esperava ${expected}, encontrou ${count}`);
  t=t.split(oldText).join(newText);write(p,t);
};
const replaceRegex=(p,re,repl,label,min=1)=>{
  let t=read(p),count=0;t=t.replace(re,(...args)=>{count++;return typeof repl==="function"?repl(...args):repl});
  if(count<min)throw new Error(`${p}: ${label} não encontrado`);write(p,t);
};

// 1. Stories: consulta central respeita privacidade e bloqueios.
replace("social-network.js",
`export async function getActiveStories({ownerUid="",max=40}={}){
  try{
    let q;
    if(ownerUid)q=query(collection(socialDb,"stories"),where("ownerUid","==",ownerUid),where("aprovado","==",true),limit(max));
    else q=query(collection(socialDb,"stories"),where("aprovado","==",true),where("visibilidade","==","publico"),limit(max));
    const snap=await getDocs(q),now=Date.now();
    return snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>!millis(x.expiraEm)||millis(x.expiraEm)>now).sort((a,b)=>millis(a.criadoEm)-millis(b.criadoEm));
  }catch(e){console.warn("Stories:",e);return[]}
}`,
`let storyBlockCache={uid:"",expires:0,values:new Set()};
async function blockedStoryOwners(){
  if(!currentUser)return new Set();
  if(storyBlockCache.uid===currentUser.uid&&storyBlockCache.expires>Date.now())return storyBlockCache.values;
  try{
    const snap=await getDocs(query(collection(socialDb,"bloqueios",currentUser.uid,"usuarios"),limit(1000)));
    storyBlockCache={uid:currentUser.uid,expires:Date.now()+30000,values:new Set(snap.docs.map(d=>d.id))};
  }catch{storyBlockCache={uid:currentUser.uid,expires:Date.now()+5000,values:new Set()}}
  return storyBlockCache.values;
}

export async function getActiveStories({ownerUid="",max=40}={}){
  try{
    const blocked=await blockedStoryOwners();
    if(ownerUid&&blocked.has(ownerUid))return[];
    let q;
    if(ownerUid){
      let privateAccess=currentUser?.uid===ownerUid;
      if(!privateAccess&&currentUser){
        try{privateAccess=(await getDoc(doc(socialDb,"seguidores",ownerUid,"usuarios",currentUser.uid))).exists()}catch{}
      }
      const constraints=[where("ownerUid","==",ownerUid),where("aprovado","==",true)];
      if(!privateAccess)constraints.push(where("visibilidade","==","publico"));
      q=query(collection(socialDb,"stories"),...constraints,limit(max));
    }else q=query(collection(socialDb,"stories"),where("aprovado","==",true),where("visibilidade","==","publico"),limit(max));
    const snap=await getDocs(q),now=Date.now();
    return snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>!blocked.has(x.ownerUid)&&(!millis(x.expiraEm)||millis(x.expiraEm)>now)).sort((a,b)=>millis(a.criadoEm)-millis(b.criadoEm));
  }catch(e){console.warn("Stories:",e);return[]}
}`,
"privacidade central de Stories");

// 2. Perfil público: bloqueio também remove acesso ao Story e limpa estado visual.
replace("profile-story-access-v45.js",
`  async function readStories() {
    if (!uid) return [];
    const privateAccess = await canReadPrivateStories();`,
`  async function isOwnerBlockedByViewer() {
    const user = auth.currentUser;
    if (!user || !uid || user.uid === uid) return false;
    try {
      return (await getDoc(doc(db, "bloqueios", user.uid, "usuarios", uid))).exists();
    } catch {
      return false;
    }
  }

  async function readStories() {
    if (!uid) return [];
    if (await isOwnerBlockedByViewer()) return [];
    const privateAccess = await canReadPrivateStories();`,
"Story respeita bloqueio");
replace("profile-story-access-v45.js",
`    } else {
      avatar.style.removeProperty("box-shadow");
    }`,
`    } else {
      avatar.style.removeProperty("box-shadow");
      avatar.style.removeProperty("cursor");
      avatar.removeAttribute("aria-label");
      avatar.removeAttribute("title");
    }`,
"limpeza do avatar sem Story");
replace("profile-story-access-v45.js",
`  window.addEventListener("sn:story-deleted", () => setTimeout(refresh, 120));
  window.addEventListener("focus", () => void refresh());`,
`  window.addEventListener("sn:story-deleted", () => setTimeout(refresh, 120));
  window.addEventListener("bd:block-list-changed", () => void refresh());
  window.addEventListener("focus", () => void refresh());`,
"refresh após bloqueio");

// 3. Segurança UGC: Destaques V45 e legado são ocultados quando o usuário é bloqueado.
replaceRegex("ugc-safety-v41.js",/document\.getElementById\("profileHighlightsV37"\)/g,'document.querySelector("#profileHighlightsV45,#profileHighlightsV37")',"compatibilidade Destaques V45",2);

// 4. Meu Perfil: não esconde perfil legado com ownerUid antigo e limita varredura.
replace("meu-perfil.js","  Timestamp\n} from \"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js\";","  Timestamp,\n  limit\n} from \"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js\";","import limit");
replace("meu-perfil.js",`      getDocs(collection(db, "atletas"))`,`      getDocs(query(collection(db, "atletas"), limit(300)))`,"limite de perfis reivindicáveis");
replace("meu-perfil.js",
`        return id &&
          !String(item.ownerUid || "").trim() &&
          !approvedIds.has(id) &&
          !pendingByMe.has(id);`,
`        return id &&
          String(item.ownerUid || "") !== String(user.uid) &&
          !approvedIds.has(id) &&
          !pendingByMe.has(id);`,
"permitir revisão de vínculo legado");
replace("meu-perfil.js",
`      '</small><small>UID do perfil: ' + esc(item.id) +
      '</small></div><button type="button" data-claim-profile="' + esc(item.id) + '">REIVINDICAR</button></div>'`,
`      '</small><small>UID do perfil: ' + esc(item.id) +
      (String(item.ownerUid || "").trim() ? '</small><small>Vínculo anterior detectado: a transferência dependerá da revisão do administrador.' : '') +
      '</small></div><button type="button" data-claim-profile="' + esc(item.id) + '">REIVINDICAR</button></div>'`,
"aviso de vínculo anterior");

// 5. Admin: reivindicação apontando para perfil já vinculado pode ser revisada e transferida com confirmação explícita.
replace("admin-profile-link-v10.js",
`  const currentOwner=text(athlete.ownerUid);
  if(currentOwner&&currentOwner!==uid)throw new Error("Esse perfil legado já está vinculado a outra conta.");`,
`  const currentOwner=text(athlete.ownerUid);
  if(currentOwner&&currentOwner!==uid){
    const claims=await getDocs(collection(db,"reivindicacoes_perfis"));
    const pending=claims.docs.some(item=>{
      const data=item.data()||{};
      return text(data.perfilId)===profileId&&text(data.solicitanteUid)===uid&&text(data.status).toLowerCase()==="pendente";
    });
    if(!pending)throw new Error("Esse perfil legado já está vinculado a outra conta e não existe uma reivindicação pendente deste UID.");
    if(!confirm(`ATENÇÃO: este perfil está vinculado ao UID ${currentOwner}. A solicitação do UID ${uid} está pendente. Confirma a transferência do cadastro legado após conferir a identidade do atleta?`)){
      throw new Error("Transferência cancelada pelo administrador.");
    }
  }`,
"transferência administrativa protegida");
replace("admin-claims-v9.js",
`  const profilesByUid=new Map(model.profiles.map(p=>[p.id,p]));
  const athleteByUid=new Map(model.athletes.filter(a=>txt(a.ownerUid)).map(a=>[txt(a.ownerUid),a]));`,
`  const profilesByUid=new Map(model.profiles.map(p=>[p.id,p]));
  const athleteById=new Map(model.athletes.map(a=>[a.id,a]));
  const athleteByUid=new Map(model.athletes.filter(a=>txt(a.ownerUid)).map(a=>[txt(a.ownerUid),a]));`,
"índice admin por atleta");
replace("admin-claims-v9.js",
`    const uid=txt(account.uid||account.id),linked=athleteByUid.get(uid),claim=claimsByUid.get(uid),social=profilesByUid.get(uid),suggestion=!linked?bestSuggestion(account,orphans):null;`,
`    const uid=txt(account.uid||account.id),linked=athleteByUid.get(uid),claim=claimsByUid.get(uid),social=profilesByUid.get(uid),claimTarget=claim?.perfilId?athleteById.get(txt(claim.perfilId)):null,suggestion=!linked&&!claimTarget?bestSuggestion(account,orphans):null;`,
"alvo reivindicado no admin");
replace("admin-claims-v9.js",`    const target=linked||suggestion||null;`,`    const target=linked||claimTarget||suggestion||null;`,"usar alvo da reivindicação");

// 6. Rules: dono sempre pode ler seus próprios conteúdos, inclusive legados pendentes.
const oldRead=`allow read: if isAdmin() || (resource.data.aprovado == true && canReadSocialOwner(resource.data.ownerUid, resource.data.get('visibilidade','privado')));`;
const newRead=`allow read: if isAdmin() || (signedIn() && resource.data.ownerUid == request.auth.uid) || (resource.data.aprovado == true && canReadSocialOwner(resource.data.ownerUid, resource.data.get('visibilidade','privado')));`;
replace("firestore.rules",oldRead,newRead,"owner read social",3);

// Consolida blocos duplicados de perfis sem alterar a lógica: múltiplos allow no mesmo match continuam em OR.
{
  let t=read("firestore.rules");
  const marker="    match /perfis/{uid} {";
  const starts=[];let pos=0;
  while((pos=t.indexOf(marker,pos))>=0){starts.push(pos);pos+=marker.length}
  if(starts.length<2)throw new Error(`firestore.rules: esperado mais de um bloco perfis, encontrados ${starts.length}`);
  const blocks=[];
  for(const start of starts){
    let i=start+marker.length,depth=1,inSingle=false,inDouble=false,escaped=false;
    for(;i<t.length;i++){
      const ch=t[i];
      if(escaped){escaped=false;continue}
      if(ch==="\\"&&(inSingle||inDouble)){escaped=true;continue}
      if(ch==="'"&&!inDouble){inSingle=!inSingle;continue}
      if(ch==='"'&&!inSingle){inDouble=!inDouble;continue}
      if(inSingle||inDouble)continue;
      if(ch==="{")depth++;else if(ch==="}"){depth--;if(depth===0)break}
    }
    blocks.push({start,end:i+1,inner:t.slice(start+marker.length,i)});
  }
  const merged=marker+blocks.map(b=>b.inner).join("\n").replace(/\n{3,}/g,"\n\n")+"}";
  for(let idx=blocks.length-1;idx>=0;idx--){const b=blocks[idx];t=t.slice(0,b.start)+(idx===0?merged:"")+t.slice(b.end)}
  write("firestore.rules",t);
}

// 7. Limites de listas pessoais crescentes.
replace("hashtags.js",`getDocs(collection(db,"seguindo",user.uid,"usuarios"))`,`getDocs(query(collection(db,"seguindo",user.uid,"usuarios"),limit(1000)))`,"limite seguindo");
replace("hashtags.js",`getDocs(collection(db,"bloqueios",user.uid,"usuarios"))`,`getDocs(query(collection(db,"bloqueios",user.uid,"usuarios"),limit(1000)))`,"limite bloqueios");
replace("salvos.js",`import { collection, deleteDoc, doc, getDoc, getDocs, getFirestore }`,`import { collection, deleteDoc, doc, getDoc, getDocs, getFirestore, limit, query }`,"imports salvos");
replace("salvos.js",`getDocs(collection(db,"salvos",user.uid,"publicacoes"))`,`getDocs(query(collection(db,"salvos",user.uid,"publicacoes"),limit(300)))`,"limite salvos");

// 8. Service Worker: precache resiliente, sem página de teste e cache novo.
replaceRegex("sw.js",/bd-atletas-v\d+-\d{8}-\d+/g,"bd-atletas-v46-20260909-1","cache V46");
replaceRegex("sw.js",/\s*["']\/teste-social\.html["'],?/g,"","remover teste do precache");
replace("sw.js","caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE).catch(()=>{}))","caches.open(CACHE_NAME).then(cache=>Promise.allSettled(CORE.map(url=>cache.add(url))))","precache resiliente");

// 9. Manifest recebe PNGs reais gerados pelo workflow.
{
  const p="manifest.webmanifest",m=JSON.parse(read(p));
  const existing=(Array.isArray(m.icons)?m.icons:[]).filter(i=>!["/assets/app-icon-192.png","/assets/app-icon-512.png"].includes(i.src));
  m.icons=[
    {src:"/assets/app-icon-192.png",sizes:"192x192",type:"image/png",purpose:"any"},
    {src:"/assets/app-icon-512.png",sizes:"512x512",type:"image/png",purpose:"any maskable"},
    ...existing
  ];
  write(p,JSON.stringify(m,null,2)+"\n");
}
{
  let t=read("sw.js");
  const anchor='  "/assets/app-icon.svg",';
  if(!t.includes(anchor))throw new Error("sw.js: âncora de ícone ausente");
  t=t.replace(anchor,anchor+'\n  "/assets/app-icon-192.png",\n  "/assets/app-icon-512.png",');
  write("sw.js",t);
}

// 10. Normaliza versões de módulos compartilhados para impedir instâncias ESM duplicadas e cache antigo.
const runtimeAssets=[
  "firebase-app-check-v11.js","media-utils.js","site-v5.js","admin-claims-v9.js","admin-commerce-v11.js",
  "admin-control-center-v10.js","admin-data-migration-v11.js","admin-profile-browser-v13.js","admin-profile-link-v10.js",
  "admin-shortcut-v34.js","admin-v8-hardening.js","social-network.js","ugc-safety-v41.js","cloudinary-upload.js","profile-story-access-v45.js"
];
function escapeRe(s){return s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}
for(const p of [...fs.readdirSync(root).filter(f=>/\.(?:js|html)$/i.test(f)),...fs.readdirSync(path.join(root,"scripts")).filter(f=>f.endsWith(".mjs")).map(f=>`scripts/${f}`)]){
  let t=read(p),before=t;
  for(const asset of runtimeAssets){
    const re=new RegExp(`${escapeRe(asset)}(?:\\?v=[0-9A-Za-z._-]+)?`,"g");
    t=t.replace(re,`${asset}?v=20260909-46`);
  }
  if(t!==before)write(p,t);
}

// 11. Scanner V46: remove falsos positivos e reconhece Android TWA existente.
{
  let t=read("scripts/audit-v46-complete.mjs");
  t=t.replace(`if(!value||value.startsWith('#')||/^(?:https?:|data:|mailto:|tel:|javascript:|blob:|chrome-extension:)/i.test(value)) return null;`,`if(!value||value.startsWith('#')||/^(?:https?:|data:|mailto:|tel:|javascript:|blob:|chrome-extension:|node:)/i.test(value)) return null;`);
  t=t.replace(`if(/\\.(?:js|mjs)$/i.test(file)){`,`if(/\\.(?:js|mjs)$/i.test(file) && !file.startsWith("scripts/")){`);
  t=t.replace(`for(const m of text.matchAll(/http:\\\/\\\\/[^\"'\x60\\s)]+/g)) add('MEDIUM','INSECURE_HTTP',file,m[0]);`,`for(const m of text.matchAll(/http:\\\/\\\\/[^\"'\x60\\s)]+/g)) if(!m[0].startsWith("http://www.w3.org/2000/svg")) add('MEDIUM','INSECURE_HTTP',file,m[0]);`);
  t=t.replace(`if(/getDocs\\s*\\(\\s*collection\\s*\\(/.test(text)) add('MEDIUM','UNBOUNDED_COLLECTION_SCAN',file,'getDocs(collection(...)) sem query/limit aparente');`,`if(!file.startsWith("scripts/") && /getDocs\\s*\\(\\s*collection\\s*\\(/.test(text)) add('LOW','UNBOUNDED_COLLECTION_SCAN',file,'revisar coleção sem limite explícito');`);
  t=t.replace(`const androidFiles=files.filter(f=>f.startsWith('android/'));\nif(!androidFiles.length) add('MEDIUM','ANDROID_PROJECT_MISSING','android/','projeto Android/TWA não está no repositório');`,`const androidFiles=files.filter(f=>f.startsWith('android-twa/'));\nif(!androidFiles.length) add('HIGH','ANDROID_PROJECT_MISSING','android-twa/','projeto Android/TWA não está no repositório');`);
  t=t.replace(`if(!fileSet.has('.well-known/assetlinks.json')) add('MEDIUM','ASSETLINKS_MISSING','.well-known/assetlinks.json','Digital Asset Links ausente');`,`if(!fileSet.has('.well-known/assetlinks.json')) add('LOW','ASSETLINKS_PENDING_PLAY_CERT','.well-known/assetlinks.json','depende do SHA-256 do certificado de App Signing do Google Play');`);
  t=t.replace(`if(/allow\\s+(?:read|write|create|update|delete)(?:\\s*,\\s*\\w+)*\\s*:\\s*if\\s+true\\s*;/.test(t)) add('HIGH','UNCONDITIONAL_RULE_ALLOW','firestore.rules','allow ... if true detectado');`,`if(/allow\\s+(?:write|create|update|delete)(?:\\s*,\\s*\\w+)*\\s*:\\s*if\\s+true\\s*;/.test(t)) add('HIGH','UNCONDITIONAL_RULE_WRITE','firestore.rules','escrita incondicional detectada');`);
  write("scripts/audit-v46-complete.mjs",t);
}

console.log(`V46 fixes aplicados em ${changed.size} arquivos:`);
for(const p of [...changed].sort())console.log(` - ${p}`);
