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
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { loadExploreProfiles, type MobileAthleteDirectoryItem } from "@/services/mobileContent";
import { resolveProfile } from "@/services/profileResolver";
import { inviteAthleteToTeam } from "@/services/teamInviteService";
import { loadTeams, type MobileTeam } from "@/services/teamService";
import { brand } from "@/ui/brand";

function norm(value: unknown) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function InviteAthleteToTeamScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ uid?: string }>();
  const initialTargetUid = String(params.uid || "");
  const currentUid = getAuth().currentUser?.uid || "";
  const [targetUid, setTargetUid] = useState(initialTargetUid);
  const [teams, setTeams] = useState<MobileTeam[]>([]);
  const [athletes, setAthletes] = useState<MobileAthleteDirectoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [athleteName, setAthleteName] = useState(initialTargetUid ? "Atleta" : "Selecione um atleta");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!currentUid) {
      setLoading(false);
      setError("Entre na sua conta para convidar atletas.");
      return;
    }
    Promise.all([
      loadTeams(),
      loadExploreProfiles(),
      initialTargetUid ? resolveProfile(initialTargetUid).catch(() => null) : Promise.resolve(null),
    ]).then(([allTeams, allAthletes, profile]) => {
      if (!mounted) return;
      setTeams(allTeams.filter((team) => team.ownerUid === currentUid));
      setAthletes(allAthletes.filter((athlete) => athlete.ownerUid && athlete.ownerUid !== currentUid));
      if (initialTargetUid) setAthleteName(profile?.resolved?.nome || "Atleta");
    }).catch((cause) => {
      if (mounted) setError(cause instanceof Error ? cause.message : "Não foi possível preparar o convite.");
    }).finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [currentUid, initialTargetUid]);

  const hasTeams = teams.length > 0;
  const filteredAthletes = useMemo(() => {
    const term = norm(search);
    const source = athletes.filter((athlete) => athlete.ownerUid !== currentUid);
    if (!term) return source.slice(0, 30);
    return source.filter((athlete) => norm([
      athlete.nome,
      athlete.cidade,
      athlete.uf,
      athlete.modalidade,
      athlete.posicao,
      athlete.categoria,
      athlete.time,
    ].filter(Boolean).join(" ")).includes(term)).slice(0, 50);
  }, [athletes, currentUid, search]);

  function chooseAthlete(athlete: MobileAthleteDirectoryItem) {
    if (!athlete.ownerUid) return;
    setTargetUid(athlete.ownerUid);
    setAthleteName(athlete.nome || "Atleta");
    setSearch("");
    setSent(new Set());
  }

  async function send(team: MobileTeam) {
    if (!targetUid) {
      Alert.alert("Convite", "Escolha um atleta primeiro.");
      return;
    }
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

      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {loading ? <View style={styles.center}><ActivityIndicator color={brand.colors.cyan} /><Text style={styles.muted}>Buscando atletas e equipes…</Text></View> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!loading && !targetUid ? (
          <View style={styles.selectorCard}>
            <Text style={styles.selectorLabel}>1. ESCOLHA O ATLETA</Text>
            <View style={styles.searchWrap}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar por nome, cidade, categoria ou equipe…"
                placeholderTextColor={brand.colors.muted}
                autoCapitalize="none"
                style={styles.searchInput}
              />
            </View>
            <View style={styles.athleteList}>
              {filteredAthletes.map((athlete) => (
                <Pressable key={athlete.directoryKey} onPress={() => chooseAthlete(athlete)} style={styles.athleteRow}>
                  {athlete.fotoUrl ? <Image source={{ uri: athlete.fotoUrl }} style={styles.athleteAvatar} /> : <View style={styles.athleteAvatarFallback}><Text style={styles.athleteAvatarText}>{athlete.nome.slice(0, 1).toUpperCase()}</Text></View>}
                  <View style={styles.athleteCopy}>
                    <Text style={styles.athleteName}>{athlete.nome}</Text>
                    <Text style={styles.athleteMeta}>{[athlete.cidade, athlete.uf, athlete.categoria].filter(Boolean).join(" • ")}</Text>
                    <Text style={styles.athleteSport}>{[athlete.modalidade, athlete.time].filter(Boolean).join(" • ") || "Perfil esportivo"}</Text>
                  </View>
                  <Text style={styles.athleteArrow}>›</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {!loading && targetUid ? (
          <View style={styles.selectedAthlete}>
            <View style={styles.selectedBadge}><Text style={styles.selectedBadgeText}>✓</Text></View>
            <View style={styles.selectedCopy}><Text style={styles.selectedLabel}>ATLETA SELECIONADO</Text><Text style={styles.selectedName}>{athleteName}</Text></View>
            {!initialTargetUid ? <Pressable onPress={() => { setTargetUid(""); setAthleteName("Selecione um atleta"); setSent(new Set()); }} style={styles.changeButton}><Text style={styles.changeButtonText}>TROCAR</Text></Pressable> : null}
          </View>
        ) : null}

        {!loading && !error && !hasTeams ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>Você ainda não administra uma equipe aprovada</Text>
            <Text style={styles.muted}>Cadastre uma equipe e, depois da aprovação, volte aqui para montar o elenco.</Text>
            <Pressable onPress={() => router.push("/team/create")} style={styles.createButton}><Text style={styles.createButtonText}>CADASTRAR EQUIPE</Text></Pressable>
          </View>
        ) : null}

        {targetUid && hasTeams ? <Text style={styles.stepLabel}>2. ESCOLHA A EQUIPE</Text> : null}
        {targetUid ? teams.map((team) => {
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
        }) : null}

        {hasTeams ? <Pressable onPress={() => router.push("/team/invites")} style={styles.manageButton}><Text style={styles.manageButtonText}>GERENCIAR CONVITES ›</Text></Pressable> : null}
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
  selectorCard: { borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.xl, backgroundColor: brand.colors.surface, padding: 12 },
  selectorLabel: { color: brand.colors.cyan, fontSize: 9, fontWeight: "900", letterSpacing: 0.8, marginBottom: 9 },
  searchWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: brand.colors.border, borderRadius: brand.radius.md, backgroundColor: brand.colors.bgDeep, paddingHorizontal: 11 },
  searchIcon: { color: brand.colors.cyan, fontSize: 20, marginRight: 7 },
  searchInput: { flex: 1, color: brand.colors.text, paddingVertical: 11, fontSize: 13 },
  athleteList: { gap: 6, marginTop: 10 },
  athleteRow: { flexDirection: "row", alignItems: "center", gap: 9, borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.md, backgroundColor: brand.colors.surfaceSoft, padding: 9 },
  athleteAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: brand.colors.cyan },
  athleteAvatarFallback: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: brand.colors.cyan, backgroundColor: brand.colors.bgDeep },
  athleteAvatarText: { color: brand.colors.cyanSoft, fontWeight: "900" },
  athleteCopy: { flex: 1 },
  athleteName: { color: brand.colors.text, fontSize: 12, fontWeight: "900" },
  athleteMeta: { marginTop: 2, color: brand.colors.muted, fontSize: 8 },
  athleteSport: { marginTop: 3, color: brand.colors.gold, fontSize: 8, fontWeight: "800" },
  athleteArrow: { color: brand.colors.cyan, fontSize: 22 },
  selectedAthlete: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: brand.colors.cyan, borderRadius: brand.radius.lg, backgroundColor: "#092b40", padding: 12 },
  selectedBadge: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: brand.colors.cyan },
  selectedBadgeText: { color: brand.colors.bgDeep, fontWeight: "900" },
  selectedCopy: { flex: 1 },
  selectedLabel: { color: brand.colors.cyan, fontSize: 7, fontWeight: "900", letterSpacing: 0.7 },
  selectedName: { marginTop: 2, color: brand.colors.text, fontSize: 14, fontWeight: "900" },
  changeButton: { borderRadius: brand.radius.pill, borderWidth: 1, borderColor: brand.colors.gold, paddingHorizontal: 9, paddingVertical: 7 },
  changeButtonText: { color: brand.colors.gold, fontSize: 8, fontWeight: "900" },
  stepLabel: { marginTop: 4, color: brand.colors.gold, fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
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
