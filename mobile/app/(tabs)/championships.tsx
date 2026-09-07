import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import { loadChampionships, type MobileChampionship } from "@/services/mobileContent";
import { brand } from "@/ui/brand";

type ChampionshipFilter = "Todos" | "Com inscrição" | "Sem link";

function norm(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatDate(value: string) {
  if (!value) return "Data não informada";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? "Data não informada" : date.toLocaleDateString("pt-BR");
}

function dateMillis(value: string) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const parsed = new Date(`${value}T12:00:00`).getTime();
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
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
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ChampionshipFilter>("Todos");
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

  const filtered = useMemo(() => {
    const term = norm(search);
    return items
      .filter((item) => {
        const link = safeHttpsUrl(item.linkOrganizador);
        if (filter === "Com inscrição" && !link) return false;
        if (filter === "Sem link" && link) return false;
        if (!term) return true;
        return norm(`${item.nome} ${item.local} ${item.organizador} ${item.descricao}`).includes(term);
      })
      .sort((a, b) => dateMillis(a.data) - dateMillis(b.data));
  }, [filter, items, search]);

  const withLink = useMemo(() => items.filter((item) => Boolean(safeHttpsUrl(item.linkOrganizador))).length, [items]);

  return (
    <FlatList
      data={filtered}
      keyExtractor={(item) => item.id}
      style={styles.list}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={brand.colors.cyan} />
      }
      ListHeaderComponent={
        <View>
          <BrandHeader
            eyebrow="MAIS COMPETIÇÕES. MAIS OPORTUNIDADES."
            title="Campeonatos"
            subtitle="Eventos, torneios e competições publicados pela rede Banco de Atletas."
          />
          <View style={styles.statsRow}>
            <MiniStat value={String(items.length)} label="EVENTOS" />
            <MiniStat value={String(withLink)} label="INSCRIÇÕES" />
            <MiniStat value="BR" label="REDE" gold />
          </View>

          <View style={styles.searchWrap}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar campeonato, cidade, organizador…"
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

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {(["Todos", "Com inscrição", "Sem link"] as ChampionshipFilter[]).map((item) => (
              <Pressable
                key={item}
                onPress={() => setFilter(item)}
                style={({ pressed }) => [styles.filterChip, filter === item && styles.filterChipActive, pressed && styles.pressed]}
              >
                <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.resultRow}>
            <Text style={styles.counter}>{filtered.length} evento{filtered.length === 1 ? "" : "s"}</Text>
            <Text style={styles.resultHint}>AGENDA ESPORTIVA</Text>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={brand.colors.cyan} />
            <Text style={styles.muted}>Carregando campeonatos…</Text>
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nenhum campeonato encontrado</Text>
            <Text style={styles.muted}>Altere a busca ou o filtro para consultar a agenda.</Text>
          </View>
        )
      }
      renderItem={({ item, index }) => <ChampionshipCard item={item} featured={index === 0 && !search && filter === "Todos"} />}
    />
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

function ChampionshipCard({ item, featured }: { item: MobileChampionship; featured: boolean }) {
  const link = safeHttpsUrl(item.linkOrganizador);

  const shareChampionship = useCallback(async () => {
    const message = [
      `🏆 ${item.nome}`,
      item.data ? `📅 ${formatDate(item.data)}` : "",
      item.local ? `📍 ${item.local}` : "",
      item.organizador ? `Organização: ${item.organizador}` : "",
      link,
      "Banco de Atletas",
    ]
      .filter(Boolean)
      .join("\n");
    await Share.share({ message });
  }, [item.data, item.local, item.nome, item.organizador, link]);

  return (
    <View style={[styles.card, featured && styles.cardFeatured]}>
      <View style={styles.cardAccent} />
      {item.imagem ? (
        <Image source={{ uri: item.imagem }} style={[styles.poster, featured && styles.posterFeatured]} resizeMode="cover" />
      ) : (
        <View style={[styles.posterFallback, featured && styles.posterFeatured]}>
          <Text style={styles.trophy}>🏆</Text>
          <Text style={styles.posterFallbackText}>BANCO DE ATLETAS</Text>
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.tagRow}>
          <View style={[styles.tag, featured && styles.featuredTag]}>
            <Text style={[styles.tagText, featured && styles.featuredTagText]}>{featured ? "EM DESTAQUE" : "CAMPEONATO"}</Text>
          </View>
          <Text style={styles.dateTop}>{formatDate(item.data)}</Text>
        </View>

        <Text style={styles.name}>{item.nome}</Text>
        <View style={styles.metaGrid}>
          <View style={styles.metaPill}><Text style={styles.metaIcon}>⌖</Text><Text numberOfLines={1} style={styles.metaText}>{item.local || "Local não informado"}</Text></View>
          <View style={styles.metaPill}><Text style={styles.metaIcon}>●</Text><Text numberOfLines={1} style={styles.metaText}>{item.organizador || "Organizador não informado"}</Text></View>
        </View>
        {item.descricao ? <Text numberOfLines={featured ? 4 : 3} style={styles.description}>{item.descricao}</Text> : null}

        <View style={styles.actionRow}>
          <Pressable onPress={() => void shareChampionship()} style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}>
            <Text style={styles.shareButtonText}>↗ COMPARTILHAR</Text>
          </Pressable>
          {link ? (
            <Pressable onPress={() => void Linking.openURL(link)} style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}>
              <Text style={styles.linkButtonText}>INSCRIÇÕES</Text>
              <Text style={styles.linkArrow}>›</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: brand.colors.bg },
  content: { padding: 16, paddingTop: 14, paddingBottom: 112, gap: 14 },
  statsRow: { flexDirection: "row", gap: 9, marginBottom: 11 },
  statCard: { flex: 1, alignItems: "center", borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.md, backgroundColor: brand.colors.surface, paddingVertical: 11 },
  statValue: { color: brand.colors.cyan, fontSize: 18, fontWeight: "900" },
  statValueGold: { color: brand.colors.gold },
  statLabel: { marginTop: 2, color: brand.colors.muted, fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  searchWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: brand.colors.border, borderRadius: brand.radius.md, backgroundColor: brand.colors.surface, paddingHorizontal: 13 },
  searchIcon: { marginRight: 8, color: brand.colors.cyan, fontSize: 23, fontWeight: "900" },
  search: { flex: 1, color: brand.colors.text, paddingVertical: 12, fontSize: 14 },
  clearSearch: { color: brand.colors.mutedStrong, fontSize: 24, lineHeight: 28 },
  filterScroll: { gap: 8, paddingVertical: 11, paddingRight: 18 },
  filterChip: { borderWidth: 1, borderColor: brand.colors.border, borderRadius: brand.radius.pill, backgroundColor: brand.colors.surface, paddingHorizontal: 13, paddingVertical: 8 },
  filterChipActive: { borderColor: brand.colors.cyan, backgroundColor: "#0a4160" },
  filterText: { color: brand.colors.mutedStrong, fontSize: 10, fontWeight: "800" },
  filterTextActive: { color: brand.colors.cyanSoft },
  resultRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  counter: { color: brand.colors.text, fontSize: 12, fontWeight: "900" },
  resultHint: { color: brand.colors.gold, fontSize: 8, fontWeight: "900", letterSpacing: 0.7 },
  error: { marginTop: 10, color: brand.colors.danger, fontWeight: "700" },
  center: { alignItems: "center", gap: 10, paddingVertical: 58 },
  empty: { borderRadius: brand.radius.lg, borderWidth: 1, borderColor: brand.colors.borderSoft, backgroundColor: brand.colors.surface, padding: 22 },
  emptyTitle: { color: brand.colors.text, fontSize: 18, fontWeight: "900", marginBottom: 6 },
  muted: { color: brand.colors.muted, lineHeight: 19, textAlign: "center" },
  card: { position: "relative", overflow: "hidden", borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.xl, backgroundColor: brand.colors.surface, ...brand.shadow },
  cardFeatured: { borderColor: brand.colors.cyan },
  cardAccent: { position: "absolute", zIndex: 2, left: 0, right: 0, top: 0, height: 3, backgroundColor: brand.colors.gold },
  poster: { width: "100%", aspectRatio: 16 / 9, backgroundColor: brand.colors.bgDeep },
  posterFeatured: { aspectRatio: 16 / 10 },
  posterFallback: { width: "100%", aspectRatio: 16 / 9, alignItems: "center", justifyContent: "center", backgroundColor: brand.colors.surfaceSoft },
  trophy: { fontSize: 42 },
  posterFallbackText: { marginTop: 8, color: brand.colors.gold, fontWeight: "900", letterSpacing: 1.2 },
  body: { padding: 15 },
  tagRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  tag: { borderRadius: brand.radius.pill, borderWidth: 1, borderColor: brand.colors.border, backgroundColor: brand.colors.bgDeep, paddingHorizontal: 9, paddingVertical: 5 },
  featuredTag: { borderColor: brand.colors.gold, backgroundColor: "#3c2c0d" },
  tagText: { color: brand.colors.cyan, fontSize: 8, fontWeight: "900", letterSpacing: 0.7 },
  featuredTagText: { color: brand.colors.gold },
  dateTop: { color: brand.colors.mutedStrong, fontSize: 10, fontWeight: "800" },
  name: { marginTop: 9, color: brand.colors.text, fontSize: 22, lineHeight: 27, fontWeight: "900" },
  metaGrid: { gap: 7, marginTop: 11 },
  metaPill: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: brand.radius.sm, backgroundColor: brand.colors.bgDeep, paddingHorizontal: 10, paddingVertical: 8 },
  metaIcon: { color: brand.colors.cyan, fontWeight: "900" },
  metaText: { flex: 1, color: brand.colors.mutedStrong, fontSize: 11 },
  description: { marginTop: 11, color: brand.colors.mutedStrong, lineHeight: 20 },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 15 },
  shareButton: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: brand.radius.md, borderWidth: 1, borderColor: brand.colors.cyan, backgroundColor: brand.colors.bgDeep, paddingVertical: 13, paddingHorizontal: 10 },
  shareButtonText: { color: brand.colors.cyanSoft, fontSize: 9, fontWeight: "900", letterSpacing: 0.4 },
  linkButton: { flex: 1.1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: brand.radius.md, borderWidth: 1, borderColor: "#ffe27a", backgroundColor: brand.colors.gold, paddingVertical: 13, paddingHorizontal: 14 },
  linkButtonText: { color: brand.colors.bgDeep, fontSize: 10, fontWeight: "900" },
  linkArrow: { color: brand.colors.bgDeep, fontSize: 24, fontWeight: "900" },
  pressed: { opacity: 0.8 },
});
