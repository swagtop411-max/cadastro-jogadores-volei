import {inspectImageUrl,sourceImageUrl} from "./media-utils.js?v=20260909-46";

const ROOT_ID="bdMediaViewerV15";
const STYLE_ID="bdMediaViewerStylesV15";
const OPEN_DELAY=210;
const MAX_ZOOM=5;
const MIN_ZOOM=1;
const SELECTORS=[
  "img[data-media-viewer]",
  ".social-media-frame img",
  ".community-media img",
  ".post-media img",
  ".publication-media img",
  ".saved-post-media img",
  ".profile-post-media img",
  ".pp-post-media img"
].join(",");

let clickTimer=0;
let state={open:false,items:[],index:0,scale:1,x:0,y:0,loading:false,pointers:new Map(),pinchStart:0,pinchScale:1,panStart:null,lastFocused:null};

function installStyles(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement("style");
  style.id=STYLE_ID;
  style.textContent=`
${SELECTORS}{cursor:zoom-in}
.bd-media-viewer{position:fixed;inset:0;z-index:32000;display:none;background:rgba(2,10,18,.96);color:#fff;overscroll-behavior:contain;touch-action:none;-webkit-user-select:none;user-select:none}.bd-media-viewer.open{display:grid;grid-template-rows:auto 1fr auto}.bdmv-toolbar{display:flex;align-items:center;gap:8px;padding:max(10px,env(safe-area-inset-top)) 12px 10px;background:linear-gradient(180deg,rgba(0,0,0,.58),transparent);z-index:3}.bdmv-toolbar .bdmv-spacer{flex:1}.bdmv-button{width:44px;height:44px;border:1px solid rgba(255,255,255,.24);border-radius:999px;background:rgba(20,31,41,.62);color:#fff;display:grid;place-items:center;font:800 18px/1 system-ui,sans-serif;cursor:pointer;backdrop-filter:blur(14px)}.bdmv-button:hover{background:rgba(37,56,71,.78)}.bdmv-button:focus-visible{outline:3px solid #6bdcff;outline-offset:2px}.bdmv-quality{display:flex;align-items:center;gap:7px;min-width:0;padding:7px 10px;border-radius:999px;background:rgba(18,31,42,.58);border:1px solid rgba(255,255,255,.16);font:800 11px/1.2 system-ui,sans-serif}.bdmv-quality b{color:#76e7ff}.bdmv-quality span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:210px}.bdmv-stage{position:relative;min-height:0;overflow:hidden;display:grid;place-items:center}.bdmv-image-wrap{position:absolute;inset:0;display:grid;place-items:center;transform-origin:center center;will-change:transform}.bdmv-image{display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;pointer-events:none;image-rendering:auto}.bdmv-image.loading{filter:blur(1.5px);opacity:.86}.bdmv-loader{position:absolute;left:50%;top:50%;width:42px;height:42px;margin:-21px 0 0 -21px;border-radius:50%;border:3px solid rgba(255,255,255,.24);border-top-color:#fff;animation:bdmvspin .7s linear infinite;z-index:2}.bdmv-loader[hidden]{display:none}.bdmv-nav{position:absolute;top:50%;translate:0 -50%;z-index:3}.bdmv-prev{left:12px}.bdmv-next{right:12px}.bdmv-footer{display:flex;align-items:center;justify-content:center;gap:10px;padding:10px 12px max(12px,env(safe-area-inset-bottom));background:linear-gradient(0deg,rgba(0,0,0,.66),transparent);font:700 12px/1.2 system-ui,sans-serif;z-index:3}.bdmv-footer .bdmv-help{opacity:.72;text-align:center}.bdmv-counter{padding:7px 10px;border-radius:999px;background:rgba(20,31,41,.62);border:1px solid rgba(255,255,255,.16)}.bdmv-zoom{min-width:54px;text-align:center;padding:7px 10px;border-radius:999px;background:rgba(20,31,41,.62);border:1px solid rgba(255,255,255,.16)}.bdmv-toast{position:absolute;left:50%;bottom:82px;translate:-50% 0;background:rgba(15,28,38,.9);border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:9px 13px;font:800 11px system-ui,sans-serif;opacity:0;transform:translateY(8px);transition:.2s;pointer-events:none;z-index:5}.bdmv-toast.show{opacity:1;transform:translateY(0)}@keyframes bdmvspin{to{rotate:360deg}}@media(max-width:640px){.bdmv-toolbar{gap:6px}.bdmv-quality span{max-width:125px}.bdmv-nav{display:none}.bdmv-footer .bdmv-help{display:none}.bdmv-button{width:42px;height:42px}}@media(prefers-reduced-motion:reduce){.bdmv-loader{animation:none}.bdmv-toast{transition:none}}
`;
  document.head.appendChild(style);
}

function build(){
  let root=document.getElementById(ROOT_ID);
  if(root)return root;
  root=document.createElement("div");
  root.id=ROOT_ID;
  root.className="bd-media-viewer";
  root.setAttribute("role","dialog");
  root.setAttribute("aria-modal","true");
  root.setAttribute("aria-label","Visualizador de imagem em alta qualidade");
  root.innerHTML=`
    <div class="bdmv-toolbar">
      <button class="bdmv-button" type="button" data-bdmv-close aria-label="Fechar">×</button>
      <div class="bdmv-quality" aria-live="polite"><b>HD</b><span data-bdmv-quality>Preparando imagem...</span></div>
      <div class="bdmv-spacer"></div>
      <button class="bdmv-button" type="button" data-bdmv-reset aria-label="Restaurar zoom">1:1</button>
      <button class="bdmv-button" type="button" data-bdmv-share aria-label="Compartilhar imagem">↗</button>
    </div>
    <div class="bdmv-stage" data-bdmv-stage>
      <div class="bdmv-image-wrap" data-bdmv-wrap><img class="bdmv-image" data-bdmv-image alt=""></div>
      <div class="bdmv-loader" data-bdmv-loader hidden></div>
      <button class="bdmv-button bdmv-nav bdmv-prev" type="button" data-bdmv-prev aria-label="Imagem anterior">‹</button>
      <button class="bdmv-button bdmv-nav bdmv-next" type="button" data-bdmv-next aria-label="Próxima imagem">›</button>
      <div class="bdmv-toast" data-bdmv-toast role="status"></div>
    </div>
    <div class="bdmv-footer">
      <span class="bdmv-counter" data-bdmv-counter>1 / 1</span>
      <span class="bdmv-zoom" data-bdmv-zoom>100%</span>
      <span class="bdmv-help">Pinça, roda do mouse ou duplo toque para ampliar. Arraste para explorar.</span>
    </div>`;
  document.body.appendChild(root);
  bind(root);
  return root;
}

function normalizeUrl(value){
  const raw=String(value||"").trim();
  if(!raw)return"";
  const source=sourceImageUrl(raw);
  return inspectImageUrl(source||raw);
}

function itemFrom(img){
  const low=img.currentSrc||img.src||"";
  const explicit=img.dataset.fullSrc||img.dataset.mediaFull||img.dataset.originalSrc||"";
  return {
    low,
    full:normalizeUrl(explicit||low),
    alt:img.alt||"Imagem da publicação",
    source:img
  };
}

function galleryFor(img){
  const scope=img.closest("[data-media-gallery],article[data-post-id],.social-post,.community-post,.publication,.post-card,.saved-card,.profile-post")||img.parentElement;
  const nodes=scope?[...scope.querySelectorAll(SELECTORS)]:[img];
  const filtered=nodes.filter(node=>node instanceof HTMLImageElement&&node.naturalWidth!==1&&!node.classList.contains("feed-avatar")&&!node.closest("a[href*='perfil-social']"));
  const items=(filtered.length?filtered:[img]).map(itemFrom).filter(item=>item.full||item.low);
  const seen=new Set();
  return items.filter(item=>{const key=item.full||item.low;if(seen.has(key))return false;seen.add(key);return true});
}

function clamp(value,min,max){return Math.min(max,Math.max(min,value))}
function root(){return document.getElementById(ROOT_ID)}
function stage(){return root()?.querySelector("[data-bdmv-stage]")}
function wrap(){return root()?.querySelector("[data-bdmv-wrap]")}
function image(){return root()?.querySelector("[data-bdmv-image]")}

function bounds(){
  const box=stage()?.getBoundingClientRect();
  const im=image();
  if(!box||!im)return{x:0,y:0};
  const baseW=Math.min(im.naturalWidth||box.width,box.width);
  const baseH=Math.min(im.naturalHeight||box.height,box.height);
  return{x:Math.max(0,(baseW*state.scale-box.width)/2),y:Math.max(0,(baseH*state.scale-box.height)/2)};
}

function applyTransform(){
  const b=bounds();
  state.x=clamp(state.x,-b.x,b.x);
  state.y=clamp(state.y,-b.y,b.y);
  const target=wrap();
  if(target)target.style.transform=`translate3d(${state.x}px,${state.y}px,0) scale(${state.scale})`;
  const z=root()?.querySelector("[data-bdmv-zoom]");
  if(z)z.textContent=`${Math.round(state.scale*100)}%`;
}

function resetZoom(){state.scale=1;state.x=0;state.y=0;applyTransform()}
function setZoom(next,centerX=0,centerY=0){
  const prev=state.scale;
  state.scale=clamp(next,MIN_ZOOM,MAX_ZOOM);
  if(prev!==state.scale&&prev>0&&state.scale>1){const ratio=state.scale/prev;state.x=(state.x-centerX)*ratio+centerX;state.y=(state.y-centerY)*ratio+centerY}
  if(state.scale===1){state.x=0;state.y=0}
  applyTransform();
}

function toast(text){
  const el=root()?.querySelector("[data-bdmv-toast]");
  if(!el)return;
  el.textContent=text;el.classList.add("show");clearTimeout(el._timer);el._timer=setTimeout(()=>el.classList.remove("show"),1500);
}

function updateControls(){
  const r=root();if(!r)return;
  const total=state.items.length;
  r.querySelector("[data-bdmv-counter]").textContent=`${state.index+1} / ${Math.max(1,total)}`;
  r.querySelector("[data-bdmv-prev]").hidden=total<2;
  r.querySelector("[data-bdmv-next]").hidden=total<2;
}

function preloadAdjacent(){
  if(state.items.length<2)return;
  for(const offset of [-1,1]){const item=state.items[(state.index+offset+state.items.length)%state.items.length];if(item?.full){const preload=new Image();preload.decoding="async";preload.src=item.full}}
}

async function renderCurrent(){
  const r=root(),im=image();if(!r||!im||!state.items.length)return;
  const item=state.items[state.index];
  resetZoom();
  updateControls();
  const loader=r.querySelector("[data-bdmv-loader]");
  const quality=r.querySelector("[data-bdmv-quality]");
  state.loading=true;loader.hidden=false;im.classList.add("loading");
  im.alt=item.alt||"Imagem ampliada";
  if(item.low)im.src=item.low;
  const hd=new Image();hd.decoding="async";
  hd.onload=()=>{
    if(!state.open||state.items[state.index]!==item)return;
    im.src=item.full||item.low;im.classList.remove("loading");loader.hidden=true;state.loading=false;
    const w=hd.naturalWidth||im.naturalWidth||0,h=hd.naturalHeight||im.naturalHeight||0;
    quality.textContent=w&&h?`${w} × ${h}px • alta qualidade`:"Alta qualidade carregada";
    preloadAdjacent();
  };
  hd.onerror=()=>{
    if(!state.open||state.items[state.index]!==item)return;
    im.classList.remove("loading");loader.hidden=true;state.loading=false;quality.textContent="Qualidade disponível";
  };
  hd.src=item.full||item.low;
}

function openViewer(img){
  installStyles();const r=build();
  state.items=galleryFor(img);if(!state.items.length)return;
  const selected=state.items.findIndex(item=>item.source===img);state.index=selected>=0?selected:0;
  state.open=true;state.lastFocused=document.activeElement instanceof HTMLElement?document.activeElement:null;
  document.documentElement.style.overflow="hidden";document.body.style.overflow="hidden";
  r.classList.add("open");
  r.querySelector("[data-bdmv-close]")?.focus();
  renderCurrent();
}

function closeViewer(){
  const r=root();if(!r||!state.open)return;
  state.open=false;state.pointers.clear();state.panStart=null;resetZoom();r.classList.remove("open");
  document.documentElement.style.overflow="";document.body.style.overflow="";
  state.lastFocused?.focus?.();
}

function move(step){
  if(state.items.length<2)return;
  state.index=(state.index+step+state.items.length)%state.items.length;
  renderCurrent();
}

async function shareCurrent(){
  const item=state.items[state.index];if(!item)return;
  const url=item.full||item.low;
  try{
    if(navigator.share){await navigator.share({title:"Imagem da rede esportiva",url});return}
    if(navigator.clipboard){await navigator.clipboard.writeText(url);toast("Link da imagem copiado");return}
    toast("Compartilhamento indisponível neste navegador");
  }catch(error){if(error?.name!=="AbortError")toast("Não foi possível compartilhar")}
}

function pointerDistance(a,b){return Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)}
function pointerCenter(a,b){return{x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2}}

function bind(r){
  if(r.dataset.bound==="1")return;r.dataset.bound="1";
  r.querySelector("[data-bdmv-close]").addEventListener("click",closeViewer);
  r.querySelector("[data-bdmv-prev]").addEventListener("click",()=>move(-1));
  r.querySelector("[data-bdmv-next]").addEventListener("click",()=>move(1));
  r.querySelector("[data-bdmv-reset]").addEventListener("click",resetZoom);
  r.querySelector("[data-bdmv-share]").addEventListener("click",shareCurrent);
  const st=r.querySelector("[data-bdmv-stage]");
  st.addEventListener("dblclick",event=>{event.preventDefault();const rect=st.getBoundingClientRect();const cx=event.clientX-rect.left-rect.width/2,cy=event.clientY-rect.top-rect.height/2;setZoom(state.scale>1?1:2.6,cx,cy)});
  st.addEventListener("wheel",event=>{event.preventDefault();const rect=st.getBoundingClientRect();const cx=event.clientX-rect.left-rect.width/2,cy=event.clientY-rect.top-rect.height/2;setZoom(state.scale*(event.deltaY<0?1.14:.88),cx,cy)},{passive:false});
  st.addEventListener("pointerdown",event=>{
    st.setPointerCapture?.(event.pointerId);state.pointers.set(event.pointerId,event);
    if(state.pointers.size===1)state.panStart={clientX:event.clientX,clientY:event.clientY,x:state.x,y:state.y};
    if(state.pointers.size===2){const pts=[...state.pointers.values()];state.pinchStart=pointerDistance(pts[0],pts[1]);state.pinchScale=state.scale;state.panStart=null}
  });
  st.addEventListener("pointermove",event=>{
    if(!state.pointers.has(event.pointerId))return;state.pointers.set(event.pointerId,event);
    if(state.pointers.size===2){const pts=[...state.pointers.values()],distance=pointerDistance(pts[0],pts[1]);if(state.pinchStart>0){const center=pointerCenter(pts[0],pts[1]),rect=st.getBoundingClientRect();setZoom(state.pinchScale*(distance/state.pinchStart),center.x-rect.left-rect.width/2,center.y-rect.top-rect.height/2)}return}
    if(state.pointers.size===1&&state.scale>1&&state.panStart){state.x=state.panStart.x+(event.clientX-state.panStart.clientX);state.y=state.panStart.y+(event.clientY-state.panStart.clientY);applyTransform()}
  });
  const release=event=>{
    const start=state.panStart;state.pointers.delete(event.pointerId);
    if(state.pointers.size===0&&start&&state.scale===1){const dx=event.clientX-start.clientX;if(Math.abs(dx)>70)move(dx<0?1:-1)}
    if(state.pointers.size<2){state.pinchStart=0;state.pinchScale=state.scale}
    if(state.pointers.size===0)state.panStart=null;
  };
  st.addEventListener("pointerup",release);st.addEventListener("pointercancel",release);
}

function eligible(img){
  if(!(img instanceof HTMLImageElement))return false;
  if(img.closest(`#${ROOT_ID}`))return false;
  if(img.classList.contains("feed-avatar"))return false;
  if(img.closest("a[href*='perfil-social']")&&img.width<160)return false;
  return !!img.matches(SELECTORS);
}

function installDelegation(){
  document.addEventListener("click",event=>{
    if(state.open)return;
    const img=event.target instanceof Element?event.target.closest(SELECTORS):null;
    if(!eligible(img))return;
    clearTimeout(clickTimer);
    clickTimer=setTimeout(()=>openViewer(img),OPEN_DELAY);
  });
  document.addEventListener("dblclick",event=>{
    const img=event.target instanceof Element?event.target.closest(SELECTORS):null;
    if(!eligible(img))return;
    clearTimeout(clickTimer);
  },true);
  document.addEventListener("keydown",event=>{
    if(!state.open)return;
    if(event.key==="Escape")closeViewer();
    else if(event.key==="ArrowLeft")move(-1);
    else if(event.key==="ArrowRight")move(1);
    else if(event.key==="+")setZoom(state.scale*1.25);
    else if(event.key==="-")setZoom(state.scale*.8);
    else if(event.key==="0")resetZoom();
  });
}

installStyles();build();installDelegation();
window.BDMediaViewer={open:openViewer,close:closeViewer};
