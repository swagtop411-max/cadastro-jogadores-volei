import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const failures=[];
const warnings=[];
const passes=[];
const file=p=>path.join(root,p);
const exists=p=>fs.existsSync(file(p));
const read=p=>fs.readFileSync(file(p),"utf8");
const pass=m=>passes.push(m);
const fail=m=>failures.push(m);
const warn=m=>warnings.push(m);
const need=(p,needle,label)=>{if(!exists(p))return fail(`${p}: ausente (${label})`);read(p).includes(needle)?pass(`${p}: ${label}`):fail(`${p}: ${label}`)};
const forbid=(p,needle,label)=>{if(!exists(p))return fail(`${p}: ausente (${label})`);read(p).includes(needle)?fail(`${p}: ${label}`):pass(`${p}: ${label}`)};

for(const p of [
  "android-twa/app/build.gradle",
  "android-twa/app/src/main/AndroidManifest.xml",
  "android-twa/app/src/main/res/values/strings.xml",
  "android-twa/assetlinks.template.json",
  "functions/index.js",
  "functions/package.json",
  "firebase.json",
  "conta.html",
  "conta.js",
  "play-store-mode-v44.js",
  "exclusao-conta.html",
  "politica-privacidade.html",
  "termos-de-uso.html",
  "ugc-safety-v41.js",
  "admin-moderation-v42.js",
  "cloudinary-upload.js",
  "play-store/store-listing-pt-BR.md",
  "play-store/data-safety-pt-BR.md",
  "play-store/content-declarations-pt-BR.md"
]) exists(p)?pass(`arquivo ${p}`):fail(`arquivo ausente: ${p}`);

need("android-twa/app/build.gradle","compileSdk 36","Android compile SDK 36");
need("android-twa/app/build.gradle","targetSdk 36","Android target API 36");
need("android-twa/app/build.gradle",'applicationId "br.com.cadastrodeatletas.app"',"applicationId definido");
need("android-twa/app/build.gradle",'implementation "com.google.androidbrowserhelper:androidbrowserhelper:',"Android Browser Helper presente");
need("android-twa/app/src/main/AndroidManifest.xml",'android:usesCleartextTraffic="false"',"HTTP sem criptografia bloqueado");
need("android-twa/app/src/main/AndroidManifest.xml",'android:autoVerify="true"',"App Link verificado solicitado");
need("android-twa/app/src/main/AndroidManifest.xml",'https://cadastrodeatletas.com.br/?app=1',"TWA aponta para domínio oficial");
need("android-twa/app/src/main/res/values/strings.xml",'delegate_permission/common.handle_all_urls',"asset statement da TWA presente");

need("conta.html",'id="registerBirth"',"cadastro solicita data de nascimento");
need("conta.html",'id="confirmAdult"',"cadastro exige declaração de maioridade");
need("conta.html","USO EXCLUSIVO PARA MAIORES DE 18 ANOS","aviso 18+ visível no cadastro");
need("conta.js","function isAdult18","validação etária implementada");
need("conta.js","exclusivo para pessoas com 18 anos ou mais","cadastro bloqueia menores");
need("conta.js","nascimento: birth","data de nascimento é salva na área privada da conta");
need("termos-de-uso.html","Uso exclusivo para maiores de 18 anos","Termos restringem uso a adultos");
need("politica-privacidade.html","Restrição etária","Privacidade documenta restrição 18+");

need("play-store-mode-v44.js",'input[name="profilePlano"]',"modo Play controla planos digitais");
need("play-store-mode-v44.js",'input.value!=="gratuito"',"planos digitais pagos são bloqueados no app Play");
need("play-store-mode-v44.js","não oferece compra de recursos digitais fora do faturamento do Google Play","aviso de conformidade de pagamento presente");

need("exclusao-conta.html","deleteMyAccount","exclusão autenticada disponível no app");
need("exclusao-conta.html","EXCLUIR CONTA E DADOS","confirmação explícita de exclusão");
need("politica-privacidade.html","exclusao-conta.html","política aponta para exclusão de conta");
need("termos-de-uso.html","Denúncia, bloqueio e moderação","termos cobrem moderação de UGC");
need("ugc-safety-v41.js",'collection(db,"denuncias")',"denúncia UGC persistente");
need("ugc-safety-v41.js",'collection(db,"bloqueios",currentUser.uid,"usuarios")',"bloqueio persistente entre dispositivos");
need("admin-moderation-v42.js",'collection(db,"denuncias")',"fila administrativa de moderação");

need("functions/index.js","exports.signCloudinaryUpload","backend de upload assinado");
need("functions/index.js","exports.deleteMyAccount","backend de exclusão de conta");
need("functions/index.js","enforceAppCheck: true","Cloud Functions protegidas por App Check");
forbid("functions/index.js","CLOUDINARY_API_SECRET = \"","segredo Cloudinary não pode estar hardcoded");
need("firebase.json",'"runtime": "nodejs22"',"Functions configuradas em Node 22");
need("cloudinary-upload.js","signedUpload","frontend prefere upload assinado");

need("play-store/store-listing-pt-BR.md","Somente maiores de 18 anos","ficha da loja declara público adulto");
need("play-store/data-safety-pt-BR.md","Segurança dos dados","roteiro de Data Safety presente");
need("play-store/content-declarations-pt-BR.md","Restringir acesso de menores identificados pelo Google: **SIM**","declaração de público-alvo preparada");

if(exists(".well-known/assetlinks.json")){
  const assetlinks=read(".well-known/assetlinks.json");
  if(assetlinks.includes("SUBSTITUIR_")||!assetlinks.includes("br.com.cadastrodeatletas.app")) fail(".well-known/assetlinks.json ainda não está pronto para produção");
  else pass("Digital Asset Links de produção presente");
}else warn("Digital Asset Links de produção depende do SHA-256 do certificado de App Signing emitido/exibido pelo Google Play");

if(exists("android-twa/keystore.properties"))warn("keystore.properties existe no checkout; confirme que não está versionado");
else pass("chave Android não está versionada no repositório");

console.log(`PLAY RELEASE AUDIT: ${passes.length} verificações aprovadas`);
for(const item of passes)console.log(`OK ${item}`);
for(const item of warnings)console.warn(`PENDENTE EXTERNO ${item}`);
if(failures.length){
  console.error(`FALHOU: ${failures.length} problema(s)`);
  for(const item of failures)console.error(`ERRO ${item}`);
  process.exit(1);
}
console.log("AUDITORIA DE CÓDIGO PARA GOOGLE PLAY APROVADA ✓");
