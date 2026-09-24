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
  const body = html.search(/<body[^>]*>/i);
  const nav = html.indexOf('id="betaMobileNav"');
  if (body < 0 || nav < 0) throw new Error(`${page}: betaMobileNav ausente`);
  if (nav - body > 1800) throw new Error(`${page}: menu não está no início do body para cold start`);
  if (!html.includes('id="bottomNavColdStartV70"')) throw new Error(`${page}: CSS crítico V70 ausente`);
  if (!html.includes('@media(max-width:900px){') ||
      !html.includes('#betaMobileNav.bottom-nav-v67{') ||
      !html.includes('display:grid!important;position:fixed!important')) {
    throw new Error(`${page}: menu não está fixo/visível no mobile antes do JavaScript`);
  }
  if (html.includes('id="bottomNavRescueV67"')) {
    throw new Error(`${page}: CSS legado do menu voltou para a página`);
  }
  const items = (html.match(/data-nav="(?:feed|explorar|publicar|torneios|perfil)"/g) || []).length;
  if (items !== 5) throw new Error(`${page}: menu inferior deve ter exatamente 5 itens, encontrou ${items}`);
}

const mobile = fs.readFileSync('beta-mobile-v21.js', 'utf8');
if (!mobile.includes("nav.style.setProperty('display','grid','important')")) {
  throw new Error('beta-mobile-v21.js: fallback de visibilidade do menu ausente');
}
if (!mobile.includes('function installNavGuardian()') || !mobile.includes('function enforceNav()')) {
  throw new Error('beta-mobile-v21.js: guardião persistente do menu ausente');
}

const themeBoot = fs.readFileSync('theme-boot-v65.js', 'utf8');
if (!themeBoot.includes('html.beta-mobile-app body{transform:none!important')) {
  throw new Error('theme-boot-v65.js: body transform pode quebrar position:fixed no Android');
}

const motion = fs.readFileSync('app-motion-v65.css', 'utf8');
if (!motion.includes('html.beta-mobile-app #betaMobileNav{position:fixed!important;display:grid!important')) {
  throw new Error('app-motion-v65.css: trava fixa/visível do menu ausente');
}

console.log('Beta navigation cold-start guard: OK');
