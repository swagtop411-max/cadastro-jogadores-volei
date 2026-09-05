import { getApp } from "@react-native-firebase/app";
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  putFile,
  ref,
  uploadBytesResumable,
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

type UploadStage = "arquivo" | "fallback-bytes" | "url";

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

function storageDiagnostic(stage: UploadStage, path: string): string {
  const configuredBucket = getApp().options.storageBucket || "não informado no APK";
  return `Etapa: ${stage}. Bucket alvo: ${STORAGE_BUCKET}. Bucket do APK: ${configuredBucket}. Caminho: ${path}.`;
}

function friendlyStorageError(error: unknown, stage: UploadStage, path: string): Error {
  const code = errorCode(error);
  const diagnostic = storageDiagnostic(stage, path);

  if (code === "storage/unauthorized") {
    return new Error(`O Firebase Storage recusou o envio. Entre novamente na conta e tente outra vez. ${diagnostic}`);
  }
  if (code === "storage/bucket-not-found") {
    return new Error(`O bucket do Firebase Storage não foi encontrado. ${diagnostic}`);
  }
  if (code === "storage/object-not-found") {
    return new Error(`O Firebase Storage não encontrou o objeto após a tentativa de envio. ${diagnostic}`);
  }
  if (code === "storage/retry-limit-exceeded") {
    return new Error(`O Firebase Storage excedeu o limite de tentativas. Verifique sua conexão e tente novamente. ${diagnostic}`);
  }

  const detail = error instanceof Error ? error.message : "erro desconhecido";
  return new Error(`Falha no envio da mídia: ${detail}. ${diagnostic}`);
}

async function getDownloadUrlWithRetry(
  storageRef: ReturnType<typeof ref>,
  attempts = 6,
): Promise<string> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const url = await getDownloadURL(storageRef);
      if (url) return url;
    } catch (error) {
      lastError = error;
      if (errorCode(error) !== "storage/object-not-found" || attempt === attempts - 1) {
        throw error;
      }
    }
    await wait(250 * (attempt + 1));
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("O Firebase Storage não retornou a URL do arquivo enviado.");
}

async function uploadImageByBytes(
  storageRef: ReturnType<typeof ref>,
  uri: string,
  mime: string,
): Promise<void> {
  const response = await fetch(uri);
  const blob = await response.blob();
  await uploadBytesResumable(storageRef, blob, {
    contentType: mime,
    cacheControl: "public,max-age=31536000,immutable",
  });
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
  const storageRef = ref(storageInstance(), path);
  const uri = mediaUri(input.uri);
  const metadata = {
    contentType: mime,
    cacheControl: "public,max-age=31536000,immutable",
  };

  let usedBytesFallback = false;

  try {
    await putFile(storageRef, uri, metadata);
  } catch (error) {
    if (input.kind !== "image" || errorCode(error) !== "storage/object-not-found") {
      throw friendlyStorageError(error, "arquivo", path);
    }

    try {
      await uploadImageByBytes(storageRef, uri, mime);
      usedBytesFallback = true;
    } catch (fallbackError) {
      throw friendlyStorageError(fallbackError, "fallback-bytes", path);
    }
  }

  try {
    const url = await getDownloadUrlWithRetry(storageRef);
    return { url, path, mime, size, kind: input.kind };
  } catch (error) {
    if (
      input.kind === "image" &&
      !usedBytesFallback &&
      errorCode(error) === "storage/object-not-found"
    ) {
      try {
        await uploadImageByBytes(storageRef, uri, mime);
        const url = await getDownloadUrlWithRetry(storageRef);
        return { url, path, mime, size, kind: input.kind };
      } catch (fallbackError) {
        throw friendlyStorageError(fallbackError, "fallback-bytes", path);
      }
    }

    throw friendlyStorageError(error, "url", path);
  }
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
