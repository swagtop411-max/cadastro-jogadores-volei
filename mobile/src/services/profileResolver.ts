import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  query,
  where,
} from "@react-native-firebase/firestore";

import type {
  AthleteCategory,
  ChampionshipHistoryItemV1,
  PublicProfileV1,
  UserAccountV1,
} from "../contracts/schema-v1";
import {
  firebaseAccountRepository,
  firebaseProfileRepository,
} from "../repositories/firebase/firestoreRepositories";

export type LegacyAthlete = Partial<{
  id: string;
  ownerUid: string;
  nome: string;
  cidade: string;
  uf: string;
  modalidade: string;
  modalidades: string[];
  posicao: string;
  posicoes: string[];
  categoria: string;
  time: string;
  observacoes: string;
  bio: string;
  foto: string;
  fotoUrl: string;
  instagramUrl: string;
  historicoCampeonatos: ChampionshipHistoryItemV1[];
  historicoEquipes: unknown[];
}>;

export type ResolvedProfile = {
  profile: PublicProfileV1 | null;
  account: UserAccountV1 | null;
  legacyAthlete: LegacyAthlete | null;
  resolved: PublicProfileV1 | null;
  source:
    | "perfil"
    | "perfil+usuario"
    | "perfil+atleta"
    | "perfil+usuario+atleta"
    | "usuario"
    | "atleta"
    | "nenhuma";
};

function text(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function normalizedText(value: unknown): string {
  return text(value)
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isPlaceholder(value: unknown): boolean {
  const normalized = normalizedText(value);
  return new Set([
    "",
    "nao informada",
    "nao informado",
    "nao preenchida",
    "nao preenchido",
    "em preenchimento",
    "selecione",
    "indefinida",
    "indefinido",
    "n/a",
    "nenhuma",
    "nenhum",
  ]).has(normalized);
}

function choose(...values: unknown[]): string {
  for (const value of values) {
    const candidate = text(value);
    if (candidate) return candidate;
  }
  return "";
}

function chooseMeaningful(...values: unknown[]): string {
  for (const value of values) {
    const candidate = text(value);
    if (candidate && !isPlaceholder(candidate)) return candidate;
  }
  return "";
}

function valuesFrom(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => valuesFrom(item));
  }
  const raw = text(value);
  if (!raw) return [];
  return raw
    .split(/[,;|]/)
    .map((item) => item.trim())
    .filter((item) => item && !isPlaceholder(item));
}

function mergeStringList(...values: unknown[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    for (const item of valuesFrom(value)) {
      const key = normalizedText(item);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

function chooseName(...values: unknown[]): string {
  const candidates = values.map((value) => text(value)).filter(Boolean);
  const placeholders = new Set(["usuario", "usuário", "user", "atleta"]);
  const meaningful = candidates.find(
    (candidate) => !placeholders.has(candidate.toLocaleLowerCase("pt-BR")),
  );
  return meaningful || candidates[0] || "Atleta";
}

function normalizeCategory(...values: unknown[]): AthleteCategory {
  for (const raw of values) {
    const value = normalizedText(raw);
    if (!value || isPlaceholder(raw)) continue;
    if (value.includes("inic")) return "Iniciante";
    if (value.includes("avan")) return "Avançado";
    if (value.includes("inter")) return "Intermediário";
  }
  return "";
}

function normalizeCity(value: unknown, uf: string): string {
  const city = text(value).replace(/\s+/g, " ");
  if (!city) return "";

  const prefixed = city.match(/^([A-Z]{2})\s*[-,]\s*(.+)$/i);
  if (prefixed) {
    const prefixUf = prefixed[1]?.toUpperCase();
    if (!uf || prefixUf === uf) return text(prefixed[2]);
  }

  const suffixed = city.match(/^(.+?)\s*[-,]\s*([A-Z]{2})$/i);
  if (suffixed) {
    const suffixUf = suffixed[2]?.toUpperCase();
    if (!uf || suffixUf === uf) return text(suffixed[1]);
  }

  return city;
}

function historyKey(item: ChampionshipHistoryItemV1): string {
  return [
    item.campeonato || item.nome || item.evento,
    item.colocacao || item.resultado,
    item.ano || item.data,
  ]
    .map((value) => text(value).toLocaleLowerCase("pt-BR"))
    .join("|");
}

function mergeHistory(...values: unknown[]): ChampionshipHistoryItemV1[] {
  const seen = new Set<string>();
  const merged: ChampionshipHistoryItemV1[] = [];
  for (const value of values) {
    if (!Array.isArray(value)) continue;
    for (const raw of value) {
      if (!raw || typeof raw !== "object") continue;
      const item = raw as ChampionshipHistoryItemV1;
      const key = historyKey(item);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }
  return merged.slice(0, 30);
}

async function getLegacyAthleteByOwnerUid(uid: string): Promise<LegacyAthlete | null> {
  const db = getFirestore();
  const request = query(collection(db, "atletas"), where("ownerUid", "==", uid), limit(1));
  const snapshot = await getDocs(request);
  const document = snapshot.docs[0];
  return document ? ({ id: document.id, ...(document.data() as LegacyAthlete) }) : null;
}

export async function getLegacyAthleteById(id: string): Promise<LegacyAthlete | null> {
  const normalized = String(id || "").trim();
  if (!normalized) return null;
  const snapshot = await getDoc(doc(getFirestore(), "atletas", normalized));
  return snapshot.exists()
    ? ({ id: snapshot.id, ...(snapshot.data() as LegacyAthlete) })
    : null;
}

function buildResolvedProfile(
  uid: string,
  profile: PublicProfileV1 | null,
  account: UserAccountV1 | null,
  athlete: LegacyAthlete | null,
): PublicProfileV1 | null {
  if (!profile && !account && !athlete) return null;

  const history = mergeHistory(
    profile?.historicoCampeonatos,
    account?.historicoCampeonatos,
    athlete?.historicoCampeonatos,
  );
  const uf = chooseMeaningful(profile?.uf, account?.uf, athlete?.uf).toUpperCase().slice(0, 2);
  const cidade = normalizeCity(
    chooseMeaningful(profile?.cidade, account?.cidade, athlete?.cidade),
    uf,
  );
  const categoria = normalizeCategory(profile?.categoria, account?.categoria, athlete?.categoria);
  const modalidades = mergeStringList(
    profile?.modalidade,
    account?.modalidades,
    account?.modalidade,
    athlete?.modalidades,
    athlete?.modalidade,
  );
  const posicoes = mergeStringList(
    profile?.posicao,
    account?.posicoes,
    account?.posicao,
    athlete?.posicoes,
    athlete?.posicao,
  );

  return {
    uid,
    nome: chooseName(profile?.nome, account?.nome, athlete?.nome),
    cidade,
    uf,
    modalidade: modalidades.join(", "),
    posicao: posicoes.join(", "),
    categoria,
    time: chooseMeaningful(profile?.time, account?.time, athlete?.time),
    bio: chooseMeaningful(profile?.bio, account?.bio, athlete?.bio, athlete?.observacoes),
    fotoUrl: chooseMeaningful(profile?.fotoUrl, account?.fotoUrl, athlete?.fotoUrl, athlete?.foto),
    fotoPath: chooseMeaningful(profile?.fotoPath, account?.fotoPath),
    capaUrl: chooseMeaningful(profile?.capaUrl, account?.capaUrl),
    capaPath: chooseMeaningful(profile?.capaPath, account?.capaPath),
    handle: chooseMeaningful(profile?.handle),
    instagramUrl: chooseMeaningful(
      profile?.instagramUrl,
      account?.instagramUrl,
      athlete?.instagramUrl,
    ),
    historicoCampeonatos: history,
    completo: Boolean(cidade && uf.length === 2 && categoria),
  };
}

function sourceLabel(
  profile: PublicProfileV1 | null,
  account: UserAccountV1 | null,
  athlete: LegacyAthlete | null,
): ResolvedProfile["source"] {
  const hasProfile = Boolean(profile);
  const hasAccount = Boolean(account);
  const hasAthlete = Boolean(athlete);

  if (hasProfile && hasAccount && hasAthlete) return "perfil+usuario+atleta";
  if (hasProfile && hasAccount) return "perfil+usuario";
  if (hasProfile && hasAthlete) return "perfil+atleta";
  if (hasProfile) return "perfil";
  if (hasAccount) return "usuario";
  if (hasAthlete) return "atleta";
  return "nenhuma";
}

export async function resolveProfile(uid: string): Promise<ResolvedProfile> {
  const [profile, account, legacyAthlete] = await Promise.all([
    firebaseProfileRepository.getByUid(uid).catch(() => null),
    firebaseAccountRepository.getByUid(uid).catch(() => null),
    getLegacyAthleteByOwnerUid(uid).catch(() => null),
  ]);

  return {
    profile,
    account,
    legacyAthlete,
    resolved: buildResolvedProfile(uid, profile, account, legacyAthlete),
    source: sourceLabel(profile, account, legacyAthlete),
  };
}

export async function resolveLegacyAthleteById(id: string): Promise<PublicProfileV1 | null> {
  const athlete = await getLegacyAthleteById(id);
  if (!athlete) return null;
  const uid = athlete.ownerUid || `legacy:${id}`;
  if (athlete.ownerUid) {
    const linked = await resolveProfile(athlete.ownerUid).catch(() => null);
    if (linked?.resolved) return linked.resolved;
  }
  return buildResolvedProfile(uid, null, null, athlete);
}
