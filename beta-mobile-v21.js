const PAGE=(location.pathname.split('/').pop()||'index.html');
const ACTIVE=localStorage.getItem('bd_public_beta_v19')==='1'||new URLSearchParams(location.search).get('beta')==='1';
if(!ACTIVE)throw new Error('Beta Mobile V21 inativo');

document.documentElement.classList.add('beta-mobile-app');
document.documentElement.dataset.betaPage=PAGE.replace('.html','');

function ensureCss(){if(document.getElementById('betaMobileV21Css'))return;const l=document.createElement('link');l.id='betaMobileV21Css';l.rel='stylesheet';l.href='/beta-mobile-v21.css?v=20260907-21';document.head.appendChild(l)}
ensureCss();

const icons={
 home:'<svg viewBox="0 0 24 24"><path d="M3 10.8 12 3l9 7.8v9.2a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
 search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg>',
 plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
 trophy:'<svg viewBox="0 0 24 24"><path d="M8 4h8v4a4 4 0 0 1-8 0zM12 12v5M8 21h8M10 17h4M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4"/></svg>',
 user:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4.5 21c.8-4 3.2-6 7.5-6s6.7 2 7.5 6"/></svg>',
 gear:'⚙',
 arrow:'<svg viewBox="0 0 24 24"><path d="M5 12h14M14 7l5 5-5 5"/></svg>',
 share:'<svg viewBox="0 0 24 24"><path d="M14 5h5v5M19 5l-8 8M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>'
};

function navItem(href,icon,label,key,extra=''){const active=PAGE===key||(key==='index.html'&&PAGE==='');return `<a class="${active?'active ':''}${extra}" href="${href}">${extra==='publish'?`<span class="beta-publish-circle">${icon}</span>`:icon}<span>${label}</span></a>`}
function mountNav(){if(document.getElementById('betaMobileNav'))return;const nav=document.createElement('nav');nav.id='betaMobileNav';nav.className='beta-mobile-nav';nav.setAttribute('aria-label','Navegação principal do app');nav.innerHTML=navItem('/index.html?beta=1',icons.home,'Feed','index.html')+navItem('/explorar.html?beta=1',icons.search,'Explorar','explorar.html')+navItem('/comunidade.html?beta=1#publicar',icons.plus,'Publicar','comunidade.html','publish')+navItem('/proximos-campeonatos.html?beta=1',icons.trophy,'Torneios','proximos-campeonatos.html')+navItem('/meu-perfil.html?beta=1',icons.user,'Perfil','meu-perfil.html');document.body.appendChild(nav)}

function buildTop(){if(PAGE!=='index.html'||document.getElementById('betaMobileTop'))return;const home=document.querySelector('.home-social');if(!home)return;const top=document.createElement('section');top.id='betaMobileTop';top.className='beta-mobile-top';top.innerHTML=`<div class="beta-mobile-hero"><h1>Feed</h1><p>Treinos, conquistas, campeonatos e momentos publicados por atletas da rede.</p><button class="beta-mobile-settings" type="button" aria-label="Opções do Beta">${icons.gear}</button></div><div class="beta-mobile-stats"><div class="beta-mobile-stat"><b data-beta-stat="all">0</b><span>PUBLICAÇÕES</span></div><div class="beta-mobile-stat"><b data-beta-stat="photo">0</b><span>FOTOS</span></div><div class="beta-mobile-stat video"><b data-beta-stat="video">0</b><span>VÍDEOS</span></div></div><label class="beta-mobile-search">${icons.search}<input id="betaMobileSearch" type="search" maxlength="80" autocomplete="off" placeholder="Buscar publicação ou atleta..."></label><div class="beta-mobile-result-line"><span data-beta-results>0 resultados</span><span class="dot"></span><strong>REDE ATIVA</strong></div>`;home.before(top);top.querySelector('.beta-mobile-settings').onclick=()=>window.BDBetaV20?.toggle?.();top.querySelector('#betaMobileSearch').addEventListener('input',applySearch)}

function cards(){return[...document.querySelectorAll('#homeFeed .social-post[data-post-id]')]}
function enhanceCard(card){if(card.dataset.betaV21==='1')return;card.dataset.betaV21='1';const head=card.querySelector('.social-post-head');if(head&&!head.querySelector('.beta-post-pill')){const pill=document.createElement('span');pill.className='beta-post-pill';pill.textContent=card.querySelector('video')?'VÍDEO':'POST';head.appendChild(pill)}const media=card.querySelector('.social-media-frame');if(media&&!card.querySelector('.beta-card-actions')){const profile=card.querySelector('.social-author')?.getAttribute('href')||'/atletas.html';const actions=document.createElement('div');actions.className='beta-card-actions';actions.innerHTML=`<a class="beta-card-action primary" href="${profile}">${icons.search}<span>VER ATLETA</span></a><button class="beta-card-action share" type="button">${icons.share}<span>COMPARTILHAR</span></button>`;actions.querySelector('.share').onclick=()=>card.querySelector('.home-share')?.click();media.after(actions);const foot=document.createElement('div');foot.className='beta-card-foot';foot.innerHTML='<span></span>';actions.after(foot)}}

function updateStats(){const all=cards();const photos=all.filter(c=>!c.querySelector('video')).length;const videos=all.length-photos;document.querySelector('[data-beta-stat="all"]')?.replaceChildren(document.createTextNode(String(all.length)));document.querySelector('[data-beta-stat="photo"]')?.replaceChildren(document.createTextNode(String(photos)));document.querySelector('[data-beta-stat="video"]')?.replaceChildren(document.createTextNode(String(videos)));const visible=all.filter(c=>!c.hidden&&!c.classList.contains('beta-search-hidden')).length;const r=document.querySelector('[data-beta-results]');if(r)r.textContent=`${visible} resultado${visible===1?'':'s'}`}

function applySearch(){const q=(document.getElementById('betaMobileSearch')?.value||'').trim().toLocaleLowerCase('pt-BR');for(const card of cards()){const text=(card.textContent||'').toLocaleLowerCase('pt-BR');card.classList.toggle('beta-search-hidden',Boolean(q)&&!text.includes(q))}updateStats()}

let scheduled=false;function refresh(){scheduled=false;buildTop();mountNav();for(const card of cards())enhanceCard(card);applySearch()}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(refresh)}
function boot(){buildTop();mountNav();refresh();const feed=document.getElementById('homeFeed');if(feed){new MutationObserver(schedule).observe(feed,{childList:true,subtree:true});new MutationObserver(schedule).observe(document.body,{attributes:true,subtree:true,attributeFilter:['hidden']})}setTimeout(refresh,350);setTimeout(refresh,1200)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
