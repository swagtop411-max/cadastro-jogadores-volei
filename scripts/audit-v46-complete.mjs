import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const findings=[];
const add=(severity,code,file,message)=>findings.push({severity,code,file,message});
const ignoredDirs=new Set(['.git','node_modules','.gradle','build','dist']);

function walk(dir='.'){
  const out=[];
  for(const entry of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){
    if(entry.name.startsWith('.') && entry.name!=='.well-known' && dir==='.'){
      if(entry.name!=='.github') continue;
    }
    if(entry.isDirectory()){
      if(ignoredDirs.has(entry.name)) continue;
      out.push(...walk(path.join(dir,entry.name)));
    }else out.push(path.join(dir,entry.name).replaceAll('\\','/'));
  }
  return out;
}

const files=walk();
const fileSet=new Set(files);
const textFiles=files.filter(f=>/\.(?:html?|js|mjs|css|json|webmanifest|rules|ya?ml|md)$/i.test(f));
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const source=new Map(textFiles.map(f=>[f,read(f)]));

function resolveLocal(from,ref){
  let value=String(ref||'').trim();
  if(!value||value.startsWith('#')||/^(?:https?:|data:|mailto:|tel:|javascript:|blob:|chrome-extension:|node:)/i.test(value)) return null;
  value=value.split('#')[0].split('?')[0];
  if(!value||value==='/'||value==='.') return 'index.html';
  if(value.startsWith('/')) value=value.slice(1);
  else value=path.posix.normalize(path.posix.join(path.posix.dirname(from),value));
  if(value.endsWith('/')) value+='index.html';
  return value.replace(/^\.\//,'');
}

for(const [file,text] of source){
  if(/\.html?$/i.test(file)){
    const ids=[...text.matchAll(/\bid=["']([^"']+)["']/gi)].map(m=>m[1]);
    const counts=new Map();
    for(const id of ids) counts.set(id,(counts.get(id)||0)+1);
    for(const [id,count] of counts) if(count>1) add('HIGH','DUPLICATE_HTML_ID',file,`id="${id}" aparece ${count} vezes`);

    const refs=[...text.matchAll(/\b(?:src|href|action|manifest)=["']([^"']+)["']/gi)];
    for(const m of refs){
      const resolved=resolveLocal(file,m[1]);
      if(resolved && !fileSet.has(resolved)) add('HIGH','BROKEN_LOCAL_REF',file,`${m[1]} -> ${resolved} não existe`);
    }

    const scriptSrcs=[...text.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)].map(m=>m[1]);
    const seen=new Map();
    for(const src of scriptSrcs){const k=src.split('?')[0];seen.set(k,(seen.get(k)||0)+1)}
    for(const [src,count] of seen) if(count>1) add('MEDIUM','DUPLICATE_SCRIPT',file,`${src} carregado ${count} vezes`);

    for(const m of text.matchAll(/<a\b[^>]*target=["']_blank["'][^>]*>/gi)){
      if(!/\brel=["'][^"']*\bnoopener\b/i.test(m[0])) add('MEDIUM','TARGET_BLANK_NO_NOOPENER',file,m[0].slice(0,180));
    }
  }

  if(/\.(?:js|mjs)$/i.test(file) && !file.startsWith("scripts/")){
    const importRefs=[];
    for(const m of text.matchAll(/\bfrom\s*["']([^"']+)["']/g)) importRefs.push(m[1]);
    for(const m of text.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) importRefs.push(m[1]);
    for(const ref of importRefs){
      const resolved=resolveLocal(file,ref);
      if(resolved && !fileSet.has(resolved)) add('HIGH','BROKEN_IMPORT',file,`${ref} -> ${resolved} não existe`);
    }
    if(/\beval\s*\(/.test(text)||/\bnew\s+Function\s*\(/.test(text)) add('HIGH','DYNAMIC_CODE_EXEC',file,'eval/new Function detectado');
    if(/document\.write\s*\(/.test(text)) add('HIGH','DOCUMENT_WRITE',file,'document.write detectado');
    for(const m of text.matchAll(/http:\/\/[^"'`\s)]+/g)) add('MEDIUM','INSECURE_HTTP',file,m[0]);
    if(!file.startsWith("scripts/") && /getDocs\s*\(\s*collection\s*\(/.test(text)) add('LOW','UNBOUNDED_COLLECTION_SCAN',file,'revisar coleção sem limite explícito');
  }

  if(/\.css$/i.test(file)){
    for(const m of text.matchAll(/url\((['"]?)([^)'"\s]+)\1\)/gi)){
      const resolved=resolveLocal(file,m[2]);
      if(resolved && !fileSet.has(resolved)) add('HIGH','BROKEN_CSS_REF',file,`${m[2]} -> ${resolved} não existe`);
    }
  }
}

// Versões conflitantes do mesmo módulo local são perigosas com ES Modules: podem criar instâncias duplicadas.
const versions=new Map();
for(const [file,text] of source){
  if(!/\.(?:html?|js|mjs)$/i.test(file)) continue;
  for(const m of text.matchAll(/["'](\.\.?\/[^"']+?\.(?:js|css))(\?v=[^"']+)?["']/g)){
    const key=path.posix.basename(m[1]);
    if(!versions.has(key)) versions.set(key,new Map());
    const v=m[2]||'(sem versão)';
    if(!versions.get(key).has(v)) versions.get(key).set(v,new Set());
    versions.get(key).get(v).add(file);
  }
}
for(const [asset,map] of versions){
  if(map.size>1){
    const detail=[...map].map(([v,owners])=>`${v}: ${[...owners].slice(0,8).join(', ')}`).join(' | ');
    add('MEDIUM','ASSET_VERSION_SPLIT',asset,detail);
  }
}

// PWA / Service Worker.
if(fileSet.has('sw.js')){
  const sw=read('sw.js');
  const coreMatch=sw.match(/const\s+CORE\s*=\s*\[([\s\S]*?)\];/);
  if(coreMatch){
    for(const m of coreMatch[1].matchAll(/["']([^"']+)["']/g)){
      const resolved=resolveLocal('sw.js',m[1]);
      if(resolved && !fileSet.has(resolved)) add('HIGH','SW_MISSING_CORE_ASSET','sw.js',`${m[1]} -> ${resolved} não existe`);
    }
  }
  if(/cache\.addAll\(CORE\)\.catch\(\(\)=>\{\}\)/.test(sw)) add('MEDIUM','SW_SWALLOWS_PRECACHE_FAILURE','sw.js','cache.addAll falha inteiro se um único asset falhar e o erro é engolido');
}

if(fileSet.has('manifest.webmanifest')){
  try{
    const manifest=JSON.parse(read('manifest.webmanifest'));
    const icons=Array.isArray(manifest.icons)?manifest.icons:[];
    if(!icons.some(i=>String(i.sizes||'').includes('192')&&/png/i.test(i.type||i.src||''))) add('MEDIUM','PWA_MISSING_192_PNG','manifest.webmanifest','ícone PNG 192x192 ausente');
    if(!icons.some(i=>String(i.sizes||'').includes('512')&&/png/i.test(i.type||i.src||''))) add('MEDIUM','PWA_MISSING_512_PNG','manifest.webmanifest','ícone PNG 512x512 ausente');
    for(const icon of icons){const resolved=resolveLocal('manifest.webmanifest',icon.src);if(resolved&&!fileSet.has(resolved))add('HIGH','MANIFEST_ICON_MISSING','manifest.webmanifest',`${icon.src} não existe`)}
  }catch(e){add('HIGH','INVALID_MANIFEST','manifest.webmanifest',e.message)}
}

// Segurança de mídia e backend.
if(fileSet.has('cloudinary-upload.js?v=20260909-46')){
  const t=read('cloudinary-upload.js?v=20260909-46');
  if(/legacyUnsignedUpload/.test(t)||/upload_preset/.test(t)) add('HIGH','UNSIGNED_CLOUDINARY_FALLBACK','cloudinary-upload.js?v=20260909-46','fallback unsigned ainda existe no frontend');
}
if(fileSet.has('functions/index.js')){
  const t=read('functions/index.js');
  if(/signCloudinaryUpload/.test(t)&&!/consumeAppCheckToken\s*:\s*true/.test((t.match(/exports\.signCloudinaryUpload[\s\S]*?\n\);/)||[''])[0])) add('MEDIUM','SIGNER_NO_REPLAY_PROTECTION','functions/index.js','signCloudinaryUpload sem consumeAppCheckToken');
  if(/signCloudinaryUpload/.test(t)&&!/rate[_-]?limit|upload_rate_limits|rateLimits/i.test(t)) add('MEDIUM','SIGNER_NO_RATE_LIMIT','functions/index.js','signCloudinaryUpload sem rate limit autoritativo');
  for(const required of ['deleteMyAccount','signCloudinaryUpload']) if(!t.includes(required)) add('HIGH','FUNCTION_MISSING','functions/index.js',`${required} ausente`);
}

// Stories: consultas por owner precisam respeitar privacidade de terceiros.
if(fileSet.has('social-network.js?v=20260909-46')){
  const t=read('social-network.js?v=20260909-46');
  const block=(t.match(/export async function getActiveStories[\s\S]*?\n}\n/)||[''])[0];
  if(block&&/if\(ownerUid\).*where\("ownerUid"/.test(block)&&!/privateAccess|canReadPrivate|visibilidade/.test(block.split('else q=')[0])) add('HIGH','OWNER_STORY_QUERY_PRIVACY','social-network.js?v=20260909-46','consulta de Stories por ownerUid não restringe visibilidade para visitante');
}

// Firestore Rules.
if(fileSet.has('firestore.rules')){
  const t=read('firestore.rules');
  const perfis=(t.match(/match\s+\/perfis\/\{uid\}/g)||[]).length;
  if(perfis>1) add('MEDIUM','DUPLICATE_PERFIS_MATCH','firestore.rules',`${perfis} blocos match /perfis/{uid}; regras sobrepostas aumentam risco de regressão`);
  if(/allow\s+(?:write|create|update|delete)(?:\s*,\s*\w+)*\s*:\s*if\s+true\s*;/.test(t)) add('HIGH','UNCONDITIONAL_RULE_WRITE','firestore.rules','escrita incondicional detectada');
  if(!/match\s+\/denuncias\//.test(t)) add('HIGH','REPORT_RULES_MISSING','firestore.rules','regras de denúncias ausentes');
  if(!/match\s+\/bloqueios\//.test(t)) add('HIGH','BLOCK_RULES_MISSING','firestore.rules','regras de bloqueio persistente ausentes');
}

// Android / TWA e Digital Asset Links.
const androidFiles=files.filter(f=>f.startsWith('android-twa/'));
if(!androidFiles.length) add('HIGH','ANDROID_PROJECT_MISSING','android-twa/','projeto Android/TWA não está no repositório');
if(!fileSet.has('.well-known/assetlinks.json')) add('LOW','ASSETLINKS_PENDING_PLAY_CERT','.well-known/assetlinks.json','depende do SHA-256 do certificado de App Signing do Google Play');

// Documentação de auditoria antiga não pode ser usada como fonte de estado atual, mas denuncia itens a revisar.
if(fileSet.has('RELEASE_CANDIDATE_RC1_AUDIT_2026-09-08.md')){
  const t=read('RELEASE_CANDIDATE_RC1_AUDIT_2026-09-08.md');
  if(/Estado:\s*PENDENTE|Estado:\s*NÃO EXISTE|Estado:\s*INCOMPLETO/.test(t)) add('LOW','STALE_RC1_OPEN_ITEMS','RELEASE_CANDIDATE_RC1_AUDIT_2026-09-08.md','documento RC1 ainda registra itens abertos; confirmar se já foram resolvidos');
}

const order={HIGH:0,MEDIUM:1,LOW:2};
findings.sort((a,b)=>order[a.severity]-order[b.severity]||a.file.localeCompare(b.file)||a.code.localeCompare(b.code));
const counts={HIGH:0,MEDIUM:0,LOW:0};
for(const item of findings) counts[item.severity]++;
console.log(`V46 COMPLETE AUDIT | arquivos=${files.length} | HIGH=${counts.HIGH} MEDIUM=${counts.MEDIUM} LOW=${counts.LOW}`);
for(const item of findings) console.log(`${item.severity}\t${item.code}\t${item.file}\t${item.message}`);
console.log('AUDIT_JSON='+JSON.stringify({counts,findings}));
// Primeira passagem é diagnóstica. O workflow continua verde para permitir coleta e correção no mesmo ciclo.
