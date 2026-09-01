import { collection, deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from 'firebase/firestore';
import { db } from '@/src/config/firebase';
import { profileOf } from '@/src/services/socialActions';
import type { PublicProfile } from '@/src/types/social';

export type FollowRequest = {
  uid: string;
  status: 'pendente';
  criadoEm?: unknown;
  profile?: PublicProfile | null;
};

export async function isPrivateProfile(uid: string) {
  const snapshot = await getDoc(doc(db, 'config_perfis', uid));
  return snapshot.exists() && snapshot.data().privado === true;
}

export async function hasFollowRequest(targetUid: string, requesterUid: string) {
  return (await getDoc(doc(db, 'solicitacoes_seguir', targetUid, 'usuarios', requesterUid))).exists();
}

export async function requestFollow(targetUid: string, requesterUid: string) {
  if (!targetUid || !requesterUid || targetUid === requesterUid) return;
  await setDoc(doc(db, 'solicitacoes_seguir', targetUid, 'usuarios', requesterUid), {
    uid: requesterUid,
    status: 'pendente',
    criadoEm: serverTimestamp(),
  });
}

export async function cancelFollowRequest(targetUid: string, requesterUid: string) {
  await deleteDoc(doc(db, 'solicitacoes_seguir', targetUid, 'usuarios', requesterUid));
}

export function subscribeFollowRequests(targetUid: string, callback: (requests: FollowRequest[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'solicitacoes_seguir', targetUid, 'usuarios'), snapshot => {
    Promise.all(snapshot.docs.map(async item => {
      const data = item.data();
      const uid = String(data.uid || item.id);
      return { uid, status: 'pendente' as const, criadoEm: data.criadoEm, profile: await profileOf(uid).catch(() => null) };
    })).then(callback).catch(() => callback([]));
  });
}

export async function approveFollowRequest(targetUid: string, requesterUid: string) {
  const requestRef = doc(db, 'solicitacoes_seguir', targetUid, 'usuarios', requesterUid);
  const request = await getDoc(requestRef);
  if (!request.exists()) throw new Error('Solicitação não encontrada.');
  await Promise.all([
    setDoc(doc(db, 'seguidores', targetUid, 'usuarios', requesterUid), { uid: requesterUid, criadoEm: serverTimestamp() }),
    setDoc(doc(db, 'seguindo', requesterUid, 'usuarios', targetUid), { uid: targetUid, criadoEm: serverTimestamp() }),
  ]);
  await deleteDoc(requestRef);
}

export async function rejectFollowRequest(targetUid: string, requesterUid: string) {
  await deleteDoc(doc(db, 'solicitacoes_seguir', targetUid, 'usuarios', requesterUid));
}
