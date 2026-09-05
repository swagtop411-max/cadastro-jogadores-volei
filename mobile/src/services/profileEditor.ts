import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "@react-native-firebase/firestore";

import type {
  AthleteCategory,
  ChampionshipHistoryItemV1,
  PublicProfileV1,
} from "../contracts/schema-v1";
import { resolveProfile } from "./profileResolver";

const db = getFirestore();

export type ProfileEditValues = {
  nome: string;
  nascimento: string;
  cidade: string;
  uf: string;
  modalidade: string;
  posicao: string;
  categoria: AthleteCategory;
  time: string;
  contato: string;
  bio: string;
  instagramUrl: string;
  historicoCampeonatos: ChampionshipHistoryItemV1[];
  fotoUrl: string;
  fotoPath: string;
};

const UFS = new Set([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLocation(cidade: string, rawUf: string) {
  let city = text(cidade).replace(/\s+/g, " ");
  let uf = text(rawUf).toUpperCase();
  const prefix = city.match(/^([A-Z]{2})\s*[-,]\s*(.+)$/i);
  if (prefix) {
    uf ||= prefix[1]?.toUpperCase() || "";
    city = text(prefix[2]);
  } else {
    const suffix = city.match(/^(.+?)\s*[-,]\s*([A-Z]{2})$/i);
    if (suffix) {
      uf ||= suffix[2]?.toUpperCase() || "";
      city = text(suffix[1]);
    }
  }
  return { cidade: city, uf };
}

function normalizeHistory(history: ChampionshipHistoryItemV1[]): ChampionshipHistoryItemV1[] {
  const seen = new Set<string>();
  const result: ChampionshipHistoryItemV1[] = [];
  for (const item of history.slice(0, 30)) {
    const campeonato = text(item.campeonato || item.nome || item.evento);
    const colocacao = text(item.colocacao || item.resultado);
    const ano = text(item.ano || item.data);
    if (!campeonato && !colocacao && !ano) continue;
    if (!campeonato || !colocacao || !ano) {
      throw new Error("Complete campeonato, colocação e ano em todos os itens do histórico.");
    }
    const key = `${campeonato.toLocaleLowerCase("pt-BR")}|${colocacao.toLocaleLowerCase("pt-BR")}|${ano}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ campeonato, colocacao, ano });
  }
  return result;
}

export async function loadOwnProfileForEdit(uid: string): Promise<ProfileEditValues> {
  const resolved = await resolveProfile(uid);
  const profile = resolved.resolved;
  const account = resolved.account;
  if (!profile && !account) throw new Error("Não foi possível localizar seu perfil.");
  return {
    nome: profile?.nome || account?.nome || "",
    nascimento: account?.nascimento || "",
    cidade: profile?.cidade || account?.cidade || "",
    uf: profile?.uf || account?.uf || "",
    modalidade: profile?.modalidade || account?.modalidade || "",
    posicao: profile?.posicao || account?.posicao || "",
    categoria: profile?.categoria || account?.categoria || "",
    time: profile?.time || account?.time || "",
    contato: account?.contato || "",
    bio: profile?.bio || account?.bio || "",
    instagramUrl: profile?.instagramUrl || account?.instagramUrl || "",
    historicoCampeonatos: profile?.historicoCampeonatos || [],
    fotoUrl: profile?.fotoUrl || account?.fotoUrl || "",
    fotoPath: profile?.fotoPath || account?.fotoPath || "",
  };
}

export async function saveOwnProfile(input: {
  uid: string;
  email: string;
  values: ProfileEditValues;
}): Promise<PublicProfileV1> {
  const { uid, email } = input;
  const values = input.values;
  const nome = text(values.nome);
  const loc = normalizeLocation(values.cidade, values.uf);
  const modalidade = text(values.modalidade);
  const posicao = text(values.posicao);
  const categoria = values.categoria;
  const time = text(values.time);
  const contato = text(values.contato);
  const bio = text(values.bio).slice(0, 500);
  const nascimento = text(values.nascimento);
  const instagramUrl = text(values.instagramUrl).slice(0, 300);
  const historicoCampeonatos = normalizeHistory(values.historicoCampeonatos);
  const fotoUrl = text(values.fotoUrl);
  const fotoPath = text(values.fotoPath);

  if (nome.length < 2) throw new Error("Informe seu nome completo ou nome esportivo.");
  if (loc.cidade.length < 2) throw new Error("Informe sua cidade.");
  if (!UFS.has(loc.uf)) throw new Error("Informe uma UF válida, por exemplo SP.");
  if (!categoria) throw new Error("Selecione sua categoria.");

  const [accountSnap, profileSnap] = await Promise.all([
    getDoc(doc(db, "usuarios", uid)),
    getDoc(doc(db, "perfis", uid)),
  ]);
  const account = accountSnap.exists() ? accountSnap.data() : null;
  const currentProfile = profileSnap.exists() ? (profileSnap.data() as Partial<PublicProfileV1>) : null;
  const now = serverTimestamp();

  if (account) {
    await setDoc(
      doc(db, "usuarios", uid),
      {
        nome,
        nascimento,
        cidade: loc.cidade,
        uf: loc.uf,
        modalidade,
        posicao,
        categoria,
        time,
        contato,
        bio,
        historicoCampeonatos,
        fotoUrl,
        fotoPath,
        instagramUrl,
        atualizadoEm: now,
      },
      { merge: true },
    );
  } else {
    await setDoc(doc(db, "usuarios", uid), {
      uid,
      nome,
      email,
      papel: "usuario",
      status: "ativo",
      criadoEm: now,
      atualizadoEm: now,
      nascimento,
      cidade: loc.cidade,
      uf: loc.uf,
      modalidade,
      posicao,
      categoria,
      time,
      contato,
      bio,
      historicoCampeonatos,
      fotoUrl,
      fotoPath,
      instagramUrl,
    });
  }

  const publicProfile: PublicProfileV1 = {
    uid,
    nome,
    cidade: loc.cidade,
    uf: loc.uf,
    modalidade,
    posicao,
    categoria,
    time,
    bio,
    fotoUrl,
    fotoPath,
    capaUrl: text(currentProfile?.capaUrl),
    capaPath: text(currentProfile?.capaPath),
    historicoCampeonatos,
    handle: text(currentProfile?.handle),
    instagramUrl,
    completo: true,
  };

  await setDoc(doc(db, "perfis", uid), publicProfile, { merge: true });

  const legacy = await getDocs(query(collection(db, "atletas"), where("ownerUid", "==", uid)));
  await Promise.all(
    legacy.docs.map((document) =>
      setDoc(
        document.ref,
        {
          ownerUid: uid,
          nome,
          cidade: loc.uf ? `${loc.uf} - ${loc.cidade}` : loc.cidade,
          uf: loc.uf,
          modalidade,
          posicao,
          categoria,
          time,
          historicoCampeonatos,
          observacoes: bio,
          instagramUrl,
          foto: fotoUrl,
          atualizadoEm: now,
        },
        { merge: true },
      ),
    ),
  );

  return publicProfile;
}
