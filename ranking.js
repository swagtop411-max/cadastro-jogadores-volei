import{initializeApp,getApps,getApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";import{getFirestore,collection,getDocs}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9CO",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};const app=getApps().length?getApp():initializeApp(cfg),db=getFirestore(app);
const $=id=>document.getElementById(id),esc=v=>{const d=document.createElement("div");d.textContent=v==null?"":String(v);return d.innerHTML},norm=v=>String(v||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const pontos=v=>{const s=norm(v);if(/campe|(^|\s)1[ºo°]?|primeiro/.test(s))return 100;if(/(^|\s)2[ºo°]?|segundo/.test(s))return 80;if(/(^|\s)3[ºo°]?|terceiro/.test(s))return 65;if(/(^|\s)4[ºo°]?|quarto/.test(s))return 55;if(/(^|\s)[5-8][ºo°]?/.test(s))return 40;if(/(^|\s)(9|10|11|12|13|14|15|16)[ºo°]?/.test(s))return 25;return 10};
let atletas=[],filtro={periodo:"geral",ano:"",categoria:"",modalidade:""},carregamentoRanking=null;
function montar(){const mapa=new Map();atletas.forEach(a=>{let total=0,participacoes=0;const hist=Array.isArray(a.historicoCampeonatos)?a.historicoCampeonatos:[];hist.forEach(h=>{const ano=String(h.ano||"");if(filtro.ano&&ano!==filtro.ano)return;if(filtro.categoria&&norm(a.categoria)!==norm(filtro.categoria))return;if(filtro.modalidade&&!(Array.isArray(a.modalidades)?a.modalidades:[]).some(m=>norm(m)===norm(filtro.modalidade)))return;total+=pontos(h.colocacao);participacoes++});if(total)mapa.set(a.id,{...a,pontos:total,participacoes})});return[...mapa.values()].sort((a,b)=>b.pontos-a.pontos||b.participacoes-a.participacoes||a.nome.localeCompare(b.nome,"pt-BR"))}
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
        historicoCampeonatos:historico});
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
function iniciar(){const b=$("btnAbrirRanking"),x=$("btnFecharRanking"),d=$("rankingDrawer");if(!b||!d)return;b.addEventListener("click",abrir);x&&x.addEventListener("click",fechar);d.addEventListener("click",e=>{if(e.target.matches("[data-fechar-ranking]"))fechar()});document.addEventListener("keydown",e=>{if(e.key==="Escape")fechar()});const h=document.querySelector(".ranking-panel-head");if(h&&!$("rankingFiltros"))h.insertAdjacentHTML("afterend","<div id=\"rankingFiltros\" class=\"ranking-filtros\" aria-label=\"Filtros do ranking\"></div>")}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",iniciar,{once:true});else iniciar();