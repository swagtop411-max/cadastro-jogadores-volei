import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/src/config/firebase';
import type { FeedPost } from '@/src/types/social';

function millis(value: any) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapPost(doc: QueryDocumentSnapshot<DocumentData>): FeedPost {
  return { id: doc.id, ...(doc.data() as Omit<FeedPost, 'id'>) };
}

export function subscribeFeed(onData: (posts: FeedPost[]) => void, onError?: (error: unknown) => void): Unsubscribe {
  let fallbackUnsubscribe: Unsubscribe | null = null;
  const primary = query(
    collection(db, 'publicacoes'),
    where('aprovado', '==', true),
    orderBy('criadoEm', 'desc'),
    limit(30),
  );

  const unsubscribe = onSnapshot(
    primary,
    snapshot => onData(snapshot.docs.map(mapPost)),
    () => {
      const fallback = query(collection(db, 'publicacoes'), where('aprovado', '==', true), limit(60));
      fallbackUnsubscribe = onSnapshot(
        fallback,
        snapshot => {
          const posts = snapshot.docs.map(mapPost).sort((a, b) => millis(b.criadoEm) - millis(a.criadoEm));
          onData(posts.slice(0, 30));
        },
        error => onError?.(error),
      );
    },
  );

  return () => {
    unsubscribe();
    fallbackUnsubscribe?.();
  };
}
