import { getAuth } from "@react-native-firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from "@react-native-firebase/firestore";

import type { UploadedMedia } from "./mediaUpload";
import { resolveProfile } from "./profileResolver";

const db = getFirestore();
const STORY_TTL_MS = 24 * 60 * 60 * 1000;
const STORY_QUERY_LIMIT = 120;

export type MobileStory = {
  id: string;
  ownerUid: string;
  ownerName: string;
  ownerPhoto: string;
  mediaUrl: string;
  mediaPath: string;
  mediaType: "image" | "video";
  caption: string;
  createdAt: unknown;
  expiresAt: unknown;
  viewed: boolean;
};

export type StoryGroup = {
  ownerUid: string;
  ownerName: string;
  ownerPhoto: string;
  stories: MobileStory[];
  hasUnseen: boolean;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function millis(value: unknown) {
  if (!value) return 0;
  if (typeof value === "object" && value !== null) {
    const stamp = value as { toMillis?: () => number; seconds?: number };
    if (typeof stamp.toMillis === "function") return stamp.toMillis();
    if (typeof stamp.seconds === "number") return stamp.seconds * 1000;
  }
  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

async function privacyFor(uid: string): Promise<"publico" | "privado"> {
  try {
    const snapshot = await getDoc(doc(db, "config_perfis", uid));
    return snapshot.exists() && snapshot.data()?.privado === true ? "privado" : "publico";
  } catch {
    return "publico";
  }
}

async function ownerIdentity(uid: string) {
  try {
    const result = await resolveProfile(uid);
    return {
      name: result.resolved?.nome || getAuth().currentUser?.displayName || "Atleta",
      photo: result.resolved?.fotoUrl || "",
    };
  } catch {
    return { name: getAuth().currentUser?.displayName || "Atleta", photo: "" };
  }
}

export async function publishStory(input: {
  uid: string;
  caption?: string;
  media: UploadedMedia;
}) {
  const user = getAuth().currentUser;
  if (!user || user.uid !== input.uid) throw new Error("Entre na sua conta para publicar um Story.");
  const caption = text(input.caption);
  if (caption.length > 2200) throw new Error("A legenda pode ter no máximo 2.200 caracteres.");
  if (!input.media?.url) throw new Error("Selecione uma foto ou vídeo para o Story.");

  const [visibility, identity] = await Promise.all([
    privacyFor(input.uid),
    ownerIdentity(input.uid),
  ]);

  const expiresAt = Timestamp.fromMillis(Date.now() + STORY_TTL_MS);
  const created = await addDoc(collection(db, "stories"), {
    ownerUid: input.uid,
    nome: identity.name.slice(0, 100),
    mediaUrl: input.media.url,
    mediaPath: input.media.path || "",
    mediaType: input.media.kind,
    legenda: caption,
    tipo: input.media.kind,
    visibilidade: visibility,
    criadoEm: serverTimestamp(),
    expiraEm: expiresAt,
    aprovado: true,
    status: "publicado",
  });

  return created.id;
}

export async function deleteStory(storyId: string) {
  if (!getAuth().currentUser) throw new Error("Entre na sua conta.");
  await deleteDoc(doc(db, "stories", storyId));
}

async function viewedByCurrentUser(storyId: string) {
  const uid = getAuth().currentUser?.uid;
  if (!uid) return false;
  try {
    return (await getDoc(doc(db, "story_views", storyId, "usuarios", uid))).exists();
  } catch {
    return false;
  }
}

export async function markStoryViewed(storyId: string) {
  const uid = getAuth().currentUser?.uid;
  if (!uid) return;
  await setDoc(
    doc(db, "story_views", storyId, "usuarios", uid),
    { viewerUid: uid, viewedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function loadStoryViewerUids(storyId: string): Promise<string[]> {
  const ownerUid = getAuth().currentUser?.uid;
  if (!ownerUid) return [];
  const story = await getDoc(doc(db, "stories", storyId));
  if (!story.exists() || story.data()?.ownerUid !== ownerUid) return [];
  const snapshot = await getDocs(collection(db, "story_views", storyId, "usuarios"));
  return snapshot.docs.map((entry) => entry.id);
}

export async function loadActiveStories(): Promise<MobileStory[]> {
  const source = collection(db, "stories");
  let snapshot;
  try {
    snapshot = await getDocs(
      query(source, where("aprovado", "==", true), where("status", "==", "publicado"), limit(STORY_QUERY_LIMIT)),
    );
  } catch {
    snapshot = await getDocs(query(source, where("aprovado", "==", true), limit(STORY_QUERY_LIMIT)));
  }

  const now = Date.now();
  const raw = snapshot.docs
    .map((entry) => {
      const data = entry.data() as Record<string, unknown>;
      const mediaType = text(data.mediaType || data.tipo) === "video" ? "video" as const : "image" as const;
      return {
        id: entry.id,
        ownerUid: text(data.ownerUid),
        rawName: text(data.nome),
        mediaUrl: text(data.mediaUrl),
        mediaPath: text(data.mediaPath),
        mediaType,
        caption: text(data.legenda),
        createdAt: data.criadoEm,
        expiresAt: data.expiraEm,
      };
    })
    .filter((item) => item.ownerUid && item.mediaUrl && millis(item.expiresAt) > now)
    .sort((a, b) => millis(a.createdAt) - millis(b.createdAt));

  const ownerUids = [...new Set(raw.map((item) => item.ownerUid))];
  const identities = new Map<string, { name: string; photo: string }>();
  await Promise.all(ownerUids.map(async (uid) => {
    try {
      const resolved = await resolveProfile(uid);
      identities.set(uid, {
        name: resolved.resolved?.nome || "Atleta",
        photo: resolved.resolved?.fotoUrl || "",
      });
    } catch {
      identities.set(uid, { name: "Atleta", photo: "" });
    }
  }));

  const seen = await Promise.all(raw.map((item) => viewedByCurrentUser(item.id)));
  return raw.map((item, index) => {
    const identity = identities.get(item.ownerUid);
    return {
      id: item.id,
      ownerUid: item.ownerUid,
      ownerName: identity?.name || item.rawName || "Atleta",
      ownerPhoto: identity?.photo || "",
      mediaUrl: item.mediaUrl,
      mediaPath: item.mediaPath,
      mediaType: item.mediaType,
      caption: item.caption,
      createdAt: item.createdAt,
      expiresAt: item.expiresAt,
      viewed: Boolean(seen[index]),
    };
  });
}

export function groupStories(stories: MobileStory[]): StoryGroup[] {
  const groups = new Map<string, StoryGroup>();
  for (const story of stories) {
    const current = groups.get(story.ownerUid) || {
      ownerUid: story.ownerUid,
      ownerName: story.ownerName,
      ownerPhoto: story.ownerPhoto,
      stories: [],
      hasUnseen: false,
    };
    current.stories.push(story);
    if (!story.viewed) current.hasUnseen = true;
    groups.set(story.ownerUid, current);
  }

  const currentUid = getAuth().currentUser?.uid || "";
  return [...groups.values()].sort((a, b) => {
    if (a.ownerUid === currentUid) return -1;
    if (b.ownerUid === currentUid) return 1;
    if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
    const latestA = Math.max(...a.stories.map((item) => millis(item.createdAt)));
    const latestB = Math.max(...b.stories.map((item) => millis(item.createdAt)));
    return latestB - latestA;
  });
}

export function storyTimeRemaining(expiresAt: unknown) {
  const remaining = Math.max(0, millis(expiresAt) - Date.now());
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  return hours > 0 ? `${hours}h` : `${Math.max(1, minutes)}min`;
}
