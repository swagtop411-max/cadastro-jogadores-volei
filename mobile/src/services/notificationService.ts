import { getAuth } from "@react-native-firebase/auth";
import {
  addDoc,
  collection,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
  writeBatch,
} from "@react-native-firebase/firestore";

import { resolveProfile } from "./profileResolver";

const db = getFirestore();

export type NotificationType = "like" | "comment" | "follow" | "message" | "mention";

export type MobileNotification = {
  id: string;
  targetUid: string;
  actorUid: string;
  actorName: string;
  actorPhoto: string;
  type: NotificationType;
  sourceId: string;
  text: string;
  read: boolean;
  createdAt: unknown;
};

export async function createActivityNotification(input: {
  targetUid: string;
  type: NotificationType;
  sourceId: string;
  text: string;
}) {
  const user = getAuth().currentUser;
  if (!user || !input.targetUid || input.targetUid === user.uid) return;
  let actorName = user.displayName || "Atleta";
  let actorPhoto = "";
  try {
    const profile = await resolveProfile(user.uid);
    actorName = profile.resolved?.nome || actorName;
    actorPhoto = profile.resolved?.fotoUrl || "";
  } catch {
    // A notificação ainda pode ser entregue com a identidade básica do Auth.
  }
  await addDoc(collection(db, "notificacoes", input.targetUid, "itens"), {
    targetUid: input.targetUid,
    actorUid: user.uid,
    actorNome: actorName.slice(0, 100),
    actorFoto: actorPhoto.slice(0, 2000),
    type: input.type,
    sourceId: String(input.sourceId || "").slice(0, 200),
    text: String(input.text || "").slice(0, 500),
    lida: false,
    createdAt: serverTimestamp(),
  });
}

export function subscribeNotifications(
  onData: (items: MobileNotification[]) => void,
  onError?: (error: Error) => void,
) {
  const uid = getAuth().currentUser?.uid;
  if (!uid) {
    onData([]);
    return () => undefined;
  }
  const source = query(
    collection(db, "notificacoes", uid, "itens"),
    orderBy("createdAt", "desc"),
    limit(120),
  );
  return onSnapshot(
    source,
    (snapshot) => {
      onData(snapshot.docs.map((entry) => {
        const data = entry.data() as Record<string, unknown>;
        return {
          id: entry.id,
          targetUid: String(data.targetUid || uid),
          actorUid: String(data.actorUid || ""),
          actorName: String(data.actorNome || "Atleta"),
          actorPhoto: String(data.actorFoto || ""),
          type: (String(data.type || "mention") as NotificationType),
          sourceId: String(data.sourceId || ""),
          text: String(data.text || ""),
          read: data.lida === true,
          createdAt: data.createdAt,
        };
      }));
    },
    (cause) => onError?.(cause instanceof Error ? cause : new Error("Não foi possível acompanhar as notificações.")),
  );
}

export async function markNotificationRead(notificationId: string) {
  const uid = getAuth().currentUser?.uid;
  if (!uid || !notificationId) return;
  await updateDoc(doc(db, "notificacoes", uid, "itens", notificationId), { lida: true });
}

export async function markAllNotificationsRead(items: MobileNotification[]) {
  const uid = getAuth().currentUser?.uid;
  if (!uid) return;
  const unread = items.filter((item) => !item.read).slice(0, 400);
  if (!unread.length) return;
  const batch = writeBatch(db);
  for (const item of unread) {
    batch.update(doc(db, "notificacoes", uid, "itens", item.id), { lida: true });
  }
  await batch.commit();
}

export function notificationLabel(type: NotificationType) {
  if (type === "like") return "curtiu sua publicação";
  if (type === "comment") return "comentou na sua publicação";
  if (type === "follow") return "começou a seguir você";
  if (type === "message") return "enviou uma mensagem";
  return "mencionou você";
}
