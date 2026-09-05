import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { ChampionshipHistoryItemV1, PublicProfileV1 } from "@/contracts/schema-v1";
import { resolveLegacyAthleteById, resolveProfile } from "@/services/profileResolver";

function historyTitle(item: ChampionshipHistoryItemV1): string {
  return String(item.campeonato || item.nome || item.evento || "Campeonato").trim();
}

function historyPlacement(item: ChampionshipHistoryItemV1): string {
  return String(item.colocacao || item.resultado || "Participação").trim();
}

function historyYear(item: ChampionshipHistoryItemV1): string {
  return String(item.ano || item.data || "").trim();
}

function placementPoints(value: unknown): number {
  const normalized = String(value || "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (/(^|\s)(1[ºo°]?|primeiro|campeao)/.test(normalized)) return 100;
  if (/(^|\s)(2[ºo°]?|segundo)/.test(normalized)) return 80;
  if (/(^|\s)(3[ºo°]?|terceiro)/.test(normalized)) return 65;
  if (/(^|\s)(4[ºo°]?|quarto)/.test(normalized)) return 55;
  if (/(^|\s)[5-8][ºo°]?/.test(normalized)) return 40;
  if (/(^|\s)(9|10|11|12|13|14|15|16)[ºo°]?/.test(normalized)) return 25;
  return 10;
}

export default function AthleteScreen() {
  const params = useLocalSearchParams<{ uid?: string; athleteId?: string }>();
  const uid = typeof params.uid === "string" ? params.uid : "";
  const athleteId = typeof params.athleteId === "string" ? params.athleteId : "";
  const [profile, setProfile] = useState<PublicProfileV1 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!uid && !athleteId) {
      setLoading(false);
      setError("Atleta não informado.");
      return;
    }

    setLoading(true);
    setError(null);
    const request = athleteId
      ? resolveLegacyAthleteById(athleteId)
      : resolveProfile(uid).then((result) => result.resolved);

    request
      .then((result) => {
        if (mounted) setProfile(result);
      })
      .catch((cause) => {
        if (mounted) setError(cause instanceof Error ? cause.message : "Não foi possível abrir o atleta.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [athleteId, uid]);

  const history = profile?.historicoCampeonatos || [];
  const totalPoints = useMemo(
    () => history.reduce((sum, item) => sum + placementPoints(item.colocacao || item.resultado), 0),
    [history],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#48cae4" />
        <Text style={styles.muted}>Carregando atleta…</Text>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Perfil indisponível</Text>
        <Text style={styles.muted}>{error || "Este atleta ainda não possui dados públicos."}</Text>
      </View>
    );
  }

  const city = [profile.cidade, profile.uf].filter(Boolean).join(" / ");

  return (
    <ScrollView contentContainerStyle={styles.page}>
      {profile.capaUrl ? <Image source={{ uri: profile.capaUrl }} style={styles.cover} /> : null}
      <View style={[styles.hero, profile.capaUrl ? styles.heroWithCover : null]}>
        {profile.fotoUrl ? (
          <Image source={{ uri: profile.fotoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>{profile.nome.slice(0, 1).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.name}>{profile.nome}</Text>
        <Text style={styles.category}>{profile.categoria || "Categoria não informada"}</Text>
        {city ? <Text style={styles.city}>{city}</Text> : null}
      </View>

      <View style={styles.card}>
        <Info label="Modalidade" value={profile.modalidade || "Não informada"} />
        <Info label="Posição" value={profile.posicao || "Não informada"} />
        <Info label="Time / equipe" value={profile.time || "Não informado"} />
        {profile.bio ? <Info label="Sobre" value={profile.bio} /> : null}
      </View>

      <View style={styles.historyHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>TRAJETÓRIA</Text>
          <Text style={styles.sectionTitle}>Histórico de campeonatos</Text>
        </View>
        <View style={styles.pointsPill}>
          <Text style={styles.pointsValue}>{totalPoints}</Text>
          <Text style={styles.pointsLabel}>PTS</Text>
        </View>
      </View>

      {history.length ? (
        <View style={styles.historyList}>
          {history.map((item, index) => (
            <View key={`${historyTitle(item)}-${historyPlacement(item)}-${historyYear(item)}-${index}`} style={styles.historyItem}>
              <View style={styles.medalBadge}>
                <Text style={styles.medalText}>{historyPlacement(item).slice(0, 3).toUpperCase()}</Text>
              </View>
              <View style={styles.historyCopy}>
                <Text style={styles.historyName}>{historyTitle(item)}</Text>
                <Text style={styles.historyMeta}>
                  {[historyPlacement(item), historyYear(item), item.modalidade, item.categoria]
                    .filter(Boolean)
                    .join(" • ")}
                </Text>
              </View>
              <Text style={styles.historyPoints}>
                {placementPoints(item.colocacao || item.resultado)} pts
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyHistory}>
          <Text style={styles.emptyHistoryTitle}>Nenhum campeonato registrado</Text>
          <Text style={styles.muted}>O histórico aparecerá aqui quando for adicionado ao perfil.</Text>
        </View>
      )}

      {profile.instagramUrl ? (
        <Pressable onPress={() => void Linking.openURL(profile.instagramUrl)} style={styles.button}>
          <Text style={styles.buttonText}>ABRIR INSTAGRAM</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: "#071827", padding: 20, paddingBottom: 60 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#071827",
    padding: 24,
  },
  muted: { color: "#9fb0bf", textAlign: "center", lineHeight: 19 },
  errorTitle: { color: "#ffffff", fontSize: 20, fontWeight: "900" },
  cover: { width: "100%", height: 160, borderRadius: 24, backgroundColor: "#17384d" },
  hero: { alignItems: "center", borderRadius: 24, backgroundColor: "#0d2235", padding: 22 },
  heroWithCover: { marginTop: -34, marginHorizontal: 12 },
  avatar: { width: 112, height: 112, borderRadius: 56, backgroundColor: "#17384d" },
  avatarFallback: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#17384d",
  },
  avatarText: { color: "#7ddff0", fontSize: 42, fontWeight: "900" },
  name: { marginTop: 14, color: "#ffffff", fontSize: 28, fontWeight: "900", textAlign: "center" },
  category: { marginTop: 5, color: "#48cae4", fontSize: 15, fontWeight: "800" },
  city: { marginTop: 5, color: "#b8c7d9" },
  card: { marginTop: 14, borderRadius: 22, backgroundColor: "#0d2235", paddingHorizontal: 18 },
  info: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#29445c", paddingVertical: 15 },
  infoLabel: { color: "#7ddff0", fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  infoValue: { marginTop: 5, color: "#ffffff", fontSize: 16, lineHeight: 22 },
  historyHeader: {
    marginTop: 24,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionEyebrow: { color: "#d9a93f", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  sectionTitle: { marginTop: 3, color: "#ffffff", fontSize: 20, fontWeight: "900" },
  pointsPill: {
    minWidth: 62,
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: "#17384d",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pointsValue: { color: "#d9a93f", fontSize: 18, fontWeight: "900" },
  pointsLabel: { color: "#9fb0bf", fontSize: 9, fontWeight: "900" },
  historyList: { gap: 9 },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderRadius: 17,
    backgroundColor: "#0d2235",
    padding: 13,
  },
  medalBadge: {
    width: 45,
    height: 45,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#17384d",
  },
  medalText: { color: "#d9a93f", fontSize: 11, fontWeight: "900" },
  historyCopy: { flex: 1 },
  historyName: { color: "#ffffff", fontSize: 14, fontWeight: "900" },
  historyMeta: { marginTop: 3, color: "#9fb0bf", fontSize: 11 },
  historyPoints: { color: "#7ddff0", fontSize: 11, fontWeight: "900" },
  emptyHistory: { borderRadius: 18, backgroundColor: "#0d2235", padding: 18 },
  emptyHistoryTitle: { color: "#ffffff", fontWeight: "900", marginBottom: 5 },
  button: { marginTop: 18, alignItems: "center", borderRadius: 15, backgroundColor: "#48cae4", paddingVertical: 14 },
  buttonText: { color: "#071827", fontWeight: "900" },
});
