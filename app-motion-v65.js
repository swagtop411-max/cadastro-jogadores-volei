(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const running = new WeakMap();

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

  addEventListener('pageshow', () => {
    root.classList.remove('app-leaving');
    document.querySelectorAll('.app-nav-pending').forEach(el => el.classList.remove('app-nav-pending'));
  });
})();
