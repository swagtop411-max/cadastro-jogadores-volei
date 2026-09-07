import { getAuth } from "@react-native-firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "@react-native-firebase/firestore";

import { createActivityNotification } from "./notificationService";

const db = getFirestore();

export type SocialPostState = {
  liked: boolean;
  saved: boolean;
  likeCount: number;
  commentCount: number;
};

export type SocialComment = {
  id: string;
  ownerUid: string;
  nome: string;
  texto: string;
  createdAt: unknown;
};

export type FollowState = {
  following: boolean;
  requested: boolean;
  privateProfile: boolean;
  followerCount: number;
  followingCount: number;
};

export type SocialUserRef = {
  uid: string;
  createdAt: unknown;
};

function requireUser() {
  const user = getAuth().currentUser;
  if (!user) throw new Error("Entre na sua conta para usar os recursos sociais.");
  return user;
}

async function socialTargetOwner(postId: string) {
  try {
    const image = await getDoc(doc(db, "publicacoes", postId));
    if (image.exists()) return String(image.data()?.ownerUid || "");
  } catch {
    // Tenta a coleção de vídeos abaixo.
  }
  try {
    const video = await getDoc(doc(db, "videos", postId));
    if (video.exists()) return String(video.data()?.ownerUid || "");
  } catch {
    // Notificação é melhor esforço e não bloqueia a ação social.
  }
  return "";
}

async function loadApprovedComments(postId: string) {
  const base = collection(db, "comentarios_publicacoes");
  try {
    return await getDocs(
      query(
        base,
        where("publicacaoId", "==", postId),
        where("aprovado", "==", true),
        orderBy("criadoEm", "asc"),
      ),
    );
  } catch {
    return getDocs(
      query(base, where("publicacaoId", "==", postId), where("aprovado", "==", true)),
    );
  }
}

export async function loadPostSocialState(postId: string): Promise<SocialPostState> {
  const user = getAuth().currentUser;
  const likesRef = collection(db, "curtidas_publicacoes", postId, "usuarios");
  const [likes, comments, likedDoc, savedDoc] = await Promise.all([
    getDocs(likesRef),
    loadApprovedComments(postId),
    user ? getDoc(doc(db, "curtidas_publicacoes", postId, "usuarios", user.uid)) : Promise.resolve(null),
    user ? getDoc(doc(db, "salvos", user.uid, "publicacoes", postId)) : Promise.resolve(null),
  ]);

  return {
    liked: Boolean(likedDoc?.exists()),
    saved: Boolean(savedDoc?.exists()),
    likeCount: likes.size,
    commentCount: comments.size,
  };
}

export async function toggleLike(postId: string, currentlyLiked: boolean) {
  const user = requireUser();
  const ref = doc(db, "curtidas_publicacoes", postId, "usuarios", user.uid);
  if (currentlyLiked) {
    await deleteDoc(ref);
    return false;
  }
  await setDoc(ref, { uid: user.uid, criadoEm: serverTimestamp() });
  void socialTargetOwner(postId).then((targetUid) => targetUid && createActivityNotification({
    targetUid,
    type: "like",
    sourceId: postId,
    text: "curtiu sua publicação",
  })).catch(() => undefined);
  return true;
}

export async function toggleSaved(postId: string, kind: "image" | "video", currentlySaved: boolean) {
  const user = requireUser();
  const ref = doc(db, "salvos", user.uid, "publicacoes", postId);
  if (currentlySaved) {
    await deleteDoc(ref);
    return false;
  }
  await setDoc(ref, { postId, kind, createdAt: serverTimestamp() });
  return true;
}

export async function loadComments(postId: string): Promise<SocialComment[]> {
  const snapshot = await loadApprovedComments(postId);
  const comments = snapshot.docs.map((item) => {
    const data = item.data() as Record<string, unknown>;
    return {
      id: item.id,
      ownerUid: String(data.ownerUid || ""),
      nome: String(data.nome || "Atleta"),
      texto: String(data.texto || ""),
      createdAt: data.criadoEm,
    };
  });

  return comments.sort((a, b) => {
    const aValue = a.createdAt as { toMillis?: () => number; seconds?: number } | undefined;
    const bValue = b.createdAt as { toMillis?: () => number; seconds?: number } | undefined;
    const am = aValue?.toMillis?.() ?? (aValue?.seconds ?? 0) * 1000;
    const bm = bValue?.toMillis?.() ?? (bValue?.seconds ?? 0) * 1000;
    return am - bm;
  });
}

export async function addComment(postId: string, rawText: string) {
  const user = requireUser();
  const texto = rawText.trim();
  if (!texto) throw new Error("Escreva um comentário.");
  if (texto.length > 500) throw new Error("O comentário pode ter no máximo 500 caracteres.");
  const email = user.email || "";
  if (!email) throw new Error("Sua conta precisa ter um e-mail válido.");
  const nome = (user.displayName || email.split("@")[0] || "Atleta").trim().slice(0, 100);

  const created = await addDoc(collection(db, "comentarios_publicacoes"), {
    ownerUid: user.uid,
    ownerEmail: email,
    publicacaoId: postId,
    nome: nome.length >= 2 ? nome : "Atleta",
    texto,
    aprovado: true,
    status: "publicado",
    criadoEm: serverTimestamp(),
  });
  void socialTargetOwner(postId).then((targetUid) => targetUid && createActivityNotification({
    targetUid,
    type: "comment",
    sourceId: postId,
    text: texto.slice(0, 180),
  })).catch(() => undefined);
  return created.id;
}

export async function deleteOwnComment(commentId: string) {
  requireUser();
  await deleteDoc(doc(db, "comentarios_publicacoes", commentId));
}

async function profileIsPrivate(uid: string) {
  const snapshot = await getDoc(doc(db, "config_perfis", uid));
  return snapshot.exists() && snapshot.data()?.privado === true;
}

export async function loadFollowState(targetUid: string): Promise<FollowState> {
  const user = getAuth().currentUser;
  const [followers, following, privacy] = await Promise.all([
    getDocs(collection(db, "seguidores", targetUid, "usuarios")),
    getDocs(collection(db, "seguindo", targetUid, "usuarios")),
    profileIsPrivate(targetUid),
  ]);

  if (!user || user.uid === targetUid) {
    return {
      following: user?.uid === targetUid,
      requested: false,
      privateProfile: privacy,
      followerCount: followers.size,
      followingCount: following.size,
    };
  }

  const [followDoc, requestDoc] = await Promise.all([
    getDoc(doc(db, "seguidores", targetUid, "usuarios", user.uid)),
    getDoc(doc(db, "solicitacoes_seguir", targetUid, "usuarios", user.uid)),
  ]);

  return {
    following: followDoc.exists(),
    requested: requestDoc.exists(),
    privateProfile: privacy,
    followerCount: followers.size,
    followingCount: following.size,
  };
}

export async function loadFollowerRefs(uid: string): Promise<SocialUserRef[]> {
  const snapshot = await getDocs(collection(db, "seguidores", uid, "usuarios"));
  return snapshot.docs.map((entry) => ({ uid: entry.id, createdAt: entry.data()?.criadoEm }));
}

export async function loadFollowingRefs(uid: string): Promise<SocialUserRef[]> {
  const snapshot = await getDocs(collection(db, "seguindo", uid, "usuarios"));
  return snapshot.docs.map((entry) => ({ uid: entry.id, createdAt: entry.data()?.criadoEm }));
}

export async function toggleFollow(targetUid: string, state: FollowState): Promise<"following" | "requested" | "none"> {
  const user = requireUser();
  if (user.uid === targetUid) return "following";

  if (state.following) {
    const batch = writeBatch(db);
    batch.delete(doc(db, "seguidores", targetUid, "usuarios", user.uid));
    batch.delete(doc(db, "seguindo", user.uid, "usuarios", targetUid));
    await batch.commit();
    return "none";
  }

  if (state.requested) {
    await deleteDoc(doc(db, "solicitacoes_seguir", targetUid, "usuarios", user.uid));
    return "none";
  }

  if (state.privateProfile) {
    await setDoc(doc(db, "solicitacoes_seguir", targetUid, "usuarios", user.uid), {
      uid: user.uid,
      status: "pendente",
      criadoEm: serverTimestamp(),
    });
    void createActivityNotification({ targetUid, type: "follow", sourceId: user.uid, text: "solicitou seguir você" }).catch(() => undefined);
    return "requested";
  }

  const batch = writeBatch(db);
  batch.set(doc(db, "seguidores", targetUid, "usuarios", user.uid), {
    uid: user.uid,
    criadoEm: serverTimestamp(),
  });
  batch.set(doc(db, "seguindo", user.uid, "usuarios", targetUid), {
    uid: targetUid,
    criadoEm: serverTimestamp(),
  });
  await batch.commit();
  void createActivityNotification({ targetUid, type: "follow", sourceId: user.uid, text: "começou a seguir você" }).catch(() => undefined);
  return "following";
}
