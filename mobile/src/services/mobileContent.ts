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

import type {
  AthleteCategory,
  ChampionshipHistoryItemV1,
  PublicProfileV1,
} from "../contracts/schema-v1";
import type { UploadedMedia } from "./mediaUpload";

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

export type MobileAthleteDirectoryItem = PublicProfileV1 & {
  directoryKey: string;
  ownerUid: string;
  athleteId: string;
  source: "perfil" | "atleta" | "perfil+atleta";
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

type LegacyAthleteRecord = {
  id: string;
  ownerUid: string;
  nome: string;
  cidade: string;
  uf: string;
  modalidade: string;
  modalidades: string[];
  posicao: string;
  posicoes: string[];
  categoria: AthleteCategory;
  time: string;
  bio: string;
  fotoUrl: string;
  instagramUrl: string;
  historicoCampeonatos: ChampionshipHistoryItemV1[];
  status: string;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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

function list(value: unknown, fallback?: unknown): string[] {
  if (Array.isArray(value)) return value.map(text).filter(Boolean);
  const raw = text(value) || text(fallback);
  return raw ? raw.split(",").map((item) => item.trim()).filter(Boolean) : [];
}

function normalizeCategory(value: unknown): AthleteCategory {
  const normalized = text(value)
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (normalized.includes("inic")) return "Iniciante";
  if (normalized.includes("avan")) return "Avançado";
  if (normalized.includes("inter")) return "Intermediário";
  return "";
}

function locationParts(value: unknown, rawUf?: unknown): { cidade: string; uf: string } {
  let cidade = text(value).replace(/\s+/g, " ");
  let uf = text(rawUf).toUpperCase().slice(0, 2);
  const prefixed = cidade.match(/^([A-Z]{2})\s*[-,]\s*(.+)$/i);
  if (prefixed) {
    uf ||= prefixed[1]?.toUpperCase() || "";
    cidade = text(prefixed[2]);
  } else {
    const suffixed = cidade.match(/^(.+?)\s*[-,]\s*([A-Z]{2})$/i);
    if (suffixed) {
      uf ||= suffixed[2]?.toUpperCase() || "";
      cidade = text(suffixed[1]);
    }
  }
  return { cidade, uf };
}

function historyKey(item: ChampionshipHistoryItemV1): string {
  return [item.campeonato || item.nome || item.evento, item.colocacao || item.resultado, item.ano || item.data]
    .map((value) => text(value).toLocaleLowerCase("pt-BR"))
    .join("|");
}

function mergeHistory(...histories: unknown[]): ChampionshipHistoryItemV1[] {
  const seen = new Set<string>();
  const result: ChampionshipHistoryItemV1[] = [];
  for (const history of histories) {
    if (!Array.isArray(history)) continue;
    for (const raw of history) {
      if (!raw || typeof raw !== "object") continue;
      const item = raw as ChampionshipHistoryItemV1;
      const key = historyKey(item);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push(item);
    }
  }
  return result.slice(0, 30);
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

function profileFromData(uid: string, data: Record<string, unknown>): PublicProfileV1 {
  const loc = locationParts(data.cidade, data.uf);
  return {
    uid,
    nome: meaningfulName(data.nome),
    cidade: loc.cidade,
    uf: loc.uf,
    modalidade: text(data.modalidade) || list(data.modalidades).join(", "),
    posicao: text(data.posicao) || list(data.posicoes).join(", "),
    categoria: normalizeCategory(data.categoria),
    time: text(data.time),
    bio: text(data.bio) || text(data.observacoes),
    fotoUrl: text(data.fotoUrl) || text(data.foto),
    fotoPath: text(data.fotoPath),
    capaUrl: text(data.capaUrl),
    capaPath: text(data.capaPath),
    handle: text(data.handle),
    instagramUrl: text(data.instagramUrl),
    historicoCampeonatos: mergeHistory(data.historicoCampeonatos),
    completo: data.completo === true,
  };
}

function legacyFromData(id: string, data: Record<string, unknown>): LegacyAthleteRecord {
  const loc = locationParts(data.cidade, data.uf);
  const modalidades = list(data.modalidades, data.modalidade);
  const posicoes = list(data.posicoes, data.posicao);
  return {
    id,
    ownerUid: text(data.ownerUid) || text(data.uid),
    nome: meaningfulName(data.nome),
    cidade: loc.cidade,
    uf: loc.uf,
    modalidade: text(data.modalidade) || modalidades.join(", "),
    modalidades,
    posicao: text(data.posicao) || posicoes.join(", "),
    posicoes,
    categoria: normalizeCategory(data.categoria),
    time: text(data.time),
    bio: text(data.bio) || text(data.observacoes),
    fotoUrl: text(data.fotoUrl) || text(data.foto),
    instagramUrl: text(data.instagramUrl),
    historicoCampeonatos: mergeHistory(data.historicoCampeonatos),
    status: text(data.status || "ativo"),
  };
}

function mergeProfileAndAthlete(
  profile: PublicProfileV1 | null,
  athlete: LegacyAthleteRecord | null,
): MobileAthleteDirectoryItem | null {
  if (!profile && !athlete) return null;
  const ownerUid = profile?.uid || athlete?.ownerUid || "";
  const athleteId = athlete?.id || "";
  const uid = ownerUid || `legacy:${athleteId}`;
  const cidade = profile?.cidade || athlete?.cidade || "";
  const uf = profile?.uf || athlete?.uf || "";
  const categoria = profile?.categoria || athlete?.categoria || "";
  const nome = meaningfulName(profile?.nome, athlete?.nome);
  const profileOnlyPlaceholder =
    !athlete &&
    ["usuario", "usuário", "user", "atleta"].includes(nome.toLocaleLowerCase("pt-BR")) &&
    !cidade &&
    !categoria &&
    !profile?.modalidade &&
    !profile?.posicao &&
    !profile?.time;
  if (profileOnlyPlaceholder) return null;
  if (athlete && athlete.status.toLocaleLowerCase("pt-BR") === "inativo") return null;

  return {
    uid,
    directoryKey: athleteId ? `atleta:${athleteId}` : `perfil:${uid}`,
    ownerUid,
    athleteId,
    source: profile && athlete ? "perfil+atleta" : profile ? "perfil" : "atleta",
    nome,
    cidade,
    uf,
    modalidade: profile?.modalidade || athlete?.modalidade || "",
    posicao: profile?.posicao || athlete?.posicao || "",
    categoria,
    time: profile?.time || athlete?.time || "",
    bio: profile?.bio || athlete?.bio || "",
    fotoUrl: profile?.fotoUrl || athlete?.fotoUrl || "",
    fotoPath: profile?.fotoPath || "",
    capaUrl: profile?.capaUrl || "",
    capaPath: profile?.capaPath || "",
    handle: profile?.handle || "",
    instagramUrl: profile?.instagramUrl || athlete?.instagramUrl || "",
    historicoCampeonatos: mergeHistory(
      profile?.historicoCampeonatos,
      athlete?.historicoCampeonatos,
    ),
    completo: Boolean(cidade && uf && categoria),
  };
}

export async function loadAthleteDirectory(): Promise<MobileAthleteDirectoryItem[]> {
  const [profilesResult, athletesResult] = await Promise.allSettled([
    getDocs(collection(db, "perfis")),
    getDocs(collection(db, "atletas")),
  ]);

  if (profilesResult.status === "rejected" && athletesResult.status === "rejected") {
    throw profilesResult.reason || athletesResult.reason;
  }

  const profiles = new Map<string, PublicProfileV1>();
  if (profilesResult.status === "fulfilled") {
    for (const document of profilesResult.value.docs) {
      profiles.set(
        document.id,
        profileFromData(document.id, document.data() as Record<string, unknown>),
      );
    }
  }

  const athletes: LegacyAthleteRecord[] = [];
  if (athletesResult.status === "fulfilled") {
    for (const document of athletesResult.value.docs) {
      athletes.push(legacyFromData(document.id, document.data() as Record<string, unknown>));
    }
  }

  const athletesByOwner = new Map(
    athletes.filter((item) => item.ownerUid).map((item) => [item.ownerUid, item] as const),
  );
  const usedAthleteIds = new Set<string>();
  const merged: MobileAthleteDirectoryItem[] = [];

  for (const [uid, profile] of profiles) {
    const athlete = athletesByOwner.get(uid) || null;
    if (athlete) usedAthleteIds.add(athlete.id);
    const item = mergeProfileAndAthlete(profile, athlete);
    if (item) merged.push(item);
  }

  for (const athlete of athletes) {
    if (usedAthleteIds.has(athlete.id)) continue;
    const item = mergeProfileAndAthlete(null, athlete);
    if (item) merged.push(item);
  }

  return merged.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function loadMobileFeed(): Promise<MobileFeedItem[]> {
  const [postsSnapshot, videosSnapshot, directory] = await Promise.all([
    loadPublicCollection("publicacoes"),
    loadPublicCollection("videos"),
    loadAthleteDirectory().catch(() => []),
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
      legenda: text(data.legenda),
      videoUrl: text(data.videoUrl),
      criadoEm: data.criadoEm,
      status: text(data.status),
    };
  });

  const byUid = new Map(
    directory.filter((item) => item.ownerUid).map((item) => [item.ownerUid, item] as const),
  );

  return [...posts, ...videos]
    .filter((item) => item.ownerUid && item.status !== "removido")
    .sort((a, b) => millis(b.criadoEm) - millis(a.criadoEm))
    .map((item) => {
      const athlete = byUid.get(item.ownerUid);
      return {
        id: item.id,
        kind: item.kind,
        ownerUid: item.ownerUid,
        authorName: meaningfulName(athlete?.nome, item.nome),
        authorPhoto: athlete?.fotoUrl || "",
        text: text(item.texto) || text(item.legenda),
        mediaUrl:
          item.kind === "video"
            ? text(item.videoUrl)
            : text(item.imagemUrl) || text(item.imagem),
        createdAt: item.criadoEm,
      };
    });
}

export async function loadExploreProfiles(): Promise<MobileAthleteDirectoryItem[]> {
  return loadAthleteDirectory();
}

async function profilePrivacy(uid: string): Promise<"publico" | "privado"> {
  try {
    const privacy = await getDoc(doc(db, "config_perfis", uid));
    return privacy.exists() && privacy.data()?.privado === true ? "privado" : "publico";
  } catch {
    return "publico";
  }
}

export async function publishPost(input: {
  uid: string;
  email: string;
  nome: string;
  text: string;
  media?: UploadedMedia | null;
}) {
  const body = input.text.trim();
  if (!body && !input.media) throw new Error("Escreva algo ou selecione uma foto/vídeo.");
  if (body.length > 2200) throw new Error("A publicação pode ter no máximo 2.200 caracteres.");
  const visibility = await profilePrivacy(input.uid);

  if (input.media?.kind === "video") {
    await addDoc(collection(db, "videos"), {
      ownerUid: input.uid,
      nome: input.nome.trim() || "Atleta",
      videoUrl: input.media.url,
      videoPath: input.media.path,
      videoMime: input.media.mime,
      videoTamanho: input.media.size,
      legenda: body,
      hashtags: [],
      mencoes: [],
      visibilidade: visibility,
      aprovado: true,
      status: "publicado",
      criadoEm: serverTimestamp(),
    });
    return;
  }

  await addDoc(collection(db, "publicacoes"), {
    ownerUid: input.uid,
    ownerEmail: input.email.trim(),
    nome: input.nome.trim() || "Atleta",
    texto: body,
    imagem: "",
    imagemUrl: input.media?.url || "",
    imagemPath: input.media?.path || "",
    imagemMime: input.media?.mime || "image/jpeg",
    imagemTamanho: input.media?.size || 0,
    legenda: body,
    tipo: "imagem",
    midias: [],
    hashtags: [],
    mencoes: [],
    armazenamento: input.media ? "firebase-storage" : "nenhum",
    visibilidade: visibility,
    aprovado: true,
    status: "publicado",
    criadoEm: serverTimestamp(),
  });
}

export async function publishTextPost(input: {
  uid: string;
  email: string;
  nome: string;
  text: string;
}) {
  return publishPost({ ...input, media: null });
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
