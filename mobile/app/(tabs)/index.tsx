import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  formatFirebaseDate,
  loadMobileFeed,
  type MobileFeedItem,
} from "@/services/mobileContent";

export default function FeedScreen() {
  const [items, setItems] = useState<MobileFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      setItems(await loadMobileFeed());
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

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => `${item.kind}-${item.id}`}
      style={styles.list}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.eyebrow}>REDE ESPORTIVA</Text>
          <Text style={styles.title}>Feed</Text>
          <Text style={styles.subtitle}>Publicações recentes do mesmo feed do cadastrodeatletas.com.br.</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#48cae4" />
            <Text style={styles.muted}>Carregando publicações…</Text>
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>O feed está começando</Text>
            <Text style={styles.muted}>Quando alguém publicar no site ou no app, o conteúdo aparecerá aqui.</Text>
          </View>
        )
      }
      renderItem={({ item }) => <FeedCard item={item} />}
    />
  );
}

function FeedCard({ item }: { item: MobileFeedItem }) {
  return (
    <View style={styles.card}>
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
        <Text style={styles.kind}>{item.kind === "video" ? "VÍDEO" : "POST"}</Text>
      </View>

      {item.text ? <Text style={styles.postText}>{item.text}</Text> : null}

      {item.kind === "image" && item.mediaUrl ? (
        <Image source={{ uri: item.mediaUrl }} style={styles.media} resizeMode="cover" />
      ) : null}

      {item.kind === "video" ? (
        <View style={styles.videoPlaceholder}>
          <Text style={styles.videoIcon}>▶</Text>
          <Text style={styles.videoTitle}>Vídeo publicado</Text>
          <Text style={styles.muted}>A reprodução nativa será ativada na etapa de mídia do app.</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: "#071827" },
  content: { padding: 16, paddingBottom: 110, gap: 14 },
  header: { marginBottom: 4 },
  eyebrow: { color: "#d9a93f", fontSize: 12, fontWeight: "900", letterSpacing: 1.1 },
  title: { marginTop: 4, color: "#ffffff", fontSize: 34, fontWeight: "900" },
  subtitle: { marginTop: 6, color: "#b8c7d9", lineHeight: 20 },
  error: { marginTop: 10, color: "#ff9b9b", fontWeight: "700" },
  center: { alignItems: "center", gap: 10, paddingVertical: 56 },
  empty: { borderRadius: 20, backgroundColor: "#0d2235", padding: 22 },
  emptyTitle: { color: "#ffffff", fontSize: 18, fontWeight: "900", marginBottom: 6 },
  muted: { color: "#9fb0bf", lineHeight: 19 },
  card: { overflow: "hidden", borderRadius: 22, backgroundColor: "#0d2235" },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#17384d" },
  avatarFallback: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "#17384d" },
  avatarText: { color: "#7ddff0", fontWeight: "900", fontSize: 18 },
  authorCopy: { flex: 1 },
  authorName: { color: "#ffffff", fontSize: 15, fontWeight: "900" },
  date: { marginTop: 2, color: "#8fa0ac", fontSize: 11 },
  kind: { color: "#48cae4", fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  postText: { color: "#e7edf2", fontSize: 15, lineHeight: 22, paddingHorizontal: 14, paddingBottom: 14 },
  media: { width: "100%", aspectRatio: 4 / 5, backgroundColor: "#06121d" },
  videoPlaceholder: { minHeight: 190, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#06121d", padding: 24 },
  videoIcon: { color: "#48cae4", fontSize: 36, fontWeight: "900" },
  videoTitle: { color: "#ffffff", fontSize: 16, fontWeight: "900" },
});
