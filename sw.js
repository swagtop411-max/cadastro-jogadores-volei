const CACHE_NAME="bd-atletas-v79-20260924-79";
const CORE=["/theme-boot-v65.js?v=20260924-79","/app-motion-v65.css?v=20260924-79","/app-motion-v65.js?v=20260924-79","/assets/app-splash-portrait-v61.webp","/firebase-app-check-init-v60.js","/app-branding-v58.js?v=20260916-58","/assets/app-logo.webp?v=20260916-58","/assets/app-icon-maskable-512.png?v=20260916-58","/assets/apple-touch-icon.png?v=20260916-58","/","/index.html","/site-theme.css","/site-v8.css","/site-v5.js?v=20260924-79","/site-v8.js","/home-social.js","/feed-experience-v16.js","/media-utils.js?v=20260909-46","/media-viewer.js","/profile-media-v25.js","/profile-publish-compat-v35.js","/owner-publish-v35.js","/avatar-story-v36.js","/profile-story-access-v45.js?v=20260909-46","/reivindicacao-v45.js","/firebase-app-check-v11.js?v=20260915-49","/notification-router-v49.js?v=20260916-54","/admin-message-v49.js?v=20260915-49","/admin-shortcut-v34.js?v=20260909-47","/ugc-safety-v41.js?v=20260909-47","/age-gate-v47.js?v=20260909-47","/terms-consent-v47.js?v=20260909-47","/cloudinary-upload.js?v=20260909-46","/auth-gate-v53.js?v=20260924-82","/profile-required-v55.js?v=20260916-55","/explorar-v26.css","/activity-center-v27.css","/activity-center-v27.js?v=20260916-54","/activity-deeplink-v27.js","/public-beta-v19.js","/beta-mobile-v21.js?v=20260924-79","/beta-mobile-v21.css?v=20260924-79","/beta-mobile-pages-v21.css?v=20260924-79","/beta-mobile-activity-v28.js","/beta-mobile-activity-v28.css","/beta-account-v23.js","/beta-account-v23.css","/manifest.webmanifest",
  "/assets/app-icon-192.png?v=20260916-58",
  "/assets/app-icon-512.png?v=20260916-58","/atletas.html","/explorar.html","/explorar.js","/atividade.html","/comunidade.html","/proximos-campeonatos.html","/perfil.html","/perfil-social.html","/meu-perfil.html","/conta.html","/politica-privacidade.html","/termos-de-uso.html","/politica-cookies.html","/exclusao-conta.html"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>Promise.allSettled(CORE.map(url=>cache.add(url)))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(key=>key!==CACHE_NAME&&key.startsWith("bd-atletas-")).map(key=>caches.delete(key)));await self.clients.claim();const clients=await self.clients.matchAll({type:"window",includeUncontrolled:true});for(const client of clients){try{const url=new URL(client.url);if(url.origin!==self.location.origin)continue;if(url.searchParams.get("build")!=="79"){url.searchParams.set("build","79");await client.navigate(url.href)}}catch{}}})())});
function remember(request,response){if(response&&response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy))}return response}
self.addEventListener("fetch",event=>{
 const request=event.request;if(request.method!=="GET")return;const url=new URL(request.url);if(url.origin!==self.location.origin)return;
 if(request.mode==="navigate"){
  if(url.searchParams.get("build")!=="79"){url.searchParams.set("build","79");event.respondWith(Response.redirect(url.href,302));return}
  const fresh=new Request(request,{cache:"no-store"});
  event.respondWith(fetch(fresh).then(response=>remember(request,response)).catch(()=>caches.match(request).then(hit=>hit||caches.match("/index.html"))));return;
 }
 if(/\.(?:css|js|webmanifest)$/i.test(url.pathname)){
  const fresh=new Request(request,{cache:"no-store"});
  event.respondWith(fetch(fresh).then(response=>remember(request,response)).catch(()=>caches.match(request).then(hit=>hit||Response.error())));return;
 }
 if(/\.(?:png|jpe?g|webp|svg|gif)$/i.test(url.pathname)){
  event.respondWith(caches.match(request).then(cached=>{const network=fetch(request).then(response=>remember(request,response)).catch(()=>cached);return cached||network}));
 }
});