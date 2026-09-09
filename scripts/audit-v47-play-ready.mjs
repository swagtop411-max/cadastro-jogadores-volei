import fs from "node:fs";

const read=path=>fs.readFileSync(path,"utf8");
const exists=path=>fs.existsSync(path);
const checks=[];
const warnings=[];
function check(name,ok,detail=""){checks.push({name,ok,detail});if(!ok)process.exitCode=1}
function warn(name,ok,detail=""){if(!ok)warnings.push({name,detail})}

const gradle=read("android-twa/app/build.gradle");
const manifest=read("android-twa/app/src/main/AndroidManifest.xml");
const functions=read("functions/index.js");
const appCheck=read("firebase-app-check-v11.js");
const moderation=read("admin-moderation-v42.js");
const ugc=read("ugc-safety-v41.js");
const terms=read("termos-de-uso.html");
const privacy=read("politica-privacidade.html");
const deletion=read("exclusao-conta.html");
const rules=read("firestore.rules");
const storage=read("storage.rules");
const sw=read("sw.js");

check("Android targetSdk 36",/targetSdk\s+36/.test(gradle));
check("Android compileSdk 36",/compileSdk\s+36/.test(gradle));
check("Android sem cleartext",/android:usesCleartextTraffic="false"/.test(manifest));
check("Android sem backup",/android:allowBackup="false"/.test(manifest));
check("App Link autoVerify",/android:autoVerify="true"/.test(manifest));
check("Cloudinary assinado com App Check",/exports\.signCloudinaryUpload/.test(functions)&&/enforceAppCheck:\s*true/.test(functions)&&/api_sign_request/.test(functions));
check("Exclusão de conta via backend",/exports\.deleteMyAccount/.test(functions)&&/auth\.deleteUser\(uid\)/.test(functions));
check("Aceite legal versionado no backend",/exports\.acceptLegalTerms/.test(functions)&&/LEGAL_VERSION\s*=\s*"2026-09-09"/.test(functions)&&/termosAceitosVersao/.test(functions));
check("Consentimento V47 no bootstrap",/terms-consent-v47\.js/.test(appCheck));
check("Barreira 18+ V47 no bootstrap",/age-gate-v47\.js/.test(appCheck));
check("Moderação registra responsável e ação",/resolvidoEm/.test(moderation)&&/resolvidoPorUid/.test(moderation)&&/acaoModeracao/.test(moderation));
check("Denunciar e bloquear disponíveis",/DENUNCIAR/.test(ugc)&&/BLOQUEAR USUÁRIO/.test(ugc));
check("Bloqueio aplicado em regras sociais",/function isBlocked/.test(rules)&&/!isBlocked/.test(rules));
check("Storage restringe escrita ao dono",/function isOwner/.test(storage)&&/allow create: if isOwner/.test(storage));
check("Termos 18+ e UGC",/18 anos/.test(terms)&&/Denúncia|denúncia/.test(terms)&&/bloqueio|bloquear/i.test(terms));
check("Privacidade cobre exclusão",/exclusao-conta\.html/.test(privacy));
check("Página pública de exclusão existe",/deleteMyAccount/.test(deletion)&&/Excluir minha conta/i.test(deletion));
check("Service Worker V47",/bd-atletas-v47/.test(sw)&&/terms-consent-v47\.js/.test(sw)&&/age-gate-v47\.js/.test(sw));

const assetTemplate=exists("android-twa/assetlinks.template.json")?read("android-twa/assetlinks.template.json"):"";
warn("Digital Asset Links final publicado",exists(".well-known/assetlinks.json")&&!/SUBSTITUIR|PLACEHOLDER/.test(exists(".well-known/assetlinks.json")?read(".well-known/assetlinks.json"):""),"Depende do SHA-256 do certificado App Signing fornecido pelo Google Play.");
warn("Placeholder de App Signing substituído",assetTemplate&&!/SUBSTITUIR_PELA_IMPRESSAO/.test(assetTemplate),"Só deve ser substituído depois de criar o app e ativar Play App Signing.");

for(const item of checks)console.log(`${item.ok?"✅":"❌"} ${item.name}${item.detail?` — ${item.detail}`:""}`);
for(const item of warnings)console.log(`⚠️ ${item.name} — ${item.detail}`);
const failed=checks.filter(item=>!item.ok).length;
console.log(`\nV47: ${checks.length-failed}/${checks.length} verificações de código aprovadas; ${warnings.length} pendência(s) externa(s).`);
if(failed)process.exitCode=1;
