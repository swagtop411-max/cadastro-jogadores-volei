import {
  collection,
  getDocs,
  getFirestore,
  orderBy,
  query,
  where,
} from "@react-native-firebase/firestore";

import {
  loadExploreProfiles,
  type MobileFeedItem,
} from "./mobileContent";

const db = getFirestore();

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
  criadoEm: unknown;
  status: string;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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
  return (
    candidates.find((value) => !placeholders.has(value.toLocaleLowerCase("pt-BR"))) ||
    candidates[0] ||
    "Atleta"
  );
}

async function loadPublicCollection(name: "publicacoes" | "videos") {
  const source = collection(db, name);
  try {
    return await getDocs(
      query(
        source,
        where("aprovado", "==", true),
        where("visibilidade", "==", "publico"),
        orderBy("criadoEm", "desc"),
      ),
    );
  } catch {
    return getDocs(
      query(source, where("aprovado", "==", true), where("visibilidade", "==", "publico")),
    );
  }
}

export async function loadCompleteMobileFeed(): Promise<MobileFeedItem[]> {
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
      criadoEm: data.criadoEm,
      status: text(data.status),
    };
  });

  const byUid = new Map(
    directory.filter((item) => item.ownerUid).map((item) => [item.ownerUid, item] as const),
  );

  return [...posts, ...videos]
    .filter((item) => {
      if (item.status === "removido") return false;
      const mediaUrl = item.kind === "video"
        ? item.videoUrl
        : item.imagemUrl || item.imagem;
      return Boolean(item.texto || item.legenda || mediaUrl);
    })
    .sort((a, b) => millis(b.criadoEm) - millis(a.criadoEm))
    .map((item) => {
      const athlete = item.ownerUid ? byUid.get(item.ownerUid) : undefined;
      return {
        id: item.id,
        kind: item.kind,
        ownerUid: item.ownerUid,
        authorName: meaningfulName(athlete?.nome, item.nome),
        authorPhoto: athlete?.fotoUrl || "",
        text: item.texto || item.legenda,
        mediaUrl:
          item.kind === "video"
            ? item.videoUrl
            : item.imagemUrl || item.imagem,
        createdAt: item.criadoEm,
      };
    });
}
