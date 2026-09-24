(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const running = new WeakMap();

  async function ensureMobileShell() {
    if (!root.classList.contains('beta-mobile-app')) return;

    try {
      await import('./public-beta-v19.js?v=20260924-68');
    } catch (error) {
      console.warn('Mobile shell bootstrap:', error);
    }

    const mountFallback = () => {
      if (document.getElementById('betaMobileNav') || !document.body) return;

      const page = location.pathname.split('/').pop() || 'index.html';
      const icons = {
        home:'<svg viewBox="0 0 24 24"><path d="M3 10.8 12 3l9 7.8v9.2a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
        search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg>',
        plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
        trophy:'<svg viewBox="0 0 24 24"><path d="M8 4h8v4a4 4 0 0 1-8 0zM12 12v5M8 21h8M10 17h4M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4"/></svg>',
        user:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4.5 21c.8-4 3.2-6 7.5-6s6.7 2 7.5 6"/></svg>'
      };
      const item = (href, icon, label, key, extra='') => {
        const active = page === key || (key === 'index.html' && page === '');
        const profileAttr = key === 'meu-perfil.html' ? ' data-beta-profile-nav' : '';
        return `<a class="${active?'active ':''}${extra}" href="${href}"${profileAttr}>${extra==='publish'?'<span class="beta-publish-circle">'+icon+'</span>':icon}<span>${label}</span></a>`;
      };
      const nav = document.createElement('nav');
      nav.id = 'betaMobileNav';
      nav.className = 'beta-mobile-nav';
      nav.dataset.shellFallback = '1';
      nav.setAttribute('aria-label', 'Navegação principal do app');
      nav.innerHTML =
        item('/index.html?beta=1',icons.home,'Feed','index.html')+
        item('/explorar.html?beta=1',icons.search,'Explorar','explorar.html')+
        item('/comunidade.html?beta=1#publicar',icons.plus,'Publicar','comunidade.html','publish')+
        item('/proximos-campeonatos.html?beta=1',icons.trophy,'Torneios','proximos-campeonatos.html')+
        item('/meu-perfil.html?beta=1',icons.user,'Perfil','meu-perfil.html');
      document.body.appendChild(nav);
    };

    if (!document.getElementById('betaMobileNav')) {
      try {
        await import('./beta-mobile-v21.js?v=20260924-69');
      } catch (error) {
        console.warn('Mobile navigation:', error);
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => setTimeout(mountFallback, 350), {once:true});
    } else {
      setTimeout(mountFallback, 350);
    }
    setTimeout(mountFallback, 1000);
  }

  function animateHost(host) {
    if (!host || reduced.matches) return;
    const previous = running.get(host);
    previous?.cancel?.();
    if (!host.animate) {
      host.classList.remove('app-tab-enter');
      void host.offsetWidth;
      host.classList.add('app-tab-enter');
      setTimeout(() => host.classList.remove('app-tab-enter'), 220);
      return;
    }
    const animation = host.animate(
      [{opacity:.68, transform:'translateY(4px)'}, {opacity:1, transform:'translateY(0)'}],
      {duration:185, easing:'cubic-bezier(.16,.78,.22,1)'}
    );
    running.set(host, animation);
    animation.finished.catch(() => {}).finally(() => running.delete(host));
  }

  function tabHost(target) {
    if (target.matches('.account-tab')) return document.querySelector('.account-card');
    if (target.matches('.pp-tab')) return target.closest('.pp-section') || document.querySelector('.pp-section');
    if (target.matches('.feed-v16-btn')) return document.getElementById('homeFeed');
    if (target.matches('.publisher-v50-target')) return target.closest('.publisher-v50-shell');
    if (target.matches('[role="tab"]')) return target.closest('.account-card,.pp-section,[role="tablist"]')?.parentElement;
    return null;
  }

  document.addEventListener('click', event => {
    const tab = event.target.closest?.('.account-tab,.pp-tab,.feed-v16-btn,.publisher-v50-target,[role="tab"]');
    if (!tab) return;
    const host = tabHost(tab);
    requestAnimationFrame(() => requestAnimationFrame(() => animateHost(host)));
  }, true);

  let previousFilter = '';
  let filterAnimation;
  addEventListener('bd:feed-filter-change', event => {
    const detail = event.detail || {};
    const key = `${detail.mode}:${detail.kind}`;
    const changed = previousFilter && previousFilter !== key;
    previousFilter = key;
    if (!changed || reduced.matches) return;
    const feed = document.getElementById('homeFeed');
    if (!feed?.animate) return;
    filterAnimation?.cancel();
    filterAnimation = feed.animate(
      [{opacity:.7,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],
      {duration:175,easing:'cubic-bezier(.16,.78,.22,1)'}
    );
  });

  function internalNavigation(anchor, event) {
    if (!anchor || event.defaultPrevented || event.button !== 0) return null;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
    if (anchor.hasAttribute('download') || anchor.target === '_blank' || anchor.dataset.noAppTransition !== undefined) return null;
    const raw = anchor.getAttribute('href') || '';
    if (!raw || raw.startsWith('#') || /^(mailto:|tel:|javascript:)/i.test(raw)) return null;
    let url;
    try { url = new URL(anchor.href, location.href); } catch { return null; }
    if (url.origin !== location.origin) return null;
    const sameDocument = url.pathname === location.pathname && url.search === location.search;
    if (sameDocument) return null;
    return url;
  }

  document.addEventListener('click', event => {
    const anchor = event.target.closest?.('a[href]');
    const url = internalNavigation(anchor, event);
    if (!url) return;
    event.preventDefault();
    anchor.classList.add('app-nav-pending');
    root.classList.remove('app-preparing');
    root.classList.add('app-leaving');
    root.setAttribute('aria-busy', 'true');
    try { sessionStorage.setItem('bd_internal_nav_v65', '1'); } catch {}
    setTimeout(() => location.assign(url.href), reduced.matches ? 0 : 105);
  });

  void ensureMobileShell();

  addEventListener('pageshow', () => {
    root.classList.remove('app-leaving');
    document.querySelectorAll('.app-nav-pending').forEach(el => el.classList.remove('app-nav-pending'));
  });
})();
