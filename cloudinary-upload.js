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

/*
 * Ponte de compatibilidade do compositor do perfil.
 * O script legado usa o arquivo para montar a prévia e, em seguida,
 * limpa o value do input. O publicador Cloudinary precisa que esse mesmo
 * File continue disponível quando o usuário clicar em PUBLICAR.
 *
 * Capturamos a seleção antes do listener legado e restauramos o File
 * depois que ele terminar de preparar a prévia. Assim a UI atual continua
 * funcionando sem voltar a depender do Firebase Storage.
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
