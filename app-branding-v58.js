(() => {
  if (window.__athleteBranding58) return;
  window.__athleteBranding58 = true;
  let launchFinished;
  window.__athleteLaunchReady = new Promise(resolve => { launchFinished = resolve; });
  const version = '20260916-58';
  const logo = '/assets/app-logo.webp?v=' + version;
  const style = document.createElement('style');
  style.textContent = `
    .header .header-brand{gap:10px!important;min-width:0!important}
    .header .header-brand .app-site-logo{display:block!important;width:46px!important;height:46px!important;max-width:none!important;flex:0 0 46px!important;object-fit:contain!important;border-radius:7px}
    #appLaunch58{position:fixed;inset:0;width:100%;height:100vh;height:100dvh;z-index:2147483647;background:#020d4b;display:grid;place-items:center;visibility:visible!important;opacity:1;transition:opacity .2s ease;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);box-sizing:border-box}
    #appLaunch58 img{display:block;width:100%;height:100%;max-width:100vw;max-height:100vh;max-height:100dvh;object-fit:contain}
    #appLaunch58 button{position:absolute;right:16px;bottom:calc(20px + env(safe-area-inset-bottom));border:1px solid #ffffff80;background:#020d4b;color:white;border-radius:24px;padding:10px 18px;font:600 14px Arial;cursor:pointer}
    @media(max-width:600px){.header .header-brand .app-site-logo{width:42px!important;height:42px!important;flex-basis:42px!important}.header .header-brand{gap:7px!important}}
    @media(prefers-reduced-motion:reduce){#appLaunch58{transition:none}}
  `;
  document.head.appendChild(style);
  function link(rel, href, type) {
    let el = document.querySelector(`link[rel="${rel}"]`);
    if (!el) { el = document.createElement('link'); el.rel = rel; document.head.appendChild(el); }
    el.href = href;
    if (type) el.type = type;
  }
  link('manifest', '/manifest.webmanifest?v=' + version);
  link('icon', '/assets/app-icon-192.png?v=' + version, 'image/png');
  link('apple-touch-icon', '/assets/apple-touch-icon.png?v=' + version);
  function brandHeader() {
    document.querySelectorAll('.header .header-brand').forEach(brand => {
      if (brand.querySelector('.app-site-logo')) return;
      brand.querySelector('.brand-ball')?.remove();
      const img = document.createElement('img');
      img.className = 'app-site-logo'; img.src = logo;
      img.alt = 'Cadastro de Atletas'; img.width = 46; img.height = 46;
      brand.prepend(img);
    });
  }
  function launch() {
    const params = new URLSearchParams(location.search);
    const app = params.get('app') === '1' || params.get('beta') === '1' || matchMedia('(display-mode: standalone)').matches || navigator.standalone === true || document.referrer.startsWith('android-app://');
    if (!app) { launchFinished(); return; }
    try {
      const key = 'athleteLaunch58';
      const previous = Number(sessionStorage.getItem(key) || 0);
      if (Date.now() - previous < 30 * 60 * 1000) { launchFinished(); return; }
      sessionStorage.setItem(key, String(Date.now()));
    } catch { /* Opening still works when storage is unavailable. */ }
    const splash = document.createElement('div');
    splash.id = 'appLaunch58'; splash.setAttribute('role', 'status');
    splash.setAttribute('aria-label', 'Abrindo Cadastro de Atletas');
    const img = document.createElement('img');
    img.alt = 'Cadastro de Atletas'; img.src = logo;
    const skip = document.createElement('button'); skip.type = 'button'; skip.textContent = 'Continuar';
    let timer;
    const close = () => { clearTimeout(timer); splash.remove(); launchFinished(); };
    skip.onclick = close;
    splash.append(img, skip); document.body.appendChild(splash);
    img.onload = () => { clearTimeout(timer); timer = setTimeout(close, 1600); };
    img.onerror = close;
    timer = setTimeout(close, 3500);
    if (img.complete && img.naturalWidth) img.onload();
  }
  function boot() {
    brandHeader(); launch();
    new MutationObserver(brandHeader).observe(document.body, {childList:true, subtree:true});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
