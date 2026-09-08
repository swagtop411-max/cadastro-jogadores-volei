import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js";

const CLOUDINARY_CLOUD_NAME = "hmputmfr";
// Compatibilidade temporária para o site até as Cloud Functions de produção serem implantadas.
// O fluxo seguro assinado é sempre tentado primeiro. Remover os presets depois do deploy validado.
const CLOUDINARY_IMAGE_PRESET = "cadastro_atletas_images";
const CLOUDINARY_VIDEO_PRESET = "cadastro_atletas_videos";
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

export const CLOUDINARY_CONFIG = Object.freeze({
  cloudName: CLOUDINARY_CLOUD_NAME,
  imagePreset: CLOUDINARY_IMAGE_PRESET,
  videoPreset: CLOUDINARY_VIDEO_PRESET,
});

function firebaseFunctions() {
  const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
  return getFunctions(app, "southamerica-east1");
}

function signer() {
  if (!signUploadCallable) signUploadCallable = httpsCallable(firebaseFunctions(), "signCloudinaryUpload");
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

function appMode() {
  try {
    return new URLSearchParams(location.search).get("app") === "1"
      || window.matchMedia?.("(display-mode: standalone)")?.matches === true
      || navigator.standalone === true;
  } catch {
    return false;
  }
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
  const result = await signer()({ resourceType, tags, kind });
  const ticket = result?.data || {};
  if (!ticket.signature || !ticket.timestamp || !ticket.apiKey || !ticket.cloudName) {
    throw new Error("O serviço seguro de mídia não retornou uma assinatura válida.");
  }
  return ticket;
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
  if (typeof onProgress === "function") onProgress(10);
  const response = await fetch(endpoint, { method: "POST", body: form, signal });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || "Não foi possível enviar o arquivo com segurança.");
  if (typeof onProgress === "function") onProgress(100);
  return data;
}

async function legacyUnsignedUpload(file, { resourceType, signal, tags, onProgress }) {
  const preset = resourceType === "video" ? CLOUDINARY_VIDEO_PRESET : CLOUDINARY_IMAGE_PRESET;
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", preset);
  if (Array.isArray(tags) && tags.length) form.append("tags", tags.join(","));
  if (typeof onProgress === "function") onProgress(5);
  const response = await fetch(endpoint, { method: "POST", body: form, signal });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || "Não foi possível enviar o arquivo para o Cloudinary.");
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
  let data;
  try {
    data = await signedUpload(file, { resourceType, tags, kind, signal, onProgress });
  } catch (secureError) {
    const code = String(secureError?.code || secureError?.message || "").toLowerCase();
    const backendUnavailable = code.includes("not-found") || code.includes("internal") || code.includes("unavailable") || code.includes("cors") || code.includes("network");
    if (appMode() && !backendUnavailable) throw secureError;
    console.warn("Upload assinado ainda não disponível; usando compatibilidade temporária.", secureError);
    data = await legacyUnsignedUpload(file, { resourceType, signal, tags, onProgress });
  }

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
