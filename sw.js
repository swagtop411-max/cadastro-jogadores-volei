const CACHE_NAME="bd-atletas-v41-20260908-1";
const CORE=["/","/index.html","/site-theme.css","/site-v8.css","/site-v5.js","/site-v8.js","/home-social.js","/feed-experience-v16.js","/media-utils.js","/media-viewer.js","/profile-media-v25.js","/profile-publish-compat-v35.js","/owner-publish-v35.js","/avatar-story-v36.js","/profile-highlights-v37.js","/admin-shortcut-v34.js","/ugc-safety-v41.js","/explorar-v26.css","/activity-center-v27.css","/activity-center-v27.js","/activity-deeplink-v27.js","/public-beta-v19.js","/beta-mobile-v21.js","/beta-mobile-v21.css","/beta-mobile-pages-v21.css","/beta-mobile-activity-v28.js","/beta-mobile-activity-v28.css","/beta-account-v23.js","/beta-account-v23.css","/manifest.webmanifest","/teste-social.html","/atletas.html","/explorar.html","/explorar.js","/atividade.html","/comunidade.html","/proximos-campeonatos.html","/perfil-social.html","/meu-perfil.html","/conta.html","/politica-privacidade.html","/termos-de-uso.html","/politica-cookies.html","/exclusao-conta.html"];
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