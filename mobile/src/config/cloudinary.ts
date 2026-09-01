const CLOUD_NAME = 'hmputmfr';
const IMAGE_PRESET = 'cadastro_atletas_images';
const VIDEO_PRESET = 'cadastro_atletas_videos';

export type LocalMedia = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
};

export type CloudinaryUpload = {
  url: string;
  publicId: string;
  mime: string;
  bytes: number;
  width?: number;
  height?: number;
  duration?: number;
};

export async function uploadToCloudinary(media: LocalMedia): Promise<CloudinaryUpload> {
  const mime = media.mimeType || 'image/jpeg';
  const isVideo = mime.startsWith('video/');
  const resourceType = isVideo ? 'video' : 'image';
  const preset = isVideo ? VIDEO_PRESET : IMAGE_PRESET;
  const extension = mime.split('/')[1]?.replace('quicktime', 'mov') || (isVideo ? 'mp4' : 'jpg');
  const name = media.fileName || `mobile-${Date.now()}.${extension}`;

  const form = new FormData();
  form.append('file', { uri: media.uri, type: mime, name } as unknown as Blob);
  form.append('upload_preset', preset);
  form.append('tags', 'cadastro-de-atletas,mobile');

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, {
    method: 'POST',
    body: form,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || 'Não foi possível enviar a mídia.');

  return {
    url: String(payload.secure_url || ''),
    publicId: String(payload.public_id || ''),
    mime,
    bytes: Number(payload.bytes || media.fileSize || 0),
    width: Number(payload.width || 0),
    height: Number(payload.height || 0),
    duration: Number(payload.duration || 0),
  };
}
