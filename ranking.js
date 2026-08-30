import{initializeApp,getApps,getApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";import{getFirestore,collection,getDocs}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9CO",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};const app=getApps().length?getApp():initializeApp(cfg),db=getFirestore(app);
const $=id=>document.getElementById(id),esc=v=>{const d=document.createElement("div");d.textContent=v==null?"":String(v);return d.innerHTML},norm=v=>String(v||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
/* HISTORICO-RANKING-DEDUPE-V1 */
function dedupeHistorico(hist){const arr=Array.isArray(hist)?hist:[],seen=new Set();return arr.filter(h=>{const key=[h?.campeonato,h?.colocacao,h?.ano].map(v=>String(v??"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ")).join("|");if(seen.has(key))return false;seen.add(key);return true})}
const pontos=v=>{const s=norm(v);if(/campe|(^|\s)1[ºo°]?|primeiro/.test(s))return 100;if(/(^|\s)2[ºo°]?|segundo/.test(s))return 80;if(/(^|\s)3[ºo°]?|terceiro/.test(s))return 65;if(/(^|\s)4[ºo°]?|quarto/.test(s))return 55;if(/(^|\s)[5-8][ºo°]?/.test(s))return 40;if(/(^|\s)(9|10|11|12|13|14|15|16)[ºo°]?/.test(s))return 25;return 10};
let atletas=[],filtro={periodo:"geral",ano:"",categoria:"",modalidade:""},carregamentoRanking=null;
function chaveAtleta(a){
  const nome=norm(a.nome);
  const cidade=norm(a.cidade);
  const nascimento=String(a.dataNascimento||a.nascimento||"").trim();
  const uid=String(a.uid||a.ownerUid||"").trim();
  const legado=String(a.legadoAtletaId||"").trim();
  if(legado)return "legado:"+legado;
  if(uid)return "uid:"+uid;
  return "nome:"+nome+"|cidade:"+cidade+"|nascimento:"+nascimento;
}
function unificarAtletas(){
  const mapa=new Map();
  atletas.forEach(a=>{
    const chave=chaveAtleta(a);
    const existente=mapa.get(chave);
    if(!existente){mapa.set(chave,{...a});return}
    const historicoA=Array.isArray(existente.historicoCampeonatos)?existente.historicoCampeonatos:[];
    const historicoB=Array.isArray(a.historicoCampeonatos)?a.historicoCampeonatos:[];
    const historico=historicoB.length>=historicoA.length?historicoB:historicoA;
    const modalidades=[...(Array.isArray(existente.modalidades)?existente.modalidades:[]),...(Array.isArray(a.modalidades)?a.modalidades:[])].filter(Boolean);
    mapa.set(chave,{...existente,...a,
      id:existente.id||a.id,
      nome:existente.nome||a.nome,
      cidade:existente.cidade||a.cidade,
      categoria:existente.categoria||a.categoria,
      historicoCampeonatos:dedupeHistorico(historico),
      modalidades:[...new Set(modalidades)]
    });
  });
  return [...mapa.values()];
}
function montar(){
  const mapa=new Map();
  unificarAtletas().forEach(a=>{
    let total=0,participacoes=0;
    const hist=dedupeHistorico(a.historicoCampeonatos);
    hist.forEach(h=>{
      const ano=String(h.ano||"");
      if(filtro.ano&&ano!==filtro.ano)return;
      if(filtro.categoria&&norm(a.categoria)!==norm(filtro.categoria))return;
      if(filtro.modalidade&&!(Array.isArray(a.modalidades)?a.modalidades:[]).some(m=>norm(m)===norm(filtro.modalidade)))return;
      total+=pontos(h.colocacao);
      participacoes++;
    });
    if(total)mapa.set(chaveAtleta(a),{...a,pontos:total,participacoes});
  });
  return[...mapa.values()].sort((a,b)=>b.pontos-a.pontos||b.participacoes-a.participacoes||a.nome.localeCompare(b.nome,"pt-BR"));
}
function render(){const box=$("rankingLista"),arr=montar();if(!box)return;const top=arr.slice(0,3),rest=arr.slice(3);if(!arr.length){box.innerHTML="<p class=\"ranking-vazio\">Ainda não há pontuação para os filtros selecionados.</p>";return}const podio=top.map((a,i)=>"<article class=\"ranking-podio p"+(i+1)+"\"><div class=\"podio-lugar\">"+(i+1)+"º</div><div class=\"podio-nome\">"+esc(a.nome)+"</div><small>"+a.participacoes+" campeonato"+(a.participacoes===1?"":"s")+"</small><strong>"+a.pontos+"<em> PTS</em></strong></article>").join("");const lista=rest.map((a,i)=>"<article class=\"ranking-item\"><div class=\"ranking-posicao\">"+(i+4)+"º</div><div class=\"ranking-atleta\"><strong>"+esc(a.nome)+"</strong><small>"+esc(a.cidade||"Cidade não informada")+" · "+a.participacoes+" campeonato"+(a.participacoes===1?"":"s")+"</small></div><div class=\"ranking-pontos\">"+a.pontos+"<small>PONTOS</small></div></article>").join("");box.innerHTML="<div class=\"ranking-top3\">"+podio+"</div><div class=\"ranking-restante\">"+lista+"</div>"}
async function garantirCarregamento(){if(carregamentoRanking)return carregamentoRanking;carregamentoRanking=carregar();return carregamentoRanking}async function abrir(){const d=$("rankingDrawer");if(!d)return;d.classList.add("aberto");d.setAttribute("aria-hidden","false");document.body.style.overflow="hidden";const box=$("rankingLista");if(box)box.innerHTML="<p class=\"ranking-loading\">Carregando ranking...</p>";await garantirCarregamento();render()}function fechar(){const d=$("rankingDrawer");if(!d)return;d.classList.remove("aberto");d.setAttribute("aria-hidden","true");document.body.style.overflow=""}
async function carregar(){
  try{
    const [atletasSnap, perfisSnap] = await Promise.all([
      getDocs(collection(db,"atletas")),
      getDocs(collection(db,"perfis"))
    ]);
    const perfis=perfisSnap.docs.map(d=>({id:d.id,...(d.data()||{})}));
    const perfilByUid=new Map(perfis.map(p=>[String(p.uid||p.id),p]));
    const perfilByLegado=new Map(perfis.filter(p=>p.legadoAtletaId).map(p=>[String(p.legadoAtletaId),p]));

    atletas=atletasSnap.docs.map(d=>{
      const a={id:d.id,...(d.data()||{})};
      const p=perfilByLegado.get(String(a.id))||perfilByUid.get(String(a.ownerUid||""));
      const histA=Array.isArray(a.historicoCampeonatos)?a.historicoCampeonatos:[];
      const histP=Array.isArray(p?.historicoCampeonatos)?p.historicoCampeonatos:[];
      const historico=histP.length?histP:histA;
      const modalidades=Array.isArray(a.modalidades)&&a.modalidades.length?a.modalidades:
        (Array.isArray(p?.modalidades)&&p.modalidades.length?p.modalidades:
        (a.modalidade?[a.modalidade]:(p?.modalidade?[p.modalidade]:[])));
      return {...a,nome:a.nome||p?.nome||"Atleta",cidade:a.cidade||p?.cidade||"",
        categoria:a.categoria||p?.categoria||"",modalidades,historicoCampeonatos:historico};
    });

    const idsAtletas=new Set(atletas.map(a=>String(a.id)));
    perfis.forEach(p=>{
      const legado=String(p.legadoAtletaId||"");
      const historico=Array.isArray(p.historicoCampeonatos)?p.historicoCampeonatos:[];
      if(!historico.length||(legado&&idsAtletas.has(legado)))return;
      atletas.push({id:p.uid||p.id,uid:p.uid||p.id,ownerUid:p.uid||"",nome:p.nome||"Atleta",
        cidade:p.cidade||"",categoria:p.categoria||"",modalidade:p.modalidade||"",
        modalidades:Array.isArray(p.modalidades)?p.modalidades:(p.modalidade?[p.modalidade]:[]),
        historicoCampeonatos:dedupeHistorico(historico)});
    });

    const anos=[...new Set(atletas.flatMap(a=>(Array.isArray(a.historicoCampeonatos)?a.historicoCampeonatos:[]).map(h=>String(h.ano||"")).filter(Boolean)))].sort().reverse();
    const cats=[...new Set(atletas.map(a=>a.categoria).filter(Boolean))].sort();
    const mods=[...new Set(atletas.flatMap(a=>Array.isArray(a.modalidades)?a.modalidades:[]).filter(Boolean))].sort();
    const box=$("rankingFiltros");
    box.innerHTML="<select id=\"rankingPeriodo\"><option value=\"geral\">Ranking geral</option><option value=\"ano\">Ranking por ano</option></select><select id=\"rankingAno\"><option value=\"\">Todos os anos</option>"+anos.map(x=>"<option>"+esc(x)+"</option>").join("")+"</select><select id=\"rankingCategoria\"><option value=\"\">Todas as categorias</option>"+cats.map(x=>"<option>"+esc(x)+"</option>").join("")+"</select><select id=\"rankingModalidade\"><option value=\"\">Todas as modalidades</option>"+mods.map(x=>"<option>"+esc(x)+"</option>").join("")+"</select>";
    ["rankingPeriodo","rankingAno","rankingCategoria","rankingModalidade"].forEach(id=>$(id).addEventListener("change",()=>{
      filtro.periodo=$("rankingPeriodo").value;filtro.ano=filtro.periodo==="ano"?$("rankingAno").value:"";
      filtro.categoria=$("rankingCategoria").value;filtro.modalidade=$("rankingModalidade").value;render();
    }));
    render();
  }catch(e){console.error(e);$("rankingLista").innerHTML="<p class=\"ranking-vazio\">Não foi possível carregar o ranking.</p>"}
}
function iniciar(){const b=$("btnAbrirRanking"),d=$("rankingDrawer")||garantirRankingDrawer(),x=$("btnFecharRanking");if(b)b.addEventListener("click",abrir);if(x)x.addEventListener("click",fechar);if(d)d.addEventListener("click",e=>{if(e.target.matches("[data-fechar-ranking]"))fechar()});document.addEventListener("keydown",e=>{if(e.key==="Escape")fechar()});const h=document.querySelector(".ranking-panel-head");if(h&&!$("rankingFiltros"))h.insertAdjacentHTML("afterend","<div id=\"rankingFiltros\" class=\"ranking-filtros\" aria-label=\"Filtros do ranking\"></div>")}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",iniciar,{once:true});else iniciar();


/* GLOBAL-RANKING-SAME-PAGE-V2 */
function garantirRankingDrawer(){
  let d=document.getElementById("rankingDrawer");
  if(d)return d;
  d=document.createElement("div");
  d.id="rankingDrawer";d.className="ranking-drawer";d.setAttribute("aria-hidden","true");
  d.innerHTML='<div class="ranking-overlay" data-fechar-ranking></div><aside class="ranking-panel" role="dialog" aria-modal="true" aria-labelledby="rankingTitulo"><div class="ranking-panel-head"><div><span>DESEMPENHO NO CIRCUITO</span><h2 id="rankingTitulo">RANKING DOS ATLETAS</h2></div><button id="btnFecharRanking" class="ranking-close" type="button" aria-label="Fechar ranking">×</button></div><p class="ranking-intro">Pontuação calculada automaticamente a partir das colocações informadas nos campeonatos do perfil de cada atleta.</p><div id="rankingLista" class="ranking-lista"><p class="ranking-loading">Carregando ranking...</p></div><details class="ranking-regras"><summary>Como os pontos são calculados?</summary><ul><li><strong>1º lugar:</strong> 100 pontos</li><li><strong>2º lugar:</strong> 80 pontos</li><li><strong>3º lugar:</strong> 65 pontos</li><li><strong>4º lugar:</strong> 55 pontos</li><li><strong>5º ao 8º:</strong> 40 pontos</li><li><strong>9º ao 16º:</strong> 25 pontos</li><li><strong>Participação / outras colocações:</strong> 10 pontos</li></ul></details></aside>';
  document.body.appendChild(d);
  return d;
}
function instalarRankingGlobal(){
  garantirRankingDrawer();
  document.addEventListener("click",e=>{
    const el=e.target.closest&&e.target.closest("a[href],button");
    if(!el)return;
    const href=el.getAttribute("href")||"";
    const id=el.id||"";
    const eRanking=id==="menuRanking"||/ranking[.]html(?:[?#]|$)/i.test(href)||/index[.]html[?]abrir=ranking(?:[&#]|$)/i.test(href);
    if(!eRanking)return;
    if(id==="btnAbrirRanking")return;
    e.preventDefault();e.stopPropagation();
    if(window.closeSiteMenu)window.closeSiteMenu();
    garantirRankingDrawer();
    abrir();
  },true);
}
instalarRankingGlobal();
function abrirRankingSolicitadoV2(){
  const params=new URLSearchParams(window.location.search);
  if(params.get("abrir")==="ranking" || window.location.hash==="#ranking"){
    setTimeout(()=>{garantirRankingDrawer();abrir()},0);
  }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",abrirRankingSolicitadoV2,{once:true});else abrirRankingSolicitadoV2();
