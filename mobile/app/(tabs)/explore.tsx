import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import { loadExploreProfiles, type MobileAthleteDirectoryItem } from "@/services/mobileContent";
import { brand } from "@/ui/brand";

type ExploreFilter = "Todos" | "Praia" | "Quadra" | "Iniciante" | "Intermediário" | "Avançado";

function norm(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function ExploreScreen() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<MobileAthleteDirectoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ExploreFilter>("Todos");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      setProfiles(await loadExploreProfiles());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar os atletas.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = norm(search);
    return profiles.filter((profile) => {
      const searchable = norm(
        [profile.nome, profile.cidade, profile.uf, profile.modalidade, profile.posicao, profile.categoria, profile.time]
          .filter(Boolean)
          .join(" "),
      );
      const matchesSearch = !term || searchable.includes(term);
      if (!matchesSearch || filter === "Todos") return matchesSearch;
      if (filter === "Praia") return norm(profile.modalidade).includes("praia");
      if (filter === "Quadra") return norm(profile.modalidade).includes("quadra");
      return norm(profile.categoria).includes(norm(filter));
    });
  }, [filter, profiles, search]);

  return (
    <FlatList
      data={filtered}
      keyExtractor={(item) => item.directoryKey}
      style={styles.list}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={brand.colors.cyan} />
      }
      ListHeaderComponent={
        <View>
          <BrandHeader
            eyebrow="DESCUBRA NOVOS TALENTOS"
            title="Explorar"
            subtitle="Encontre atletas por nome, cidade, modalidade, categoria, posição ou equipe."
          />

          <View style={styles.searchWrap}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar atletas por nome, cidade…"
              placeholderTextColor={brand.colors.muted}
              autoCapitalize="none"
              style={styles.search}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {(["Todos", "Praia", "Quadra", "Iniciante", "Intermediário", "Avançado"] as ExploreFilter[]).map((item) => (
              <Pressable
                key={item}
                onPress={() => setFilter(item)}
                style={[styles.filterChip, filter === item && styles.filterChipActive]}
              >
                <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.resultRow}>
            <Text style={styles.counter}>{filtered.length} atleta{filtered.length === 1 ? "" : "s"}</Text>
            <Text style={styles.resultHint}>TOQUE PARA VER O PERFIL</Text>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={brand.colors.cyan} />
            <Text style={styles.muted}>Carregando atletas…</Text>
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nenhum atleta encontrado</Text>
            <Text style={styles.muted}>Tente outro filtro, nome, cidade ou categoria.</Text>
          </View>
        )
      }
      renderItem={({ item }) => (
        <ProfileCard
          profile={item}
          onPress={() =>
            router.push({
              pathname: "/athlete/[uid]",
              params: { uid: item.ownerUid || item.uid, athleteId: item.athleteId || "" },
            })
          }
        />
      )}
    />
  );
}

function ProfileCard({ profile, onPress }: { profile: MobileAthleteDirectoryItem; onPress: () => void }) {
  const meta = [profile.cidade, profile.uf].filter(Boolean).join(" / ");
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.cardAccent} />
      {profile.fotoUrl ? (
        <Image source={{ uri: profile.fotoUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarText}>{profile.nome.slice(0, 1).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.profileCopy}>
        <View style={styles.nameRow}>
          <Text numberOfLines={1} style={styles.name}>{profile.nome}</Text>
          <View style={styles.onlineDot} />
        </View>
        <Text numberOfLines={1} style={styles.category}>{profile.categoria || "Categoria não informada"}</Text>
        <Text numberOfLines={1} style={styles.meta}>{meta || "Cidade não informada"}</Text>
        <Text numberOfLines={1} style={styles.modality}>{profile.modalidade || profile.posicao || "Perfil esportivo"}</Text>
      </View>
      <View style={styles.arrowCircle}><Text style={styles.arrow}>›</Text></View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: brand.colors.bg },
  content: { padding: 16, paddingTop: 14, paddingBottom: 112 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: brand.colors.border,
    borderRadius: brand.radius.md,
    backgroundColor: brand.colors.surface,
    paddingHorizontal: 14,
    ...brand.shadow,
  },
  searchIcon: { marginRight: 8, color: brand.colors.cyan, fontSize: 24, fontWeight: "900" },
  search: { flex: 1, color: brand.colors.text, paddingVertical: 13, fontSize: 14 },
  filterScroll: { gap: 8, paddingVertical: 12, paddingRight: 18 },
  filterChip: {
    borderWidth: 1,
    borderColor: brand.colors.border,
    borderRadius: brand.radius.pill,
    backgroundColor: brand.colors.surface,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  filterChipActive: { borderColor: brand.colors.cyan, backgroundColor: "#0a4160" },
  filterText: { color: brand.colors.mutedStrong, fontSize: 11, fontWeight: "800" },
  filterTextActive: { color: brand.colors.cyanSoft },
  resultRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  counter: { color: brand.colors.text, fontSize: 13, fontWeight: "900" },
  resultHint: { color: brand.colors.gold, fontSize: 8, fontWeight: "900", letterSpacing: 0.7 },
  error: { marginBottom: 10, color: brand.colors.danger, fontWeight: "700" },
  center: { alignItems: "center", gap: 10, paddingVertical: 60 },
  empty: { borderRadius: brand.radius.lg, borderWidth: 1, borderColor: brand.colors.borderSoft, backgroundColor: brand.colors.surface, padding: 22 },
  emptyTitle: { color: brand.colors.text, fontSize: 18, fontWeight: "900", marginBottom: 6 },
  muted: { color: brand.colors.muted, textAlign: "center" },
  card: {
    position: "relative",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: brand.colors.borderSoft,
    borderRadius: brand.radius.lg,
    backgroundColor: brand.colors.surface,
    padding: 12,
    ...brand.shadow,
  },
  cardAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3, backgroundColor: brand.colors.cyan },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  avatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 1, borderColor: brand.colors.cyan, backgroundColor: brand.colors.surfaceSoft },
  avatarFallback: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: brand.colors.cyan, backgroundColor: brand.colors.surfaceSoft },
  avatarText: { color: brand.colors.cyanSoft, fontSize: 22, fontWeight: "900" },
  profileCopy: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { flexShrink: 1, color: brand.colors.text, fontSize: 15, fontWeight: "900" },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: brand.colors.success },
  category: { marginTop: 3, color: brand.colors.cyan, fontSize: 11, fontWeight: "900" },
  meta: { marginTop: 3, color: brand.colors.mutedStrong, fontSize: 11 },
  modality: { marginTop: 3, color: brand.colors.gold, fontSize: 10, fontWeight: "800" },
  arrowCircle: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: brand.colors.surfaceRaised },
  arrow: { marginTop: -2, color: brand.colors.cyanSoft, fontSize: 24, fontWeight: "800" },
});
