import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { PublicProfileV1 } from "@/contracts/schema-v1";
import { loadExploreProfiles } from "@/services/mobileContent";

function norm(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function ExploreScreen() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<PublicProfileV1[]>([]);
  const [search, setSearch] = useState("");
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
    if (!term) return profiles;
    return profiles.filter((profile) =>
      norm([
        profile.nome,
        profile.cidade,
        profile.uf,
        profile.modalidade,
        profile.posicao,
        profile.categoria,
        profile.time,
      ].filter(Boolean).join(" ")).includes(term),
    );
  }, [profiles, search]);

  return (
    <FlatList
      data={filtered}
      numColumns={2}
      keyExtractor={(item) => item.uid}
      style={styles.list}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.eyebrow}>DESCOBERTA</Text>
          <Text style={styles.title}>Explorar atletas</Text>
          <Text style={styles.subtitle}>Busque por nome, cidade, categoria, posição, modalidade ou equipe.</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar atleta…"
            placeholderTextColor="#718695"
            autoCapitalize="none"
            style={styles.search}
          />
          <Text style={styles.counter}>{filtered.length} atleta{filtered.length === 1 ? "" : "s"}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#48cae4" />
            <Text style={styles.muted}>Carregando atletas…</Text>
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nenhum atleta encontrado</Text>
            <Text style={styles.muted}>Tente outro nome, cidade ou categoria.</Text>
          </View>
        )
      }
      renderItem={({ item }) => (
        <ProfileCard
          profile={item}
          onPress={() => router.push({ pathname: "/athlete/[uid]", params: { uid: item.uid } })}
        />
      )}
    />
  );
}

function ProfileCard({ profile, onPress }: { profile: PublicProfileV1; onPress: () => void }) {
  const meta = [profile.cidade, profile.uf].filter(Boolean).join(" / ");
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {profile.fotoUrl ? (
        <Image source={{ uri: profile.fotoUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarText}>{profile.nome.slice(0, 1).toUpperCase()}</Text>
        </View>
      )}
      <Text numberOfLines={2} style={styles.name}>{profile.nome}</Text>
      <Text numberOfLines={1} style={styles.category}>{profile.categoria || "Categoria não informada"}</Text>
      <Text numberOfLines={1} style={styles.meta}>{meta || "Cidade não informada"}</Text>
      {profile.time ? <Text numberOfLines={1} style={styles.team}>{profile.time}</Text> : null}
      <Text style={styles.openHint}>VER PERFIL</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: "#071827" },
  content: { padding: 16, paddingBottom: 110 },
  row: { gap: 12, marginBottom: 12 },
  header: { marginBottom: 14 },
  eyebrow: { color: "#d9a93f", fontSize: 12, fontWeight: "900", letterSpacing: 1.1 },
  title: { marginTop: 4, color: "#ffffff", fontSize: 32, fontWeight: "900" },
  subtitle: { marginTop: 6, color: "#b8c7d9", lineHeight: 20 },
  search: { marginTop: 14, borderWidth: 1, borderColor: "#29445c", borderRadius: 16, backgroundColor: "#0d2235", color: "#ffffff", paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  counter: { marginTop: 9, color: "#8fa0ac", fontSize: 12, fontWeight: "700" },
  error: { marginTop: 8, color: "#ff9b9b", fontWeight: "700" },
  center: { alignItems: "center", gap: 10, paddingVertical: 60 },
  empty: { borderRadius: 20, backgroundColor: "#0d2235", padding: 22 },
  emptyTitle: { color: "#ffffff", fontSize: 18, fontWeight: "900", marginBottom: 6 },
  muted: { color: "#9fb0bf" },
  card: { flex: 1, minWidth: 0, alignItems: "center", borderRadius: 20, backgroundColor: "#0d2235", padding: 14 },
  pressed: { opacity: 0.72 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#17384d" },
  avatarFallback: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", backgroundColor: "#17384d" },
  avatarText: { color: "#7ddff0", fontSize: 26, fontWeight: "900" },
  name: { marginTop: 10, color: "#ffffff", fontSize: 15, fontWeight: "900", textAlign: "center" },
  category: { marginTop: 4, color: "#48cae4", fontSize: 12, fontWeight: "800" },
  meta: { marginTop: 4, color: "#a8bac8", fontSize: 11, textAlign: "center" },
  team: { marginTop: 6, color: "#d9a93f", fontSize: 11, fontWeight: "800" },
  openHint: { marginTop: 10, color: "#7ddff0", fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
});
