import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const page=read('atividade.html'),js=read('activity-center-v27.js'),css=read('activity-center-v27.css'),deep=read('activity-deeplink-v27.js'),site=read('site-v5.js?v=20260909-46'),sw=read('sw.js');
const checks=[
 ['pagina central',page.includes('CENTRAL DE <em>ATIVIDADES</em>')],
 ['filtros',page.includes('data-activity-filter="unread"')&&page.includes('data-activity-filter="interactions"')],
 ['realtime',js.includes('onSnapshot')&&js.includes('notificacoes')],
 ['marcar todas',js.includes('writeBatch')&&js.includes('markAllRead')],
 ['deep link post',js.includes('post=${encodeURIComponent(item.sourceId)}')&&deep.includes('data-post-id')],
 ['mensagens',deep.includes('snInboxButton')],
 ['campeonatos',js.includes('collection(db,"campeonatos")')&&js.includes('publicado')],
 ['menu',site.includes('href="atividade.html"')&&site.includes('data-v27-activity')],
 ['cache',sw.includes('/atividade.html')&&sw.includes('/activity-center-v27.js')],
 ['responsivo',css.includes('@media(max-width:650px)')]
];
let failed=0;for(const [name,ok] of checks){console.log(`${ok?'OK':'FAIL'} ${name}`);if(!ok)failed++}if(failed)process.exit(1);console.log('V27 activity center audit passed.');