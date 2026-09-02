function ensureBaseHeader(){
  if(document.querySelector('.header')) return;
  const header=document.createElement('header');
  header.className='header';
  header.innerHTML='<button class="site-menu-trigger" id="siteMenuTrigger" type="button" aria-controls="siteMenuDrawer" aria-expanded="false">☰<span>MENU</span></button><a class="header-brand" href="index.html"><div><strong>BANCO DE DADOS DE ATLETAS</strong><span>VÔLEI DE PRAIA</span></div></a>';
  document.body.prepend(header);
}

async function boot(){
  ensureBaseHeader();
  import('./auth-audit-v11.js?v=20260902-1').catch(error=>console.warn('Telemetria de sessão V11:',error));
  try{await import('./site-v5.js?v=20260901-9')}catch(error){console.error('Shell V8:',error)}
  if((location.pathname.split('/').pop()||'')==='admin.html'){
    Promise.all([
      import('./admin-v8-hardening.js?v=20260902-2'),
      import('./admin-claims-v9.js?v=20260902-1'),
      import('./admin-profile-link-v10.js?v=20260902-1'),
      import('./admin-control-center-v10.js?v=20260902-1'),
      import('./admin-data-migration-v11.js?v=20260902-1'),
      import('./admin-commerce-v11.js?v=20260902-1')
    ]).catch(error=>console.error('Admin V10:',error));
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
