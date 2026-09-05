import { collection, getDocs, getFirestore, limit, query, where } from "@react-native-firebase/firestore";

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

type LegacyAthlete = Partial<{
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
  return typeof value === "string" ? value.trim() : "";
}

function joinList(value: unknown): string {
  return Array.isArray(value)
    ? value.map((item) => text(item)).filter(Boolean).join(", ")
    : "";
}

function choose(...values: unknown[]): string {
  for (const value of values) {
    const candidate = text(value);
    if (candidate) return candidate;
  }
  return "";
}

function normalizeCategory(...values: unknown[]): AthleteCategory {
  const value = choose(...values).toLocaleLowerCase("pt-BR");
  if (value.includes("inic")) return "Iniciante";
  if (value.includes("avan")) return "Avançado";
  if (value.includes("inter")) return "Intermediário";
  return "";
}

function shouldReadLegacyAthlete(profile: PublicProfileV1 | null): boolean {
  return !profile || profile.completo !== true;
}

async function getLegacyAthleteByOwnerUid(uid: string): Promise<LegacyAthlete | null> {
  const db = getFirestore();
  const request = query(collection(db, "atletas"), where("ownerUid", "==", uid), limit(1));
  const snapshot = await getDocs(request);
  const document = snapshot.docs[0];
  return document ? (document.data() as LegacyAthlete) : null;
}

function buildResolvedProfile(
  uid: string,
  profile: PublicProfileV1 | null,
  account: UserAccountV1 | null,
  athlete: LegacyAthlete | null,
): PublicProfileV1 | null {
  if (!profile && !account && !athlete) return null;

  const history =
    Array.isArray(profile?.historicoCampeonatos) && profile.historicoCampeonatos.length > 0
      ? profile.historicoCampeonatos
      : Array.isArray(account?.historicoCampeonatos) && account.historicoCampeonatos.length > 0
        ? account.historicoCampeonatos
        : Array.isArray(athlete?.historicoCampeonatos)
          ? athlete.historicoCampeonatos
          : [];

  const cidade = choose(profile?.cidade, account?.cidade, athlete?.cidade);
  const uf = choose(profile?.uf, account?.uf, athlete?.uf).toUpperCase().slice(0, 2);
  const categoria = normalizeCategory(profile?.categoria, account?.categoria, athlete?.categoria);

  const resolved: PublicProfileV1 = {
    uid,
    nome: choose(profile?.nome, account?.nome, athlete?.nome, "Atleta"),
    cidade,
    uf,
    modalidade: choose(
      profile?.modalidade,
      account?.modalidade,
      joinList(account?.modalidades),
      athlete?.modalidade,
      joinList(athlete?.modalidades),
    ),
    posicao: choose(
      profile?.posicao,
      account?.posicao,
      joinList(account?.posicoes),
      athlete?.posicao,
      joinList(athlete?.posicoes),
    ),
    categoria,
    time: choose(profile?.time, account?.time, athlete?.time),
    bio: choose(profile?.bio, account?.bio, athlete?.bio, athlete?.observacoes),
    fotoUrl: choose(profile?.fotoUrl, account?.fotoUrl, athlete?.fotoUrl, athlete?.foto),
    fotoPath: choose(profile?.fotoPath, account?.fotoPath),
    capaUrl: choose(profile?.capaUrl, account?.capaUrl),
    capaPath: choose(profile?.capaPath, account?.capaPath),
    handle: choose(profile?.handle),
    instagramUrl: choose(profile?.instagramUrl, account?.instagramUrl, athlete?.instagramUrl),
    historicoCampeonatos: history,
    completo: Boolean(cidade && uf.length === 2 && categoria),
  };

  return resolved;
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
  const [profile, account] = await Promise.all([
    firebaseProfileRepository.getByUid(uid),
    firebaseAccountRepository.getByUid(uid),
  ]);

  const legacyAthlete = shouldReadLegacyAthlete(profile)
    ? await getLegacyAthleteByOwnerUid(uid).catch(() => null)
    : null;

  return {
    profile,
    account,
    legacyAthlete,
    resolved: buildResolvedProfile(uid, profile, account, legacyAthlete),
    source: sourceLabel(profile, account, legacyAthlete),
  };
}
