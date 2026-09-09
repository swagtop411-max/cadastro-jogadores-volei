import fs from "node:fs";

const failures=[];
const pass=[];
const read=p=>fs.readFileSync(p,"utf8");
const need=(p,s,label)=>{if(!fs.existsSync(p))return failures.push(`${p}: arquivo ausente`);read(p).includes(s)?pass.push(label):failures.push(`${p}: ${label}`)};
const forbid=(p,s,label)=>{if(!fs.existsSync(p))return failures.push(`${p}: arquivo ausente`);read(p).includes(s)?failures.push(`${p}: ${label}`):pass.push(label)};

need("reivindicacao-v45.js",'status: "pendente"',"reivindicação cria pedido pendente");
need("reivindicacao-v45.js",'text(profile.ownerUid) && text(profile.ownerUid) !== user.uid',"vínculo anterior segue para revisão");
need("reivindicacao-v45.js",'where("solicitanteUid", "==", user.uid)',"consulta apenas reivindicações do usuário");
need("perfil.html",'reivindicacao-v45.js?v=20260909-45',"perfil legado usa fluxo V45");
forbid("perfil.html",'src="reivindicacao.js?',"perfil legado não carrega fluxo antigo");

need("profile-story-access-v45.js?v=20260909-46",'where("visibilidade", "==", "publico")',"visitante consulta apenas Stories públicos");
need("profile-story-access-v45.js?v=20260909-46",'where("aprovado", "==", true)',"Stories exigem aprovação");
need("profile-story-access-v45.js?v=20260909-46",'created + 24 * 60 * 60 * 1000',"Story legado recebe janela de 24h");
need("profile-story-access-v45.js?v=20260909-46",'openStoryViewer(activeStories, 0)',"foto do perfil abre Story ativo");
need("profile-story-access-v45.js?v=20260909-46",'profile-highlight-v45',"Stories expirados aparecem em Destaques");
need("perfil-social.html",'<button class="pp-tab active" data-tab="posts">▦ PUBLICAÇÕES</button>',"perfil público mantém apenas Publicações");
forbid("perfil-social.html",'data-tab="stories">',"aba Stories removida");
forbid("perfil-social.html",'data-tab="archive">',"aba Stories Postados removida");
need("avatar-story-v36.js",'profile-story-access-v45.js?v=20260909-46',"avatar carrega controle seguro V45");
forbid("avatar-story-v36.js",'profile-highlights-v37.js',"controle antigo de Destaques não é carregado");

need("sw.js",'bd-atletas-v45-20260909-1',"cache atualizado para V45");
need("sw.js",'/profile-story-access-v45.js?v=20260909-46',"novo módulo de Stories está no cache");
need("sw.js",'/reivindicacao-v45.js',"novo módulo de reivindicação está no cache");

console.log(`V45 AUDIT: ${pass.length} verificações aprovadas`);
for(const item of pass)console.log(`OK ${item}`);
if(failures.length){
  console.error(`FALHOU: ${failures.length} problema(s)`);
  for(const item of failures)console.error(`ERRO ${item}`);
  process.exit(1);
}
console.log("REIVINDICAÇÃO + STORIES V45 APROVADOS ✓");
