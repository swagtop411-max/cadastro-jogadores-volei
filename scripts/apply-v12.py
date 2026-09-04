from pathlib import Path
import re

ROOT = Path('.')
VERSION = '20260904-2'


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def require(condition, message):
    if not condition:
        raise SystemExit(f'V12 ERRO: {message}')


def replace_once(text, old, new, label):
    require(old in text, f'padrão não encontrado: {label}')
    return text.replace(old, new, 1)


# 1. Firestore: corrigir permissões administrativas criadas pela V11.
rules = read('firestore.rules')
rules = replace_once(
    rules,
    """      allow create: if signedIn()\n        && request.resource.data.uid == request.auth.uid\n        && request.resource.data.handle == handle\n        && request.resource.data.handle is string && request.resource.data.handle.size() >= 3 && request.resource.data.handle.size() <= 40\n        && request.resource.data.atualizadoEm is timestamp\n        && request.resource.data.keys().hasOnly(['uid','handle','atualizadoEm']);""",
    """      allow create: if isAdmin() || (\n        signedIn()\n        && request.resource.data.uid == request.auth.uid\n        && request.resource.data.handle == handle\n        && request.resource.data.handle is string && request.resource.data.handle.size() >= 3 && request.resource.data.handle.size() <= 40\n        && request.resource.data.atualizadoEm is timestamp\n        && request.resource.data.keys().hasOnly(['uid','handle','atualizadoEm'])\n      );""",
    'handles create admin',
)
rules = replace_once(
    rules,
    """      allow update: if signedIn() && resource.data.uid == request.auth.uid\n        && request.resource.data.uid == resource.data.uid\n        && request.resource.data.handle == handle\n        && request.resource.data.atualizadoEm is timestamp\n        && request.resource.data.keys().hasOnly(['uid','handle','atualizadoEm']);""",
    """      allow update: if isAdmin() || (\n        signedIn() && resource.data.uid == request.auth.uid\n        && request.resource.data.uid == resource.data.uid\n        && request.resource.data.handle == handle\n        && request.resource.data.atualizadoEm is timestamp\n        && request.resource.data.keys().hasOnly(['uid','handle','atualizadoEm'])\n      );""",
    'handles update admin',
)

social_read = "      allow read: if resource.data.aprovado == true && canReadSocialOwner(resource.data.ownerUid, resource.data.get(\'visibilidade\',\'privado\'));"
social_read_admin = "      allow read: if isAdmin() || (resource.data.aprovado == true && canReadSocialOwner(resource.data.ownerUid, resource.data.get(\'visibilidade\',\'privado\')));"
count = rules.count(social_read)
require(count >= 3, f'esperava 3 regras sociais sem bypass ADM, encontrei {count}')
rules = rules.replace(social_read, social_read_admin)
write('firestore.rules', rules)


# 2. Higienização: separar operações centrais dos handles para uma falha não desfazer tudo.
p = Path('admin-data-migration-v11.js')
s = read(p)
s = s.replace(
    'collection,deleteField,doc,getDocs,getFirestore,serverTimestamp,writeBatch',
    'collection,deleteField,doc,getDocs,getFirestore,limit,query,serverTimestamp,where,writeBatch',
    1,
)
s = replace_once(
    s,
    'async function rows(name){const snap=await getDocs(collection(db,name));return snap.docs}',
    'async function rows(name,max=1200){const snap=await getDocs(query(collection(db,name),limit(max)));return snap.docs}\nasync function socialRows(name,max=600){const snap=await getDocs(query(collection(db,name),where("aprovado","==",true),limit(max)));return snap.docs}',
    'migration rows',
)
s = s.replace('rows("publicacoes"),rows("videos"),rows("stories")', 'socialRows("publicacoes"),socialRows("videos"),socialRows("stories")', 1)
s = replace_once(
    s,
    'const privacy=new Map(configs.map(d=>[d.id,d.data()?.privado===true]));const ops=[];let moved=0,handles=0,visibility=0,expired=0;',
    'const privacy=new Map(configs.map(d=>[d.id,d.data()?.privado===true]));const coreOps=[],handleOps=[];let moved=0,handles=0,visibility=0,expired=0;',
    'migration split ops',
)
s = s.replace('ops.push(batch=>batch.set(pdoc.ref,{handle},{merge:true}));handles++}ops.push(batch=>batch.set(doc(db,"handles",handle),{uid:pdoc.id,handle,atualizadoEm:serverTimestamp()},{merge:true}))', 'handleOps.push(batch=>batch.set(pdoc.ref,{handle},{merge:true}));handles++}handleOps.push(batch=>batch.set(doc(db,"handles",handle),{uid:pdoc.id,handle,atualizadoEm:serverTimestamp()},{merge:true}))', 1)
s = s.replace('ops.push(batch=>batch.set(doc(db,"atletas",d.id,"privado","dados")', 'coreOps.push(batch=>batch.set(doc(db,"atletas",d.id,"privado","dados")')
s = s.replace('ops.push(batch=>batch.set(doc(db,"equipes",d.id,"privado","dados")', 'coreOps.push(batch=>batch.set(doc(db,"equipes",d.id,"privado","dados")')
s = s.replace('ops.push(batch=>batch.update(d.ref,publicPatch))', 'coreOps.push(batch=>batch.update(d.ref,publicPatch))')
s = s.replace('ops.push(batch=>batch.set(d.ref,{visibilidade:desired},{merge:true}))', 'coreOps.push(batch=>batch.set(d.ref,{visibilidade:desired},{merge:true}))')
s = s.replace('ops.push(batch=>batch.delete(d.ref))', 'coreOps.push(batch=>batch.delete(d.ref))')
s = replace_once(
    s,
    ' await commitOps(ops);if(status)status.textContent=`✓ Concluído: ${moved} registros sensíveis higienizados, ${handles} perfis indexados, ${visibility} conteúdos com visibilidade sincronizada e ${expired} eventos vencidos removidos.`;',
    ' await commitOps(coreOps);let handleWarning="";try{await commitOps(handleOps)}catch(handleError){console.warn("Handles V12:",handleError);handleWarning=" · handles pendentes"}if(status)status.textContent=`✓ Concluído: ${moved} registros sensíveis higienizados, ${handles} perfis preparados, ${visibility} conteúdos com visibilidade sincronizada e ${expired} eventos vencidos removidos${handleWarning}.`;',
    'migration commit',
)
repair = '''\nasync function repairVisibility(){\n try{\n  const [configs,posts,videos,stories]=await Promise.all([rows("config_perfis",800),socialRows("publicacoes"),socialRows("videos"),socialRows("stories")]);\n  const privacy=new Map(configs.map(d=>[d.id,d.data()?.privado===true])),ops=[];\n  for(const group of [posts,videos,stories])for(const d of group){const data=d.data()||{},desired=privacy.get(data.ownerUid)?"privado":"publico";if(data.visibilidade!==desired)ops.push(batch=>batch.set(d.ref,{visibilidade:desired},{merge:true}))}\n  if(ops.length){await commitOps(ops);console.info(`V12: ${ops.length} conteúdos legados reparados.`);document.dispatchEvent(new CustomEvent("bd:v12-visibility-repaired",{detail:{count:ops.length}}))}\n }catch(error){console.warn("Reparo de visibilidade V12:",error?.code||error)}\n}\n'''
marker = 'onAuthStateChanged(auth,user=>{if(text(user?.email).toLowerCase()===ADMIN_EMAIL)'
require(marker in s, 'migration auth marker')
s = s.replace(marker, repair + '\n' + marker, 1)
s = s.replace('if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",addPanel,{once:true});else addPanel()', 'void repairVisibility();if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",addPanel,{once:true});else addPanel()', 1)
write(p, s)


# 3. Comunidade ADM: uma coleção com falha não derruba toda a moderação.
p = Path('comunidade-admin.js')
s = read(p)
s = s.replace('getDocs,getFirestore,onSnapshot,query,serverTimestamp', 'getDocs,getFirestore,limit,onSnapshot,query,serverTimestamp', 1)
pattern = r'async function loadCommunity\(\)\{.*?\}\nfunction editValue'
replacement = '''async function loadCommunity(){if(!list)return;list.innerHTML='<p class="subtitulo">Carregando conteúdo...</p>';try{\n const entries=Object.entries(refs),results=await Promise.allSettled(entries.map(async([type,ref])=>({type,snapshot:await getDocs(query(ref,limit(type==="comment"?180:120)))})));\n const failures=results.filter(r=>r.status==="rejected"),ok=results.filter(r=>r.status==="fulfilled").map(r=>r.value);\n items=ok.flatMap(({type,snapshot})=>snapshot.docs.map(d=>({type,id:d.id,item:{id:d.id,...d.data()}}))).sort((a,b)=>dateValue(b.item.criadoEm)-dateValue(a.item.criadoEm));\n if(!ok.length)throw failures[0]?.reason||new Error("Nenhuma coleção disponível");\n render();setStatus(failures.length?`${items.length} item(ns) carregados. ${failures.length} fonte(s) indisponíveis.`:`${items.length} item(ns) na comunidade.`,failures.length?"":"success");\n }catch(error){console.error("Comunidade ADM:",error);list.innerHTML='<div class="community-admin-error">Não foi possível carregar a comunidade.</div>';setStatus(`Erro ao carregar a comunidade (${error?.code||"erro"}).`,"error")}}\nfunction editValue'''
s, n = re.subn(pattern, replacement, s, count=1, flags=re.S)
require(n == 1, f'loadCommunity substituições={n}')
write(p, s)


# 4. Lista pública: atletas e perfis são fontes independentes.
p = Path('public.js')
s = read(p)
pattern = r'async function carregarAtletas\(\)\{.*?\n\[busca,filtroNivel'
replacement = '''async function carregarAtletas(){if(!lista)return;lista.innerHTML='<p class="subtitulo">Carregando primeiros atletas...</p>';legacyMap.clear();profileMap.clear();try{\n const results=await Promise.allSettled([readPage("atletas",{pageSize:60}),readPage("perfis",{pageSize:60})]);\n const legacyResult=results[0],profileResult=results[1],legacyFirst=legacyResult.status==="fulfilled"?legacyResult.value:{docs:[],last:null,done:true},profileFirst=profileResult.status==="fulfilled"?profileResult.value:{docs:[],last:null,done:true};\n if(!legacyFirst.docs.length&&!profileFirst.docs.length&&results.every(r=>r.status==="rejected"))throw results.find(r=>r.status==="rejected")?.reason||new Error("Nenhuma fonte respondeu");\n addLegacyDocs(legacyFirst.docs);addProfileDocs(profileFirst.docs);rebuildAthletes();\n const failed=results.filter(r=>r.status==="rejected").length;if(resultadoTexto)resultadoTexto.textContent=failed?`${atletas.length} perfis disponíveis · uma fonte será tentada novamente`:`${atletas.length} perfis disponíveis · completando a rede em segundo plano...`;\n const idle=window.requestIdleCallback||((fn)=>setTimeout(fn,120));idle(async()=>{let dirty=0;const jobs=[];if(legacyResult.status==="fulfilled")jobs.push(readRemaining("atletas",{pageSize:100,max:600,last:legacyFirst.last,loaded:legacyFirst.docs.length,onBatch:docs=>{addLegacyDocs(docs);if(++dirty%2===0)rebuildAthletes()}}));if(profileResult.status==="fulfilled")jobs.push(readRemaining("perfis",{pageSize:100,max:600,last:profileFirst.last,loaded:profileFirst.docs.length,onBatch:docs=>{addProfileDocs(docs);if(++dirty%2===0)rebuildAthletes()}}));await Promise.allSettled(jobs);rebuildAthletes()})\n }catch(e){console.error("Atletas:",e);lista.innerHTML='<div class="card"><div><h3>Não foi possível carregar os atletas</h3><p>'+esc(e?.code==="permission-denied"?"O acesso ao banco foi recusado. Atualize a página.":"Atualize a página e tente novamente.")+'</p><button type="button" id="btnRetryAtletas" class="search-button">↻ TENTAR NOVAMENTE</button></div></div>';$("btnRetryAtletas")?.addEventListener("click",carregarAtletas)}}\n[busca,filtroNivel'''
s, n = re.subn(pattern, replacement, s, count=1, flags=re.S)
require(n == 1, f'carregarAtletas substituições={n}')
write(p, s)


# 5. Monetização: carregar parcialmente e recompor dados financeiros privados.
p = Path('admin.js')
s = read(p)
pattern = r'async function loadMonetizacao\(\)\{.*?\}\nfunction renderAtletas'
replacement = '''async function loadMonetizacao(){\n const cards=$("monetizacaoCards"),planosBox=$("monetizacaoPlanos"),engBox=$("monetizacaoEngajamento"),st=$("monetizacaoStatus");if(!cards)return;cards.innerHTML='<div class="monetizacao-loading">🔄 Atualizando dados...</div>';if(st)clear(st);const timeout=(p,ms=15000)=>Promise.race([p,new Promise((_,reject)=>setTimeout(()=>reject(Object.assign(new Error("Tempo esgotado"),{code:"deadline-exceeded"})),ms))]);const names=["apoiadores","atletas","equipes","site_stats","atletas_pendentes","equipes_pendentes"];\n try{const result=await Promise.allSettled(names.map(name=>timeout(getDocs(collection(db,name))))),map=new Map(names.map((name,i)=>[name,result[i].status==="fulfilled"?result[i].value:null])),failures=names.filter((name,i)=>result[i].status==="rejected"),docs=name=>map.get(name)?.docs||[],apoi=docs("apoiadores").map(d=>({id:d.id,...d.data()})),atPublic=docs("atletas"),eqPublic=docs("equipes"),eventos=docs("site_stats").map(d=>d.data()),atPend=docs("atletas_pendentes").map(d=>d.data()),eqPend=docs("equipes_pendentes").map(d=>d.data());\n  const financial=async(kind,row)=>{try{const p=await getDoc(doc(db,kind,row.id,"privado","dados"));return{...row.data(),...(p.exists()?p.data():{})}}catch{return row.data()}};const [atletas,equipes]=await Promise.all([Promise.all(atPublic.map(d=>financial("atletas",d))),Promise.all(eqPublic.map(d=>financial("equipes",d)))]),ativosApoi=apoi.filter(a=>a.ativo!==false),valorPlano=v=>Number(v||0),pagosAtletas=atletas.filter(a=>a.status!=="inativo"&&a.planoId&&a.planoId!=="gratuito"&&a.planoStatus==="ativo"),pagosEquipes=equipes.filter(a=>a.status!=="inativo"&&a.planoId&&a.planoId!=="gratuito"&&a.planoStatus==="ativo"),valoresApoio={Bronze:50,Prata:100,Ouro:200,Master:350},receitaApoiadores=ativosApoi.reduce((sum,a)=>sum+Number(a.valor||valoresApoio[a.plano]||0),0),receitaAtletas=pagosAtletas.reduce((sum,a)=>sum+valorPlano(a.valorPlano),0),receitaEquipes=pagosEquipes.reduce((sum,a)=>sum+valorPlano(a.valorPlano),0),receita=receitaApoiadores+receitaAtletas+receitaEquipes,planos={Bronze:0,Prata:0,Ouro:0,Master:0};ativosApoi.forEach(a=>{const p=String(a.plano||"").trim();if(planos[p]!=null)planos[p]++});\n  const visualizacoes=eventos.filter(e=>e.nome==="page_view").length,cliques=eventos.filter(e=>["apoiador_click","apoiador_banner_click"].includes(e.nome)).length,campanhas=ativosApoi.length,anuncios=ativosApoi.filter(a=>String(a.imagem||"").trim()).length,atletasPremium=pagosAtletas.filter(a=>String(a.planoId||"").toLowerCase()==="premium").length,equipesPremium=pagosEquipes.filter(a=>String(a.planoId||"").toLowerCase()==="premium").length,pendentesPagamento=atPend.filter(a=>a.planoId&&a.planoId!=="gratuito"&&a.pagamentoConfirmado!==true).length+eqPend.filter(a=>a.planoId&&a.planoId!=="gratuito"&&a.pagamentoConfirmado!==true).length,fmt=n=>Number(n||0).toLocaleString("pt-BR"),dinheiro=n=>Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}),cardsData=[["💰","Receita mensal",dinheiro(receita),"Apoiadores + atletas + equipes com planos ativos"],["🤝","Patrocinadores ativos",fmt(ativosApoi.length),"Marcas com divulgação ativa"],["📦","Planos",fmt(ativosApoi.length+pagosAtletas.length+pagosEquipes.length),"Contratos pagos ativos"],["🖱️","Cliques",fmt(cliques),"Interações com espaços comerciais"],["👁️","Visualizações",fmt(visualizacoes),"Visualizações registradas"],["📣","Campanhas",fmt(campanhas),"Campanhas comerciais ativas"],["📰","Anúncios",fmt(anuncios),"Apoiadores com material visual"],["🏐","Atletas Premium",fmt(atletasPremium),"Atletas com plano Premium ativo"],["👥","Equipes Premium",fmt(equipesPremium),"Equipes com plano Premium ativo"]];\n  cards.innerHTML=cardsData.map(x=>'<div class="monetizacao-card"><span class="ico">'+x[0]+'</span><span class="valor">'+x[2]+'</span><span class="rotulo">'+x[1]+'</span><span class="desc">'+x[3]+'</span></div>').join("");planosBox.innerHTML=Object.entries(planos).map(([p,n])=>'<div class="monetizacao-row"><span>'+p+'</span><strong>'+fmt(n)+'</strong></div>').join("");engBox.innerHTML='<div class="monetizacao-row"><span>Cliques em apoiadores</span><strong>'+fmt(eventos.filter(e=>e.nome==="apoiador_click").length)+'</strong></div><div class="monetizacao-row"><span>Cliques no banner comercial</span><strong>'+fmt(eventos.filter(e=>e.nome==="apoiador_banner_click").length)+'</strong></div><div class="monetizacao-row"><span>Pagamentos aguardando confirmação</span><strong>'+fmt(pendentesPagamento)+'</strong></div><div class="monetizacao-row"><span>Receita de atletas</span><strong>'+dinheiro(receitaAtletas)+'</strong></div><div class="monetizacao-row"><span>Receita de equipes</span><strong>'+dinheiro(receitaEquipes)+'</strong></div><div class="monetizacao-row"><span>Receita de apoiadores</span><strong>'+dinheiro(receitaApoiadores)+'</strong></div>';if(st&&failures.length)status(st,"Dados parciais: "+failures.join(", ")+" indisponível(is).","erro");\n }catch(e){console.error(e);cards.innerHTML='<div class="monetizacao-loading">Não foi possível carregar os dados de monetização.</div>';if(st)status(st,"Erro ao carregar monetização ("+(e.code||"erro")+").","erro")}}\nfunction renderAtletas'''
s, n = re.subn(pattern, replacement, s, count=1, flags=re.S)
require(n == 1, f'loadMonetizacao substituições={n}')
write(p, s)


# 6. Meu Perfil: Firestore não filtra regras por documento, então consultar somente claims do usuário.
p = Path('meu-perfil.js')
s = read(p)
old = 'getDocs(collection(db,"reivindicacoes_perfis")),\n      getDocs(collection(db,"atletas"))'
new = 'getDocs(query(collection(db,"reivindicacoes_perfis"),where("solicitanteUid","==",user.uid))),\n      getDocs(collection(db,"atletas"))'
require(old in s, 'claims query de meu-perfil')
s = s.replace(old, new, 1)
write(p, s)


# 7. App Check em cada entrypoint Firebase ativo. Sem enforcement ainda.
active = {
    'analytics.js','public.js','cadastro-direto.js','cadastro-equipe.js','campeonatos-public.js','conta.js','admin.js',
    'comunidade-admin.js','admin-data-migration-v11.js','admin-commerce-v11.js','auth-audit-v11.js','admin-control-center-v10.js',
    'admin-profile-link-v10.js','admin-claims-v9.js','campeonatos-admin.js','apoio.js','ranking.js','meu-perfil.js','perfil-social.js',
    'home-social.js','comunidade.js','social-network.js','social-v6.js','reivindicacao.js'
}
for name in sorted(active):
    p = Path(name)
    if not p.exists():
        continue
    text = read(p)
    if 'firebase-app-check-v11.js' not in text:
        text = f'await import("./firebase-app-check-v11.js?v={VERSION}");\n' + text
    write(p, text)


# 8. Corrigir admin para reutilizar o app inicializado pelo App Check.
p = Path('admin.js')
s = read(p)
s = s.replace('import{initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";', 'import{getApp,getApps,initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";', 1)
s = s.replace('const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);', 'const app=getApps().length?getApp():initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);', 1)
write(p, s)


# 9. Cache bust único para JS locais em HTML e módulos.
for p in list(ROOT.glob('*.html')) + list(ROOT.glob('*.js')):
    text = read(p)
    text = re.sub(r'(\.js\?v=)[0-9A-Za-z._-]+', rf'\g<1>{VERSION}', text)
    write(p, text)

p = Path('sw.js')
if p.exists():
    text = read(p)
    text = re.sub(r'const CACHE_NAME="[^"]+"', f'const CACHE_NAME="bd-atletas-v12-{VERSION}"', text, count=1)
    write(p, text)


# 10. Audit V12 guardrails.
p = Path('scripts/audit-v11.mjs')
s = read(p)
anchor = '// Aprovação segura sem campos pessoais no documento público.'
checks = f'''// Recuperação V12.\nrequireText('firestore.rules','allow create: if isAdmin() || (\\n        signedIn()','ADM pode criar handles na migração');\nrequireText('admin-data-migration-v11.js','repairVisibility','reparo automático de visibilidade legado');\nrequireText('comunidade-admin.js','Promise.allSettled','comunidade ADM tolera falha parcial');\nrequireText('public.js','const results=await Promise.allSettled','atletas toleram falha parcial');\nrequireText('admin.js','const result=await Promise.allSettled','monetização tolera falha parcial');\nrequireText('atletas.html','public.js?v={VERSION}','cache bust público atualizado');\nfor(const mod of ['analytics.js','public.js','cadastro-direto.js','conta.js','admin.js','comunidade-admin.js','meu-perfil.js'])requireText(mod,'firebase-app-check-v11.js?v={VERSION}',`App Check antes de ${{mod}}`);\n\n'''
if 'Recuperação V12.' not in s:
    require(anchor in s, 'anchor do audit V11')
    s = s.replace(anchor, checks + anchor, 1)
write(p, s)


# 11. Checkpoint.
write('AUDITORIA_RECUPERACAO_V12_2026-09-04.md', '''# Recuperação V12 — 04/09/2026\n\nCorreções aplicadas após regressões observadas em produção:\n\n- ADM pode criar e atualizar handles durante a higienização.\n- ADM pode ler publicações, Stories e vídeos pendentes para moderação.\n- Higienização separa visibilidade/dados sensíveis dos handles e repara visibilidade automaticamente.\n- Feed legado volta após reparo de `visibilidade`.\n- Lista de atletas tolera falha em uma das fontes (`atletas` ou `perfis`) e limita carga automática.\n- Monetização tolera falhas parciais e lê valores/status financeiros das subcoleções privadas.\n- Meu Perfil consulta apenas reivindicações do próprio usuário.\n- App Check é carregado explicitamente antes dos principais módulos Firebase.\n- Query strings JS e cache foram unificados na versão 20260904-2.\n\n## Nova conta sem perfil\n\nCriar uma conta em Authentication/`usuarios` não publica um atleta incompleto. A pessoa precisa concluir `meu-perfil.html`; ao salvar, `/perfis/{uid}` é criado e passa a aparecer automaticamente na lista pública, sem aprovação administrativa.\n\n## Etapa externa\n\nDepois do CI verde, publicar o `firestore.rules` atualizado no Firebase Console. App Check deve permanecer apenas em monitoramento até a taxa de requisições verificadas estabilizar.\n''')

print('V12 patch concluído.')
