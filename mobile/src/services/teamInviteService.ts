import { getAuth } from "@react-native-firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "@react-native-firebase/firestore";

import { createActivityNotification } from "./notificationService";
import { resolveProfile } from "./profileResolver";
import { loadTeam, type MobileTeam } from "./teamService";

const db = getFirestore();

export type TeamInviteStatus = "pendente" | "aceito" | "recusado" | "cancelado";

export type TeamInvite = {
  id: string;
  teamId: string;
  teamName: string;
  inviterUid: string;
  targetUid: string;
  targetName: string;
  status: TeamInviteStatus;
  createdAt: unknown;
  respondedAt: unknown;
};

export type TeamMember = {
  uid: string;
  teamId: string;
  inviteId: string;
  role: "capitao" | "atleta";
  name: string;
  photo: string;
  createdAt: unknown;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function inviteFromDoc(entry: { id: string; data: () => Record<string, unknown> }): TeamInvite {
  const data = entry.data();
  return {
    id: entry.id,
    teamId: text(data.equipeId),
    teamName: text(data.equipeNome) || "Equipe",
    inviterUid: text(data.convidadoPorUid),
    targetUid: text(data.atletaUid),
    targetName: text(data.atletaNome) || "Atleta",
    status: (text(data.status) || "pendente") as TeamInviteStatus,
    createdAt: data.criadoEm,
    respondedAt: data.respondidoEm,
  };
}

function millis(value: unknown) {
  if (value && typeof value === "object") {
    const stamp = value as { toMillis?: () => number; seconds?: number };
    if (typeof stamp.toMillis === "function") return stamp.toMillis();
    if (typeof stamp.seconds === "number") return stamp.seconds * 1000;
  }
  return 0;
}

async function ensureTeamOwner(teamId: string, uid: string): Promise<MobileTeam> {
  const team = await loadTeam(teamId);
  if (!team) throw new Error("Equipe não encontrada.");
  if (team.ownerUid !== uid) throw new Error("Somente o responsável pela equipe pode enviar convites.");
  return team;
}

async function hasPendingInvite(teamId: string, targetUid: string) {
  const snapshot = await getDocs(query(collection(db, "equipe_convites"), where("atletaUid", "==", targetUid), limit(100)));
  return snapshot.docs.some((entry) => {
    const data = entry.data() as Record<string, unknown>;
    return text(data.equipeId) === teamId && text(data.status) === "pendente";
  });
}

export async function inviteAthleteToTeam(teamId: string, targetUid: string) {
  const user = getAuth().currentUser;
  if (!user) throw new Error("Entre na sua conta para convidar atletas.");
  if (!targetUid || targetUid === user.uid) throw new Error("Selecione outro atleta para o convite.");
  const [team, targetProfile] = await Promise.all([
    ensureTeamOwner(teamId, user.uid),
    resolveProfile(targetUid),
  ]);
  if (!targetProfile.resolved) throw new Error("O atleta precisa ter um perfil no app para receber convites.");
  if (await hasPendingInvite(teamId, targetUid)) throw new Error("Já existe um convite pendente para este atleta.");

  const created = await addDoc(collection(db, "equipe_convites"), {
    equipeId: team.id,
    equipeNome: team.nome,
    convidadoPorUid: user.uid,
    atletaUid: targetUid,
    atletaNome: targetProfile.resolved.nome || "Atleta",
    status: "pendente",
    criadoEm: serverTimestamp(),
  });

  await createActivityNotification({
    targetUid,
    type: "team_invite",
    sourceId: created.id,
    text: `convidou você para a equipe ${team.nome}`,
  }).catch(() => undefined);

  return created.id;
}

export function subscribeIncomingTeamInvites(
  onData: (items: TeamInvite[]) => void,
  onError?: (error: Error) => void,
) {
  const uid = getAuth().currentUser?.uid;
  if (!uid) {
    onData([]);
    return () => undefined;
  }
  const base = query(collection(db, "equipe_convites"), where("atletaUid", "==", uid), limit(100));
  return onSnapshot(base, (snapshot) => {
    const items = snapshot.docs
      .map((entry) => inviteFromDoc({ id: entry.id, data: () => entry.data() as Record<string, unknown> }))
      .sort((a, b) => millis(b.createdAt) - millis(a.createdAt));
    onData(items);
  }, (cause) => onError?.(cause instanceof Error ? cause : new Error("Não foi possível acompanhar os convites.")));
}

export async function loadOutgoingTeamInvites(): Promise<TeamInvite[]> {
  const uid = getAuth().currentUser?.uid;
  if (!uid) return [];
  const snapshot = await getDocs(query(collection(db, "equipe_convites"), where("convidadoPorUid", "==", uid), limit(100)));
  return snapshot.docs
    .map((entry) => inviteFromDoc({ id: entry.id, data: () => entry.data() as Record<string, unknown> }))
    .sort((a, b) => millis(b.createdAt) - millis(a.createdAt));
}

export async function respondToTeamInvite(inviteId: string, decision: "aceito" | "recusado") {
  const user = getAuth().currentUser;
  if (!user) throw new Error("Entre na sua conta para responder ao convite.");
  const inviteRef = doc(db, "equipe_convites", inviteId);
  const snapshot = await getDoc(inviteRef);
  if (!snapshot.exists()) throw new Error("Este convite não está mais disponível.");
  const invite = inviteFromDoc({ id: snapshot.id, data: () => snapshot.data() as Record<string, unknown> });
  if (invite.targetUid !== user.uid) throw new Error("Este convite pertence a outro atleta.");
  if (invite.status !== "pendente") throw new Error("Este convite já foi respondido.");

  const profile = await resolveProfile(user.uid).catch(() => null);
  const batch = writeBatch(db);
  batch.update(inviteRef, { status: decision, respondidoEm: serverTimestamp() });
  if (decision === "aceito") {
    batch.set(doc(db, "equipes", invite.teamId, "membros", user.uid), {
      uid: user.uid,
      equipeId: invite.teamId,
      conviteId: invite.id,
      papel: "atleta",
      nome: profile?.resolved?.nome || user.displayName || "Atleta",
      fotoUrl: profile?.resolved?.fotoUrl || "",
      criadoEm: serverTimestamp(),
    });
  }
  await batch.commit();

  await createActivityNotification({
    targetUid: invite.inviterUid,
    type: "team_invite",
    sourceId: invite.id,
    text: decision === "aceito"
      ? `${profile?.resolved?.nome || "O atleta"} aceitou o convite para ${invite.teamName}`
      : `${profile?.resolved?.nome || "O atleta"} recusou o convite para ${invite.teamName}`,
  }).catch(() => undefined);
}

export async function cancelTeamInvite(inviteId: string) {
  const user = getAuth().currentUser;
  if (!user) throw new Error("Entre na sua conta.");
  const ref = doc(db, "equipe_convites", inviteId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return;
  const invite = inviteFromDoc({ id: snapshot.id, data: () => snapshot.data() as Record<string, unknown> });
  if (invite.inviterUid !== user.uid) throw new Error("Somente quem enviou o convite pode cancelá-lo.");
  if (invite.status !== "pendente") return;
  const batch = writeBatch(db);
  batch.update(ref, { status: "cancelado", respondidoEm: serverTimestamp() });
  await batch.commit();
}

export async function loadTeamMembers(teamId: string): Promise<TeamMember[]> {
  const snapshot = await getDocs(query(collection(db, "equipes", teamId, "membros"), orderBy("criadoEm", "asc"), limit(60)));
  return snapshot.docs.map((entry) => {
    const data = entry.data() as Record<string, unknown>;
    return {
      uid: entry.id,
      teamId,
      inviteId: text(data.conviteId),
      role: text(data.papel) === "capitao" ? "capitao" : "atleta",
      name: text(data.nome) || "Atleta",
      photo: text(data.fotoUrl),
      createdAt: data.criadoEm,
    };
  });
}

export async function leaveTeam(teamId: string) {
  const user = getAuth().currentUser;
  if (!user) throw new Error("Entre na sua conta.");
  const batch = writeBatch(db);
  batch.delete(doc(db, "equipes", teamId, "membros", user.uid));
  await batch.commit();
}
