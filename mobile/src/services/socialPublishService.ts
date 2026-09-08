import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  updateDoc,
} from "@react-native-firebase/firestore";

import type { UploadedMedia } from "./mediaUpload";
import { createActivityNotification } from "./notificationService";

const db = getFirestore();

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function extractHashtags(body: string) {
  return [...new Set([...body.matchAll(/(^|\s)#([\p{L}\p{N}_]{2,40})/gu)].map((match) => String(match[2] || "").toLocaleLowerCase("pt-BR")))].slice(0, 30);
}

function extractMentions(body: string) {
  return [...new Set([...body.matchAll(/(^|\s)@([a-zA-Z0-9._]{3,40})/g)].map((match) => String(match[2] || "").toLocaleLowerCase("pt-BR")))].slice(0, 20);
}

async function privacyFor(uid: string): Promise<"publico" | "privado"> {
  try {
    const privacy = await getDoc(doc(db, "config_perfis", uid));
    return privacy.exists() && privacy.data()?.privado === true ? "privado" : "publico";
  } catch {
    return "publico";
  }
}

async function notifyMentions(handles: string[], sourceId: string) {
  await Promise.all(handles.map(async (handle) => {
    try {
      const snapshot = await getDoc(doc(db, "handles", handle));
      const uid = snapshot.exists() ? String(snapshot.data()?.uid || "") : "";
      if (!uid) return;
      await createActivityNotification({ targetUid: uid, type: "mention", sourceId, text: `mencionou você em uma publicação` });
    } catch {
      // Menções inválidas ou sem handle não bloqueiam a publicação.
    }
  }));
}

export async function publishSocialContent(input: {
  uid: string;
  email: string;
  name: string;
  body: string;
  media: UploadedMedia[];
}) {
  const body = text(input.body);
  const media = input.media.filter((item) => item?.url).slice(0, 10);
  if (!body && !media.length) throw new Error("Escreva algo ou selecione uma mídia.");
  if (body.length > 2200) throw new Error("A publicação pode ter no máximo 2.200 caracteres.");
  if (media.length > 1 && media.some((item) => item.kind !== "image")) {
    throw new Error("Nesta versão, carrosséis aceitam até 10 fotos. Publique vídeos individualmente.");
  }
  const visibility = await privacyFor(input.uid);
  const hashtags = extractHashtags(body);
  const mentions = extractMentions(body);

  if (media.length === 1 && media[0]?.kind === "video") {
    const item = media[0];
    const created = await addDoc(collection(db, "videos"), {
      ownerUid: input.uid,
      nome: text(input.name) || "Atleta",
      videoUrl: item.url,
      videoPath: item.path,
      videoMime: item.mime,
      videoTamanho: item.size,
      legenda: body,
      hashtags,
      mencoes: mentions,
      visibilidade: visibility,
      aprovado: true,
      status: "publicado",
      criadoEm: serverTimestamp(),
    });
    void notifyMentions(mentions, created.id);
    return { id: created.id, kind: "video" as const };
  }

  const first = media[0];
  const carousel = media.length >= 2;
  const midias = carousel ? media.map((item, index) => ({
    ordem: index,
    tipo: item.kind,
    url: item.url,
    path: item.path,
    mime: item.mime,
    size: item.size,
  })) : [];
  const created = await addDoc(collection(db, "publicacoes"), {
    ownerUid: input.uid,
    ownerEmail: text(input.email),
    nome: text(input.name) || "Atleta",
    texto: body,
    imagem: first?.url || "",
    imagemUrl: first?.url || "",
    imagemPath: first?.path || "",
    imagemMime: first?.mime || "image/jpeg",
    imagemTamanho: first?.size || 0,
    legenda: body,
    tipo: carousel ? "carrossel" : "imagem",
    midias,
    hashtags,
    mencoes: mentions,
    armazenamento: first?.provider || "nenhum",
    visibilidade: visibility,
    aprovado: true,
    status: "publicado",
    criadoEm: serverTimestamp(),
  });
  void notifyMentions(mentions, created.id);
  return { id: created.id, kind: "image" as const };
}

export async function updateOwnPostCaption(postId: string, kind: "image" | "video", body: string) {
  const value = body.trim();
  if (value.length > 2200) throw new Error("A legenda pode ter no máximo 2.200 caracteres.");
  const hashtags = extractHashtags(value);
  const mentions = extractMentions(value);
  const ref = doc(db, kind === "video" ? "videos" : "publicacoes", postId);
  if (kind === "video") await updateDoc(ref, { legenda: value, hashtags, mencoes: mentions });
  else await updateDoc(ref, { legenda: value, texto: value, hashtags, mencoes: mentions });
  void notifyMentions(mentions, postId);
}

export async function deleteOwnPost(postId: string, kind: "image" | "video") {
  await deleteDoc(doc(db, kind === "video" ? "videos" : "publicacoes", postId));
}
