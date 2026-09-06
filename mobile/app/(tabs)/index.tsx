import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import { formatFirebaseDate, type MobileFeedItem } from "@/services/mobileContent";
import { loadCompleteMobileFeed } from "@/services/feedService";
import { brand } from "@/ui/brand";

type FeedFilter = "all" | "image" | "video";

export default function FeedScreen() {
  const [items, setItems] = useState<MobileFeedItem[]>([]);
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      setItems(await loadCompleteMobileFeed());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar o feed.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const visibleItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => item.kind === filter);
  }, [filter, items]);

  return (
    <FlatList
      data={visibleItems}
      keyExtractor={(item) => `${item.kind}-${item.id}`}
      style={styles.list}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load(true)}
          tintColor={brand.colors.cyan}
        />
      }
      ListHeaderComponent={
        <View>
          <BrandHeader
            eyebrow="CONECTE-SE COM A COMUNIDADE"
            title="Feed"
            subtitle="Treinos, conquistas, campeonatos e momentos publicados por atletas da rede."
          />
          <View style={styles.filterRow}>
            <FilterChip label="Todos" active={filter === "all"} onPress={() => setFilter("all")} />
            <FilterChip label="Fotos" active={filter === "image"} onPress={() => setFilter("image")} />
            <FilterChip label="Vídeos" active={filter === "video"} onPress={() => setFilter("video")} />
          </View>
          <View style={styles.feedMetaRow}>
            <Text style={styles.feedMeta}>{visibleItems.length} publicação{visibleItems.length === 1 ? "" : "ões"}</Text>
            <View style={styles.liveDot} />
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={brand.colors.cyan} />
            <Text style={styles.muted}>Carregando publicações…</Text>
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nada por aqui neste filtro</Text>
            <Text style={styles.muted}>Alterne entre Todos, Fotos e Vídeos ou puxe a tela para atualizar.</Text>
          </View>
        )
      }
      renderItem={({ item }) => <FeedCard item={item} />}
    />
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.filterChip, active && styles.filterChipActive]}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function FeedCard({ item }: { item: MobileFeedItem }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardAccent} />
      <View style={styles.authorRow}>
        {item.authorPhoto ? (
          <Image source={{ uri: item.authorPhoto }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>{item.authorName.slice(0, 1).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.authorCopy}>
          <Text style={styles.authorName}>{item.authorName}</Text>
          <Text style={styles.date}>{formatFirebaseDate(item.createdAt)}</Text>
        </View>
        <View style={styles.kindPill}>
          <Text style={styles.kind}>{item.kind === "video" ? "VÍDEO" : "POST"}</Text>
        </View>
      </View>

      {item.text ? <Text style={styles.postText}>{item.text}</Text> : null}

      {item.kind === "image" && item.mediaUrl ? (
        <Image source={{ uri: item.mediaUrl }} style={styles.media} resizeMode="cover" />
      ) : null}

      {item.kind === "video" ? (
        <View style={styles.videoPlaceholder}>
          <View style={styles.playButton}>
            <Text style={styles.videoIcon}>▶</Text>
          </View>
          <Text style={styles.videoTitle}>Vídeo publicado</Text>
          <Text style={styles.muted}>Conteúdo em vídeo da comunidade.</Text>
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        <Text style={styles.cardFooterText}>BANCO DE ATLETAS</Text>
        <View style={styles.footerLine} />
        <Text style={styles.cardFooterTextGold}>REDE ESPORTIVA</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: brand.colors.bg },
  content: { padding: 16, paddingTop: 14, paddingBottom: 112, gap: 15 },
  filterRow: { flexDirection: "row", gap: 9, marginBottom: 10 },
  filterChip: {
    borderWidth: 1,
    borderColor: brand.colors.border,
    borderRadius: brand.radius.pill,
    backgroundColor: brand.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  filterChipActive: {
    borderColor: brand.colors.cyan,
    backgroundColor: "#0a4160",
  },
  filterChipText: { color: brand.colors.mutedStrong, fontSize: 12, fontWeight: "800" },
  filterChipTextActive: { color: brand.colors.cyanSoft },
  feedMetaRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 4 },
  feedMeta: { color: brand.colors.muted, fontSize: 11, fontWeight: "700" },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: brand.colors.success },
  error: {
    marginTop: 8,
    borderRadius: brand.radius.sm,
    backgroundColor: brand.colors.dangerBg,
    color: "#ffd6dc",
    fontWeight: "700",
    padding: 11,
  },
  center: { alignItems: "center", gap: 10, paddingVertical: 56 },
  empty: {
    borderRadius: brand.radius.lg,
    borderWidth: 1,
    borderColor: brand.colors.borderSoft,
    backgroundColor: brand.colors.surface,
    padding: 22,
  },
  emptyTitle: { color: brand.colors.text, fontSize: 18, fontWeight: "900", marginBottom: 6 },
  muted: { color: brand.colors.muted, lineHeight: 19, textAlign: "center" },
  card: {
    position: "relative",
    overflow: "hidden",
    borderRadius: brand.radius.xl,
    borderWidth: 1,
    borderColor: brand.colors.borderSoft,
    backgroundColor: brand.colors.surface,
    ...brand.shadow,
  },
  cardAccent: { position: "absolute", left: 0, right: 0, top: 0, height: 3, backgroundColor: brand.colors.cyan },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 11, padding: 15 },
  avatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: brand.colors.cyan, backgroundColor: brand.colors.surfaceSoft },
  avatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: brand.colors.cyan,
    backgroundColor: brand.colors.surfaceSoft,
  },
  avatarText: { color: brand.colors.cyanSoft, fontWeight: "900", fontSize: 18 },
  authorCopy: { flex: 1 },
  authorName: { color: brand.colors.text, fontSize: 15, fontWeight: "900" },
  date: { marginTop: 2, color: brand.colors.muted, fontSize: 11 },
  kindPill: {
    borderRadius: brand.radius.pill,
    borderWidth: 1,
    borderColor: brand.colors.border,
    backgroundColor: brand.colors.bgDeep,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  kind: { color: brand.colors.cyan, fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  postText: { color: brand.colors.text, fontSize: 15, lineHeight: 22, paddingHorizontal: 15, paddingBottom: 15 },
  media: { width: "100%", aspectRatio: 4 / 3, backgroundColor: brand.colors.bgDeep },
  videoPlaceholder: { minHeight: 190, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: brand.colors.bgDeep, padding: 24 },
  playButton: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", backgroundColor: brand.colors.cyan },
  videoIcon: { marginLeft: 3, color: brand.colors.bgDeep, fontSize: 24, fontWeight: "900" },
  videoTitle: { color: brand.colors.text, fontSize: 16, fontWeight: "900" },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 15, paddingVertical: 12 },
  cardFooterText: { color: brand.colors.muted, fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  cardFooterTextGold: { color: brand.colors.gold, fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  footerLine: { flex: 1, height: 1, backgroundColor: brand.colors.borderSoft },
});
