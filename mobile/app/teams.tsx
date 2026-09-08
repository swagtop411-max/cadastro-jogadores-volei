import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { loadTeams, type MobileTeam } from "@/services/teamService";
import { brand } from "@/ui/brand";

function norm(value: unknown) {
  return String(value || "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export default function TeamsScreen() {
  const router = useRouter();
  const [teams, setTeams] = useState<MobileTeam[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTeams()
      .then(setTeams)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Não foi possível carregar as equipes."))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const term = norm(search.trim());
    return teams
      .filter((team) => category === "Todas" || team.categoria === category)
      .filter((team) => !term || norm(`${team.nome} ${team.cidade} ${team.uf} ${team.modalidade} ${team.categoria}`).includes(term));
  }, [teams, search, category]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>REDE DE TIMES</Text>
          <Text style={styles.title}>Equipes</Text>
          <Text style={styles.subtitle}>{teams.length} equipe{teams.length === 1 ? "" : "s"} cadastrada{teams.length === 1 ? "" : "s"}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push("/team/invites")} style={styles.invitesButton}><Text style={styles.invitesButtonText}>✉</Text></Pressable>
          <Pressable onPress={() => router.push("/team/create")} style={styles.create}><Text style={styles.createText}>＋</Text></Pressable>
        </View>
      </View>

      <Pressable onPress={() => router.push("/team/invites")} style={styles.inviteBanner}>
        <View style={styles.inviteBannerIcon}><Text style={styles.inviteBannerIconText}>🏐</Text></View>
        <View style={styles.inviteBannerCopy}>
          <Text style={styles.inviteBannerTitle}>CONVITES E ELENCOS</Text>
          <Text style={styles.inviteBannerText}>Convide atletas, aceite solicitações e acompanhe os membros oficiais.</Text>
        </View>
        <Text style={styles.inviteBannerArrow}>›</Text>
      </Pressable>

      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput value={search} onChangeText={setSearch} placeholder="Buscar equipe, cidade ou modalidade…" placeholderTextColor={brand.colors.muted} style={styles.search} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {["Todas", "Iniciante", "Intermediário", "Avançado"].map((item) => (
          <Pressable key={item} onPress={() => setCategory(item)} style={[styles.chip, category === item && styles.chipActive]}>
            <Text style={[styles.chipText, category === item && styles.chipTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list}>
        {loading ? <View style={styles.center}><ActivityIndicator color={brand.colors.cyan} /><Text style={styles.muted}>Carregando equipes…</Text></View> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && !visible.length ? <View style={styles.empty}><Text style={styles.emptyIcon}>👥</Text><Text style={styles.emptyTitle}>Nenhuma equipe encontrada</Text><Text style={styles.muted}>Cadastre uma equipe ou altere os filtros.</Text></View> : null}
        {visible.map((team) => (
          <Pressable key={team.id} onPress={() => router.push({ pathname: "/team/[id]", params: { id: team.id } })} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
            {team.logo ? <Image source={{ uri: team.logo }} style={styles.logo} /> : <View style={styles.logoFallback}><Text style={styles.logoText}>{team.nome.slice(0, 2).toUpperCase()}</Text></View>}
            <View style={styles.copy}>
              <Text style={styles.name}>{team.nome}</Text>
              <Text style={styles.meta}>{[team.cidade, team.uf].filter(Boolean).join(" / ") || "Local não informado"}</Text>
              <View style={styles.tagRow}>
                {team.modalidade ? <View style={styles.tag}><Text style={styles.tagText}>{team.modalidade}</Text></View> : null}
                {team.categoria ? <View style={styles.tagGold}><Text style={styles.tagGoldText}>{team.categoria}</Text></View> : null}
              </View>
              <Text style={styles.roster}>{team.atletas.length} atleta{team.atletas.length === 1 ? "" : "s"} no elenco legado</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        ))}
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
  eyebrow: { color: brand.colors.cyan, fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  title: { color: brand.colors.text, fontSize: 25, fontWeight: "900" },
  subtitle: { marginTop: 2, color: brand.colors.muted, fontSize: 10 },
  headerActions: { flexDirection: "row", gap: 7 },
  invitesButton: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: brand.colors.gold, backgroundColor: "#3c2c0d" },
  invitesButtonText: { color: brand.colors.gold, fontSize: 17 },
  create: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: brand.colors.gold },
  createText: { color: brand.colors.bgDeep, fontSize: 26, fontWeight: "900" },
  inviteBanner: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 14, marginBottom: 10, borderWidth: 1, borderColor: brand.colors.gold, borderRadius: brand.radius.lg, backgroundColor: "#3c2c0d", padding: 11 },
  inviteBannerIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: brand.colors.bgDeep },
  inviteBannerIconText: { fontSize: 17 },
  inviteBannerCopy: { flex: 1 },
  inviteBannerTitle: { color: brand.colors.gold, fontSize: 9, fontWeight: "900", letterSpacing: 0.7 },
  inviteBannerText: { marginTop: 3, color: brand.colors.mutedStrong, fontSize: 9, lineHeight: 13 },
  inviteBannerArrow: { color: brand.colors.gold, fontSize: 25 },
  searchWrap: { flexDirection: "row", alignItems: "center", marginHorizontal: 14, borderWidth: 1, borderColor: brand.colors.border, borderRadius: brand.radius.md, backgroundColor: brand.colors.surface, paddingHorizontal: 12 },
  searchIcon: { color: brand.colors.cyan, fontSize: 22, marginRight: 7 },
  search: { flex: 1, color: brand.colors.text, paddingVertical: 12 },
  filters: { gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  chip: { borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.pill, backgroundColor: brand.colors.surface, paddingHorizontal: 13, paddingVertical: 8 },
  chipActive: { borderColor: brand.colors.cyan, backgroundColor: "#0a4160" },
  chipText: { color: brand.colors.mutedStrong, fontSize: 10, fontWeight: "800" },
  chipTextActive: { color: brand.colors.cyanSoft },
  list: { gap: 9, padding: 14, paddingTop: 4, paddingBottom: 35 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.xl, backgroundColor: brand.colors.surface, padding: 12 },
  logo: { width: 68, height: 68, borderRadius: 18, borderWidth: 1, borderColor: brand.colors.cyan, backgroundColor: brand.colors.bgDeep },
  logoFallback: { width: 68, height: 68, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: brand.colors.cyan, backgroundColor: brand.colors.bgDeep },
  logoText: { color: brand.colors.cyanSoft, fontSize: 18, fontWeight: "900" },
  copy: { flex: 1 },
  name: { color: brand.colors.text, fontSize: 16, fontWeight: "900" },
  meta: { marginTop: 3, color: brand.colors.muted, fontSize: 9 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 6 },
  tag: { borderRadius: brand.radius.pill, backgroundColor: "#0a4160", paddingHorizontal: 8, paddingVertical: 4 },
  tagText: { color: brand.colors.cyanSoft, fontSize: 8, fontWeight: "900" },
  tagGold: { borderRadius: brand.radius.pill, backgroundColor: "#3c2c0d", paddingHorizontal: 8, paddingVertical: 4 },
  tagGoldText: { color: brand.colors.gold, fontSize: 8, fontWeight: "900" },
  roster: { marginTop: 6, color: brand.colors.mutedStrong, fontSize: 9 },
  arrow: { color: brand.colors.gold, fontSize: 26 },
  center: { alignItems: "center", gap: 9, paddingVertical: 45 },
  muted: { color: brand.colors.muted, textAlign: "center" },
  error: { borderRadius: brand.radius.md, backgroundColor: brand.colors.dangerBg, color: "#ffd5dd", padding: 11 },
  empty: { alignItems: "center", borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.xl, backgroundColor: brand.colors.surface, padding: 24 },
  emptyIcon: { fontSize: 32 },
  emptyTitle: { marginTop: 8, marginBottom: 6, color: brand.colors.text, fontSize: 17, fontWeight: "900" },
  pressed: { opacity: 0.75 },
});
