import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { loadChampionships, type MobileChampionship } from "@/services/mobileContent";

function formatDate(value: string) {
  if (!value) return "Data não informada";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? "Data não informada" : date.toLocaleDateString("pt-BR");
}

function safeHttpsUrl(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(normalized);
    return parsed.protocol === "https:" ? parsed.href : "";
  } catch {
    return "";
  }
}

export default function ChampionshipsScreen() {
  const [items, setItems] = useState<MobileChampionship[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      setItems(await loadChampionships());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar os campeonatos.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      style={styles.list}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.eyebrow}>AGENDA ESPORTIVA</Text>
          <Text style={styles.title}>Campeonatos</Text>
          <Text style={styles.subtitle}>Próximos eventos publicados no cadastrodeatletas.com.br.</Text>
          <Text style={styles.counter}>{items.length} evento{items.length === 1 ? "" : "s"} próximo{items.length === 1 ? "" : "s"}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#48cae4" />
            <Text style={styles.muted}>Carregando campeonatos…</Text>
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nenhum campeonato próximo</Text>
            <Text style={styles.muted}>Assim que um evento for publicado no site, ele aparecerá aqui.</Text>
          </View>
        )
      }
      renderItem={({ item }) => <ChampionshipCard item={item} />}
    />
  );
}

function ChampionshipCard({ item }: { item: MobileChampionship }) {
  const link = safeHttpsUrl(item.linkOrganizador);

  return (
    <View style={styles.card}>
      {item.imagem ? (
        <Image source={{ uri: item.imagem }} style={styles.poster} resizeMode="cover" />
      ) : (
        <View style={styles.posterFallback}>
          <Text style={styles.trophy}>🏆</Text>
          <Text style={styles.posterFallbackText}>CAMPEONATO</Text>
        </View>
      )}

      <View style={styles.body}>
        <Text style={styles.tag}>🏆 CAMPEONATO</Text>
        <Text style={styles.name}>{item.nome}</Text>
        <Text style={styles.meta}>📅 {formatDate(item.data)}</Text>
        <Text style={styles.meta}>📍 {item.local}</Text>
        <Text style={styles.meta}>👤 {item.organizador}</Text>
        {item.descricao ? <Text style={styles.description}>{item.descricao}</Text> : null}

        {link ? (
          <Pressable onPress={() => void Linking.openURL(link)} style={styles.linkButton}>
            <Text style={styles.linkButtonText}>ABRIR INSCRIÇÕES / ORGANIZADOR</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: "#071827" },
  content: { padding: 16, paddingBottom: 110, gap: 14 },
  header: { marginBottom: 2 },
  eyebrow: { color: "#d9a93f", fontSize: 12, fontWeight: "900", letterSpacing: 1.1 },
  title: { marginTop: 4, color: "#ffffff", fontSize: 32, fontWeight: "900" },
  subtitle: { marginTop: 6, color: "#b8c7d9", lineHeight: 20 },
  counter: { marginTop: 9, color: "#8fa0ac", fontSize: 12, fontWeight: "700" },
  error: { marginTop: 8, color: "#ff9b9b", fontWeight: "700" },
  center: { alignItems: "center", gap: 10, paddingVertical: 58 },
  empty: { borderRadius: 20, backgroundColor: "#0d2235", padding: 22 },
  emptyTitle: { color: "#ffffff", fontSize: 18, fontWeight: "900", marginBottom: 6 },
  muted: { color: "#9fb0bf", lineHeight: 19 },
  card: { overflow: "hidden", borderRadius: 22, backgroundColor: "#0d2235" },
  poster: { width: "100%", aspectRatio: 16 / 10, backgroundColor: "#06121d" },
  posterFallback: { width: "100%", aspectRatio: 16 / 9, alignItems: "center", justifyContent: "center", backgroundColor: "#102c42" },
  trophy: { fontSize: 40 },
  posterFallbackText: { marginTop: 8, color: "#d9a93f", fontWeight: "900", letterSpacing: 1.4 },
  body: { padding: 16 },
  tag: { color: "#d9a93f", fontSize: 11, fontWeight: "900" },
  name: { marginTop: 6, color: "#ffffff", fontSize: 22, fontWeight: "900" },
  meta: { marginTop: 7, color: "#c8d3dc", lineHeight: 20 },
  description: { marginTop: 12, color: "#a8bac8", lineHeight: 20 },
  linkButton: { marginTop: 16, alignItems: "center", borderRadius: 14, backgroundColor: "#48cae4", paddingVertical: 13, paddingHorizontal: 10 },
  linkButtonText: { color: "#071827", fontSize: 12, fontWeight: "900", textAlign: "center" },
});
