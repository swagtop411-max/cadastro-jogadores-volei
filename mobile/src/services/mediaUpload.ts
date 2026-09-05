import { getApp } from "@react-native-firebase/app";
import {
  deleteObject,
  getStorage,
  putFile,
  ref,
  uploadString,
} from "@react-native-firebase/storage";

export type UploadKind = "image" | "video";

export type LocalMediaInput = {
  uid: string;
  uri: string;
  kind: UploadKind;
  mimeType?: string | null;
  fileSize?: number | null;
  fileName?: string | null;
  base64?: string | null;
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

type UploadStage = "imagem-base64" | "arquivo" | "url";

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

function mediaBase64(value?: string | null): string {
  const normalized = String(value || "").trim();
  if (!normalized) {
    throw new Error("A imagem selecionada não forneceu os dados necessários para o envio. Selecione a foto novamente.");
  }
  return normalized;
}

function uniqueName(ext: string): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
}

function errorCode(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : "";
}

function storageInstance() {
  return getStorage(getApp());
}

function storageReference(path: string) {
  // Força refFromURL internamente. Isso evita o bug de resolução observado em
  // buckets novos *.firebasestorage.app quando a referência é criada só pelo path.
  return ref(storageInstance(), `${STORAGE_BUCKET_URL}/${path}`);
}

function publicMediaUrl(path: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(STORAGE_BUCKET)}/o/${encodeURIComponent(path)}?alt=media`;
}

function storageDiagnostic(stage: UploadStage, path: string, uri?: string): string {
  const configuredBucket = getApp().options.storageBucket || "não informado no APK";
  const uriScheme = uri ? String(uri).split(":", 1)[0] || "desconhecido" : "não aplicável";
  return `Etapa: ${stage}. Bucket alvo: ${STORAGE_BUCKET}. Bucket do APK: ${configuredBucket}. Referência: ${STORAGE_BUCKET_URL}/${path}. URI: ${uriScheme}.`;
}

function friendlyStorageError(error: unknown, stage: UploadStage, path: string, uri?: string): Error {
  const code = errorCode(error);
  const diagnostic = storageDiagnostic(stage, path, uri);

  if (code === "storage/unauthorized") {
    return new Error(`O Firebase Storage recusou o envio. Entre novamente na conta e tente outra vez. ${diagnostic}`);
  }
  if (code === "storage/bucket-not-found") {
    return new Error(`O bucket do Firebase Storage não foi encontrado. ${diagnostic}`);
  }
  if (code === "storage/object-not-found") {
    return new Error(`O Firebase Storage não encontrou o objeto durante o envio. ${diagnostic}`);
  }
  if (code === "storage/retry-limit-exceeded") {
    return new Error(`O Firebase Storage excedeu o limite de tentativas. Verifique sua conexão e tente novamente. ${diagnostic}`);
  }

  const detail = error instanceof Error ? error.message : "erro desconhecido";
  return new Error(`Falha no envio da mídia: ${detail}. ${diagnostic}`);
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
  const storageRef = storageReference(path);
  const uri = mediaUri(input.uri);
  const metadata = {
    contentType: mime,
    cacheControl: "public,max-age=31536000,immutable",
  };

  if (input.kind === "image") {
    try {
      const base64 = mediaBase64(input.base64);
      await uploadString(storageRef, base64, "base64", metadata);
    } catch (error) {
      if (error instanceof Error && !errorCode(error)) throw error;
      throw friendlyStorageError(error, "imagem-base64", path, uri);
    }
  } else {
    try {
      await putFile(storageRef, uri, metadata);
    } catch (error) {
      throw friendlyStorageError(error, "arquivo", path, uri);
    }
  }

  try {
    const url = publicMediaUrl(path);
    return { url, path, mime, size, kind: input.kind };
  } catch (error) {
    throw friendlyStorageError(error, "url", path, uri);
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
    await deleteObject(storageReference(normalized));
  } catch (error) {
    if (errorCode(error) !== "storage/object-not-found") throw error;
  }
}
