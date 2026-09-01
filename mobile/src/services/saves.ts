import { collection, deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from 'firebase/firestore';
import { db } from '@/src/config/firebase';

export type SavedReference = { postId: string; kind: string; createdAt?: unknown };

export async function isSaved(uid: string, postId: string) {
  if (!uid || !postId) return false;
  return (await getDoc(doc(db, 'salvos', uid, 'publicacoes', postId))).exists();
}

export async function toggleSave(uid: string, postId: string, kind = 'post') {
  const ref = doc(db, 'salvos', uid, 'publicacoes', postId);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) {
    await deleteDoc(ref);
    return false;
  }
  await setDoc(ref, { postId, kind, createdAt: serverTimestamp() });
  return true;
}

export function subscribeSaved(uid: string, callback: (items: SavedReference[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'salvos', uid, 'publicacoes'), snapshot => {
    callback(snapshot.docs.map(item => ({ postId: item.id, ...item.data() } as SavedReference)));
  });
}
