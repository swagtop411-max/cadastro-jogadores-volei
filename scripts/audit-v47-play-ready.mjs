import fs from "node:fs";

const read=path=>fs.readFileSync(path,"utf8");
const exists=path=>fs.existsSync(path);
const checks=[];
const warnings=[];
const fail=(name,ok,detail="")=>{checks.push({name,ok,detail});if(!ok)process.exitCode=1};
const warn=(name,ok,detail="")=>{if(!ok)warnings.push({name,detail})};

const gradle=read("android-twa/app/build.gradle");
const rootGradle=read("android-twa/build.gradle");
const manifest=read("android-twa/app/src/main/AndroidManifest.xml");
const strings=read("android-twa/app/src/main/res/values/strings.xml");
const webManifest=read("manifest.webmanifest");
const authGate=read("auth-gate-v53.js");
const appCheck=read("firebase-app-check-v11.js");
const cloudinary=read("cloudinary-upload.js");
const termsConsent=read("terms-consent-v47.js");
const playMode=read("play-store-mode-v44.js");
const moderation=read("admin-moderation-v42.js");
const ugc=read("ugc-safety-v41.js");
const messaging=read("messaging-v50.js");
const terms=read("termos-de-uso.html");
const privacy=read("politica-privacidade.html");
const deletion=read("exclusao-conta.html");
const rules=read("firestore.rules");
const storage=read("storage.rules");
const sw=read("sw.js");
const dataSafety=read("play-store/data-safety-pt-BR.md");
const declarations=read("play-store/content-declarations-pt-BR.md");
const listing=read("play-store/store-listing-pt-BR.md");
const gitignore=read(".gitignore");

// Android / TWA
fail("Package Android correto",/applicationId\s+"br\.com\.cadastrodeatletas\.app"/.test(gradle));
fail("Namespace Android correto",/namespace\s+"br\.com\.cadastrodeatletas\.app"/.test(gradle));
fail("Android targetSdk 36",/targetSdk\s+36/.test(gradle));
fail("Android compileSdk 36",/compileSdk\s+36/.test(gradle));
fail("Android minSdk suportado",/minSdk\s+(2[3-9]|[3-9]\d)/.test(gradle));
fail("versionCode válido",/versionCode\s+[1-9]\d*/.test(gradle));
fail("Android Gradle Plugin definido",/com\.android\.application/.test(rootGradle));
fail("Somente INTERNET como permissão nativa",(manifest.match(/<uses-permission\b/g)||[]).length===1&&/android\.permission\.INTERNET/.test(manifest));
fail("Android sem cleartext",/android:usesCleartextTraffic="false"/.test(manifest));
fail("Android sem backup",/android:allowBackup="false"/.test(manifest));
fail("App Link autoVerify",/android:autoVerify="true"/.test(manifest)&&/android:host="cadastrodeatletas\.com\.br"/.test(manifest));
fail("TWA inicia em modo Play",/https:\/\/cadastrodeatletas\.com\.br\/\?app=1/.test(manifest)&&/\?app=1/.test(strings));
fail("Manifest PWA standalone",/"display"\s*:\s*"standalone"/.test(webManifest)&&/"start_url"\s*:\s*"\/\?app=1"/.test(webManifest));
fail("Ícone PWA 512 declarado",/512x512/.test(webManifest)&&exists("assets/app-icon-512.png"));

// Acesso / 18+
fail("Conteúdo protegido por login",/auth-gate-v53\.js/.test(read("site-v5.js"))&&/location\.replace\("conta\.html\?tab=register&gate=1"\)/.test(authGate));
fail("Somente páginas legais/conta ficam públicas",/conta\.html/.test(authGate)&&/termos-de-uso\.html/.test(authGate)&&/politica-privacidade\.html/.test(authGate)&&/exclusao-conta\.html/.test(authGate));
fail("Barreira 18+ carregada",/age-gate-v47\.js/.test(appCheck));
fail("Termos indicam 18+",/18 anos/.test(terms));
fail("Declaração Play indica público 18+",/Maiores de 18 anos/.test(declarations)&&/crianças:\s*\*\*NÃO\*\*/i.test(declarations));

// UGC / social safety
fail("Denúncia e bloqueio no app",/DENUNCIAR/.test(ugc)&&/BLOQUEAR USUÁRIO/.test(ugc));
fail("Moderação registra trilha de ação",/resolvidoEm/.test(moderation)&&/resolvidoPorUid/.test(moderation)&&/acaoModeracao/.test(moderation));
fail("Bloqueio aplicado nas regras",/function isBlocked/.test(rules)&&/!isBlocked/.test(rules));
fail("Mensagens possuem histórico e exclusão",/conversas/.test(messaging)&&/EXCLUIR PARA MIM/.test(messaging)&&/EXCLUIR PARA TODOS/.test(messaging)&&/LIMPAR HISTÓRICO/.test(messaging));
fail("Notificações de mensagens possuem alerta",/v53-notification-alarm/.test(messaging)&&/Nova mensagem recebida/.test(messaging));

// Backend atual sem Blaze obrigatório
fail("Upload usa Cloudflare Worker",/cadastro-atletas-api\.swagtop411\.workers\.dev/.test(cloudinary)&&/\/v1\/media\/sign/.test(cloudinary));
fail("Upload envia Firebase ID token",/Authorization/.test(cloudinary)&&/Bearer/.test(cloudinary));
fail("Upload envia App Check",/X-Firebase-AppCheck/.test(cloudinary));
fail("Upload não usa callable Firebase Functions",!/firebase-functions/.test(cloudinary)&&!/httpsCallable/.test(cloudinary));
fail("Aceite legal não depende de Firebase Functions",!/firebase-functions/.test(termsConsent)&&!/httpsCallable/.test(termsConsent));
fail("Firebase App Check inicializado",/initializeAppCheck/.test(appCheck));

// Exclusão exigida pelo Google Play
fail("Página pública de exclusão existe",/Excluir minha conta/i.test(deletion));
fail("Exclusão pode ser iniciada sem login",/SOLICITAR EXCLUSÃO DA CONTA/.test(deletion)&&/wa\.me\//.test(deletion));
fail("Exclusão não promete backend indisponível",!/firebase-functions/.test(deletion)&&!/deleteMyAccount/.test(deletion));
fail("Política aponta para exclusão pública",/exclusao-conta\.html/.test(privacy));
fail("Data Safety descreve solicitação, não exclusão automática",/solicitação de exclusão/i.test(dataSafety)&&!/utiliza a função backend `deleteMyAccount`/.test(dataSafety));

// Pagamentos digitais no Play
fail("Modo Play detecta app Android",/br\.com\.cadastrodeatletas\.app/.test(playMode)&&/app\"\)===\"1/.test(playMode));
fail("Planos digitais pagos ficam bloqueados no Play",/paid/.test(playMode)&&/input\.disabled=true/.test(playMode)&&/plano gratuito/.test(playMode));

// Segurança básica
fail("Firestore exige autenticação em áreas privadas",/function signedIn/.test(rules));
fail("Storage restringe escrita ao proprietário",/function isOwner/.test(storage)&&/allow create: if isOwner/.test(storage));
fail("Keystore não deve ser versionado",/\.jks/.test(gitignore)&&/keystore\.properties/.test(gitignore));
fail("Service Worker usa network-first para código crítico",/NETWORK_FIRST/.test(sw)&&/auth-gate-v53\.js/.test(sw)&&/terms-consent-v47\.js/.test(sw));

// Materiais de declaração
fail("Roteiro Data Safety presente",/Cloudflare Workers/.test(dataSafety)&&/Cloudinary/.test(dataSafety)&&/Firebase/.test(dataSafety));
fail("Ficha da loja contém URLs legais",/politica-privacidade\.html/.test(listing)&&/exclusao-conta\.html/.test(listing));
fail("Acesso de revisão documentado",/conta de revisão dedicada/i.test(declarations));

// Dependências externas que só podem ser fechadas no Play Console.
const assetTemplate=exists("android-twa/assetlinks.template.json")?read("android-twa/assetlinks.template.json"):"";
const assetFinal=exists(".well-known/assetlinks.json")?read(".well-known/assetlinks.json"):"";
warn("Digital Asset Links final publicado",!!assetFinal&&!/SUBSTITUIR|PLACEHOLDER/.test(assetFinal),"Falta o SHA-256 do certificado App Signing do Google Play.");
warn("Template assetlinks ainda é placeholder",assetTemplate&&!/SUBSTITUIR_PELA_IMPRESSAO/.test(assetTemplate),"Substituir somente após o Play Console fornecer o SHA-256 de App Signing.");
warn("AAB assinado depende dos secrets de upload",false,"Confirmar ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS e ANDROID_KEY_PASSWORD no GitHub Actions antes do release final.");
warn("Declarações do Play Console ainda são externas",false,"Ainda é necessário preencher Público-alvo 18+, Data Safety, IARC, anúncios, acesso ao app e URLs legais no Play Console.");
warn("Teste interno do Google Play ainda é externo",false,"Instalar o AAB pelo Teste interno antes de promover para produção.");

for(const item of checks)console.log(`${item.ok?"✅":"❌"} ${item.name}${item.detail?` — ${item.detail}`:""}`);
for(const item of warnings)console.log(`⚠️ ${item.name} — ${item.detail}`);
const failed=checks.filter(item=>!item.ok).length;
console.log(`\nV55 PLAY: ${checks.length-failed}/${checks.length} verificações locais aprovadas; ${warnings.length} pendência(s) externa(s).`);
if(failed)process.exitCode=1;
