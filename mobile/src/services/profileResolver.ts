import { collection, getDocs, getFirestore, limit, query, where } from "@react-native-firebase/firestore";

import type { PublicProfileV1, UserAccountV1 } from "../contracts/schema-v1";
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
  historicoCampeonatos: unknown[];
}>;

export type ResolvedProfile = {
  profile: PublicProfileV1 | null;
  account: UserAccountV1 | null;
  legacyAthlete: LegacyAthlete | null;
  resolved: PublicProfileV1 | null;
  source: "perfil" | "perfil+usuario" | "perfil+atleta" | "perfil+usuario+atleta" | "usuario" | "atleta" | "nenhuma";
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

function profileHasSportsData(profile: PublicProfileV1 | null): boolean {
  if (!profile) return false;
  return Boolean(
    text(profile.cidade) ||
      text(profile.uf) ||
      text(profile.modalidade) ||
      text(profile.posicao) ||
      text(profile.categoria) ||
      text(profile.time) ||
      text(profile.fotoUrl),
  );
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
      : Array.isArray(athlete?.historicoCampeonatos)
        ? athlete.historicoCampeonatos
        : [];

  const modalidade = choose(
    profile?.modalidade,
    account?.modalidade,
    joinList((account as { modalidades?: unknown } | null)?.modalidades),
    athlete?.modalidade,
    joinList(athlete?.modalidades),
  );

  const posicao = choose(
    profile?.posicao,
    account?.posicao,
    joinList((account as { posicoes?: unknown } | null)?.posicoes),
    athlete?.posicao,
    joinList(athlete?.posicoes),
  );

  const resolved: PublicProfileV1 = {
    uid,
    nome: choose(profile?.nome, account?.nome, athlete?.nome, "Atleta"),
    cidade: choose(profile?.cidade, account?.cidade, athlete?.cidade),
    uf: choose(profile?.uf, account?.uf, athlete?.uf).toUpperCase().slice(0, 2),
    modalidade,
    posicao,
    categoria: choose(profile?.categoria, account?.categoria, athlete?.categoria),
    time: choose(profile?.time, account?.time, athlete?.time),
    bio: choose(profile?.bio, (account as { bio?: unknown } | null)?.bio, athlete?.bio, athlete?.observacoes),
    fotoUrl: choose(profile?.fotoUrl, (account as { fotoUrl?: unknown } | null)?.fotoUrl, athlete?.fotoUrl, athlete?.foto),
    fotoPath: choose(profile?.fotoPath, (account as { fotoPath?: unknown } | null)?.fotoPath),
    capaUrl: choose(profile?.capaUrl, (account as { capaUrl?: unknown } | null)?.capaUrl),
    capaPath: choose(profile?.capaPath, (account as { capaPath?: unknown } | null)?.capaPath),
    handle: choose(profile?.handle),
    instagramUrl: choose(profile?.instagramUrl, (account as { instagramUrl?: unknown } | null)?.instagramUrl, athlete?.instagramUrl),
    historicoCampeonatos: history as PublicProfileV1["historicoCampeonatos"],
    completo: Boolean(
      choose(profile?.cidade, account?.cidade, athlete?.cidade) &&
        choose(profile?.categoria, account?.categoria, athlete?.categoria),
    ),
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

  const legacyAthlete = profileHasSportsData(profile)
    ? null
    : await getLegacyAthleteByOwnerUid(uid).catch(() => null);

  return {
    profile,
    account,
    legacyAthlete,
    resolved: buildResolvedProfile(uid, profile, account, legacyAthlete),
    source: sourceLabel(profile, account, legacyAthlete),
  };
}
