function ensureBaseHeader(){
  if(document.querySelector('.header')) return;
  const header=document.createElement('header');
  header.className='header';
  header.innerHTML='<button class="site-menu-trigger" id="siteMenuTrigger" type="button" aria-controls="siteMenuDrawer" aria-expanded="false">☰<span>MENU</span></button><a class="header-brand" href="index.html"><div><strong>BANCO DE DADOS DE ATLETAS</strong><span>VÔLEI DE PRAIA</span></div></a>';
  document.body.prepend(header);
}

async function boot(){
  ensureBaseHeader();
  try{await import('./site-v5.js?v=20260901-8')}catch(error){console.error('Shell V7:',error)}
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
