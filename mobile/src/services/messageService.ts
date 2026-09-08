import { getAuth } from "@react-native-firebase/auth";
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "@react-native-firebase/firestore";

import type { UploadedMedia } from "./mediaUpload";
import { createActivityNotification } from "./notificationService";
import { resolveProfile } from "./profileResolver";

const db = getFirestore();

export type ConversationPreview = {
  id: string;
  otherUid: string;
  otherName: string;
  otherPhoto: string;
  lastMessage: string;
  lastMessageAt: unknown;
  unread: boolean;
};

export type DirectMessage = {
  id: string;
  senderUid: string;
  text: string;
  type: "text" | "image" | "video";
  mediaUrl: string;
  mediaPath: string;
  mediaMime: string;
  mediaSize: number;
  createdAt: unknown;
};

function requireUser() {
  const user = getAuth().currentUser;
  if (!user) throw new Error("Entre na sua conta para usar o Direct.");
  return user;
}

export function conversationId(a: string, b: string) {
  return [a, b].sort().join("__");
}

async function ensureConversation(otherUid: string) {
  const user = requireUser();
  if (!otherUid || otherUid === user.uid) throw new Error("Conversa inválida.");
  const id = conversationId(user.uid, otherUid);
  const ref = doc(db, "conversas", id);
  const existing = await getDoc(ref);
  if (!existing.exists()) {
    const now = Timestamp.now();
    await setDoc(ref, {
      participants: [user.uid, otherUid].sort(),
      lastMessage: "",
      lastSenderUid: "",
      lastMessageAt: now,
      lastReadBy: [user.uid],
      createdAt: now,
    });
  }
  return id;
}

export async function sendDirectMessage(input: {
  otherUid: string;
  text?: string;
  media?: UploadedMedia | null;
}) {
  const user = requireUser();
  const text = String(input.text || "").trim();
  const media = input.media || null;
  if (!text && !media) throw new Error("Escreva uma mensagem ou selecione uma mídia.");
  if (text.length > 2000) throw new Error("A mensagem pode ter no máximo 2.000 caracteres.");
  const id = await ensureConversation(input.otherUid);
  const type: DirectMessage["type"] = media?.kind || "text";
  const now = Timestamp.now();
  await addDoc(collection(db, "conversas", id, "mensagens"), {
    senderUid: user.uid,
    text,
    type,
    mediaUrl: media?.url || "",
    mediaPath: media?.path || "",
    mediaMime: media?.mime || "",
    mediaSize: media?.size || 0,
    createdAt: now,
  });
  const preview = text || (type === "image" ? "📷 Foto" : "🎬 Vídeo");
  await updateDoc(doc(db, "conversas", id), {
    lastMessage: preview.slice(0, 500),
    lastSenderUid: user.uid,
    lastMessageAt: now,
    lastReadBy: [user.uid],
  });
  void createActivityNotification({
    targetUid: input.otherUid,
    type: "message",
    sourceId: id,
    text: preview.slice(0, 180),
  }).catch(() => undefined);
  return id;
}

export async function deleteOwnMessage(conversation: string, messageId: string) {
  requireUser();
  await deleteDoc(doc(db, "conversas", conversation, "mensagens", messageId));
}

export async function markConversationRead(otherUid: string) {
  const user = getAuth().currentUser;
  if (!user || !otherUid || otherUid === user.uid) return;
  const id = conversationId(user.uid, otherUid);
  try {
    await updateDoc(doc(db, "conversas", id), { lastReadBy: arrayUnion(user.uid) });
  } catch {
    // A conversa pode ainda não existir.
  }
}

export function subscribeMessages(
  otherUid: string,
  onData: (messages: DirectMessage[]) => void,
  onError?: (error: Error) => void,
) {
  const user = getAuth().currentUser;
  if (!user || !otherUid || otherUid === user.uid) {
    onData([]);
    return () => undefined;
  }
  const id = conversationId(user.uid, otherUid);
  const source = query(collection(db, "conversas", id, "mensagens"), orderBy("createdAt", "asc"), limit(250));
  return onSnapshot(source, (snapshot) => {
    onData(snapshot.docs.map((entry) => {
      const data = entry.data() as Record<string, unknown>;
      const typeValue = String(data.type || "text");
      return {
        id: entry.id,
        senderUid: String(data.senderUid || ""),
        text: String(data.text || ""),
        type: typeValue === "image" || typeValue === "video" ? typeValue : "text",
        mediaUrl: String(data.mediaUrl || ""),
        mediaPath: String(data.mediaPath || ""),
        mediaMime: String(data.mediaMime || ""),
        mediaSize: Number(data.mediaSize || 0),
        createdAt: data.createdAt,
      };
    }));
    void markConversationRead(otherUid);
  }, (cause) => onError?.(cause instanceof Error ? cause : new Error("Não foi possível acompanhar a conversa.")));
}

export function subscribeConversations(
  onData: (items: ConversationPreview[]) => void,
  onError?: (error: Error) => void,
) {
  const user = getAuth().currentUser;
  if (!user) {
    onData([]);
    return () => undefined;
  }
  const source = query(collection(db, "conversas"), where("participants", "array-contains", user.uid), limit(120));
  return onSnapshot(source, async (snapshot) => {
    const raw = snapshot.docs.map((entry) => {
      const data = entry.data() as Record<string, unknown>;
      const participants = Array.isArray(data.participants) ? data.participants.map(String) : [];
      const otherUid = participants.find((uid) => uid !== user.uid) || "";
      const lastReadBy = Array.isArray(data.lastReadBy) ? data.lastReadBy.map(String) : [];
      return {
        id: entry.id,
        otherUid,
        lastMessage: String(data.lastMessage || ""),
        lastMessageAt: data.lastMessageAt,
        unread: String(data.lastSenderUid || "") !== user.uid && !lastReadBy.includes(user.uid),
      };
    }).filter((item) => item.otherUid);

    const enriched = await Promise.all(raw.map(async (item) => {
      try {
        const profile = await resolveProfile(item.otherUid);
        return {
          ...item,
          otherName: profile.resolved?.nome || "Atleta",
          otherPhoto: profile.resolved?.fotoUrl || "",
        };
      } catch {
        return { ...item, otherName: "Atleta", otherPhoto: "" };
      }
    }));
    enriched.sort((a, b) => timestampMillis(b.lastMessageAt) - timestampMillis(a.lastMessageAt));
    onData(enriched);
  }, (cause) => onError?.(cause instanceof Error ? cause : new Error("Não foi possível acompanhar as conversas.")));
}

function timestampMillis(value: unknown) {
  if (!value) return 0;
  const stamp = value as { toMillis?: () => number; seconds?: number };
  if (typeof stamp?.toMillis === "function") return stamp.toMillis();
  if (typeof stamp?.seconds === "number") return stamp.seconds * 1000;
  return new Date(String(value)).getTime() || 0;
}
