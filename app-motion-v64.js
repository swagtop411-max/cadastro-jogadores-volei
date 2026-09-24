(() => {
  // Filter changes happen in-place. Do not intercept links, auth or form submits.
  let previousFilter = '';
  let animation;
  window.addEventListener('bd:feed-filter-change', event => {
    const detail = event.detail || {};
    const key = `${detail.mode}:${detail.kind}`;
    const changed = previousFilter && previousFilter !== key;
    previousFilter = key;
    if (!changed || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const feed = document.getElementById('homeFeed');
    if (!feed?.animate) return;
    animation?.cancel();
    animation = feed.animate([{opacity:.8,transform:'translateY(2px)'},{opacity:1,transform:'translateY(0)'}],{duration:160,easing:'ease-out'});
  });
})();
