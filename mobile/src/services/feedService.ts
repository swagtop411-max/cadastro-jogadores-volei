import {
  collection,
  getDocs,
  getFirestore,
  orderBy,
  query,
  where,
} from "@react-native-firebase/firestore";

import { loadExploreProfiles } from "./mobileContent";

const db = getFirestore();

export type MobileFeedMedia = {
  url: string;
  path: string;
  mime: string;
  size: number;
  kind: "image" | "video";
  order: number;
};

export type MobileFeedItemV2 = {
  id: string;
  kind: "image" | "video";
  ownerUid: string;
  authorName: string;
  authorPhoto: string;
  text: string;
  mediaUrl: string;
  media: MobileFeedMedia[];
  hashtags: string[];
  mentions: string[];
  createdAt: unknown;
};

type RawSocialItem = {
  id: string;
  kind: "image" | "video";
  ownerUid: string;
  nome: string;
  texto: string;
  legenda: string;
  imagemUrl: string;
  imagem: string;
  videoUrl: string;
  midias: unknown;
  hashtags: unknown;
  mencoes: unknown;
  criadoEm: unknown;
  status: string;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function millis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "object" && value !== null) {
    const timestamp = value as { toMillis?: () => number; seconds?: number };
    if (typeof timestamp.toMillis === "function") return timestamp.toMillis();
    if (typeof timestamp.seconds === "number") return timestamp.seconds * 1000;
  }
  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function meaningfulName(...values: unknown[]): string {
  const placeholders = new Set(["usuario", "usuário", "user", "atleta"]);
  const candidates = values.map(text).filter(Boolean);
  return candidates.find((value) => !placeholders.has(value.toLocaleLowerCase("pt-BR"))) || candidates[0] || "Atleta";
}

function carouselMedia(value: unknown): MobileFeedMedia[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw, index) => {
    if (!raw || typeof raw !== "object") return null;
    const item = raw as Record<string, unknown>;
    const kindValue = text(item.tipo || item.kind || item.mediaType);
    const mime = text(item.mime || item.mediaMime);
    const kind: "image" | "video" = kindValue === "video" || mime.startsWith("video/") ? "video" : "image";
    const url = text(item.url || item.mediaUrl || item.imagemUrl || item.videoUrl);
    if (!url) return null;
    return {
      url,
      path: text(item.path || item.mediaPath),
      mime,
      size: Number(item.size || item.mediaSize || 0),
      kind,
      order: Number(item.ordem ?? item.order ?? index),
    };
  }).filter((item): item is MobileFeedMedia => Boolean(item)).sort((a, b) => a.order - b.order);
}

async function loadPublicCollection(name: "publicacoes" | "videos") {
  const source = collection(db, name);
  try {
    return await getDocs(
      query(source, where("aprovado", "==", true), where("visibilidade", "==", "publico"), orderBy("criadoEm", "desc")),
    );
  } catch {
    return getDocs(query(source, where("aprovado", "==", true), where("visibilidade", "==", "publico")));
  }
}

export async function loadCompleteMobileFeed(): Promise<MobileFeedItemV2[]> {
  const [postsSnapshot, videosSnapshot, directory] = await Promise.all([
    loadPublicCollection("publicacoes"),
    loadPublicCollection("videos"),
    loadExploreProfiles().catch(() => []),
  ]);

  const posts: RawSocialItem[] = postsSnapshot.docs.map((document) => {
    const data = document.data() as Record<string, unknown>;
    return {
      id: document.id,
      kind: "image",
      ownerUid: text(data.ownerUid),
      nome: text(data.nome),
      texto: text(data.texto),
      legenda: text(data.legenda),
      imagemUrl: text(data.imagemUrl),
      imagem: text(data.imagem),
      videoUrl: "",
      midias: data.midias,
      hashtags: data.hashtags,
      mencoes: data.mencoes,
      criadoEm: data.criadoEm,
      status: text(data.status),
    };
  });

  const videos: RawSocialItem[] = videosSnapshot.docs.map((document) => {
    const data = document.data() as Record<string, unknown>;
    return {
      id: document.id,
      kind: "video",
      ownerUid: text(data.ownerUid),
      nome: text(data.nome),
      texto: "",
      legenda: text(data.legenda),
      imagemUrl: "",
      imagem: "",
      videoUrl: text(data.videoUrl),
      midias: [],
      hashtags: data.hashtags,
      mencoes: data.mencoes,
      criadoEm: data.criadoEm,
      status: text(data.status),
    };
  });

  const byUid = new Map(directory.filter((item) => item.ownerUid).map((item) => [item.ownerUid, item] as const));

  return [...posts, ...videos]
    .filter((item) => {
      if (item.status === "removido") return false;
      const first = item.kind === "video" ? item.videoUrl : item.imagemUrl || item.imagem;
      return Boolean(item.texto || item.legenda || first || carouselMedia(item.midias).length);
    })
    .sort((a, b) => millis(b.criadoEm) - millis(a.criadoEm))
    .map((item) => {
      const athlete = item.ownerUid ? byUid.get(item.ownerUid) : undefined;
      let media = carouselMedia(item.midias);
      if (!media.length) {
        const url = item.kind === "video" ? item.videoUrl : item.imagemUrl || item.imagem;
        if (url) media = [{ url, path: "", mime: item.kind === "video" ? "video/mp4" : "image/jpeg", size: 0, kind: item.kind, order: 0 }];
      }
      return {
        id: item.id,
        kind: item.kind,
        ownerUid: item.ownerUid,
        authorName: meaningfulName(athlete?.nome, item.nome),
        authorPhoto: athlete?.fotoUrl || "",
        text: item.texto || item.legenda,
        mediaUrl: media[0]?.url || "",
        media,
        hashtags: strings(item.hashtags),
        mentions: strings(item.mencoes),
        createdAt: item.criadoEm,
      };
    });
}
