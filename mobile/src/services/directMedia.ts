import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '@/src/config/firebase';
import { uploadToCloudinary, type LocalMedia } from '@/src/config/cloudinary';
import { createNotification } from '@/src/services/socialActions';

export async function sendMediaMessage(conversationId: string, user: User, media: LocalMedia) {
  const conversationRef = doc(db, 'conversas', conversationId);
  const conversation = await getDoc(conversationRef);
  if (!conversation.exists()) throw new Error('Conversa não encontrada.');

  const mime = String(media.mimeType || 'image/jpeg');
  const isVideo = mime.startsWith('video/');
  const max = isVideo ? 45 * 1024 * 1024 : 25 * 1024 * 1024;
  if ((media.fileSize || 0) > max) throw new Error(isVideo ? 'O vídeo deve ter no máximo 45 MB.' : 'A imagem deve ter no máximo 25 MB.');

  const upload = await uploadToCloudinary(media);
  const participants = (conversation.data().participants || []) as string[];
  const otherUid = participants.find(uid => uid !== user.uid) || '';
  const type = isVideo ? 'video' : 'image';
  const label = isVideo ? '🎥 Vídeo' : '📷 Foto';

  await addDoc(collection(db, 'conversas', conversationId, 'mensagens'), {
    senderUid: user.uid,
    text: '',
    type,
    mediaUrl: upload.url,
    mediaPath: upload.publicId,
    mediaMime: upload.mime,
    mediaSize: upload.bytes,
    createdAt: serverTimestamp(),
  });

  await updateDoc(conversationRef, {
    lastMessage: label,
    lastSenderUid: user.uid,
    lastMessageAt: serverTimestamp(),
    lastReadBy: [user.uid],
  });

  if (otherUid) await createNotification(otherUid, user, 'message', conversationId, `enviou ${isVideo ? 'um vídeo' : 'uma foto'}`);
}
