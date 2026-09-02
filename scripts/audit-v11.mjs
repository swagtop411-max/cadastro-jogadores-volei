import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const failures=[];
const passes=[];
const file=p=>path.join(root,p);
const exists=p=>fs.existsSync(file(p));
const read=p=>fs.readFileSync(file(p),'utf8');
const ok=m=>passes.push(m);
const fail=m=>failures.push(m);
function requireFile(p){exists(p)?ok(`arquivo ${p}`):fail(`arquivo ausente: ${p}`)}
function requireText(p,text,label=text){if(!exists(p))return fail(`${p} ausente`);read(p).includes(text)?ok(`${p}: ${label}`):fail(`${p}: não encontrou ${label}`)}
function forbidText(p,text,label=text){if(!exists(p))return fail(`${p} ausente`);read(p).includes(text)?fail(`${p}: padrão proibido (${label})`):ok(`${p}: sem ${label}`)}

[
 'firestore.rules','storage.rules','cloudinary-upload.js','firebase-app-check-v11.js','auth-audit-v11.js',
 'admin-data-migration-v11.js','admin-commerce-v11.js','meu-perfil.js','cadastro-direto.js','cadastro-equipe.js',
 'campeonatos-public.js','campeonatos-admin.js','comunidade.js','home-social.js','social-network.js','social-v6.js',
 'admin.js','admin-control-center-v10.js','ranking.js','public.js','manifest.webmanifest','site-v8.js','site-v5.js','site-v7-autoload.js'
].forEach(requireFile);

// Autoridade e privacidade.
requireText('firestore.rules','match /solicitacoes_planos/{uid}','planos por solicitação');
requireText('firestore.rules','match /site_stats/{eventId}','analytics próprio protegido');
requireText('firestore.rules','match /handles/{handle}','índice de handles');
requireText('firestore.rules','socialTargetReadable','leitura social protegida');
requireText('firestore.rules',"request.resource.data.visibilidade in ['publico','privado']",'visibilidade obrigatória');
requireText('firestore.rules',"request.resource.data.fonte == 'cliente'",'telemetria identificada');
requireText('firestore.rules','request.resource.data.confiavel == false','telemetria não autoritativa');
forbidText('auth-audit-v11.js','totalLogins','cliente não incrementa contadores de login');
forbidText('auth-audit-v11.js','planoStatus','telemetria não altera plano');
requireText('admin-commerce-v11.js','CONFIRMAR PAGAMENTO','pagamento confirmado pelo ADM');
requireText('admin-data-migration-v11.js','migracao-v11','migração de legado disponível');

// App Check Enterprise.
requireText('firebase-app-check-v11.js','ReCaptchaEnterpriseProvider','provedor Enterprise');
requireText('firebase-app-check-v11.js','isTokenAutoRefreshEnabled:true','renovação automática');
requireText('firebase-app-check-v11.js','6LcP2aUtAAAAAJL53RXsdE6UaoemgTexo5eoTmzR','site key pública configurada');
forbidText('firebase-app-check-v11.js','ReCaptchaV3Provider','provedor V3 antigo');
requireText('site-v5.js','firebase-app-check-v11.js?v=20260902-2','shell aguarda App Check');
requireText('site-v7-autoload.js','await APP_CHECK_BOOT','autoload aguarda App Check');

// Mídia e editor.
forbidText('meu-perfil.js','firebase-storage','Firebase Storage legado no editor');
requireText('meu-perfil.js','uploadCloudinary','perfil usa Cloudinary');
requireText('meu-perfil.js','solicitacoes_planos','mudança de plano não é autoativada');
requireText('perfil-social.js','visibilidade','publicação do perfil grava visibilidade');
requireText('comunidade.js','visibilidade','Comunidade grava visibilidade');
requireText('social-v6.js','visibilidade','carrossel/privacidade gravam visibilidade');

// Menções: não pode baixar o diretório inteiro.
forbidText('social-v6.js','getDocs(collection(db,"perfis"))','scan completo de perfis para menções');
requireText('social-v6.js','doc(db,"handles",key)','lookup de @handle por documento');
requireText('social-v6.js','const profileCache=new Map(),privacyCache=new Map(),blockCache=new Map(),followCache=new Map(),handleCache=new Map()','cache de handles declarado');
forbidText('social-v6.js','directoryPromise=null','diretório legado de menções');

// Consultas globais só trazem conteúdo público.
for(const p of ['home-social.js','comunidade.js','explorar.js','reels.js','hashtags.js']){
 requireText(p,'where("visibilidade","==","publico")','consulta global somente pública');
}
requireText('social-network.js','where("visibilidade","==","publico")','Stories globais somente públicos');

// Dados locais e performance.
requireText('cadastro-direto.js','sessionStorage.getItem(DRAFT_KEY)','rascunho na sessão');
forbidText('cadastro-direto.js','localStorage.getItem(DRAFT_KEY)','rascunho sensível persistente');
requireText('admin-control-center-v10.js','?800:400','limite nas leituras administrativas');
requireText('ranking.js','limit(1000)','teto no ranking');
requireText('ranking.js','RANK_CACHE_MS','cache de ranking');
requireText('public.js','max=600','teto de carga pública automática');
requireText('social-network.js','Promise.all(otherUids.map(profileOf))','perfis do Direct em paralelo');

// Estrutura e PWA.
requireText('cadastro-direto.js','instagramUrl:instagram','Instagram estruturado');
requireText('campeonatos-public.js','linkOrganizador: link','link de campeonato estruturado');
requireText('firebase-app-check-v11.js','initializeAppCheck','cliente pronto para App Check');
requireText('manifest.webmanifest','app-icon.svg','ícone PWA');
requireText('site-v8.js','og:image','Open Graph image');
requireText('site-v8.js','twitter:image','Twitter image');

// Aprovação segura sem campos pessoais no documento público.
requireText('admin.js','cadastro-atleta-v11','aprovação segura de atleta na fonte');
requireText('admin.js','cadastro-equipe-v11','aprovação segura de equipe na fonte');
const admin=read('admin.js');
const athleteApproval=(admin.match(/async function aprovarNovoCadastro\(id\)[\s\S]*?async function recusarNovoCadastro/)||[''])[0];
const teamApproval=(admin.match(/async function aprovarEquipe\(id\)[\s\S]*?async function recusarEquipe/)||[''])[0];
for(const [name,block,keys] of [['atleta',athleteApproval,['nascimento:a.nascimento','contato:a.contato','ownerEmail:a.ownerEmail']],['equipe',teamApproval,['responsavel:a.responsavel','contato:a.contato','ownerEmail:a.ownerEmail']]]){
 if(!block)fail(`admin.js: bloco de aprovação ${name} não localizado`);
 for(const k of keys)block.includes(`publicData={${k}`)||block.includes(`,${k}`)?fail(`admin.js: ${name} ainda mistura ${k} no publicData`):ok(`admin.js: ${name} sem ${k} no publicData`);
}

// Segredos e resíduos temporários.
forbidText('cloudinary-upload.js','api_secret','Cloudinary API secret no frontend');
for(const p of [
 '.github/workflows/social-read-caps-once.yml','.github/workflows/v11-core-hardening-once.yml',
 '.github/workflows/v11-core-hardening-retry.yml','.github/workflows/v11-core-hardening-final.yml',
 '.github/workflows/v11-stage2-once.yml','firestore-debug.log','scripts/apply-v11-core.py','scripts/apply-v11-stage2.py'
]) exists(p)?fail(`resíduo temporário ainda existe: ${p}`):ok(`resíduo removido: ${p}`);

console.log(`\nAUDITORIA V11: ${passes.length} verificações aprovadas`);
for(const line of passes)console.log(`OK ${line}`);
if(failures.length){console.error(`\nAUDITORIA V11 FALHOU: ${failures.length} problema(s)`);for(const line of failures)console.error(`ERRO ${line}`);process.exit(1)}
console.log('\nAUDITORIA V11 APROVADA ✓');
