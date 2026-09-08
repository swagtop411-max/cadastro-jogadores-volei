import { getApp } from "@react-native-firebase/app";
import { getFunctions, httpsCallable } from "@react-native-firebase/functions";
import { deleteObject, getStorage, ref } from "@react-native-firebase/storage";

export type UploadKind = "image" | "video";
export type MediaPurpose = "posts" | "stories" | "profiles" | "teams" | "messages";

export type LocalMediaInput = {
  uid: string;
  uri: string;
  kind: UploadKind;
  mimeType?: string | null;
  fileSize?: number | null;
  fileName?: string | null;
};

export type UploadedMedia = {
  url: string;
  path: string;
  mime: string;
  size: number;
  kind: UploadKind;
  provider: "cloudinary" | "firebase-storage";
};

type UploadSignature = {
  cloudName: string;
  apiKey: string;
  folder: string;
  tags: string;
  timestamp: string;
  format?: string;
  signature: string;
  resourceType: "image" | "video";
};

const REGION = "southamerica-east1";
const LEGACY_STORAGE_BUCKET = "jogadores-de-volei.firebasestorage.app";
const IMAGE_MIMES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"]);
const VIDEO_MIMES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const IMAGE_MAX = 10 * 1024 * 1024;
const VIDEO_MAX = 45 * 1024 * 1024;
const PROFILE_IMAGE_MAX = 5 * 1024 * 1024;

function normalizeMime(kind: UploadKind, mimeType?: string | null): string {
  const mime = String(mimeType || "").trim().toLowerCase();
  if (kind === "image") {
    if (!mime) return "image/jpeg";
    if (!IMAGE_MIMES.has(mime)) throw new Error("Use uma imagem JPG, PNG, WEBP, HEIC ou HEIF.");
    return mime;
  }
  if (!mime) return "video/mp4";
  if (!VIDEO_MIMES.has(mime)) throw new Error("Use um vídeo MP4, WEBM ou MOV.");
  return mime;
}

function extensionFromMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/heic") return "heic";
  if (mime === "image/heif") return "heif";
  if (mime === "video/webm") return "webm";
  if (mime === "video/quicktime") return "mov";
  if (mime.startsWith("video/")) return "mp4";
  return "jpg";
}

function validateSize(kind: UploadKind, size?: number | null, maxOverride?: number): number {
  const normalized = Number(size || 0);
  const max = maxOverride ?? (kind === "image" ? IMAGE_MAX : VIDEO_MAX);
  if (normalized < 0) throw new Error("O tamanho do arquivo é inválido.");
  if (normalized > max) {
    const mb = Math.round(max / 1024 / 1024);
    throw new Error(`O arquivo é muito grande. O limite é ${mb} MB.`);
  }
  return normalized;
}

function mediaUri(uri: string): string {
  const value = String(uri || "").trim();
  if (!value) throw new Error("Não foi possível localizar o arquivo selecionado.");
  return value;
}

function uniqueName(ext: string): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
}

function appendLocalFile(form: FormData, input: LocalMediaInput, mime: string, ext: string) {
  form.append("file", {
    uri: mediaUri(input.uri),
    name: String(input.fileName || uniqueName(ext)),
    type: mime,
  } as unknown as Blob);
}

async function parseResponse(response: Response): Promise<Record<string, unknown>> {
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { raw };
  }
}

function responseError(data: Record<string, unknown>, status: number): Error {
  const nested = data.error && typeof data.error === "object" ? data.error as Record<string, unknown> : null;
  const message = String(nested?.message || data.message || "").trim();
  return new Error(message ? `Falha no envio: ${message}` : `Não foi possível enviar a mídia (HTTP ${status}).`);
}

async function requestSignature(kind: UploadKind, purpose: MediaPurpose, sourceMime: string): Promise<UploadSignature> {
  const functions = getFunctions(getApp(), REGION);
  const callable = httpsCallable(functions, "createMediaUploadSignature");
  const result = await callable({ kind, purpose, sourceMime });
  const data = result.data as Partial<UploadSignature>;
  if (!data.cloudName || !data.apiKey || !data.signature || !data.timestamp || !data.folder || !data.resourceType) {
    throw new Error("O servidor não conseguiu autorizar o envio da mídia.");
  }
  return data as UploadSignature;
}

function buildForm(input: LocalMediaInput, mime: string, ext: string, signed: UploadSignature) {
  const form = new FormData();
  appendLocalFile(form, input, mime, ext);
  form.append("api_key", signed.apiKey);
  form.append("timestamp", signed.timestamp);
  form.append("folder", signed.folder);
  form.append("tags", signed.tags);
  if (signed.format) form.append("format", signed.format);
  form.append("signature", signed.signature);
  return form;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function responseMime(kind: UploadKind, format: unknown, fallback: string) {
  const normalized = String(format || "").trim().toLowerCase();
  if (!normalized) return fallback;
  if (kind === "image" && (normalized === "jpg" || normalized === "jpeg")) return "image/jpeg";
  if (kind === "video" && normalized === "mov") return "video/quicktime";
  return `${kind}/${normalized}`;
}

async function uploadCloudinary(
  input: LocalMediaInput,
  purpose: MediaPurpose,
  maxOverride?: number,
): Promise<UploadedMedia> {
  const mime = normalizeMime(input.kind, input.mimeType);
  const size = validateSize(input.kind, input.fileSize, maxOverride);
  const ext = extensionFromMime(mime);
  const signed = await requestSignature(input.kind, purpose, mime);
  const endpoint = `https://api.cloudinary.com/v1_1/${signed.cloudName}/${signed.resourceType}/upload`;
  const timeout = input.kind === "video" ? 180_000 : 75_000;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetchWithTimeout(endpoint, {
        method: "POST",
        body: buildForm(input, mime, ext, signed),
      }, timeout);
      const data = await parseResponse(response);
      if (!response.ok) throw responseError(data, response.status);
      const url = String(data.secure_url || "").trim();
      const path = String(data.public_id || "").trim();
      if (!url || !path) throw new Error("O servidor recebeu o arquivo, mas não retornou a URL da mídia.");
      return {
        url,
        path,
        mime: responseMime(input.kind, data.format, mime),
        size: Number(data.bytes || size || 0),
        kind: input.kind,
        provider: "cloudinary",
      };
    } catch (cause) {
      lastError = cause instanceof Error ? cause : new Error("Falha de rede durante o envio.");
      if (attempt < 3) await sleep(650 * attempt);
    }
  }

  if (lastError?.name === "AbortError") throw new Error("O envio demorou demais. Verifique sua internet e tente novamente.");
  throw lastError || new Error("Não foi possível enviar a mídia.");
}

export async function uploadPublicationMedia(
  input: LocalMediaInput,
  purpose: Extract<MediaPurpose, "posts" | "stories" | "messages"> = "posts",
): Promise<UploadedMedia> {
  return uploadCloudinary(input, purpose);
}

export async function uploadProfileImage(
  input: Omit<LocalMediaInput, "kind">,
  purpose: Extract<MediaPurpose, "profiles" | "teams"> = "profiles",
): Promise<UploadedMedia> {
  return uploadCloudinary({ ...input, kind: "image" }, purpose, PROFILE_IMAGE_MAX);
}

export async function deleteUploadedMedia(path: string, kind: UploadKind = "image"): Promise<void> {
  const normalized = String(path || "").trim();
  if (!normalized) return;

  if (normalized.startsWith("cadastro_atletas/")) {
    const functions = getFunctions(getApp(), REGION);
    const callable = httpsCallable(functions, "deleteMediaAsset");
    await callable({ publicId: normalized, kind });
    return;
  }

  if (!normalized.startsWith("usuarios/")) return;
  try {
    const storage = getStorage(getApp());
    await deleteObject(ref(storage, `gs://${LEGACY_STORAGE_BUCKET}/${normalized}`));
  } catch {
    // Compatibilidade best-effort para arquivos antigos do Firebase Storage.
  }
}
