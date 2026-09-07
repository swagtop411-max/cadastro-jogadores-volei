import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
} from "@react-native-firebase/firestore";

import type { PublicProfileV1, UserAccountV1 } from "../../contracts/schema-v1";
import type {
  AccountRepository,
  PageResult,
  ProfileRepository,
} from "../contracts";

const db = getFirestore();

export const firebaseAccountRepository: AccountRepository = {
  async getByUid(uid) {
    const snapshot = await getDoc(doc(db, "usuarios", uid));
    return snapshot.exists() ? (snapshot.data() as UserAccountV1) : null;
  },

  async ensureInitialAccount(input) {
    const reference = doc(db, "usuarios", input.uid);
    const existing = await getDoc(reference);
    if (existing.exists()) return;

    const now = serverTimestamp();
    await setDoc(reference, {
      uid: input.uid,
      nome: input.nome.trim(),
      email: input.email.trim().toLowerCase(),
      papel: "usuario",
      status: "ativo",
      criadoEm: now,
      atualizadoEm: now,
    });
  },
};

function initialPublicProfile(input: Pick<PublicProfileV1, "uid" | "nome">): PublicProfileV1 {
  return {
    uid: input.uid,
    nome: input.nome.trim(),
    cidade: "",
    uf: "",
    modalidade: "",
    posicao: "",
    categoria: "",
    time: "",
    bio: "",
    fotoUrl: "",
    fotoPath: "",
    capaUrl: "",
    capaPath: "",
    handle: "",
    instagramUrl: "",
    historicoCampeonatos: [],
    completo: false,
  };
}

export const firebaseProfileRepository: ProfileRepository = {
  async getByUid(uid) {
    const snapshot = await getDoc(doc(db, "perfis", uid));
    return snapshot.exists() ? (snapshot.data() as PublicProfileV1) : null;
  },

  async ensureInitialProfile(input) {
    const reference = doc(db, "perfis", input.uid);
    const existing = await getDoc(reference);
    if (existing.exists()) return;

    await setDoc(reference, initialPublicProfile(input));
  },

  async updateOwnProfile(uid, patch) {
    const sanitized = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined),
    );

    if (Object.keys(sanitized).length === 0) return;
    await updateDoc(doc(db, "perfis", uid), sanitized);
  },

  async listProfiles(input): Promise<PageResult<PublicProfileV1>> {
    const profiles = collection(db, "perfis");
    const baseConstraints = [orderBy("nome", "asc"), limit(input.limit + 1)];
    const request = input.cursor?.value
      ? query(profiles, orderBy("nome", "asc"), startAfter(input.cursor.value), limit(input.limit + 1))
      : query(profiles, ...baseConstraints);

    const snapshot = await getDocs(request);
    const hasMore = snapshot.docs.length > input.limit;
    const visibleDocs = hasMore ? snapshot.docs.slice(0, input.limit) : snapshot.docs;
    const last = visibleDocs.at(-1) ?? null;

    return {
      items: visibleDocs.map((item) => item.data() as PublicProfileV1),
      hasMore,
      nextCursor: last ? { value: last } : null,
    };
  },
};
