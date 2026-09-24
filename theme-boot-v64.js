// Runs in the head, before the first paint and independently of Firebase.
(() => {
  const root = document.documentElement;
  root.classList.add('site-v5', 'site-v8');
  const params = new URLSearchParams(location.search);
  const page = location.pathname.split('/').pop() || 'index.html';
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const app = params.get('app') === '1' || standalone || document.referrer.startsWith('android-app://');
  const requested = params.get('beta') === '1' || params.get('teste') === '1' || page === 'teste-social.html';
  let saved = false;
  try {
    if (requested || app) localStorage.setItem('bd_public_beta_v19', '1');
    saved = localStorage.getItem('bd_public_beta_v19') === '1';
  } catch { /* Storage restrictions must not block the initial theme. */ }
  if ((saved || requested || app) && (app || matchMedia('(max-width: 900px)').matches)) {
    root.classList.add('beta-mobile-app', 'beta-activity-v28');
    root.dataset.betaPage = page.replace('.html', '');
  }
  let theme = document.querySelector('meta[name="theme-color"]');
  if (!theme) { theme = document.createElement('meta'); theme.name = 'theme-color'; document.head.appendChild(theme); }
  theme.content = root.classList.contains('beta-mobile-app') ? '#031424' : '#071827';
})();
