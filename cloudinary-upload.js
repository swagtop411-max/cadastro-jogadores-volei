const CLOUDINARY_CLOUD_NAME = "hmputmfr";
const CLOUDINARY_IMAGE_PRESET = "cadastro_atletas_images";
const CLOUDINARY_VIDEO_PRESET = "cadastro_atletas_videos";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

export const CLOUDINARY_CONFIG = Object.freeze({
  cloudName: CLOUDINARY_CLOUD_NAME,
  imagePreset: CLOUDINARY_IMAGE_PRESET,
  videoPreset: CLOUDINARY_VIDEO_PRESET,
});

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
  const preset = isVideo ? CLOUDINARY_VIDEO_PRESET : CLOUDINARY_IMAGE_PRESET;
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", preset);
  if (Array.isArray(tags) && tags.length) form.append("tags", tags.join(","));

  if (typeof onProgress === "function") onProgress(5);

  const response = await fetch(endpoint, {
    method: "POST",
    body: form,
    signal,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || "Não foi possível enviar o arquivo para o Cloudinary.");
  }

  if (typeof onProgress === "function") onProgress(100);

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
