import{getApp,getApps,initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";import{getAuth,onAuthStateChanged}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";import{getFirestore,doc,getDoc,setDoc,collection,addDoc,query,where,orderBy,getDocs,serverTimestamp,deleteField,deleteDoc,Timestamp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";import{uploadCloudinary}from"./cloudinary-upload.js?v=20260901-8";
const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};const app=getApps().length?getApp():initializeApp(cfg),auth=getAuth(app),db=getFirestore(app);const $=id=>document.getElementById(id);let user=null,profile=null;
const status=(m,media=false)=>{($(media?"mediaStatus":"profileStatus")).textContent=m};
function esc(v){const d=document.createElement("div");d.textContent=v??"";return d.innerHTML}
function normalizeLocation(cidade,uf){
  let city=String(cidade||"").trim().replace(/\\s+/g," ");
  let state=String(uf||"").trim().toUpperCase();
  const ufs=new Set(["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"]);
  let m=city.match(/^([A-Z]{2})\\s*[-,]\\s*(.+)$/i);
  if(m && ufs.has(m[1].toUpperCase())){
    if(!state)state=m[1].toUpperCase();
    city=m[2].trim();
  }else{
    m=city.match(/^(.+?)\\s*[-,]\\s*([A-Z]{2})$/i);
    if(m && ufs.has(m[2].toUpperCase())){
      if(!state)state=m[2].toUpperCase();
      city=m[1].trim();
    }
  }
  city=city.replace(/^([A-Z]{2})\\s*[-,]\\s*/i,"").trim();
  return {cidade:city,uf:state};
}
async function upload(file,folder){if(!file)throw Error("Selecione um arquivo.");const max=folder==="capa"?8*1024*1024:10*1024*1024;const up=await uploadCloudinary(file,{maxBytes:max,allowImage:true,allowVideo:false,tags:["cadastro-de-atletas","perfil",folder]});return{url:up.url,path:up.path,mime:up.mime,size:up.size}}
function profileHandle(nome,uid){const base=String(nome||"atleta").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,28)||"atleta";return `${base}-${String(uid||"").slice(0,6).toLowerCase()}`}
function pontosColocacao(v){const s=String(v||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");if(/(^|\s)(1[ºo°]?|primeiro|campeao)/.test(s))return 100;if(/(^|\s)(2[ºo°]?|segundo)/.test(s))return 80;if(/(^|\s)(3[ºo°]?|terceiro)/.test(s))return 65;if(/(^|\s)(4[ºo°]?|quarto)/.test(s))return 55;if(/(^|\s)[5-8][ºo°]?/.test(s))return 40;if(/(^|\s)(9|10|11|12|13|14|15|16)[ºo°]?/.test(s))return 25;return 10}
function colocacoesOptions(selected=""){const arr=["1º lugar","2º lugar","3º lugar","4º lugar","5º lugar","6º lugar","7º lugar","8º lugar","9º lugar","10º lugar","11º lugar","12º lugar","13º lugar","14º lugar","15º lugar","16º lugar","17º lugar","18º lugar","19º lugar","20º lugar"];return '<option value="">Selecione a colocação</option>'+arr.map(v=>'<option value="'+v+'"'+(v===selected?" selected":"")+'>'+v+'</option>').join("")}
function campeonatoRowHtml(h={}){const ano=String(h.ano||"");return '<div class="campeonato-row"><input class="campeonato-nome" maxlength="120" placeholder="Nome do campeonato" value="'+esc(h.campeonato||"")+'"><select class="campeonato-colocacao" aria-label="Colocação">'+colocacoesOptions(h.colocacao||"")+'</select><input class="campeonato-ano" type="number" min="1900" max="2100" placeholder="Ano" value="'+esc(ano)+'"><div class="campeonato-pontos">'+pontosColocacao(h.colocacao)+" PTS"+'</div><button type="button" class="btn-remove-campeonato" aria-label="Remover campeonato">✕</button></div>'}
function bindCampeonatoRow(row){const sel=row.querySelector(".campeonato-colocacao"),pts=row.querySelector(".campeonato-pontos"),rm=row.querySelector(".btn-remove-campeonato");sel.onchange=()=>{pts.textContent=pontosColocacao(sel.value)+" PTS";updateHistoricoTotal()};rm.onclick=()=>{row.remove();if(!$("campeonatosLista").children.length)$("campeonatosLista").innerHTML='<div class="campeonato-empty">Nenhum campeonato registrado ainda. Clique em <strong>ADICIONAR CAMPEONATO</strong> para começar.</div>';updateHistoricoTotal()}}
function updateHistoricoTotal(){const total=[...document.querySelectorAll("#campeonatosLista .campeonato-row")].reduce((n,row)=>n+pontosColocacao(row.querySelector(".campeonato-colocacao")?.value),0);if($("historicoPontosTotal"))$("historicoPontosTotal").textContent=total+" PTS"}
function renderHistoricoCampeonatos(){const box=$("campeonatosLista"),totalBox=$("historicoPontosTotal");if(!box)return;const hist=dedupeCampeonatos(profile?.historicoCampeonatos);box.innerHTML=hist.length?hist.map(campeonatoRowHtml).join(""):'<div class="campeonato-empty">Nenhum campeonato registrado ainda. Clique em <strong>ADICIONAR CAMPEONATO</strong> para começar.</div>';if(totalBox)totalBox.textContent=hist.reduce((n,h)=>n+pontosColocacao(h.colocacao),0)+" PTS";box.querySelectorAll(".campeonato-row").forEach(bindCampeonatoRow)}
function addCampeonatoRow(){const box=$("campeonatosLista");if(!box)return;box.querySelector(".campeonato-empty")?.remove();const row=document.createElement("div");row.className="campeonato-row";row.innerHTML=campeonatoRowHtml({});box.appendChild(row);bindCampeonatoRow(row);row.querySelector(".campeonato-nome")?.focus();updateHistoricoTotal()}
function dedupeCampeonatos(hist){const seen=new Set();return (Array.isArray(hist)?hist:[]).filter(x=>{const key=[x?.campeonato,x?.colocacao,x?.ano].map(v=>String(v??"").trim().toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").replace(/\\s+/g," ")).join("|");if(!key||seen.has(key))return false;seen.add(key);return true})}
function getHistoricoCampeonatosFromForm(){const rows=[...document.querySelectorAll("#campeonatosLista .campeonato-row")].map(row=>({campeonato:row.querySelector(".campeonato-nome")?.value.trim()||"",colocacao:row.querySelector(".campeonato-colocacao")?.value.trim()||"",ano:row.querySelector(".campeonato-ano")?.value.trim()||""})).filter(x=>x.campeonato||x.colocacao||x.ano);return dedupeCampeonatos(rows)}

function fill(){const p=profile||{};const loc=normalizeLocation(p.cidade,p.uf);if($("coverPreview"))$("coverPreview").style.backgroundImage=p.capaUrl?`url("${p.capaUrl}")`:"";const publicLink=$("publicProfileLink");const myHeaderLink=$("myProfileHeaderLink");if(publicLink&&user)publicLink.href="perfil-social.html?uid="+encodeURIComponent(user.uid);if(myHeaderLink&&user){const complete=Boolean(p.nome&&p.cidade&&p.uf);myHeaderLink.href=complete?"perfil-social.html?uid="+encodeURIComponent(user.uid):"meu-perfil.html?editar=1";}$("name").value=p.nome||user.displayName||"";$("birth").value=p.nascimento||"";$("uf").value=loc.uf||"";$("city").value=loc.cidade||"";$("modalidade").value=p.modalidade||"";$("posicao").value=p.posicao||"";$("categoria").value=p.categoria||"Iniciante";$("time").value=p.time||"";$("contato").value=p.contato||"";$("bio").value=p.bio||"";renderHistoricoCampeonatos();const plan=p.planoId||"gratuito";document.querySelectorAll('input[name="profilePlano"]').forEach(x=>{x.checked=x.value===plan;x.closest(".profile-plano")?.classList.toggle("selecionado",x.checked)});$("displayName").textContent=p.nome||user.displayName||"Seu perfil";$("profileSummary").textContent=[p.cidade,p.uf,p.modalidade,p.posicao].filter(Boolean).join(" • ")||"Complete seu perfil para aparecer na rede";if(p.fotoUrl)$("avatar").src=p.fotoUrl;else $("avatar").src="data:image/svg+xml;charset=UTF-8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="#18221d"/><text x="150" y="180" text-anchor="middle" font-size="100">🏐</text></svg>')}
async function saveProfile(){
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

async function loadClaimableProfiles(){
  const box=$("claimProfileCard"),list=$("claimProfileList"),st=$("claimProfileStatus");
  if(!box||!list||!user)return;
  try{
    /*
      Fonte canônica para disponibilidade:
      - ownerUid no atleta = já vinculado;
      - reivindicacao_perfis aprovada = já reivindicado, mesmo que um dado legado
        ainda não tenha ownerUid;
      - solicitação pendente do próprio usuário também fica fora da lista.
      Isso impede que um perfil reapareça para reivindicação depois da aprovação.
    */
    const [claimsSnap, athletesSnap] = await Promise.all([
      getDocs(collection(db,"reivindicacoes_perfis")),
      getDocs(collection(db,"atletas"))
    ]);
    const claims=claimsSnap.docs.map(d=>({id:d.id,...d.data()}));
    const approvedIds=new Set(
      claims.filter(c=>String(c.status||"").toLowerCase()==="aprovada"&&c.perfilId)
        .map(c=>String(c.perfilId))
    );
    const pendingByMe=new Set(
      claims.filter(c=>String(c.status||"").toLowerCase()==="pendente"&&String(c.solicitanteUid||"")===String(user.uid))
        .map(c=>String(c.perfilId||""))
    );

    const hasApprovedMine=claims.some(c=>
      String(c.status||"").toLowerCase()==="aprovada" &&
      String(c.solicitanteUid||"")===String(user.uid)
    );
    const ownedSnap=await getDocs(query(collection(db,"atletas"),where("ownerUid","==",user.uid)));
    const alreadyLinked=Boolean(profile?.legadoAtletaId)||hasApprovedMine||!ownedSnap.empty;

    if(alreadyLinked){
      box.hidden=true;
      if(list)list.innerHTML="";
      return;
    }

    const available=athletesSnap.docs.map(d=>({id:d.id,...d.data()}))
      .filter(a=>{
        const id=String(a.id||"");
        return id &&
          !String(a.ownerUid||"").trim() &&
          !approvedIds.has(id) &&
          !pendingByMe.has(id);
      })
      .sort((a,b)=>String(a.nome||"").localeCompare(String(b.nome||""),"pt-BR"));

    if(!available.length){
      box.hidden=true;
      if(list)list.innerHTML="";
      return;
    }

    box.hidden=false;
    list.className="claim-list";
    list.innerHTML=available.slice(0,100).map(a=>
      '<div class="claim-choice"><div><strong>'+esc(a.nome||"Atleta")+
      '</strong><small>'+esc([a.cidade,a.uf,a.categoria].filter(Boolean).join(" · "))+
      '</small><small>UID do perfil: '+esc(a.id)+
      '</small></div><button type="button" data-claim-profile="'+esc(a.id)+'">REIVINDICAR</button></div>'
    ).join("");

    list.querySelectorAll("[data-claim-profile]").forEach(b=>
      b.onclick=()=>claimProfile(b.dataset.claimProfile,available.find(a=>a.id===b.dataset.claimProfile))
    );
  }catch(e){
    console.error("Falha ao carregar perfis reivindicáveis:",e);
    box.hidden=true;
  }
}
async function claimProfile(perfilId,p){
  const st=$("claimProfileStatus");
  if(!p||!user)return;
  const b=document.querySelector('[data-claim-profile="'+CSS.escape(perfilId)+'"]');
  if(b)b.disabled=true;
  try{
    const claimRef=doc(db,"reivindicacoes_perfis",perfilId+"_"+user.uid);
    const existing=await getDoc(claimRef);
    if(existing.exists()){
      const old=existing.data()||{};
      if(String(old.status||"").toLowerCase()==="aprovada"){
        if(st)st.textContent="Este perfil já está reivindicado e vinculado à sua conta.";
        if(b)b.remove();
        return;
      }
      if(String(old.status||"").toLowerCase()==="pendente"){
        if(st)st.textContent="Este perfil já possui uma solicitação aguardando análise.";
        if(b){b.textContent="SOLICITAÇÃO ENVIADA";b.disabled=true;}
        return;
      }
    }
    await setDoc(claimRef,{
      perfilId,
      perfilNome:p.nome||"Atleta",
      solicitanteUid:user.uid,
      solicitanteEmail:user.email||"",
      solicitanteNome:profile?.nome||user.displayName||"",
      status:"pendente",
      criadoEm:serverTimestamp(),
      atualizadoEm:serverTimestamp()
    },{merge:true});
    if(st)st.textContent="Solicitação enviada para análise do administrador.";
    if(b){b.textContent="SOLICITAÇÃO ENVIADA";b.disabled=true;}
  }catch(e){
    console.error(e);
    if(st)st.textContent="Não foi possível reivindicar este perfil agora.";
    if(b)b.disabled=false;
  }
}
document.querySelectorAll('input[name="profilePlano"]').forEach(x=>x.addEventListener("change",()=>{document.querySelectorAll(".profile-plano").forEach(l=>l.classList.toggle("selecionado",l.querySelector("input")?.checked));$("profilePlanStatus").textContent=x.value==="gratuito"?"Plano gratuito ativo.":"Plano selecionado. O pagamento ficará aguardando confirmação administrativa."}));
async function publishPhoto(file){if(!file)return;if(!profile?.nome){status("Complete e salve seu perfil antes de publicar.",true);return}status("Enviando foto para o feed...",true);const up=await upload(file,"publicacoes");await addDoc(collection(db,"publicacoes"),{ownerUid:user.uid,ownerEmail:user.email||"",nome:profile.nome,texto:($("captionInput")?.value.trim()||"Nova foto de "+profile.nome),imagem:up.url,imagemUrl:up.url,imagemPath:up.path,imagemMime:up.mime,imagemTamanho:up.size,aprovado:false,status:"pendente",criadoEm:serverTimestamp()});status("Foto enviada para aprovação. Ela aparecerá no feed após a aprovação.",true);if($("captionInput"))$("captionInput").value=""}
async function publishVideo(file){if(!file)return;if(!profile?.nome){status("Complete e salve seu perfil antes de publicar.",true);return}status("Enviando vídeo para o feed...",true);const up=await upload(file,"videos");await addDoc(collection(db,"videos"),{ownerUid:user.uid,nome:profile.nome,videoUrl:up.url,videoPath:up.path,videoMime:up.mime,videoTamanho:up.size,legenda:$("captionInput")?.value.trim()||"",aprovado:false,status:"pendente",criadoEm:serverTimestamp()});status("Vídeo enviado para aprovação. Ele aparecerá no feed após a aprovação.",true);if($("captionInput"))$("captionInput").value=""}
async function publishStory(file){if(!file)return;if(!profile?.nome){status("Complete e salve seu perfil antes de publicar.",true);return}status("Enviando story...",true);const up=await upload(file,"stories");const exp=new Date(Date.now()+24*60*60*1000);await addDoc(collection(db,"stories"),{ownerUid:user.uid,nome:profile.nome,mediaUrl:up.url,mediaPath:up.path,mediaType:up.mime.startsWith("video/")?"video":"image",aprovado:false,status:"pendente",criadoEm:serverTimestamp(),expiraEm:exp});status("Story enviado para aprovação. Ele aparecerá após a aprovação.",true)}
async function loadMedia(){if(!user)return;try{const p=await getDocs(query(collection(db,"publicacoes"),where("ownerUid","==",user.uid),orderBy("criadoEm","desc")));const v=await getDocs(query(collection(db,"videos"),where("ownerUid","==",user.uid),orderBy("criadoEm","desc")));const s=await getDocs(query(collection(db,"stories"),where("ownerUid","==",user.uid),orderBy("criadoEm","desc")));const items=[...p.docs.map(d=>({t:"img",url:d.data().imagemUrl||d.data().imagem})),...v.docs.map(d=>({t:"video",url:d.data().videoUrl}))];$("gallery").innerHTML=items.length?items.map(x=>x.t==="img"?`<img src="${esc(x.url)}" loading="lazy">`:`<video src="${esc(x.url)}" controls preload="metadata"></video>`).join(""):'<span class="empty">Suas publicações aparecerão aqui.</span>';const stories=s.docs.filter(d=>(d.data().expiraEm?.toDate?.()||new Date())>new Date());$("stories").innerHTML=stories.length?stories.map(d=>`<img src="${esc(d.data().mediaUrl)}" loading="lazy">`).join(""):'<span class="empty">Seus stories ativos aparecerão aqui.</span>'}catch(e){console.warn("media",e);$("gallery").innerHTML='<span class="empty">Publique seu primeiro conteúdo para começar.</span>'}}
$("saveProfile").onclick=saveProfile;$("btnAddCampeonato")?.addEventListener("click",addCampeonatoRow);$("coverInput")?.addEventListener("change",()=>{const f=$("coverInput").files[0];if(f)$("coverPreview").style.backgroundImage=`url("${URL.createObjectURL(f)}")`});$("avatarInput").onchange=()=>{const f=$("avatarInput").files[0];if(f)$("avatar").src=URL.createObjectURL(f)};$("photoInput").onchange=async()=>{try{await publishPhoto($("photoInput").files[0]);$("photoInput").value="";await loadMedia()}catch(e){console.error(e);status(e.message||"Falha ao publicar foto.",true)}};$("videoInput").onchange=async()=>{try{await publishVideo($("videoInput").files[0]);$("videoInput").value="";await loadMedia()}catch(e){console.error(e);status(e.message||"Falha ao publicar vídeo.",true)}};$("storyInput").onchange=async()=>{try{await publishStory($("storyInput").files[0]);$("storyInput").value="";await loadMedia()}catch(e){console.error(e);status(e.message||"Falha ao publicar story.",true)}};
onAuthStateChanged(auth,async u=>{if(!u){location.href="conta.html?tab=login&return=/meu-perfil.html";return}user=u;try{const [s,usuarioPrivado]=await Promise.all([getDoc(doc(db,"perfis",u.uid)),getDoc(doc(db,"usuarios",u.uid))]);profile=s.exists()?s.data():null;const privado=usuarioPrivado.exists()?usuarioPrivado.data():{};if(profile)profile={...profile,nascimento:profile.nascimento||privado.nascimento||"",contato:profile.contato||privado.contato||"",email:profile.email||privado.email||u.email||""};const legadoSnap=await getDocs(query(collection(db,"atletas"),where("ownerUid","==",u.uid)));if(!legadoSnap.empty){const legado={id:legadoSnap.docs[0].id,...legadoSnap.docs[0].data()};const legadoLoc=normalizeLocation(legado.cidade,legado.uf);const legadoLocFinal=normalizeLocation(profile?.cidade||legado.cidade,profile?.uf||legado.uf);
const legadoProfile={
  uid:u.uid,
  nome:profile?.nome||legado.nome||"",
  nascimento:profile?.nascimento||legado.nascimento||"",
  cidade:legadoLocFinal.cidade||"",
  uf:legadoLocFinal.uf||"",
  modalidade:profile?.modalidade||legado.modalidade||"",
  posicao:profile?.posicao||legado.posicao||"",
  categoria:profile?.categoria||legado.categoria||"Iniciante",
  time:profile?.time||legado.time||"",
  contato:profile?.contato||legado.contato||"",
  bio:profile?.bio||legado.observacoes||"",historicoCampeonatos:Array.isArray(profile?.historicoCampeonatos)?profile.historicoCampeonatos:(Array.isArray(legado.historicoCampeonatos)?legado.historicoCampeonatos:[]),
  fotoUrl:profile?.fotoUrl||legado.foto||"",
  plano:profile?.plano||legado.plano||"Gratuito",
  planoId:profile?.planoId||legado.planoId||"gratuito",
  valorPlano:Number(profile?.valorPlano??legado.valorPlano??0),
  planoStatus:profile?.planoStatus||legado.planoStatus||"ativo",
  pagamentoConfirmado:profile?.pagamentoConfirmado===true||legado.pagamentoConfirmado===true,
  email:u.email||profile?.email||legado.ownerEmail||"",
  status:profile?.status||legado.status||"ativo"
};
await setDoc(doc(db,"perfis",u.uid),{uid:u.uid,nome:legadoProfile.nome,cidade:legadoProfile.cidade,uf:legadoProfile.uf,modalidade:legadoProfile.modalidade,posicao:legadoProfile.posicao,categoria:legadoProfile.categoria,time:legadoProfile.time,bio:legadoProfile.bio,fotoUrl:legadoProfile.fotoUrl,plano:legadoProfile.plano,planoId:legadoProfile.planoId,valorPlano:legadoProfile.valorPlano,planoStatus:legadoProfile.planoStatus,pagamentoConfirmado:legadoProfile.pagamentoConfirmado,status:legadoProfile.status,historicoCampeonatos:legadoProfile.historicoCampeonatos});
const atualizado=await getDoc(doc(db,"perfis",u.uid));
profile=atualizado.exists()?{...atualizado.data(),nascimento:legadoProfile.nascimento||"",contato:legadoProfile.contato||"",email:legadoProfile.email||u.email||""}:legadoProfile;}fill();await loadClaimableProfiles();await loadMedia();const params=new URLSearchParams(location.search);const complete=Boolean(profile?.nome&&profile?.cidade&&profile?.uf);if(complete&&!params.has("editar")){location.replace("perfil-social.html?uid="+encodeURIComponent(user.uid))}}catch(e){console.error("Falha ao carregar/sincronizar perfil:",e);fill();await loadClaimableProfiles();await loadMedia()}});