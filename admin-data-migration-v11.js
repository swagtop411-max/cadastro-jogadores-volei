await import("./firebase-app-check-v11.js?v=20260904-2");
import{getApp,getApps,initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getAuth,onAuthStateChanged}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import{collection,deleteField,doc,getDocs,getFirestore,limit,query,serverTimestamp,where,writeBatch}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};
const ADMIN_EMAIL="swagtop411@gmail.com",app=getApps().length?getApp():initializeApp(cfg),auth=getAuth(app),db=getFirestore(app);
const slug=v=>String(v||"atleta").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,28)||"atleta";
const handleOf=(p,id)=>String(p?.handle||`${slug(p?.nome)}-${String(id||"").slice(0,6).toLowerCase()}`).slice(0,40);
const sensitiveAthlete=["nascimento","contato","ownerEmail","ownerDisplayName","valorPlano","planoStatus","pagamentoConfirmado"];
const sensitiveTeam=["responsavel","contato","ownerEmail","valorPlano","planoStatus","pagamentoConfirmado"];
const text=v=>String(v??"").trim();

function isAdmin(){return text(auth.currentUser?.email).toLowerCase()===ADMIN_EMAIL}
async function rows(name,max=1200){const snap=await getDocs(query(collection(db,name),limit(max)));return snap.docs}
async function socialRows(name,max=600){const snap=await getDocs(query(collection(db,name),where("aprovado","==",true),limit(max)));return snap.docs}
async function commitOps(ops){for(let i=0;i<ops.length;i+=350){const batch=writeBatch(db);for(const op of ops.slice(i,i+350))op(batch);await batch.commit()}}

function addPanel(){if(document.getElementById("v11MigrationPanel"))return;const host=document.getElementById("controleView")||document.getElementById("adminSection");if(!host)return;const panel=document.createElement("section");panel.id="v11MigrationPanel";panel.style.cssText="margin-top:18px;padding:18px;border:1px solid #d5e3eb;border-radius:17px;background:#fff;color:#17384d";panel.innerHTML='<h3 style="margin:0 0 6px">🧹 Higienização V11</h3><p style="margin:0 0 12px;color:#617989;font-size:11px;line-height:1.5">Move dados sensíveis legados para áreas privadas, cria handles indexados, sincroniza a visibilidade social e remove telemetria vencida. Pode ser executado novamente com segurança.</p><button id="v11RunMigration" type="button" style="border:0;border-radius:10px;background:#087fa8;color:#fff;padding:11px 15px;font-weight:900;cursor:pointer">EXECUTAR HIGIENIZAÇÃO V11</button><div id="v11MigrationStatus" style="margin-top:10px;font-size:11px;color:#617989"></div>';host.appendChild(panel);document.getElementById("v11RunMigration").onclick=runMigration}

async function runMigration(){if(!isAdmin())return;const btn=document.getElementById("v11RunMigration"),status=document.getElementById("v11MigrationStatus");if(btn)btn.disabled=true;if(status)status.textContent="Lendo dados e preparando migração...";try{
 const [profiles,configs,athletes,teams,posts,videos,stories,logs,stats]=await Promise.all([rows("perfis"),rows("config_perfis"),rows("atletas"),rows("equipes"),socialRows("publicacoes"),socialRows("videos"),socialRows("stories"),rows("access_logs"),rows("site_stats")]);
 const privacy=new Map(configs.map(d=>[d.id,d.data()?.privado===true]));const coreOps=[],handleOps=[];let moved=0,handles=0,visibility=0,expired=0;
 for(const pdoc of profiles){const p=pdoc.data()||{},handle=handleOf(p,pdoc.id);if(p.handle!==handle){handleOps.push(batch=>batch.set(pdoc.ref,{handle},{merge:true}));handles++}handleOps.push(batch=>batch.set(doc(db,"handles",handle),{uid:pdoc.id,handle,atualizadoEm:serverTimestamp()},{merge:true}))}
 for(const d of athletes){const a=d.data()||{},privatePatch={},publicPatch={};let dirty=false;for(const key of sensitiveAthlete){if(a[key]!==undefined){privatePatch[key]=a[key];publicPatch[key]=deleteField();dirty=true}}if(dirty){privatePatch.atualizadoEm=serverTimestamp();privatePatch.origem="migracao-v11";coreOps.push(batch=>batch.set(doc(db,"atletas",d.id,"privado","dados"),privatePatch,{merge:true}));coreOps.push(batch=>batch.update(d.ref,publicPatch));moved++}}
 for(const d of teams){const a=d.data()||{},privatePatch={},publicPatch={};let dirty=false;for(const key of sensitiveTeam){if(a[key]!==undefined){privatePatch[key]=a[key];publicPatch[key]=deleteField();dirty=true}}if(dirty){privatePatch.atualizadoEm=serverTimestamp();privatePatch.origem="migracao-v11";coreOps.push(batch=>batch.set(doc(db,"equipes",d.id,"privado","dados"),privatePatch,{merge:true}));coreOps.push(batch=>batch.update(d.ref,publicPatch));moved++}}
 for(const group of [posts,videos,stories])for(const d of group){const data=d.data()||{},desired=privacy.get(data.ownerUid)?"privado":"publico";if(data.visibilidade!==desired){coreOps.push(batch=>batch.set(d.ref,{visibilidade:desired},{merge:true}));visibility++}}
 const now=Date.now();for(const d of [...logs,...stats]){const v=d.data()?.expiraEm,ms=v?.toMillis?.()||0;if(ms&&ms<now){coreOps.push(batch=>batch.delete(d.ref));expired++}}
 await commitOps(coreOps);let handleWarning="";try{await commitOps(handleOps)}catch(handleError){console.warn("Handles V12:",handleError);handleWarning=" · handles pendentes"}if(status)status.textContent=`✓ Concluído: ${moved} registros sensíveis higienizados, ${handles} perfis preparados, ${visibility} conteúdos com visibilidade sincronizada e ${expired} eventos vencidos removidos${handleWarning}.`;
 document.dispatchEvent(new CustomEvent("bd:v11-migration-complete"));
 }catch(error){console.error("Migração V11:",error);if(status)status.textContent=`Erro: ${error?.message||error}`}finally{if(btn)btn.disabled=false}}


async function repairVisibility(){
 try{
  const [configs,posts,videos,stories]=await Promise.all([rows("config_perfis",800),socialRows("publicacoes"),socialRows("videos"),socialRows("stories")]);
  const privacy=new Map(configs.map(d=>[d.id,d.data()?.privado===true])),ops=[];
  for(const group of [posts,videos,stories])for(const d of group){const data=d.data()||{},desired=privacy.get(data.ownerUid)?"privado":"publico";if(data.visibilidade!==desired)ops.push(batch=>batch.set(d.ref,{visibilidade:desired},{merge:true}))}
  if(ops.length){await commitOps(ops);console.info(`V12: ${ops.length} conteúdos legados reparados.`);document.dispatchEvent(new CustomEvent("bd:v12-visibility-repaired",{detail:{count:ops.length}}))}
 }catch(error){console.warn("Reparo de visibilidade V12:",error?.code||error)}
}

onAuthStateChanged(auth,user=>{if(text(user?.email).toLowerCase()===ADMIN_EMAIL){void repairVisibility();if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",addPanel,{once:true});else addPanel()}});
