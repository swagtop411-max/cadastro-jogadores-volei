import fs from 'node:fs';

const pages = [
  'index.html',
  'explorar.html',
  'comunidade.html',
  'proximos-campeonatos.html',
  'meu-perfil.html'
];

for (const page of pages) {
  const html = fs.readFileSync(page, 'utf8');
  if (!html.includes('id="betaMobileNav"')) {
    throw new Error(`${page}: betaMobileNav ausente`);
  }
  if (!html.includes('html.beta-mobile-app #betaMobileNav.bottom-nav-v67{') ||
      !html.includes('display:grid!important;position:fixed!important')) {
    throw new Error(`${page}: regra de exibição persistente do menu ausente`);
  }
  const items = (html.match(/data-nav="(?:feed|explorar|publicar|torneios|perfil)"/g) || []).length;
  if (items < 5) {
    throw new Error(`${page}: menu inferior incompleto (${items}/5)`);
  }
  if (html.includes('#betaMobileNav.bottom-nav-v67{display:none!important}')) {
    throw new Error(`${page}: regra crítica voltou a esconder o menu`);
  }
}

const mobile = fs.readFileSync('beta-mobile-v21.js', 'utf8');
if (!mobile.includes("nav.style.setProperty('display','grid','important')")) {
  throw new Error('beta-mobile-v21.js: fallback de visibilidade do menu ausente');
}


const themeBoot = fs.readFileSync('theme-boot-v65.js', 'utf8');
if (!themeBoot.includes('html.beta-mobile-app body{transform:none!important')) {
  throw new Error('theme-boot-v65.js: body transform pode quebrar position:fixed no Android');
}

const motion = fs.readFileSync('app-motion-v65.css', 'utf8');
if (!motion.includes('html.beta-mobile-app #betaMobileNav{position:fixed!important;display:grid!important')) {
  throw new Error('app-motion-v65.css: trava fixa/visível do menu ausente');
}

if (!mobile.includes('function installNavGuardian()') || !mobile.includes('function enforceNav()')) {
  throw new Error('beta-mobile-v21.js: guardião persistente do menu ausente');
}

console.log('Beta navigation guard: OK');
