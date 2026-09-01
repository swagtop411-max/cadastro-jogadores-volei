import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/src/config/firebase';

export async function isBlockedByMe(ownerUid: string, targetUid: string) {
  if (!ownerUid || !targetUid) return false;
  return (await getDoc(doc(db, 'bloqueios', ownerUid, 'usuarios', targetUid))).exists();
}

export async function blockProfile(ownerUid: string, targetUid: string) {
  if (!ownerUid || !targetUid || ownerUid === targetUid) return;
  await setDoc(doc(db, 'bloqueios', ownerUid, 'usuarios', targetUid), { uid: targetUid, criadoEm: serverTimestamp() });
}

export async function unblockProfile(ownerUid: string, targetUid: string) {
  await deleteDoc(doc(db, 'bloqueios', ownerUid, 'usuarios', targetUid));
}
