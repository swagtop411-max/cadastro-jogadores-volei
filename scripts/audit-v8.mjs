import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const failures=[];
const notes=[];
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const exists=file=>fs.existsSync(path.join(root,file));
const fail=message=>failures.push(message);
const ok=message=>notes.push(`OK ${message}`);
const requireFile=file=>exists(file)?ok(`arquivo ${file}`):fail(`arquivo obrigatório ausente: ${file}`);
const requireText=(file,text,label=text)=>{if(!exists(file))return fail(`${file} ausente para validar ${label}`);read(file).includes(text)?ok(`${file}: ${label}`):fail(`${file}: não encontrou ${label}`)};
const forbidText=(file,text,label=text)=>{if(!exists(file))return;read(file).includes(text)?fail(`${file}: padrão proibido encontrado (${label})`):ok(`${file}: sem ${label}`)};

[
 'site-v8.js','site-v8.css','site-v5.js','cloudinary-upload.js','media-utils.js','sw.js','manifest.webmanifest','robots.txt','sitemap.xml',
 'cadastro-atleta.html','cadastro-direto.js','cadastro-equipe.js','campeonatos-public.js','campeonatos-admin.js','comunidade.js','perfil-social.js','public.js','home-social.js',
 'admin-v8-hardening.js','admin-claims-v9.js','admin-profile-link-v10.js','admin-control-center-v10.js','auth-audit-v11.js','admin-data-migration-v11.js','admin-commerce-v11.js','reivindicacao.js','conta.js','firestore.rules'
].forEach(requireFile);

// Recursos V8 solicitados.
requireText('cadastro-direto.js','uploadCloudinary','cadastro de atleta usa Cloudinary');
requireText('cadastro-direto.js','DRAFT_KEY','rascunho automático do atleta');
requireText('cadastro-direto.js','cadInstagram','Instagram no cadastro');
requireText('cadastro-atleta.html','id="cadInstagram"','campo Instagram visível');
requireText('cadastro-equipe.js','uploadCloudinary','logo de equipe usa Cloudinary');
requireText('campeonatos-public.js','uploadCloudinary','cartaz usa Cloudinary');
requireText('campeonatos-public.js','linkOrganizador','link do organizador');
requireText('campeonatos-public.js','champ-image-link','imagem clicável do campeonato');
requireText('campeonatos-public.js','const form = event.currentTarget instanceof HTMLFormElement','referência estável do formulário antes dos awaits');
requireText('campeonatos-public.js','limparFormulario(form)','limpeza segura após salvar campeonato');
forbidText('campeonatos-public.js','event.currentTarget.reset()','reset assíncrono inseguro do formulário');
requireText('comunidade.js','uploadCloudinary','Comunidade usa Cloudinary');
requireText('perfil-social.js','getUserMedia','câmera real no perfil');
requireText('perfil-social.js','mountMessageButton','botão de mensagem no perfil');
requireText('public.js','res.cloudinary.com','Cloudinary permitido nas listagens');
requireText('site-v8.js','setAdminUI(false)','ADM oculto por padrão');
requireText('site-v8.js','ADMIN_EMAIL','validação administrativa');
requireText('site-v8.js','buildHomeRail','banners verticais de apoiadores');
requireText('site-v8.js','ensureUtilityHost','host oculto de Direct/notificações');
requireText('site-v8.css','.v8-home-grid','layout V8 da Home');
requireText('home-social.js','feedImageUrl','feed usa imagem derivada otimizada');
requireText('home-social.js','IntersectionObserver','feed hidrata interações por visibilidade');
requireText('sw.js','request.mode==="navigate"','cache de navegação controlado');

// Reivindicação de perfis e diagnóstico administrativo.
requireText('reivindicacao.js','claimReturnUrl','retorno automático ao perfil antigo');
requireText('reivindicacao.js','url.searchParams.set("claim", "1")','marcador de reivindicação após autenticação');
requireText('reivindicacao.js','deterministicTaken','nova tentativa após reivindicação recusada');
requireText('conta.js','safeReturnDestination(returnTarget)','cadastro de conta respeita retorno da reivindicação');
requireText('conta.js','Voltando ao perfil para concluir sua reivindicação','mensagem de retorno após criação de conta');
requireText('admin-claims-v9.js','CONTAS CADASTRADAS / UIDs','central administrativa de UIDs');
requireText('admin-claims-v9.js','PERFIS ANTIGOS SEM DONO','lista de perfis legados sem ownerUid');
requireText('admin-claims-v9.js','vinculoUid','preenchimento assistido do vínculo manual');
requireText('site-v7-autoload.js','admin-claims-v9.js','central de UIDs carregada no ADM');
requireText('firestore.rules','match /reivindicacoes_perfis/{claimId}','regras de reivindicação presentes');

// V10: contas, acessos, duplicidades e unificação segura.
requireText('auth-audit-v11.js','export async function recordAuthEvent','registrador central de eventos autenticados V11');
requireText('auth-audit-v11.js','fonte:"cliente"','telemetria identificada como cliente');
requireText('auth-audit-v11.js','confiavel:false','telemetria não tratada como auditoria autoritativa');
requireText('auth-audit-v11.js','expiraEm','retenção preparada para TTL');
requireText('auth-audit-v11.js','sessionStorage','sessão registrada uma vez por aba/sessão');
requireText('conta.js','recordAuthEvent(credential.user, "login")','login sincronizado com painel ADM');
requireText('conta.js','recordAuthEvent(user, "cadastro")','cadastro sincronizado com painel ADM');
requireText('admin-profile-link-v10.js','export async function linkLegacyProfile','unificação segura de legado e perfil social');
requireText('admin-profile-link-v10.js','event.stopImmediatePropagation()','bloqueio do handler legado quebrado');
requireText('admin-profile-link-v10.js','ownerEmail:deleteField()','e-mail removido do documento público do atleta');
requireText('admin-control-center-v10.js','Todas as contas cadastradas','painel geral de contas');
requireText('admin-control-center-v10.js','UNIFICAR PERFIS','ação de unificação de duplicidades');
requireText('admin-control-center-v10.js','plataforma = app','modelo preparado para futuro aplicativo');
requireText('site-v7-autoload.js','auth-audit-v11.js','telemetria V11 carregada globalmente');
requireText('site-v7-autoload.js','admin-control-center-v10.js','centro de controle carregado no ADM');
requireText('firestore.rules','match /access_logs/{eventId}','coleção de logs protegida por regras');
requireText('firestore.rules',"request.resource.data.tipo in ['cadastro','login','sessao']",'tipos de evento permitidos');
requireText('firestore.rules',"request.resource.data.plataforma in ['web','app']",'origem web/app validada');
forbidText('firestore.rules',"'ultimoLoginEm','ultimoAcessoEm','totalLogins'",'métricas mutáveis pelo usuário em usuarios');
requireText('firestore.rules','match /site_stats/{eventId}','regras de analytics próprio');
requireText('firestore.rules','match /solicitacoes_planos/{uid}','solicitação segura de plano');
requireText('firestore.rules','match /handles/{handle}','índice seguro de handles');

// Fluxos novos não podem voltar ao Firebase Storage/base64 destrutivo.
for(const file of ['cadastro-direto.js','cadastro-equipe.js','campeonatos-public.js','comunidade.js']){
 forbidText(file,'firebase-storage','Firebase Storage no fluxo novo');
 forbidText(file,'toDataURL(','compactação base64/toDataURL no fluxo novo');
}
forbidText('comunidade.html','comunidade-cloudinary.js','publicador duplicado da Comunidade');
forbidText('cadastro-atleta.html','cadastro-atleta.js','script legado concorrente no cadastro');

// Segurança e privacidade essenciais.
requireText('firestore.rules',"request.auth.token.email == 'swagtop411@gmail.com'",'fallback de ADM nas regras');
requireText('firestore.rules','match /atletas/{atletaId}/privado/{documento}','dados privados de atletas');
requireText('firestore.rules','match /equipes/{equipeId}/privado/{documento}','dados privados de equipes');
requireText('firestore.rules','match /perfis/{uid}/privado/{documento}','dados privados de perfis');
requireText('firestore.rules','approvedSocialTarget','proteção de alvo social');
requireText('firestore.rules','match /conversas/{conversationId}','regras do Direct');
requireText('admin-v8-hardening.js','secureApprovePending','aprovação segura de atleta');
requireText('admin-v8-hardening.js','secureApproveTeam','aprovação segura de equipe');
requireText('campeonatos-admin.js','admin-v8-hardening.js','hardening carregado pelo painel ADM');
forbidText('admin-v8-hardening.js','nascimento:String(a.nascimento||""),cidade','nascimento misturado no payload público');
forbidText('admin-v8-hardening.js','responsavel:String(a.responsavel||""),uf','responsável misturado no payload público da equipe');

const rules=read('firestore.rules');
const athletePublicUpdate="'nome','cidade','uf','modalidades','posicoes','modalidade','posicao','categoria',\n          'time','historicoEquipes','historicoCampeonatos','observacoes','instagramUrl','foto','ownerUid','atualizadoEm'";
const teamPublicUpdate="affectedKeys().hasOnly(['nome','uf','cidade','modalidade','categoria','logo','atletas'])";
rules.includes(athletePublicUpdate)?ok('firestore.rules: nascimento/e-mail fora da atualização pública de atleta'):fail('firestore.rules: allowlist pública endurecida do atleta ausente');
rules.includes(teamPublicUpdate)?ok('firestore.rules: responsável fora da atualização pública de equipe'):fail('firestore.rules: allowlist pública endurecida da equipe ausente');
if(rules.includes("'nome','nascimento','cidade','uf','modalidades','posicoes'"))fail('firestore.rules: nascimento voltou à allowlist pública do atleta');
else ok('firestore.rules: nascimento não pode retornar ao documento público do atleta');
if(rules.includes("affectedKeys().hasOnly(['nome','responsavel','uf','cidade','modalidade','categoria','logo','atletas'])"))fail('firestore.rules: responsável voltou à allowlist pública da equipe');
else ok('firestore.rules: responsável não pode retornar à allowlist pública da equipe');
if(!rules.includes('match /access_logs/{eventId}'))fail('firestore.rules: coleção access_logs ausente');
else ok('firestore.rules: access_logs presente');
if(!rules.includes('allow read, delete: if isAdmin();'))fail('firestore.rules: leitura administrativa de auditoria ausente');
else ok('firestore.rules: auditoria restrita ao ADM para leitura');

// Validação de referências locais em HTML e imports locais em JS.
function normalizeRef(from,value){
 let v=String(value||'').trim();
 if(!v||v.startsWith('#')||v.startsWith('data:')||v.startsWith('mailto:')||v.startsWith('tel:')||v.startsWith('javascript:')||/^https?:\/\//i.test(v)||v.startsWith('//'))return null;
 v=v.split('#')[0].split('?')[0];
 if(!v)return null;
 try{v=decodeURIComponent(v)}catch{}
 const base=v.startsWith('/')?root:path.dirname(path.join(root,from));
 return path.normalize(v.startsWith('/')?path.join(root,v.slice(1)):path.join(base,v));
}

const htmlFiles=fs.readdirSync(root).filter(f=>f.endsWith('.html'));
for(const file of htmlFiles){
 const source=read(file);
 const re=/(?:src|href)\s*=\s*["']([^"']+)["']/gi;
 for(const match of source.matchAll(re)){
  const target=normalizeRef(file,match[1]);
  if(!target)continue;
  if(!/\.(?:html|js|css|json|webmanifest|png|jpe?g|webp|svg|ico|txt|xml)$/i.test(target))continue;
  if(!fs.existsSync(target))fail(`${file}: referência local quebrada -> ${match[1]}`);
 }
}

const jsFiles=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(entry.name==='.git'||entry.name==='node_modules')continue;const full=path.join(dir,entry.name);if(entry.isDirectory())walk(full);else if(entry.isFile()&&entry.name.endsWith('.js'))jsFiles.push(path.relative(root,full))}}
walk(root);
for(const file of jsFiles){
 const source=read(file);
 const patterns=[/\bfrom\s*["'](\.\.?\/[^"']+)["']/g,/\bimport\s*["'](\.\.?\/[^"']+)["']/g,/\bimport\(\s*["'`](\.\.?\/[^"'`]+)["'`]\s*\)/g];
 for(const re of patterns)for(const match of source.matchAll(re)){
  const target=normalizeRef(file,match[1]);
  if(target&&!fs.existsSync(target))fail(`${file}: import local quebrado -> ${match[1]}`);
 }
}

for(const file of ['firebase.json','appsscript.json','manifest.webmanifest']){
 if(!exists(file))continue;
 try{JSON.parse(read(file));ok(`${file}: JSON válido`)}catch(error){fail(`${file}: JSON inválido (${error.message})`)}
}

console.log(`\nAUDITORIA V8/V10: ${notes.length} verificações aprovadas`);
for(const line of notes)console.log(line);
if(failures.length){
 console.error(`\nAUDITORIA V8/V10 FALHOU: ${failures.length} problema(s)`);
 for(const line of failures)console.error(`ERRO ${line}`);
 process.exit(1);
}
console.log('\nAUDITORIA V8/V10 APROVADA ✓');

// V11 core hardening.
forbidText('meu-perfil.js','firebase-storage','Firebase Storage no editor de perfil');
requireText('meu-perfil.js','solicitacoes_planos','alteração de plano vira solicitação administrativa');
requireText('admin.js','cadastro-atleta-v11','aprovação base do atleta sem dados privados públicos');
requireText('admin.js','cadastro-equipe-v11','aprovação base da equipe sem dados privados públicos');
requireText('analytics.js','confiavel:false','analytics próprio marcado como telemetria');

// V11 stage 2: privacidade, performance e PWA.
requireText('firestore.rules','socialTargetReadable','leitura social protegida por privacidade');
requireText('firestore.rules',"request.resource.data.visibilidade in ['publico','privado']",'visibilidade social obrigatória');
requireText('home-social.js','where(\"visibilidade\",\"==\",\"publico\")','Home consulta apenas conteúdo público');
requireText('social-network.js','where(\"visibilidade\",\"==\",\"publico\")','Stories globais consultam apenas conteúdo público');
forbidText('social-v6.js','getDocs(collection(db,\"perfis\"))','diretório completo de perfis para menções');
requireText('social-v6.js','collection(db,\"handles\")','menções resolvidas por índice de handles');
requireText('cadastro-direto.js','sessionStorage.getItem(DRAFT_KEY)','rascunho sensível limitado à sessão');
forbidText('cadastro-direto.js','localStorage.getItem(DRAFT_KEY)','rascunho persistente com dados sensíveis');
requireText('firebase-app-check-v11.js','initializeAppCheck','cliente preparado para Firebase App Check');
requireText('manifest.webmanifest','app-icon.svg','ícone instalável PWA');
requireText('site-v8.js','og:image','imagem social para compartilhamento');
requireText('campeonatos-public.js','linkOrganizador: link','link de campeonato estruturado');
