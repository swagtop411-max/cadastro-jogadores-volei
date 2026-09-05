import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "@react-native-firebase/firestore";

import type { PublicProfileV1 } from "../contracts/schema-v1";

const db = getFirestore();

export type MobileFeedItem = {
  id: string;
  kind: "image" | "video";
  ownerUid: string;
  authorName: string;
  authorPhoto: string;
  text: string;
  mediaUrl: string;
  createdAt: unknown;
};

export type MobileChampionship = {
  id: string;
  nome: string;
  data: string;
  local: string;
  organizador: string;
  descricao: string;
  imagem: string;
  linkOrganizador: string;
};

type RawSocialItem = {
  id: string;
  kind: "image" | "video";
  ownerUid: string;
  nome?: string;
  texto?: string;
  legenda?: string;
  imagemUrl?: string;
  imagem?: string;
  videoUrl?: string;
  criadoEm?: unknown;
  status?: string;
};

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

async function loadPublicCollection(name: "publicacoes" | "videos", max: number) {
  const source = collection(db, name);
  try {
    return await getDocs(
      query(
        source,
        where("aprovado", "==", true),
        where("visibilidade", "==", "publico"),
        orderBy("criadoEm", "desc"),
        limit(max),
      ),
    );
  } catch {
    return getDocs(
      query(
        source,
        where("aprovado", "==", true),
        where("visibilidade", "==", "publico"),
        limit(max),
      ),
    );
  }
}

async function loadProfileMap(uids: string[]) {
  const unique = [...new Set(uids.filter(Boolean))];
  const rows = await Promise.all(
    unique.map(async (uid) => {
      try {
        const snapshot = await getDoc(doc(db, "perfis", uid));
        return [uid, snapshot.exists() ? (snapshot.data() as Partial<PublicProfileV1>) : null] as const;
      } catch {
        return [uid, null] as const;
      }
    }),
  );
  return new Map(rows);
}

export async function loadMobileFeed(): Promise<MobileFeedItem[]> {
  const [postsSnapshot, videosSnapshot] = await Promise.all([
    loadPublicCollection("publicacoes", 24),
    loadPublicCollection("videos", 8),
  ]);

  const posts: RawSocialItem[] = postsSnapshot.docs.map((document) => {
    const data = document.data() as Record<string, unknown>;
    return {
      id: document.id,
      kind: "image",
      ownerUid: String(data.ownerUid || ""),
      nome: String(data.nome || ""),
      texto: String(data.texto || ""),
      legenda: String(data.legenda || ""),
      imagemUrl: String(data.imagemUrl || ""),
      imagem: String(data.imagem || ""),
      criadoEm: data.criadoEm,
      status: String(data.status || ""),
    };
  });

  const videos: RawSocialItem[] = videosSnapshot.docs.map((document) => {
    const data = document.data() as Record<string, unknown>;
    return {
      id: document.id,
      kind: "video",
      ownerUid: String(data.ownerUid || ""),
      nome: String(data.nome || ""),
      legenda: String(data.legenda || ""),
      videoUrl: String(data.videoUrl || ""),
      criadoEm: data.criadoEm,
      status: String(data.status || ""),
    };
  });

  const raw = [...posts, ...videos]
    .filter((item) => item.ownerUid && item.status !== "removido")
    .sort((a, b) => millis(b.criadoEm) - millis(a.criadoEm))
    .slice(0, 30);

  const profiles = await loadProfileMap(raw.map((item) => item.ownerUid));

  return raw.map((item) => {
    const profile = profiles.get(item.ownerUid);
    return {
      id: item.id,
      kind: item.kind,
      ownerUid: item.ownerUid,
      authorName: profile?.nome?.trim() || item.nome?.trim() || "Atleta",
      authorPhoto: profile?.fotoUrl?.trim() || "",
      text: item.texto?.trim() || item.legenda?.trim() || "",
      mediaUrl:
        item.kind === "video"
          ? item.videoUrl?.trim() || ""
          : item.imagemUrl?.trim() || item.imagem?.trim() || "",
      createdAt: item.criadoEm,
    };
  });
}

export async function loadExploreProfiles(): Promise<PublicProfileV1[]> {
  const source = collection(db, "perfis");
  let snapshot;
  try {
    snapshot = await getDocs(query(source, orderBy("nome", "asc"), limit(140)));
  } catch {
    snapshot = await getDocs(query(source, limit(140)));
  }

  return snapshot.docs
    .map((document) => ({ uid: document.id, ...(document.data() as PublicProfileV1) }))
    .filter((profile) => profile.nome?.trim())
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function publishTextPost(input: {
  uid: string;
  email: string;
  nome: string;
  text: string;
}) {
  const body = input.text.trim();
  if (!body) throw new Error("Escreva algo antes de publicar.");
  if (body.length > 2200) throw new Error("A publicação pode ter no máximo 2.200 caracteres.");

  let privado = false;
  try {
    const privacy = await getDoc(doc(db, "config_perfis", input.uid));
    privado = privacy.exists() && privacy.data()?.privado === true;
  } catch {
    privado = false;
  }

  await addDoc(collection(db, "publicacoes"), {
    ownerUid: input.uid,
    ownerEmail: input.email.trim().toLowerCase(),
    nome: input.nome.trim() || "Atleta",
    texto: body,
    imagem: "",
    imagemUrl: "",
    imagemPath: "",
    imagemMime: "image/jpeg",
    imagemTamanho: 0,
    legenda: body,
    tipo: "imagem",
    midias: [],
    hashtags: [],
    mencoes: [],
    armazenamento: "nenhum",
    visibilidade: privado ? "privado" : "publico",
    aprovado: true,
    status: "publicado",
    criadoEm: serverTimestamp(),
  });
}

function todayIso(): string {
  const today = new Date();
  const local = new Date(today.getTime() - today.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function parseChampionshipDescription(value: unknown) {
  const raw = String(value || "");
  const match = raw.match(/\[link\](https?:\/\/[^\s\[]+)\[\/link\]/i);
  return {
    link: match?.[1] || "",
    text: raw.replace(/\s*\[link\][\s\S]*?\[\/link\]\s*/gi, " ").trim(),
  };
}

export async function loadChampionships(): Promise<MobileChampionship[]> {
  const source = collection(db, "campeonatos");
  let snapshot;
  try {
    snapshot = await getDocs(
      query(source, where("publicado", "==", true), orderBy("data", "asc"), limit(60)),
    );
  } catch {
    snapshot = await getDocs(query(source, where("publicado", "==", true), limit(60)));
  }

  const today = todayIso();
  return snapshot.docs
    .map((document) => {
      const data = document.data() as Record<string, unknown>;
      const parsed = parseChampionshipDescription(data.descricao);
      return {
        id: document.id,
        nome: String(data.nome || "Campeonato"),
        data: String(data.data || ""),
        local: String(data.local || "Local não informado"),
        organizador: String(data.organizador || "Organizador não informado"),
        descricao: parsed.text,
        imagem: String(data.imagem || ""),
        linkOrganizador: String(data.linkOrganizador || parsed.link || ""),
      };
    })
    .filter((item) => item.data && item.data >= today)
    .sort((a, b) => a.data.localeCompare(b.data));
}

export function formatFirebaseDate(value: unknown): string {
  const time = millis(value);
  if (!time) return "Agora";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(time));
}
