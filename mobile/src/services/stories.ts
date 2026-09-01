import { collection, doc, getDoc, limit, onSnapshot, query, serverTimestamp, setDoc, Timestamp, type Unsubscribe } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '@/src/config/firebase';
import { uploadToCloudinary, type LocalMedia } from '@/src/config/cloudinary';
import { profileOf } from '@/src/services/socialActions';

export type StoryItem = {
  id: string;
  ownerUid: string;
  nome?: string;
  mediaUrl: string;
  mediaPath?: string;
  mediaType?: 'image' | 'video';
  legenda?: string;
  tipo?: 'image' | 'video';
  criadoEm?: unknown;
  expiraEm?: unknown;
  aprovado?: boolean;
  status?: string;
};

const ms = (value: any) => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

export function subscribeActiveStories(callback: (stories: StoryItem[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, 'stories'), limit(100)), snapshot => {
    const now = Date.now();
    const active = snapshot.docs
      .map(item => ({ id: item.id, ...item.data() } as StoryItem))
      .filter(item => item.aprovado === true && item.status !== 'pendente' && ms(item.expiraEm) > now)
      .sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm));
    callback(active);
  });
}

export async function createStory(media: LocalMedia, user: User, caption: string) {
  if ((media.fileSize || 0) > 45 * 1024 * 1024) throw new Error('A mídia do Story deve ter no máximo 45 MB.');
  const upload = await uploadToCloudinary(media);
  const profile = await profileOf(user.uid).catch(() => null);
  const isVideo = upload.mime.startsWith('video/');
  const ref = doc(collection(db, 'stories'));
  await setDoc(ref, {
    ownerUid: user.uid,
    nome: profile?.nome || user.displayName || 'Atleta',
    mediaUrl: upload.url,
    mediaPath: upload.publicId,
    mediaType: isVideo ? 'video' : 'image',
    legenda: caption.trim().slice(0, 2200),
    tipo: isVideo ? 'video' : 'image',
    criadoEm: serverTimestamp(),
    expiraEm: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
    aprovado: true,
    status: 'publicado',
  });
  return ref.id;
}

export async function getStory(storyId: string): Promise<StoryItem | null> {
  const snapshot = await getDoc(doc(db, 'stories', storyId));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as StoryItem) : null;
}

export async function markStoryViewed(storyId: string, viewerUid: string) {
  if (!storyId || !viewerUid) return;
  await setDoc(doc(db, 'story_views', storyId, 'usuarios', viewerUid), {
    viewerUid,
    viewedAt: serverTimestamp(),
  }, { merge: true });
}
