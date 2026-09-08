import { getAuth } from "@react-native-firebase/auth";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { resolveProfile } from "@/services/profileResolver";
import { inviteAthleteToTeam } from "@/services/teamInviteService";
import { loadTeams, type MobileTeam } from "@/services/teamService";
import { brand } from "@/ui/brand";

export default function InviteAthleteToTeamScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ uid?: string }>();
  const targetUid = String(params.uid || "");
  const currentUid = getAuth().currentUser?.uid || "";
  const [teams, setTeams] = useState<MobileTeam[]>([]);
  const [athleteName, setAthleteName] = useState("Atleta");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!targetUid || !currentUid || targetUid === currentUid) {
      setLoading(false);
      setError("Selecione outro atleta para convidar.");
      return;
    }
    Promise.all([
      loadTeams(),
      resolveProfile(targetUid),
    ]).then(([allTeams, profile]) => {
      if (!mounted) return;
      setTeams(allTeams.filter((team) => team.ownerUid === currentUid));
      setAthleteName(profile.resolved?.nome || "Atleta");
    }).catch((cause) => {
      if (mounted) setError(cause instanceof Error ? cause.message : "Não foi possível preparar o convite.");
    }).finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [currentUid, targetUid]);

  const hasTeams = useMemo(() => teams.length > 0, [teams]);

  async function send(team: MobileTeam) {
    if (sending || sent.has(team.id)) return;
    setSending(team.id);
    try {
      await inviteAthleteToTeam(team.id, targetUid);
      setSent((previous) => new Set(previous).add(team.id));
      Alert.alert("Convite enviado", `${athleteName} recebeu um convite para ${team.nome}.`);
    } catch (cause) {
      Alert.alert("Convite", cause instanceof Error ? cause.message : "Não foi possível enviar o convite.");
    } finally {
      setSending(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>MONTAR ELENCO</Text>
          <Text style={styles.title}>Convidar atleta</Text>
          <Text style={styles.subtitle}>{athleteName}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {loading ? <View style={styles.center}><ActivityIndicator color={brand.colors.cyan} /><Text style={styles.muted}>Buscando suas equipes…</Text></View> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && !error && !hasTeams ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>Você ainda não administra uma equipe aprovada</Text>
            <Text style={styles.muted}>Cadastre uma equipe e, depois da aprovação, volte ao perfil do atleta para enviar o convite.</Text>
            <Pressable onPress={() => router.push("/team/create")} style={styles.createButton}><Text style={styles.createButtonText}>CADASTRAR EQUIPE</Text></Pressable>
          </View>
        ) : null}

        {teams.map((team) => {
          const busy = sending === team.id;
          const done = sent.has(team.id);
          return (
            <View key={team.id} style={styles.card}>
              {team.logo ? <Image source={{ uri: team.logo }} style={styles.logo} /> : <View style={styles.logoFallback}><Text style={styles.logoText}>{team.nome.slice(0, 2).toUpperCase()}</Text></View>}
              <View style={styles.copy}>
                <Text style={styles.name}>{team.nome}</Text>
                <Text style={styles.meta}>{[team.cidade, team.uf].filter(Boolean).join(" / ") || "Local não informado"}</Text>
                <Text style={styles.category}>{[team.modalidade, team.categoria].filter(Boolean).join(" • ")}</Text>
              </View>
              <Pressable disabled={busy || done} onPress={() => void send(team)} style={[styles.inviteButton, done && styles.inviteButtonDone]}>
                <Text style={[styles.inviteButtonText, done && styles.inviteButtonTextDone]}>{done ? "ENVIADO ✓" : busy ? "…" : "CONVIDAR"}</Text>
              </Pressable>
            </View>
          );
        })}

        {hasTeams ? (
          <Pressable onPress={() => router.push("/team/invites")} style={styles.manageButton}><Text style={styles.manageButtonText}>GERENCIAR CONVITES ENVIADOS ›</Text></Pressable>
        ) : null}
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
  eyebrow: { color: brand.colors.cyan, fontSize: 8, fontWeight: "900", letterSpacing: 1.1 },
  title: { color: brand.colors.text, fontSize: 24, fontWeight: "900" },
  subtitle: { marginTop: 2, color: brand.colors.gold, fontSize: 11, fontWeight: "800" },
  list: { gap: 10, padding: 14, paddingTop: 4, paddingBottom: 36 },
  card: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.xl, backgroundColor: brand.colors.surface, padding: 12 },
  logo: { width: 58, height: 58, borderRadius: 17, borderWidth: 1, borderColor: brand.colors.cyan, backgroundColor: brand.colors.bgDeep },
  logoFallback: { width: 58, height: 58, borderRadius: 17, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: brand.colors.cyan, backgroundColor: brand.colors.bgDeep },
  logoText: { color: brand.colors.cyanSoft, fontWeight: "900" },
  copy: { flex: 1 },
  name: { color: brand.colors.text, fontSize: 14, fontWeight: "900" },
  meta: { marginTop: 3, color: brand.colors.muted, fontSize: 9 },
  category: { marginTop: 4, color: brand.colors.gold, fontSize: 9, fontWeight: "800" },
  inviteButton: { borderRadius: brand.radius.md, backgroundColor: brand.colors.cyan, paddingHorizontal: 11, paddingVertical: 10 },
  inviteButtonDone: { backgroundColor: "#123d33" },
  inviteButtonText: { color: brand.colors.bgDeep, fontSize: 8, fontWeight: "900" },
  inviteButtonTextDone: { color: "#bff7df" },
  center: { alignItems: "center", gap: 9, paddingVertical: 45 },
  muted: { color: brand.colors.muted, textAlign: "center", lineHeight: 19 },
  empty: { alignItems: "center", borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.xl, backgroundColor: brand.colors.surface, padding: 26 },
  emptyIcon: { fontSize: 34 },
  emptyTitle: { marginTop: 8, marginBottom: 6, color: brand.colors.text, fontSize: 17, fontWeight: "900", textAlign: "center" },
  createButton: { marginTop: 14, borderRadius: brand.radius.md, backgroundColor: brand.colors.gold, paddingHorizontal: 18, paddingVertical: 12 },
  createButtonText: { color: brand.colors.bgDeep, fontSize: 9, fontWeight: "900" },
  manageButton: { alignItems: "center", marginTop: 6, borderWidth: 1, borderColor: brand.colors.gold, borderRadius: brand.radius.md, paddingVertical: 12 },
  manageButtonText: { color: brand.colors.gold, fontSize: 9, fontWeight: "900" },
  error: { borderRadius: brand.radius.md, backgroundColor: brand.colors.dangerBg, color: "#ffd5dd", padding: 11 },
});
