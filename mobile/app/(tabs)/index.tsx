import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import { FullScreenImageViewer } from "@/components/FullScreenImageViewer";
import { formatFirebaseDate, type MobileFeedItem } from "@/services/mobileContent";
import { loadCompleteMobileFeed } from "@/services/feedService";
import { brand } from "@/ui/brand";

type FeedFilter = "all" | "image" | "video";
type ImagePreview = {
  uri: string;
  authorName: string;
  caption: string;
} | null;

function norm(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function FeedScreen() {
  const router = useRouter();
  const [items, setItems] = useState<MobileFeedItem[]>([]);
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<ImagePreview>(null);

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
    const term = norm(search);
    return items.filter((item) => {
      if (filter !== "all" && item.kind !== filter) return false;
      if (!term) return true;
      return norm(`${item.authorName} ${item.text}`).includes(term);
    });
  }, [filter, items, search]);

  const imageCount = useMemo(() => items.filter((item) => item.kind === "image").length, [items]);
  const videoCount = items.length - imageCount;

  return (
    <>
      <FlatList
        data={visibleItems}
        keyExtractor={(item) => `${item.kind}-${item.id}`}
        style={styles.list}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
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

            <View style={styles.networkStats}>
              <MiniStat value={String(items.length)} label="PUBLICAÇÕES" />
              <MiniStat value={String(imageCount)} label="FOTOS" />
              <MiniStat value={String(videoCount)} label="VÍDEOS" gold />
            </View>

            <View style={styles.searchWrap}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar publicação ou atleta…"
                placeholderTextColor={brand.colors.muted}
                autoCapitalize="none"
                style={styles.search}
              />
              {search ? (
                <Pressable onPress={() => setSearch("")} hitSlop={10}>
                  <Text style={styles.clearSearch}>×</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.filterRow}>
              <FilterChip label="Todos" active={filter === "all"} onPress={() => setFilter("all")} />
              <FilterChip label="Fotos" active={filter === "image"} onPress={() => setFilter("image")} />
              <FilterChip label="Vídeos" active={filter === "video"} onPress={() => setFilter("video")} />
            </View>
            <View style={styles.feedMetaRow}>
              <Text style={styles.feedMeta}>{visibleItems.length} resultado{visibleItems.length === 1 ? "" : "s"}</Text>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>REDE ATIVA</Text>
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
              <Text style={styles.muted}>Altere os filtros ou a busca e tente novamente.</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <FeedCard
            item={item}
            onOpenAthlete={() => {
              if (!item.ownerUid) return;
              router.push({ pathname: "/athlete/[uid]", params: { uid: item.ownerUid } });
            }}
            onOpenImage={() => {
              if (!item.mediaUrl) return;
              setImagePreview({
                uri: item.mediaUrl,
                authorName: item.authorName,
                caption: item.text,
              });
            }}
          />
        )}
      />

      <FullScreenImageViewer
        visible={Boolean(imagePreview)}
        uri={imagePreview?.uri || ""}
        authorName={imagePreview?.authorName}
        caption={imagePreview?.caption}
        onClose={() => setImagePreview(null)}
      />
    </>
  );
}

function MiniStat({ value, label, gold = false }: { value: string; label: string; gold?: boolean }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, gold && styles.statValueGold]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.filterChip, active && styles.filterChipActive, pressed && styles.pressed]}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function FeedCard({
  item,
  onOpenAthlete,
  onOpenImage,
}: {
  item: MobileFeedItem;
  onOpenAthlete: () => void;
  onOpenImage: () => void;
}) {
  const sharePost = useCallback(async () => {
    const parts = [item.text, item.mediaUrl, `Publicado por ${item.authorName} no Banco de Atletas`].filter(Boolean);
    await Share.share({ message: parts.join("\n\n") });
  }, [item.authorName, item.mediaUrl, item.text]);

  return (
    <View style={styles.card}>
      <View style={styles.cardAccent} />
      <Pressable onPress={onOpenAthlete} disabled={!item.ownerUid} style={({ pressed }) => [styles.authorRow, pressed && styles.pressed]}>
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
      </Pressable>

      {item.text ? <Text style={styles.postText}>{item.text}</Text> : null}

      {item.kind === "image" && item.mediaUrl ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Abrir foto publicada por ${item.authorName} em tela cheia`}
          onPress={onOpenImage}
          style={({ pressed }) => [styles.mediaButton, pressed && styles.mediaPressed]}
        >
          <Image source={{ uri: item.mediaUrl }} style={styles.media} resizeMode="cover" />
          <View pointerEvents="none" style={styles.mediaHint}>
            <Text style={styles.mediaHintIcon}>⛶</Text>
            <Text style={styles.mediaHintText}>TOQUE PARA AMPLIAR</Text>
          </View>
        </Pressable>
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

      <View style={styles.actionRow}>
        <Pressable disabled={!item.ownerUid} onPress={onOpenAthlete} style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
          <Text style={styles.actionIcon}>◎</Text>
          <Text style={styles.actionText}>VER ATLETA</Text>
        </Pressable>
        <Pressable onPress={() => void sharePost()} style={({ pressed }) => [styles.actionButtonGold, pressed && styles.pressed]}>
          <Text style={styles.actionIconGold}>↗</Text>
          <Text style={styles.actionTextGold}>COMPARTILHAR</Text>
        </Pressable>
      </View>

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
  networkStats: { flexDirection: "row", gap: 8, marginBottom: 11 },
  statCard: { flex: 1, alignItems: "center", borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.md, backgroundColor: brand.colors.surface, paddingVertical: 10 },
  statValue: { color: brand.colors.cyan, fontSize: 17, fontWeight: "900" },
  statValueGold: { color: brand.colors.gold },
  statLabel: { marginTop: 2, color: brand.colors.muted, fontSize: 8, fontWeight: "900", letterSpacing: 0.65 },
  searchWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: brand.colors.border, borderRadius: brand.radius.md, backgroundColor: brand.colors.surface, paddingHorizontal: 13, marginBottom: 11 },
  searchIcon: { marginRight: 8, color: brand.colors.cyan, fontSize: 23, fontWeight: "900" },
  search: { flex: 1, color: brand.colors.text, paddingVertical: 12, fontSize: 14 },
  clearSearch: { color: brand.colors.mutedStrong, fontSize: 24, lineHeight: 28 },
  filterRow: { flexDirection: "row", gap: 9, marginBottom: 10 },
  filterChip: { borderWidth: 1, borderColor: brand.colors.border, borderRadius: brand.radius.pill, backgroundColor: brand.colors.surface, paddingHorizontal: 16, paddingVertical: 9 },
  filterChipActive: { borderColor: brand.colors.cyan, backgroundColor: "#0a4160" },
  filterChipText: { color: brand.colors.mutedStrong, fontSize: 12, fontWeight: "800" },
  filterChipTextActive: { color: brand.colors.cyanSoft },
  feedMetaRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 4 },
  feedMeta: { color: brand.colors.muted, fontSize: 11, fontWeight: "700" },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: brand.colors.success },
  liveText: { color: brand.colors.success, fontSize: 8, fontWeight: "900", letterSpacing: 0.7 },
  error: { marginTop: 8, borderRadius: brand.radius.sm, backgroundColor: brand.colors.dangerBg, color: "#ffd6dc", fontWeight: "700", padding: 11 },
  center: { alignItems: "center", gap: 10, paddingVertical: 56 },
  empty: { borderRadius: brand.radius.lg, borderWidth: 1, borderColor: brand.colors.borderSoft, backgroundColor: brand.colors.surface, padding: 22 },
  emptyTitle: { color: brand.colors.text, fontSize: 18, fontWeight: "900", marginBottom: 6 },
  muted: { color: brand.colors.muted, lineHeight: 19, textAlign: "center" },
  card: { position: "relative", overflow: "hidden", borderRadius: brand.radius.xl, borderWidth: 1, borderColor: brand.colors.borderSoft, backgroundColor: brand.colors.surface, ...brand.shadow },
  cardAccent: { position: "absolute", left: 0, right: 0, top: 0, height: 3, backgroundColor: brand.colors.cyan },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 11, padding: 15 },
  avatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: brand.colors.cyan, backgroundColor: brand.colors.surfaceSoft },
  avatarFallback: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: brand.colors.cyan, backgroundColor: brand.colors.surfaceSoft },
  avatarText: { color: brand.colors.cyanSoft, fontWeight: "900", fontSize: 18 },
  authorCopy: { flex: 1 },
  authorName: { color: brand.colors.text, fontSize: 15, fontWeight: "900" },
  date: { marginTop: 2, color: brand.colors.muted, fontSize: 11 },
  kindPill: { borderRadius: brand.radius.pill, borderWidth: 1, borderColor: brand.colors.border, backgroundColor: brand.colors.bgDeep, paddingHorizontal: 9, paddingVertical: 6 },
  kind: { color: brand.colors.cyan, fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  postText: { color: brand.colors.text, fontSize: 15, lineHeight: 22, paddingHorizontal: 15, paddingBottom: 15 },
  mediaButton: { position: "relative", width: "100%", overflow: "hidden", backgroundColor: brand.colors.bgDeep },
  media: { width: "100%", aspectRatio: 4 / 3, backgroundColor: brand.colors.bgDeep },
  mediaPressed: { opacity: 0.9 },
  mediaHint: {
    position: "absolute",
    right: 10,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: brand.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "rgba(0, 16, 28, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(91, 218, 255, 0.42)",
  },
  mediaHintIcon: { color: brand.colors.cyan, fontSize: 14, fontWeight: "900" },
  mediaHintText: { color: "#ffffff", fontSize: 8, fontWeight: "900", letterSpacing: 0.6 },
  videoPlaceholder: { minHeight: 190, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: brand.colors.bgDeep, padding: 24 },
  playButton: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", backgroundColor: brand.colors.cyan },
  videoIcon: { marginLeft: 3, color: brand.colors.bgDeep, fontSize: 24, fontWeight: "900" },
  videoTitle: { color: brand.colors.text, fontSize: 16, fontWeight: "900" },
  actionRow: { flexDirection: "row", gap: 8, padding: 12, paddingBottom: 2 },
  actionButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderWidth: 1, borderColor: brand.colors.border, borderRadius: brand.radius.md, backgroundColor: brand.colors.bgDeep, paddingVertical: 10 },
  actionButtonGold: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderWidth: 1, borderColor: brand.colors.gold, borderRadius: brand.radius.md, backgroundColor: "#3c2c0d", paddingVertical: 10 },
  actionIcon: { color: brand.colors.cyan, fontSize: 15, fontWeight: "900" },
  actionIconGold: { color: brand.colors.gold, fontSize: 15, fontWeight: "900" },
  actionText: { color: brand.colors.cyanSoft, fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  actionTextGold: { color: brand.colors.gold, fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 15, paddingVertical: 12 },
  cardFooterText: { color: brand.colors.muted, fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  cardFooterTextGold: { color: brand.colors.gold, fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  footerLine: { flex: 1, height: 1, backgroundColor: brand.colors.borderSoft },
  pressed: { opacity: 0.76 },
});