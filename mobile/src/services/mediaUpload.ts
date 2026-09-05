import { getApp } from "@react-native-firebase/app";
import { deleteObject, getStorage, ref } from "@react-native-firebase/storage";

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
  provider: "cloudinary" | "firebase-storage";
};

const CLOUDINARY_CLOUD_NAME = "hmputmfr";
const CLOUDINARY_IMAGE_PRESET = "cadastro_atletas_images";
const CLOUDINARY_VIDEO_PRESET = "cadastro_atletas_videos";

const LEGACY_STORAGE_BUCKET = "jogadores-de-volei.firebasestorage.app";
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

function imageDataUri(base64: string | null | undefined, mime: string): string {
  const encoded = String(base64 || "").trim();
  if (!encoded) {
    throw new Error("Não foi possível preparar a imagem para envio. Selecione a foto novamente.");
  }
  return `data:${mime};base64,${encoded}`;
}

function uniqueName(ext: string): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
}

function cloudinaryEndpoint(kind: UploadKind): string {
  return `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${kind === "video" ? "video" : "image"}/upload`;
}

async function parseCloudinaryResponse(response: Response): Promise<Record<string, unknown>> {
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { raw };
  }
}

function cloudinaryError(data: Record<string, unknown>, status: number): Error {
  const nested = data.error && typeof data.error === "object" ? data.error as Record<string, unknown> : null;
  const message = String(nested?.message || data.message || "").trim();
  return new Error(
    message
      ? `Cloudinary recusou o envio: ${message}`
      : `Não foi possível enviar a mídia para o Cloudinary (HTTP ${status}).`,
  );
}

async function uploadCloudinary(
  input: LocalMediaInput,
  maxOverride?: number,
): Promise<UploadedMedia> {
  const mime = normalizeMime(input.kind, input.mimeType);
  const size = validateSize(input.kind, input.fileSize, maxOverride);
  const ext = extensionFromMime(mime);
  const preset = input.kind === "video" ? CLOUDINARY_VIDEO_PRESET : CLOUDINARY_IMAGE_PRESET;
  const form = new FormData();

  if (input.kind === "image") {
    form.append("file", imageDataUri(input.base64, mime));
  } else {
    const filePart = {
      uri: mediaUri(input.uri),
      name: String(input.fileName || uniqueName(ext)),
      type: mime,
    } as unknown as Blob;
    form.append("file", filePart);
  }

  form.append("upload_preset", preset);
  form.append("tags", "cadastro-de-atletas,mobile");

  let response: Response;
  try {
    response = await fetch(cloudinaryEndpoint(input.kind), {
      method: "POST",
      body: form,
    });
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : "falha de rede";
    throw new Error(`Não foi possível conectar ao Cloudinary: ${detail}`);
  }

  const data = await parseCloudinaryResponse(response);
  if (!response.ok) throw cloudinaryError(data, response.status);

  const url = String(data.secure_url || "").trim();
  const path = String(data.public_id || "").trim();
  if (!url || !path) {
    throw new Error("O Cloudinary recebeu o arquivo, mas não retornou a URL da mídia.");
  }

  return {
    url,
    path,
    mime,
    size: Number(data.bytes || size || 0),
    kind: input.kind,
    provider: "cloudinary",
  };
}

export async function uploadPublicationMedia(input: LocalMediaInput): Promise<UploadedMedia> {
  return uploadCloudinary(input);
}

export async function uploadProfileImage(
  input: Omit<LocalMediaInput, "kind">,
): Promise<UploadedMedia> {
  return uploadCloudinary({ ...input, kind: "image" }, PROFILE_IMAGE_MAX);
}

// Compatibilidade com imagens antigas salvas no Firebase Storage.
// Novos uploads usam Cloudinary, igual ao site. A exclusão de assets Cloudinary
// será movida para o backend assinado, pois não deve carregar API secret no app.
export async function deleteUploadedMedia(path: string): Promise<void> {
  const normalized = String(path || "").trim();
  if (!normalized || !normalized.startsWith("usuarios/")) return;
  try {
    const storage = getStorage(getApp());
    await deleteObject(ref(storage, `gs://${LEGACY_STORAGE_BUCKET}/${normalized}`));
  } catch {
    // Limpeza é melhor esforço. Não deve impedir publicação ou salvamento do perfil.
  }
}
