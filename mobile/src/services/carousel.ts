import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '@/src/config/firebase';
import { uploadToCloudinary, type LocalMedia } from '@/src/config/cloudinary';

function hashtagsOf(text: string) {
  return [...new Set((text.match(/#[\p{L}\p{N}_-]+/gu) || []).map(item => item.slice(1).toLowerCase()))].slice(0, 30);
}

function mentionsOf(text: string) {
  return [...new Set((text.match(/@[a-z0-9_-]+/gi) || []).map(item => item.slice(1).toLowerCase()))].slice(0, 20);
}

export async function publishCarousel(user: User, media: LocalMedia[], caption: string) {
  const items = media.slice(0, 10);
  if (items.length < 2) throw new Error('Selecione pelo menos 2 mídias.');
  if (!items.some(item => String(item.mimeType || '').startsWith('image/'))) throw new Error('Inclua pelo menos uma foto para servir de capa.');

  for (const item of items) {
    const mime = String(item.mimeType || '');
    if (!mime.startsWith('image/') && !mime.startsWith('video/')) throw new Error('Há um arquivo incompatível no carrossel.');
    if (mime.startsWith('image/') && (item.fileSize || 0) > 25 * 1024 * 1024) throw new Error('Cada foto pode ter até 25 MB.');
    if (mime.startsWith('video/') && (item.fileSize || 0) > 45 * 1024 * 1024) throw new Error('Cada vídeo pode ter até 45 MB.');
  }

  const uploads = [] as Array<{ url: string; path: string; tipo: 'image' | 'video'; mime: string; tamanho: number }>;
  for (const item of items) {
    const uploaded = await uploadToCloudinary(item);
    uploads.push({
      url: uploaded.url,
      path: uploaded.publicId,
      tipo: String(item.mimeType || '').startsWith('video/') ? 'video' : 'image',
      mime: uploaded.mime || item.mimeType || 'image/jpeg',
      tamanho: Number(uploaded.bytes || item.fileSize || 0),
    });
  }

  const cover = uploads.find(item => item.tipo === 'image');
  if (!cover) throw new Error('Não foi possível definir a capa do carrossel.');
  const profile = await getDoc(doc(db, 'perfis', user.uid));
  const nome = profile.exists() ? String(profile.data().nome || user.displayName || 'Atleta') : user.displayName || 'Atleta';
  const cleanCaption = caption.trim().slice(0, 2200);

  return addDoc(collection(db, 'publicacoes'), {
    ownerUid: user.uid,
    ownerEmail: user.email || '',
    nome,
    texto: cleanCaption,
    imagem: cover.url,
    imagemUrl: cover.url,
    imagemPath: cover.path,
    imagemMime: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(cover.mime) ? cover.mime : 'image/jpeg',
    imagemTamanho: cover.tamanho,
    legenda: cleanCaption,
    tipo: 'carrossel',
    midias: uploads,
    hashtags: hashtagsOf(cleanCaption),
    mencoes: mentionsOf(cleanCaption),
    armazenamento: 'cloudinary',
    aprovado: true,
    status: 'publicado',
    criadoEm: serverTimestamp(),
  });
}
