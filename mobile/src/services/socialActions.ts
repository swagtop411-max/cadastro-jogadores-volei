import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '@/src/config/firebase';
import type { FeedPost, PublicProfile } from '@/src/types/social';

export type CommentItem = {
  id: string;
  ownerUid: string;
  nome: string;
  texto: string;
  criadoEm?: unknown;
};

export type NotificationItem = {
  id: string;
  actorUid: string;
  actorNome: string;
  actorFoto: string;
  type: 'like' | 'comment' | 'follow' | 'message' | 'mention';
  sourceId: string;
  text: string;
  lida: boolean;
  createdAt?: unknown;
};

const timestampMs = (value: any) => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

export async function profileOf(uid: string): Promise<PublicProfile | null> {
  if (!uid) return null;
  const snapshot = await getDoc(doc(db, 'perfis', uid));
  return snapshot.exists() ? ({ uid: snapshot.id, ...snapshot.data() } as PublicProfile) : null;
}

async function actorIdentity(user: User) {
  const profile = await profileOf(user.uid).catch(() => null);
  return {
    nome: profile?.nome || user.displayName || 'Atleta',
    foto: profile?.fotoUrl || '',
  };
}

export async function createNotification(
  targetUid: string,
  actor: User,
  type: NotificationItem['type'],
  sourceId: string,
  text: string,
) {
  if (!targetUid || targetUid === actor.uid) return;
  const identity = await actorIdentity(actor);
  await addDoc(collection(db, 'notificacoes', targetUid, 'itens'), {
    targetUid,
    actorUid: actor.uid,
    actorNome: identity.nome,
    actorFoto: identity.foto,
    type,
    sourceId: String(sourceId || '').slice(0, 200),
    text: String(text || '').slice(0, 500),
    lida: false,
    createdAt: serverTimestamp(),
  });
}

export async function getLikeSummary(postId: string, uid?: string | null) {
  const usersRef = collection(db, 'curtidas_publicacoes', postId, 'usuarios');
  const [likes, mine] = await Promise.all([
    getDocs(usersRef),
    uid ? getDoc(doc(usersRef, uid)) : Promise.resolve(null),
  ]);
  return { count: likes.size, liked: !!mine && mine.exists() };
}

export async function toggleLike(post: FeedPost, user: User) {
  const ref = doc(db, 'curtidas_publicacoes', post.id, 'usuarios', user.uid);
  const current = await getDoc(ref);
  if (current.exists()) {
    await deleteDoc(ref);
    return false;
  }
  await setDoc(ref, { uid: user.uid, criadoEm: serverTimestamp() });
  if (post.ownerUid && post.ownerUid !== user.uid) {
    await createNotification(post.ownerUid, user, 'like', post.id, 'curtiu sua publicação');
  }
  return true;
}

export function subscribeComments(postId: string, callback: (comments: CommentItem[]) => void): Unsubscribe {
  const q = query(collection(db, 'comentarios_publicacoes'), where('publicacaoId', '==', postId), limit(100));
  return onSnapshot(q, snapshot => {
    const comments = snapshot.docs
      .map(item => ({ id: item.id, ...item.data() } as CommentItem))
      .sort((a, b) => timestampMs(a.criadoEm) - timestampMs(b.criadoEm));
    callback(comments);
  });
}

export async function addComment(post: FeedPost, user: User, text: string) {
  const clean = text.trim().slice(0, 500);
  if (!clean) return;
  const identity = await actorIdentity(user);
  await addDoc(collection(db, 'comentarios_publicacoes'), {
    ownerUid: user.uid,
    ownerEmail: user.email || '',
    publicacaoId: post.id,
    nome: identity.nome,
    texto: clean,
    parentCommentId: '',
    aprovado: true,
    status: 'publicado',
    criadoEm: serverTimestamp(),
  });
  if (post.ownerUid && post.ownerUid !== user.uid) {
    await createNotification(post.ownerUid, user, 'comment', post.id, 'comentou em sua publicação');
  }
}

export async function getFollowState(targetUid: string, viewerUid: string) {
  if (!targetUid || !viewerUid || targetUid === viewerUid) return false;
  return (await getDoc(doc(db, 'seguidores', targetUid, 'usuarios', viewerUid))).exists();
}

export async function followProfile(targetUid: string, user: User) {
  if (!targetUid || targetUid === user.uid) return;
  const payload = { uid: user.uid, criadoEm: serverTimestamp() };
  await Promise.all([
    setDoc(doc(db, 'seguidores', targetUid, 'usuarios', user.uid), payload),
    setDoc(doc(db, 'seguindo', user.uid, 'usuarios', targetUid), { uid: targetUid, criadoEm: serverTimestamp() }),
  ]);
  await createNotification(targetUid, user, 'follow', targetUid, 'começou a seguir você');
}

export async function unfollowProfile(targetUid: string, user: User) {
  await Promise.all([
    deleteDoc(doc(db, 'seguidores', targetUid, 'usuarios', user.uid)),
    deleteDoc(doc(db, 'seguindo', user.uid, 'usuarios', targetUid)),
  ]);
}

export async function ensureConversation(currentUid: string, otherUid: string) {
  const participants = [currentUid, otherUid].sort();
  const conversationId = participants.join('__');
  const ref = doc(db, 'conversas', conversationId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) {
    await setDoc(ref, {
      participants,
      lastMessage: '',
      lastSenderUid: '',
      lastMessageAt: serverTimestamp(),
      lastReadBy: [currentUid],
      createdAt: serverTimestamp(),
    });
  }
  return conversationId;
}

export async function sendTextMessage(conversationId: string, user: User, text: string) {
  const clean = text.trim().slice(0, 2000);
  if (!clean) return;
  const conversationRef = doc(db, 'conversas', conversationId);
  const conversation = await getDoc(conversationRef);
  if (!conversation.exists()) throw new Error('Conversa não encontrada.');
  const participants = (conversation.data().participants || []) as string[];
  const otherUid = participants.find(uid => uid !== user.uid) || '';

  await addDoc(collection(db, 'conversas', conversationId, 'mensagens'), {
    senderUid: user.uid,
    text: clean,
    type: 'text',
    createdAt: serverTimestamp(),
  });
  await updateDoc(conversationRef, {
    lastMessage: clean.slice(0, 500),
    lastSenderUid: user.uid,
    lastMessageAt: serverTimestamp(),
    lastReadBy: [user.uid],
  });
  if (otherUid) await createNotification(otherUid, user, 'message', conversationId, 'enviou uma mensagem');
}

export async function markConversationRead(conversationId: string, uid: string) {
  const ref = doc(db, 'conversas', conversationId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return;
  const data = snapshot.data();
  if (data.lastSenderUid === uid || (data.lastReadBy || []).includes(uid)) return;
  await updateDoc(ref, { lastReadBy: [...new Set([...(data.lastReadBy || []), uid])] });
}

export function subscribeNotifications(uid: string, callback: (items: NotificationItem[]) => void): Unsubscribe {
  const q = query(collection(db, 'notificacoes', uid, 'itens'), limit(100));
  return onSnapshot(q, snapshot => {
    const items = snapshot.docs
      .map((item: QueryDocumentSnapshot<DocumentData>) => ({ id: item.id, ...item.data() } as NotificationItem))
      .sort((a, b) => timestampMs(b.createdAt) - timestampMs(a.createdAt));
    callback(items);
  });
}

export async function markNotificationRead(uid: string, notificationId: string) {
  await updateDoc(doc(db, 'notificacoes', uid, 'itens', notificationId), { lida: true });
}
