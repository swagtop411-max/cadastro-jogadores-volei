import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import {
  cancelTeamInvite,
  loadOutgoingTeamInvites,
  respondToTeamInvite,
  subscribeIncomingTeamInvites,
  type TeamInvite,
} from "@/services/teamInviteService";
import { formatFirebaseDate } from "@/services/mobileContent";
import { brand } from "@/ui/brand";

type Mode = "incoming" | "outgoing";

export default function TeamInvitesScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("incoming");
  const [incoming, setIncoming] = useState<TeamInvite[]>([]);
  const [outgoing, setOutgoing] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stop = subscribeIncomingTeamInvites(
      (items) => { setIncoming(items); setLoading(false); setError(null); },
      (cause) => { setError(cause.message); setLoading(false); },
    );
    void loadOutgoingTeamInvites().then(setOutgoing).catch(() => undefined);
    return stop;
  }, []);

  const visible = mode === "incoming" ? incoming : outgoing;
  const pendingIncoming = useMemo(() => incoming.filter((item) => item.status === "pendente").length, [incoming]);

  async function respond(invite: TeamInvite, decision: "aceito" | "recusado") {
    setActing(invite.id);
    try {
      await respondToTeamInvite(invite.id, decision);
      if (decision === "aceito") {
        Alert.alert("Equipe", `Você agora faz parte de ${invite.teamName}.`);
        router.push({ pathname: "/team/[id]", params: { id: invite.teamId } });
      }
    } catch (cause) {
      Alert.alert("Convite", cause instanceof Error ? cause.message : "Não foi possível responder ao convite.");
    } finally {
      setActing(null);
    }
  }

  async function cancel(invite: TeamInvite) {
    setActing(invite.id);
    try {
      await cancelTeamInvite(invite.id);
      setOutgoing((items) => items.map((item) => item.id === invite.id ? { ...item, status: "cancelado" } : item));
    } catch (cause) {
      Alert.alert("Convite", cause instanceof Error ? cause.message : "Não foi possível cancelar o convite.");
    } finally {
      setActing(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>GESTÃO DE ELENCO</Text>
          <Text style={styles.title}>Convites de equipe</Text>
          <Text style={styles.subtitle}>{pendingIncoming ? `${pendingIncoming} convite${pendingIncoming === 1 ? "" : "s"} aguardando resposta` : "Nenhum convite pendente"}</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <Pressable onPress={() => setMode("incoming")} style={[styles.tab, mode === "incoming" && styles.tabActive]}>
          <Text style={[styles.tabText, mode === "incoming" && styles.tabTextActive]}>RECEBIDOS {pendingIncoming ? `(${pendingIncoming})` : ""}</Text>
        </Pressable>
        <Pressable onPress={() => setMode("outgoing")} style={[styles.tab, mode === "outgoing" && styles.tabActiveGold]}>
          <Text style={[styles.tabText, mode === "outgoing" && styles.tabTextGold]}>ENVIADOS</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {loading ? <View style={styles.center}><ActivityIndicator color={brand.colors.cyan} /><Text style={styles.muted}>Carregando convites…</Text></View> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && !visible.length ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏐</Text>
            <Text style={styles.emptyTitle}>{mode === "incoming" ? "Nenhum convite recebido" : "Nenhum convite enviado"}</Text>
            <Text style={styles.muted}>{mode === "incoming" ? "Quando uma equipe convidar você, a solicitação aparecerá aqui." : "Abra o perfil de um atleta para convidá-lo para uma equipe que você administra."}</Text>
          </View>
        ) : null}

        {visible.map((invite) => {
          const busy = acting === invite.id;
          return (
            <View key={invite.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.teamBadge}><Text style={styles.teamBadgeText}>{invite.teamName.slice(0, 2).toUpperCase()}</Text></View>
                <View style={styles.copy}>
                  <Text style={styles.teamName}>{invite.teamName}</Text>
                  <Text style={styles.meta}>{mode === "incoming" ? "Convite para entrar no elenco" : `Convite para ${invite.targetName}`}</Text>
                  <Text style={styles.time}>{formatFirebaseDate(invite.createdAt)}</Text>
                </View>
                <View style={[styles.status, invite.status === "aceito" && styles.statusAccepted, invite.status === "recusado" && styles.statusRejected, invite.status === "cancelado" && styles.statusCanceled]}>
                  <Text style={styles.statusText}>{invite.status.toUpperCase()}</Text>
                </View>
              </View>

              {invite.status === "pendente" && mode === "incoming" ? (
                <View style={styles.actions}>
                  <Pressable disabled={busy} onPress={() => void respond(invite, "recusado")} style={styles.rejectButton}><Text style={styles.rejectText}>RECUSAR</Text></Pressable>
                  <Pressable disabled={busy} onPress={() => void respond(invite, "aceito")} style={styles.acceptButton}><Text style={styles.acceptText}>{busy ? "…" : "ACEITAR"}</Text></Pressable>
                </View>
              ) : null}

              {invite.status === "pendente" && mode === "outgoing" ? (
                <Pressable disabled={busy} onPress={() => void cancel(invite)} style={styles.cancelButton}><Text style={styles.cancelText}>{busy ? "…" : "CANCELAR CONVITE"}</Text></Pressable>
              ) : null}

              <Pressable onPress={() => router.push({ pathname: "/team/[id]", params: { id: invite.teamId } })} style={styles.openTeam}>
                <Text style={styles.openTeamText}>VER EQUIPE ›</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 11, padding: 14 },
  back: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: brand.colors.borderSoft, backgroundColor: brand.colors.surface },
  backText: { color: brand.colors.text, fontSize: 32, lineHeight: 34 },
  headerCopy: { flex: 1 },
  eyebrow: { color: brand.colors.gold, fontSize: 8, fontWeight: "900", letterSpacing: 1.1 },
  title: { color: brand.colors.text, fontSize: 23, fontWeight: "900" },
  subtitle: { marginTop: 2, color: brand.colors.muted, fontSize: 10 },
  tabs: { flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingBottom: 10 },
  tab: { flex: 1, alignItems: "center", borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.pill, backgroundColor: brand.colors.surface, paddingVertical: 10 },
  tabActive: { borderColor: brand.colors.cyan, backgroundColor: "#0a4160" },
  tabActiveGold: { borderColor: brand.colors.gold, backgroundColor: "#3c2c0d" },
  tabText: { color: brand.colors.mutedStrong, fontSize: 9, fontWeight: "900" },
  tabTextActive: { color: brand.colors.cyanSoft },
  tabTextGold: { color: brand.colors.gold },
  list: { gap: 10, padding: 14, paddingTop: 4, paddingBottom: 34 },
  card: { borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.xl, backgroundColor: brand.colors.surface, padding: 13 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  teamBadge: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: brand.colors.bgDeep, borderWidth: 1, borderColor: brand.colors.cyan },
  teamBadgeText: { color: brand.colors.cyanSoft, fontWeight: "900" },
  copy: { flex: 1 },
  teamName: { color: brand.colors.text, fontSize: 15, fontWeight: "900" },
  meta: { marginTop: 2, color: brand.colors.mutedStrong, fontSize: 10 },
  time: { marginTop: 4, color: brand.colors.muted, fontSize: 8 },
  status: { borderRadius: brand.radius.pill, backgroundColor: "#4a360e", paddingHorizontal: 8, paddingVertical: 6 },
  statusAccepted: { backgroundColor: "#123d33" },
  statusRejected: { backgroundColor: brand.colors.dangerBg },
  statusCanceled: { backgroundColor: brand.colors.surfaceRaised },
  statusText: { color: brand.colors.text, fontSize: 7, fontWeight: "900" },
  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
  rejectButton: { flex: 1, alignItems: "center", borderWidth: 1, borderColor: brand.colors.danger, borderRadius: brand.radius.md, paddingVertical: 11 },
  rejectText: { color: brand.colors.danger, fontSize: 9, fontWeight: "900" },
  acceptButton: { flex: 1, alignItems: "center", borderRadius: brand.radius.md, backgroundColor: brand.colors.cyan, paddingVertical: 11 },
  acceptText: { color: brand.colors.bgDeep, fontSize: 9, fontWeight: "900" },
  cancelButton: { marginTop: 12, alignItems: "center", borderWidth: 1, borderColor: brand.colors.gold, borderRadius: brand.radius.md, paddingVertical: 10 },
  cancelText: { color: brand.colors.gold, fontSize: 9, fontWeight: "900" },
  openTeam: { alignItems: "center", marginTop: 9, paddingVertical: 8 },
  openTeamText: { color: brand.colors.cyan, fontSize: 9, fontWeight: "900" },
  center: { alignItems: "center", gap: 9, paddingVertical: 45 },
  muted: { color: brand.colors.muted, textAlign: "center", lineHeight: 19 },
  empty: { alignItems: "center", borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.xl, backgroundColor: brand.colors.surface, padding: 26 },
  emptyIcon: { fontSize: 34 },
  emptyTitle: { marginTop: 8, marginBottom: 6, color: brand.colors.text, fontSize: 17, fontWeight: "900" },
  error: { borderRadius: brand.radius.md, backgroundColor: brand.colors.dangerBg, color: "#ffd5dd", padding: 11 },
});
