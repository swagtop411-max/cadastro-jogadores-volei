import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const js=read('explorar.js');
const html=read('explorar.html');
const css=read('explorar-v26.css');
const sw=read('sw.js');
const checks=[
  ['paginação de atletas',js.includes('PAGE_SIZE=70')&&js.includes('startAfter')&&js.includes('orderBy(documentId())')],
  ['busca progressiva controlada',js.includes('AUTO_SEARCH_PAGES=2')&&js.includes('ensureSearchCoverage')&&js.includes('SEARCH_TARGET=18')],
  ['relevância esportiva',js.includes('function relevance(')&&js.includes('function completeness(')],
  ['filtros principais',html.includes('exploreModalidade')&&html.includes('exploreCategoria')&&html.includes('explorePosicao')&&html.includes('exploreCidade')&&html.includes('exploreEquipe')],
  ['sugestões acessíveis',html.includes('aria-autocomplete="list"')&&js.includes('renderSuggestions')&&js.includes('ArrowDown')],
  ['estado compartilhável na URL',js.includes('history.replaceState')&&js.includes('URLSearchParams')],
  ['radar de descoberta',html.includes('discoverySection')&&js.includes('discoveryProfiles')],
  ['mídia otimizada',js.includes('feedImageUrl')&&js.includes('thumbImageUrl')],
  ['estilos responsivos V26',css.includes('@media(max-width:600px)')&&css.includes('.explore-filter-panel')],
  ['cache PWA V26',sw.includes('bd-atletas-v26-')&&sw.includes('/explorar-v26.css')]
];
let failed=false;
for(const [name,ok] of checks){console.log(`${ok?'OK':'FAIL'} - ${name}`);if(!ok)failed=true}
if(failed)process.exit(1);
console.log('Explorar V26 audit passed.');
