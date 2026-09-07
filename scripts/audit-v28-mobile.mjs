import fs from 'node:fs';

const need=(ok,msg)=>{if(!ok)throw new Error(`V28 Mobile: ${msg}`)};
const read=p=>fs.readFileSync(p,'utf8');
const beta=read('beta-mobile-v21.js');
const activity=read('beta-mobile-activity-v28.js');
const css=read('beta-mobile-activity-v28.css');
const publicBeta=read('public-beta-v19.js');
const sw=read('sw.js');

need(beta.includes('betaMobileActivityV28Css'),'CSS V28 não está ligado ao shell do app');
need(beta.includes("PAGE==='atividade.html'"),'atividade.html não foi tratada no shell mobile');
need(activity.includes("notificacoes',user.uid,'itens"),'badge não lê notificações privadas do usuário');
need(activity.includes("where('lida','==',false)"),'badge não filtra atividades não lidas');
need(activity.includes("/atividade.html?beta=1"),'atalho do app não preserva o modo beta');
need(css.includes('html.beta-mobile-app.beta-activity-v28 .activity-page'),'estilo da Central não está isolado ao app');
need(css.includes('.beta-activity-floating'),'atalho flutuante do app ausente');
need(publicBeta.includes('beta-mobile-activity-v28.js?v=20260907-28'),'bootstrap não carrega módulo V28');
need(sw.includes('bd-atletas-v28-20260907-1'),'cache PWA não foi versionado para V28');
need(sw.includes('/beta-mobile-activity-v28.js')&&sw.includes('/beta-mobile-activity-v28.css'),'arquivos V28 ausentes do cache do app');
console.log('V28 Mobile audit OK');
