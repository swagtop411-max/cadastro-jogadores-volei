import storage from "@react-native-firebase/storage";

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

function friendlyStorageError(error: unknown): Error {
  const code = errorCode(error);
  if (code === "storage/unauthorized") {
    return new Error("O Firebase Storage recusou o envio. Entre novamente na conta e tente outra vez.");
  }
  if (code === "storage/bucket-not-found") {
    return new Error("O bucket do Firebase Storage configurado no aplicativo não foi encontrado.");
  }
  if (code === "storage/object-not-found") {
    return new Error("O upload não criou o arquivo no Firebase Storage. A configuração do bucket será revisada.");
  }
  if (error instanceof Error) return error;
  return new Error("Não foi possível enviar a mídia para o Firebase Storage.");
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

  // Usa o bucket padrão do google-services.json do APK em vez de forçar um bucket no JS.
  // Isso mantém Auth, Storage e o aplicativo Android no mesmo projeto Firebase.
  const reference = storage().ref(path);

  try {
    const snapshot = await reference.putFile(mediaUri(input.uri), {
      contentType: mime,
      cacheControl: "public,max-age=31536000,immutable",
    });

    // A própria referência que concluiu o putFile é usada para obter a URL.
    // Evita recriar refs/buckets entre upload e leitura.
    const url = await reference.getDownloadURL();
    const realSize = Number(snapshot.totalBytes || size || 0);

    if (!url) throw new Error("O Firebase Storage não retornou a URL da mídia enviada.");
    return { url, path, mime, size: realSize, kind: input.kind };
  } catch (error) {
    throw friendlyStorageError(error);
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
    await storage().ref(normalized).delete();
  } catch (error) {
    if (errorCode(error) !== "storage/object-not-found") throw error;
  }
}
