import { addDoc, collection, deleteDoc, doc, limit, onSnapshot, query, serverTimestamp, where, type Unsubscribe } from 'firebase/firestore';
import { db } from '@/src/config/firebase';
import type { StoryItem } from '@/src/services/stories';

export type HighlightItem = {
  id: string;
  ownerUid: string;
  titulo: string;
  capaUrl: string;
  storyIds: string[];
  criadoEm?: unknown;
  atualizadoEm?: unknown;
};

const ms = (value: any) => value?.toMillis?.() || (Number(value?.seconds || 0) * 1000) || new Date(value || 0).getTime() || 0;

export function subscribeStoryArchive(uid: string, callback: (items: StoryItem[]) => void): Unsubscribe {
  const q = query(collection(db, 'stories'), where('ownerUid', '==', uid), limit(150));
  return onSnapshot(q, snapshot => {
    callback(snapshot.docs
      .map(item => ({ id: item.id, ...item.data() } as StoryItem))
      .filter(item => item.aprovado === true && item.status !== 'pendente')
      .sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm)));
  });
}

export function subscribeHighlights(uid: string, callback: (items: HighlightItem[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'destaques', uid, 'itens'), snapshot => {
    callback(snapshot.docs
      .map(item => ({ id: item.id, ...item.data() } as HighlightItem))
      .sort((a, b) => ms(a.criadoEm) - ms(b.criadoEm)));
  });
}

export async function createHighlight(uid: string, title: string, stories: StoryItem[]) {
  const chosen = stories.slice(0, 20);
  const cleanTitle = title.trim().slice(0, 30);
  if (!cleanTitle) throw new Error('Digite um nome para o Destaque.');
  if (!chosen.length) throw new Error('Selecione ao menos um Story.');
  const cover = chosen.find(item => item.tipo !== 'video' && item.mediaType !== 'video')?.mediaUrl || chosen[0].mediaUrl;
  await addDoc(collection(db, 'destaques', uid, 'itens'), {
    ownerUid: uid,
    titulo: cleanTitle,
    capaUrl: cover,
    storyIds: chosen.map(item => item.id),
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });
}

export async function deleteHighlight(uid: string, highlightId: string) {
  await deleteDoc(doc(db, 'destaques', uid, 'itens', highlightId));
}
