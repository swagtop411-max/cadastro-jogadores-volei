import { getApp } from "@react-native-firebase/app";
import {
  deleteObject,
  getDownloadURL,
  getMetadata,
  getStorage,
  putFile,
  ref,
} from "@react-native-firebase/storage";

export type UploadKind = "image" | "video";

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
};

const STORAGE_BUCKET = "jogadores-de-volei.firebasestorage.app";
const STORAGE_BUCKET_URL = `gs://${STORAGE_BUCKET}`;
const IMAGE_MIMES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const VIDEO_MIMES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const IMAGE_MAX = 10 * 1024 * 1024;
const VIDEO_MAX = 45 * 1024 * 1024;
const PROFILE_IMAGE_MAX = 5 * 1024 * 1024;

function normalizeMime(kind: UploadKind, mimeType?: string | null): string {
  const mime = String(mimeType || "").trim().toLowerCase();
  if (kind === "image") {
    if (!mime) return "image/jpeg";
    if (!IMAGE_MIMES.has(mime)) throw new Error("Use uma imagem JPG, PNG ou WEBP.");
    return mime;
  }

  if (!mime) return "video/mp4";
  if (!VIDEO_MIMES.has(mime)) throw new Error("Use um vídeo MP4, WEBM ou MOV.");
  return mime;
}

function extensionFromMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
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

function errorCode(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : "";
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function storageInstance() {
  return getStorage(getApp(), STORAGE_BUCKET_URL);
}

async function metadataWithRetry(
  storageRef: ReturnType<typeof ref>,
  attempts = 5,
) {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await getMetadata(storageRef);
    } catch (error) {
      lastError = error;
      if (errorCode(error) !== "storage/object-not-found" || attempt === attempts - 1) throw error;
      await wait(300 * (attempt + 1));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Não foi possível confirmar a mídia enviada.");
}

function tokenDownloadUrl(metadata: Awaited<ReturnType<typeof getMetadata>>): string {
  const token = metadata.downloadTokens?.[0];
  if (!token) return "";
  const bucket = metadata.bucket || STORAGE_BUCKET;
  const encodedPath = encodeURIComponent(metadata.fullPath);
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o/${encodedPath}?alt=media&token=${encodeURIComponent(token)}`;
}

async function resolveDownloadUrl(
  storageRef: ReturnType<typeof ref>,
  metadata: Awaited<ReturnType<typeof getMetadata>>,
): Promise<string> {
  try {
    return await getDownloadURL(storageRef);
  } catch (error) {
    if (errorCode(error) !== "storage/object-not-found") throw error;
    const fallback = tokenDownloadUrl(metadata);
    if (fallback) return fallback;
    throw new Error(
      `A mídia foi enviada, mas a URL não foi encontrada no bucket ${STORAGE_BUCKET}. Caminho: ${metadata.fullPath}`,
    );
  }
}

async function uploadToPath(
  input: LocalMediaInput,
  folder: "publicacoes" | "videos" | "perfil",
  maxOverride?: number,
): Promise<UploadedMedia> {
  const mime = normalizeMime(input.kind, input.mimeType);
  const size = validateSize(input.kind, input.fileSize, maxOverride);
  const ext = extensionFromMime(mime);
  const path = `usuarios/${input.uid}/${folder}/${uniqueName(ext)}`;
  const storage = storageInstance();
  const storageRef = ref(storage, path);

  try {
    await putFile(storageRef, mediaUri(input.uri), {
      contentType: mime,
      cacheControl: "public,max-age=31536000,immutable",
    });
  } catch (error) {
    const code = errorCode(error);
    if (code === "storage/unauthorized") {
      throw new Error("O Firebase Storage recusou o envio. Verifique sua sessão e as regras de upload.");
    }
    if (code === "storage/bucket-not-found") {
      throw new Error(`O bucket ${STORAGE_BUCKET} não foi encontrado no Firebase.`);
    }
    throw error;
  }

  const metadata = await metadataWithRetry(storageRef);
  const url = await resolveDownloadUrl(storageRef, metadata);
  const realSize = Number(metadata.size || size || 0);

  return { url, path, mime, size: realSize, kind: input.kind };
}

export async function uploadPublicationMedia(input: LocalMediaInput): Promise<UploadedMedia> {
  return uploadToPath(input, input.kind === "image" ? "publicacoes" : "videos");
}

export async function uploadProfileImage(
  input: Omit<LocalMediaInput, "kind">,
): Promise<UploadedMedia> {
  return uploadToPath({ ...input, kind: "image" }, "perfil", PROFILE_IMAGE_MAX);
}

export async function deleteUploadedMedia(path: string): Promise<void> {
  const normalized = String(path || "").trim();
  if (!normalized) return;
  try {
    await deleteObject(ref(storageInstance(), normalized));
  } catch (error) {
    if (errorCode(error) !== "storage/object-not-found") throw error;
  }
}
