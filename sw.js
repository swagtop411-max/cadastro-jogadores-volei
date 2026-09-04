const CACHE_NAME="bd-atletas-v12-20260904-2";
const CORE=["/","/index.html","/site-theme.css","/site-v8.css","/site-v5.js","/site-v8.js","/media-utils.js","/atletas.html","/comunidade.html","/proximos-campeonatos.html","/conta.html"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE).catch(()=>{})).then(()=>self.skipWaiting()))});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME&&key.startsWith("bd-atletas-")).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
function remember(request,response){if(response&&response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy))}return response}
self.addEventListener("fetch",event=>{
 const request=event.request;if(request.method!=="GET")return;const url=new URL(request.url);if(url.origin!==self.location.origin)return;
 if(request.mode==="navigate"||/\.(?:css|js|webmanifest)$/i.test(url.pathname)){
  event.respondWith(fetch(request).then(response=>remember(request,response)).catch(()=>caches.match(request).then(hit=>hit||(request.mode==="navigate"?caches.match("/index.html"):Response.error()))));return;
 }
 if(/\.(?:png|jpe?g|webp|svg|gif)$/i.test(url.pathname)){
  event.respondWith(caches.match(request).then(cached=>{const network=fetch(request).then(response=>remember(request,response)).catch(()=>cached);return cached||network}));
 }
});
