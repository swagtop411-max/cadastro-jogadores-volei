import { getAuth } from "@react-native-firebase/auth";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import { SocialPostCard } from "@/components/SocialPostCard";
import { SocialQuickActions } from "@/components/SocialQuickActions";
import { StoryRail } from "@/components/StoryRail";
import { loadCompleteMobileFeed, type MobileFeedItemV2 } from "@/services/feedService";
import { loadFollowingRefs } from "@/services/socialService";
import { brand } from "@/ui/brand";

type FeedFilter = "all" | "image" | "video";
type FeedMode = "for-you" | "following";

function norm(value: unknown) {
  return String(value ?? "").trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export default function FeedScreen() {
  const currentUid = getAuth().currentUser?.uid || "";
  const [items, setItems] = useState<MobileFeedItemV2[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<FeedMode>("for-you");
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const [feed, followingRefs] = await Promise.all([
        loadCompleteMobileFeed(),
        currentUid ? loadFollowingRefs(currentUid).catch(() => []) : Promise.resolve([]),
      ]);
      setItems(feed);
      setFollowing(new Set(followingRefs.map((entry) => entry.uid)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar o feed.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUid]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const visibleItems = useMemo(() => {
    const term = norm(search);
    return items.filter((item) => {
      if (mode === "following" && item.ownerUid !== currentUid && !following.has(item.ownerUid)) return false;
      if (filter !== "all" && item.kind !== filter) return false;
      if (!term) return true;
      return norm(`${item.authorName} ${item.text} ${item.hashtags.join(" ")} ${item.mentions.join(" ")}`).includes(term);
    });
  }, [currentUid, filter, following, items, mode, search]);

  const imageCount = useMemo(() => items.filter((item) => item.kind === "image").length, [items]);
  const videoCount = items.length - imageCount;

  return (
    <FlatList
      data={visibleItems}
      keyExtractor={(item) => `${item.kind}-${item.id}`}
      style={styles.list}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={brand.colors.cyan} />}
      ListHeaderComponent={
        <View>
          <BrandHeader eyebrow="REDE ESPORTIVA" title="Feed" subtitle="Stories, treinos, conquistas, campeonatos e momentos dos atletas da rede." />
          <SocialQuickActions />
          <StoryRail />

          <View style={styles.networkStats}>
            <MiniStat value={String(items.length)} label="PUBLICAÇÕES" />
            <MiniStat value={String(imageCount)} label="FOTOS" />
            <MiniStat value={String(videoCount)} label="VÍDEOS" gold />
          </View>

          <View style={styles.modeRow}>
            <ModeChip label="PARA VOCÊ" active={mode === "for-you"} onPress={() => setMode("for-you")} />
            <ModeChip label="SEGUINDO" active={mode === "following"} onPress={() => setMode("following")} />
          </View>

          <View style={styles.searchWrap}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput value={search} onChangeText={setSearch} placeholder="Buscar publicação, atleta ou hashtag…" placeholderTextColor={brand.colors.muted} autoCapitalize="none" style={styles.search} />
            {search ? <Pressable onPress={() => setSearch("")} hitSlop={10}><Text style={styles.clearSearch}>×</Text></Pressable> : null}
          </View>

          <View style={styles.filterRow}>
            <FilterChip label="Tudo" active={filter === "all"} onPress={() => setFilter("all")} />
            <FilterChip label="Fotos" active={filter === "image"} onPress={() => setFilter("image")} />
            <FilterChip label="Vídeos" active={filter === "video"} onPress={() => setFilter("video")} />
          </View>
          <View style={styles.feedMetaRow}><Text style={styles.feedMeta}>{visibleItems.length} resultado{visibleItems.length === 1 ? "" : "s"}</Text><View style={styles.liveDot} /><Text style={styles.liveText}>REDE ATIVA</Text></View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      }
      ListEmptyComponent={loading ? <View style={styles.center}><ActivityIndicator color={brand.colors.cyan} /><Text style={styles.muted}>Carregando a rede…</Text></View> : <View style={styles.empty}><Text style={styles.emptyTitle}>{mode === "following" ? "Seu feed Seguindo está começando" : "Nada por aqui neste filtro"}</Text><Text style={styles.muted}>{mode === "following" ? "Siga atletas na aba Explorar para montar este feed." : "Altere os filtros ou a busca e tente novamente."}</Text></View>}
      renderItem={({ item }) => <SocialPostCard item={item} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

function MiniStat({ value, label, gold = false }: { value: string; label: string; gold?: boolean }) {
  return <View style={styles.statCard}><Text style={[styles.statValue, gold && styles.statValueGold]}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}
function ModeChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.modeChip, active && styles.modeChipActive]}><Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>{label}</Text></Pressable>;
}
function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.filterChip, active && styles.filterChipActive]}><Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: brand.colors.bg },
  content: { padding: 16, paddingTop: 14, paddingBottom: 112 },
  separator: { height: 14 },
  networkStats: { flexDirection: "row", gap: 8, marginBottom: 10 },
  statCard: { flex: 1, alignItems: "center", borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.md, backgroundColor: brand.colors.surface, paddingVertical: 10 },
  statValue: { color: brand.colors.cyan, fontSize: 17, fontWeight: "900" },
  statValueGold: { color: brand.colors.gold },
  statLabel: { marginTop: 2, color: brand.colors.muted, fontSize: 8, fontWeight: "900", letterSpacing: 0.65 },
  modeRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  modeChip: { flex: 1, alignItems: "center", borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.pill, backgroundColor: brand.colors.surface, paddingVertical: 10 },
  modeChipActive: { borderColor: brand.colors.cyan, backgroundColor: "#0a4160" },
  modeChipText: { color: brand.colors.mutedStrong, fontSize: 10, fontWeight: "900" },
  modeChipTextActive: { color: brand.colors.cyanSoft },
  searchWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: brand.colors.border, borderRadius: brand.radius.md, backgroundColor: brand.colors.surface, paddingHorizontal: 13, marginBottom: 10 },
  searchIcon: { marginRight: 8, color: brand.colors.cyan, fontSize: 23, fontWeight: "900" },
  search: { flex: 1, color: brand.colors.text, paddingVertical: 12, fontSize: 13 },
  clearSearch: { color: brand.colors.mutedStrong, fontSize: 24, lineHeight: 28 },
  filterRow: { flexDirection: "row", gap: 9, marginBottom: 8 },
  filterChip: { borderWidth: 1, borderColor: brand.colors.border, borderRadius: brand.radius.pill, backgroundColor: brand.colors.surface, paddingHorizontal: 16, paddingVertical: 9 },
  filterChipActive: { borderColor: brand.colors.cyan, backgroundColor: "#0a4160" },
  filterChipText: { color: brand.colors.mutedStrong, fontSize: 11, fontWeight: "800" },
  filterChipTextActive: { color: brand.colors.cyanSoft },
  feedMetaRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 12 },
  feedMeta: { color: brand.colors.muted, fontSize: 10, fontWeight: "700" },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: brand.colors.success },
  liveText: { color: brand.colors.success, fontSize: 8, fontWeight: "900", letterSpacing: 0.7 },
  error: { marginBottom: 12, borderRadius: brand.radius.sm, backgroundColor: brand.colors.dangerBg, color: "#ffd6dc", fontWeight: "700", padding: 11 },
  center: { alignItems: "center", gap: 10, paddingVertical: 56 },
  empty: { borderRadius: brand.radius.lg, borderWidth: 1, borderColor: brand.colors.borderSoft, backgroundColor: brand.colors.surface, padding: 22 },
  emptyTitle: { color: brand.colors.text, fontSize: 17, fontWeight: "900", marginBottom: 6 },
  muted: { color: brand.colors.muted, lineHeight: 19, textAlign: "center" },
});
