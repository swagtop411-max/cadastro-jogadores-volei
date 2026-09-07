import fs from "node:fs";

const read=(path)=>fs.readFileSync(path,"utf8");
const media=read("media-utils.js");
const viewer=read("media-viewer.js");
const integration=read("social-v6-followfix.js");
const serviceWorker=read("sw.js");

const checks=[
  [media.includes("export function sourceImageUrl"),"media-utils deve recuperar a imagem fonte"],
  [media.includes("export function inspectImageUrl"),"media-utils deve exportar inspectImageUrl"],
  [media.includes("width:3200"),"visualização HD deve solicitar até 3200 px"],
  [media.includes("Math.min(4096"),"pipeline Cloudinary deve aceitar derivados de alta resolução"],
  [viewer.includes("const MAX_ZOOM=5"),"viewer deve suportar zoom até 5x"],
  [viewer.includes('addEventListener("wheel"'),"viewer deve suportar zoom pelo mouse"],
  [viewer.includes('addEventListener("dblclick"'),"viewer deve suportar duplo clique/toque"],
  [viewer.includes("pointerDistance"),"viewer deve suportar gesto de pinça"],
  [viewer.includes("navigator.share"),"viewer deve oferecer compartilhamento nativo"],
  [viewer.includes('event.key==="Escape"'),"viewer deve ser fechável por teclado"],
  [viewer.includes("preloadAdjacent"),"viewer deve antecipar a próxima mídia"],
  [viewer.includes('role","dialog"'),"viewer deve expor semântica acessível de diálogo"],
  [integration.includes('import("./media-viewer.js?v=20260907-1")'),"shell social deve carregar o viewer V15"],
  [serviceWorker.includes('/\\.(?:css|js|webmanifest)$/i.test(url.pathname)'),"Service Worker deve manter assets JS em network-first"],
];

const failures=checks.filter(([ok])=>!ok).map(([,message])=>message);
if(failures.length){
  console.error("Audit V15 failed:");
  failures.forEach(message=>console.error(`- ${message}`));
  process.exit(1);
}

console.log(`Audit V15 OK: ${checks.length} garantias de mídia verificadas.`);
