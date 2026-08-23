import{initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getFirestore,collection,getDocs,query,orderBy}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015",measurementId:"G-K033D1K41Y"};
const db=getFirestore(initializeApp(firebaseConfig));

const $=id=>document.getElementById(id);
const busca=$("busca"),filtroNivel=$("filtroNivel"),filtroPosicao=$("filtroPosicao"),filtroCidade=$("filtroCidade"),lista=$("listaJogadores"),ranking=$("ranking"),total=$("total"),ativos=$("ativos"),cidades=$("cidades"),apoiadoresLista=$("apoiadoresLista"),listaEquipes=$("listaEquipes");
let atletas=[];

const texto=v=>v==null?"":String(v);
const esc=v=>{const d=document.createElement("div");d.textContent=texto(v);return d.innerHTML};
const media=a=>{const v=Array.isArray(a)?a.map(Number).filter(Number.isFinite):[];return v.length?v.reduce((x,y)=>x+y,0)/v.length:0};
const foto=f=>{const s=texto(f);return s.startsWith("data:image/")||s.startsWith("http://")||s.startsWith("https://")?s:"data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#e8d5b5"/><text x="300" y="330" text-anchor="middle" font-size="150">🏐</text></svg>`)};

function normalizarAtleta(id,data){
 const a=data&&typeof data==="object"?data:{};
 return {id,nome:texto(a.nome),time:texto(a.time),cidade:texto(a.cidade),categoria:texto(a.categoria),posicao:texto(a.posicao),status:texto(a.status),foto:typeof a.foto==="string"?a.foto:"",avaliacoes:Array.isArray(a.avaliacoes)?a.avaliacoes:[]};
}

async function carregarApoiadores(){
 if(!apoiadoresLista)return;
 apoiadoresLista.innerHTML='<div class="sponsors-empty">Carregando apoiadores...</div>';
 try{
  let s;
  try{s=await getDocs(query(collection(db,"apoiadores"),orderBy("ordem")))}catch{s=await getDocs(collection(db,"apoiadores"))}
  const arr=s.docs.map(d=>({id:d.id,...(d.data()||{})})).filter(a=>a.ativo!==false).sort((a,b)=>(Number(a.ordem)||999)-(Number(b.ordem)||999));
  apoiadoresLista.innerHTML=arr.length?arr.map(a=>`<a class="sponsor-card" href="${esc(a.link||"#")}" target="_blank" rel="noopener noreferrer" title="Visitar ${esc(a.nome)}"><img src="${foto(a.imagem)}" alt="Logo de ${esc(a.nome)}" loading="lazy"><span class="sponsor-name">${esc(a.nome)}</span></a>`).join(""): '<div class="sponsors-empty">Em breve, novas marcas apoiadoras.</div>';
 }catch(e){console.error("Erro nos apoiadores:",e);apoiadoresLista.innerHTML='<div class="sponsors-empty">Não foi possível carregar os apoiadores.</div>'}
}

async function carregar(){
 if(!lista)return;
 lista.innerHTML='<p class="subtitulo">Carregando atletas...</p>';
 try{
  let s;
  try{s=await getDocs(query(collection(db,"atletas"),orderBy("nome")))}catch{s=await getDocs(collection(db,"atletas"))}
  atletas=s.docs.map(d=>normalizarAtleta(d.id,d.data())).sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR"));
  const cs=[...new Set(atletas.map(a=>a.cidade.trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR"));
  if(filtroCidade)filtroCidade.innerHTML='<option value="">Todas as cidades</option>'+cs.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");
  render();
 }catch(e){
  console.error("Erro ao carregar atletas:",e);
  lista.innerHTML='<div class="card"><div><h3>Não foi possível carregar os atletas</h3><p>O banco respondeu, mas houve um erro ao montar a lista. Atualize a página.</p></div></div>';
 }
}

function render(){
 try{
  const textoBusca=texto(busca?.value).trim().toLowerCase(),nivel=filtroNivel?.value||"",pos=filtroPosicao?.value||"",cidade=filtroCidade?.value||"";
  const filtrados=atletas.filter(a=>{const hay=[a.nome,a.time,a.cidade,a.categoria,a.posicao].join(" ").toLowerCase();return(!textoBusca||hay.includes(textoBusca))&&(!nivel||a.categoria===nivel)&&(!pos||a.posicao===pos)&&(!cidade||a.cidade===cidade)});

  if(total)total.textContent=`${atletas.length} ${atletas.length===1?"jogador":"jogadores"}`;
  if(ativos)ativos.textContent=atletas.filter(a=>a.status!=="inativo").length;
  if(cidades)cidades.textContent=new Set(atletas.map(a=>a.cidade).filter(Boolean)).size;

  if(ranking){
   const ranked=atletas.map(a=>({a,n:media(a.avaliacoes)})).filter(x=>x.n>0).sort((x,y)=>y.n-x.n).slice(0,5);
   ranking.innerHTML=`<h2>🏆 Ranking técnico</h2>${ranked.length?ranked.map((x,i)=>`<p><strong>${i+1}º</strong> ${esc(x.a.nome)} <span>· ${esc(x.a.categoria||"Sem categoria")} · ⭐ ${x.n.toFixed(1)}</span></p>`).join(""):'<p>As avaliações dos atletas aparecerão aqui quando forem registradas.</p>'}`;
  }

  if(listaEquipes){
   const equipes={};
   atletas.forEach(a=>{if(a.time)equipes[a.time]=(equipes[a.time]||0)+1});
   const topEquipes=Object.entries(equipes).sort((a,b)=>b[1]-a[1]);
   listaEquipes.innerHTML=topEquipes.length?`<div class="team-strip-head"><span>EQUIPES</span><h2>Times cadastrados</h2></div><div class="team-grid">${topEquipes.map(([t,n])=>`<div class="team-chip"><strong>${esc(t)}</strong><span>${n} atleta${n===1?"":"s"}</span></div>`).join("")}</div>`:"";
  }

  if(!filtrados.length){lista.innerHTML='<div class="card"><div><h3>Nenhum atleta encontrado</h3><p>Tente mudar os filtros ou a busca.</p></div></div>';return}

  lista.innerHTML=filtrados.map(a=>{
   const n=media(a.avaliacoes),perfil=`perfil.html?id=${encodeURIComponent(a.id)}`;
   return `<article class="card"><img src="${foto(a.foto)}" alt="Foto de ${esc(a.nome)}" loading="lazy"><div><h3>${esc(a.nome)} ${a.status==="inativo"?"🔴":"🟢"}</h3><p><strong>Cidade:</strong> ${esc(a.cidade||"Não informada")}</p><p><strong>Posição:</strong> ${esc(a.posicao||"Não informada")}</p><p><strong>Categoria:</strong> ${esc(a.categoria||"Não informada")}</p><p><strong>Time atual:</strong> ${esc(a.time||"Não informado")}</p>${n?`<p><strong>Avaliação:</strong> ⭐ ${n.toFixed(1)}</p>`:""}<p class="public-contact-note">🔒 Contato disponível somente para o administrador</p><a class="profile-link" href="${perfil}">VER PERFIL COMPLETO →</a></div></article>`
  }).join("");
 }catch(e){
  console.error("Erro ao renderizar atletas:",e);
  if(lista)lista.innerHTML=`<div class="card"><div><h3>Não foi possível carregar os atletas</h3><p>Erro ao exibir o cadastro. Atualize a página.</p></div></div>`;
 }
}

[busca,filtroNivel,filtroPosicao,filtroCidade].filter(Boolean).forEach(x=>x.addEventListener("input",render));
carregarApoiadores();
carregar();
