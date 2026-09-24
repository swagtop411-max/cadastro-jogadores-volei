// Paint the final app theme before legacy CSS can flash on screen.
(() => {
  const root = document.documentElement;
  const params = new URLSearchParams(location.search);
  const page = location.pathname.split('/').pop() || 'index.html';
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const app = params.get('app') === '1' || standalone || String(document.referrer || '').startsWith('android-app://');
  const requested = params.get('beta') === '1' || params.get('teste') === '1' || page === 'teste-social.html';

  root.classList.add('site-v5', 'site-v8', 'app-preparing');

  let beta = requested || app;
  try {
    if (beta) localStorage.setItem('bd_public_beta_v19', '1');
    beta = beta || localStorage.getItem('bd_public_beta_v19') === '1';
  } catch {}

  const mobile = app || matchMedia('(max-width: 900px)').matches;
  if (beta && mobile) {
    root.classList.add('beta-mobile-app', 'beta-activity-v28');
    root.dataset.betaPage = page.replace('.html', '');
  }

  const appBg = root.classList.contains('beta-mobile-app') ? '#031424' : '#e9eff5';
  const critical = document.createElement('style');
  critical.id = 'appCriticalThemeV65';
  critical.textContent = `
    html{background:${appBg}!important}
    html.beta-mobile-app{color-scheme:dark!important;background:#031424!important}
    html.app-preparing body{opacity:0!important}
    html.app-preparing::after,
    html.app-leaving::after{
      content:"";position:fixed;inset:0;z-index:2147483646;pointer-events:none;
      background:${appBg};opacity:1
    }
    html.app-ready body{opacity:1}
    html.app-ready::after{content:"";position:fixed;inset:0;z-index:2147483646;pointer-events:none;background:${appBg};opacity:0;visibility:hidden}
    html.app-leaving body{opacity:.985!important}
    @media(prefers-reduced-motion:no-preference){
      html.app-ready body{animation:appBootRevealV65 180ms cubic-bezier(.2,.72,.2,1) both}
      html.app-ready::after{transition:opacity 160ms ease-out,visibility 0s linear 160ms}
      html.app-leaving body{transition:opacity 100ms ease-out,transform 100ms ease-out;transform:translateY(1px)}
      @keyframes appBootRevealV65{from{opacity:.82;transform:translateY(2px)}to{opacity:1;transform:none}}
    }
  `;
  document.head.appendChild(critical);

  let theme = document.querySelector('meta[name="theme-color"]');
  if (!theme) {
    theme = document.createElement('meta');
    theme.name = 'theme-color';
    document.head.appendChild(theme);
  }
  theme.content = root.classList.contains('beta-mobile-app') ? '#031424' : '#071827';

  const required = ['siteThemeV5Runtime', 'siteThemeV8Runtime'];
  if (root.classList.contains('beta-mobile-app')) required.push('betaMobileV21Css', 'betaMobilePagesV21Css');

  const started = performance.now();
  let finished = false;
  function ready() {
    if (finished || !document.body) return false;
    const links = required.map(id => document.getElementById(id));
    if (links.some(link => !link)) return false;
    return links.every(link => {
      try { return Boolean(link.sheet); } catch { return true; }
    });
  }
  function finish() {
    if (finished) return;
    finished = true;
    root.classList.remove('app-preparing', 'app-leaving');
    root.classList.add('app-ready');
    root.removeAttribute('aria-busy');
  }
  function check() {
    if (ready() || performance.now() - started > 900) {
      requestAnimationFrame(() => requestAnimationFrame(finish));
      return;
    }
    requestAnimationFrame(check);
  }
  setTimeout(check, 0);
  setTimeout(finish, 1250);
  addEventListener('pageshow', event => {
    if (event.persisted) {
      root.classList.remove('app-preparing', 'app-leaving');
      root.classList.add('app-ready');
    }
  });
})();
