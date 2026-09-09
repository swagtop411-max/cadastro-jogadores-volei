import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js";

const CLOUDINARY_CLOUD_NAME = "hmputmfr";
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",
  authDomain: "jogadores-de-volei.firebaseapp.com",
  projectId: "jogadores-de-volei",
  storageBucket: "jogadores-de-volei.firebasestorage.app",
  messagingSenderId: "48728914064",
  appId: "1:48728914064:web:1dd7aeb705319886f74015",
};

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
let signUploadCallable = null;

// Mantém a forma antiga do objeto para módulos legados, mas sem qualquer preset público.
export const CLOUDINARY_CONFIG = Object.freeze({
  cloudName: CLOUDINARY_CLOUD_NAME,
  imagePreset: null,
  videoPreset: null,
});

function firebaseFunctions() {
  const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
  return getFunctions(app, "southamerica-east1");
}

function signer() {
  if (!signUploadCallable) signUploadCallable = httpsCallable(firebaseFunctions(), "signCloudinaryUpload", { timeout: 30000 });
  return signUploadCallable;
}

function inferKind({ tags = [], allowImage = true, allowVideo = false, kind = "" } = {}) {
  const explicit = String(kind || "").trim().toLowerCase();
  if (explicit) return explicit;
  const normalized = Array.isArray(tags) ? tags.map(value => String(value || "").toLowerCase()) : [];
  if (normalized.some(value => value.includes("story"))) return "story";
  if (normalized.some(value => value.includes("avatar"))) return "avatar";
  if (normalized.some(value => value.includes("capa") || value.includes("cover"))) return "cover";
  if (normalized.some(value => value.includes("direct") || value.includes("mensagem"))) return "direct";
  if (normalized.some(value => value.includes("carrossel"))) return "carousel";
  if (allowVideo && !allowImage) return "video";
  return "social";
}

/*
 * Ponte de compatibilidade do compositor do perfil.
 * Mantém o File disponível depois que a UI monta a prévia.
 */
function installProfileMediaInputBridge() {
  if (typeof document === "undefined" || document.documentElement.dataset.cloudinaryMediaBridge === "1") return;
  document.documentElement.dataset.cloudinaryMediaBridge = "1";

  document.addEventListener("change", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.id !== "cameraInput" && input.id !== "galleryInput") return;

    const file = input.files?.[0];
    if (!file) return;
    const otherId = input.id === "cameraInput" ? "galleryInput" : "cameraInput";

    setTimeout(() => {
      try {
        const transfer = new DataTransfer();
        transfer.items.add(file);
        input.files = transfer.files;
        const other = document.getElementById(otherId);
        if (other instanceof HTMLInputElement) other.value = "";
      } catch (error) {
        console.warn("Não foi possível preservar a mídia selecionada:", error);
      }
    }, 0);
  }, true);

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("#changeMediaBtn,#closeMedia");
    if (!button) return;
    setTimeout(() => {
      const camera = document.getElementById("cameraInput");
      const gallery = document.getElementById("galleryInput");
      if (camera instanceof HTMLInputElement) camera.value = "";
      if (gallery instanceof HTMLInputElement) gallery.value = "";
    }, 0);
  }, true);
}

installProfileMediaInputBridge();

function validateFile(file, { maxBytes, allowImage = true, allowVideo = false } = {}) {
  if (!file) throw new Error("Nenhum arquivo selecionado.");
  if (maxBytes && file.size > maxBytes) throw new Error("Arquivo acima do limite permitido.");

  const isImage = IMAGE_TYPES.has(file.type);
  const isVideo = VIDEO_TYPES.has(file.type);
  if ((isImage && !allowImage) || (isVideo && !allowVideo) || (!isImage && !isVideo)) {
    if (allowImage && allowVideo) throw new Error("Selecione uma imagem JPG, PNG, WEBP ou vídeo MP4, WEBM ou MOV.");
    if (allowVideo) throw new Error("Selecione um vídeo MP4, WEBM ou MOV.");
    throw new Error("Selecione uma imagem JPG, PNG ou WEBP.");
  }
  return { isImage, isVideo };
}

async function requestSignedTicket({ resourceType, tags, kind }) {
  try {
    const result = await signer()({ resourceType, tags, kind });
    const ticket = result?.data || {};
    if (!ticket.signature || !ticket.timestamp || !ticket.apiKey || !ticket.cloudName || !ticket.folder) {
      throw new Error("O serviço seguro de mídia não retornou uma assinatura válida.");
    }
    if (ticket.expiresAt && Math.floor(Date.now() / 1000) > Number(ticket.expiresAt)) {
      throw new Error("A autorização de envio expirou. Tente publicar novamente.");
    }
    return ticket;
  } catch (error) {
    const code = String(error?.code || "").toLowerCase();
    if (code.includes("unauthenticated")) throw new Error("Entre na sua conta novamente antes de enviar a mídia.");
    if (code.includes("resource-exhausted")) throw new Error("Muitos envios em pouco tempo. Aguarde alguns instantes e tente novamente.");
    if (code.includes("failed-precondition")) throw new Error("O serviço seguro de mídia ainda não está configurado corretamente.");
    throw new Error("Não foi possível autorizar o envio seguro da mídia. Verifique sua conexão e tente novamente.");
  }
}

async function signedUpload(file, { resourceType, tags, kind, signal, onProgress }) {
  const ticket = await requestSignedTicket({ resourceType, tags, kind });
  if (ticket.maxBytes && file.size > Number(ticket.maxBytes)) throw new Error("Arquivo acima do limite permitido para este tipo de publicação.");
  const endpoint = `https://api.cloudinary.com/v1_1/${ticket.cloudName}/${ticket.resourceType || resourceType}/upload`;
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", ticket.apiKey);
  form.append("timestamp", String(ticket.timestamp));
  form.append("signature", ticket.signature);
  form.append("folder", ticket.folder);
  form.append("tags", ticket.tags || "cadastro-de-atletas,signed");
  form.append("overwrite", "false");
  form.append("unique_filename", "true");
  form.append("use_filename", "false");
  if (ticket.allowedFormats) form.append("allowed_formats", Array.isArray(ticket.allowedFormats) ? ticket.allowedFormats.join(",") : String(ticket.allowedFormats));
  if (typeof onProgress === "function") onProgress(10);
  const response = await fetch(endpoint, { method: "POST", body: form, signal });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || "Não foi possível enviar o arquivo com segurança.");
  if (!data?.secure_url || !data?.public_id) throw new Error("O Cloudinary não confirmou o arquivo enviado.");
  if (typeof onProgress === "function") onProgress(100);
  return data;
}

export async function uploadCloudinary(file, options = {}) {
  const {
    maxBytes,
    allowImage = true,
    allowVideo = false,
    signal,
    onProgress,
    tags = ["cadastro-de-atletas"],
  } = options;

  const { isVideo } = validateFile(file, { maxBytes, allowImage, allowVideo });
  const resourceType = isVideo ? "video" : "image";
  const kind = inferKind(options);
  const data = await signedUpload(file, { resourceType, tags, kind, signal, onProgress });

  return {
    url: data.secure_url || "",
    path: data.public_id || "",
    publicId: data.public_id || "",
    resourceType: data.resource_type || resourceType,
    mime: file.type,
    size: Number(data.bytes || file.size || 0),
    width: Number(data.width || 0),
    height: Number(data.height || 0),
    duration: Number(data.duration || 0),
    format: data.format || "",
    armazenamento: "cloudinary",
  };
}

export function isCloudinaryUrl(value) {
  return /^https:\/\/res\.cloudinary\.com\//i.test(String(value || ""));
}

export function isCloudinaryPublicId(value) {
  const text = String(value || "").trim();
  return Boolean(text) && !/^https?:\/\//i.test(text) && !text.startsWith("usuarios/");
}
