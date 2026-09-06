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

import { SectionTitle } from "@/components/BrandHeader";
import type { ChampionshipHistoryItemV1, PublicProfileV1 } from "@/contracts/schema-v1";
import { resolveLegacyAthleteById, resolveProfile } from "@/services/profileResolver";
import { brand } from "@/ui/brand";

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
        <ActivityIndicator color={brand.colors.cyan} />
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
      <View style={styles.coverWrap}>
        {profile.capaUrl ? (
          <Image source={{ uri: profile.capaUrl }} style={styles.cover} />
        ) : (
          <View style={styles.coverFallback}>
            <View style={styles.coverGlow} />
            <Text style={styles.coverBrand}>BANCO DE ATLETAS</Text>
            <Text style={styles.coverTagline}>CONECTA TALENTOS • MOVE O ESPORTE</Text>
          </View>
        )}
        <View style={styles.coverLineCyan} />
        <View style={styles.coverLineGold} />
      </View>

      <View style={styles.hero}>
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
        <View style={styles.heroChipRow}>
          {profile.modalidade ? <View style={styles.heroChip}><Text style={styles.heroChipText}>{profile.modalidade}</Text></View> : null}
          {profile.time ? <View style={styles.heroChipGold}><Text style={styles.heroChipGoldText}>{profile.time}</Text></View> : null}
        </View>
      </View>

      <View style={styles.statsRow}>
        <Stat value={String(history.length)} label="CAMPEONATOS" />
        <Stat value={String(totalPoints)} label="PONTOS" gold />
        <Stat value={profile.completo ? "100%" : "—"} label="PERFIL" />
      </View>

      <SectionTitle eyebrow="DADOS ESPORTIVOS" title="Informações do atleta" />
      <View style={styles.card}>
        <Info label="Modalidade" value={profile.modalidade || "Não informada"} />
        <Info label="Posição" value={profile.posicao || "Não informada"} />
        <Info label="Categoria" value={profile.categoria || "Não informada"} />
        <Info label="Time / equipe" value={profile.time || "Não informado"} />
        {profile.bio ? <Info label="Sobre" value={profile.bio} /> : null}
      </View>

      <SectionTitle eyebrow="TRAJETÓRIA" title="Histórico de campeonatos" action={`${totalPoints} PTS`} />
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
                  {[historyPlacement(item), historyYear(item), item.modalidade, item.categoria].filter(Boolean).join(" • ")}
                </Text>
              </View>
              <Text style={styles.historyPoints}>{placementPoints(item.colocacao || item.resultado)} pts</Text>
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
        <Pressable onPress={() => void Linking.openURL(profile.instagramUrl)} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <Text style={styles.buttonText}>ABRIR INSTAGRAM</Text>
          <Text style={styles.buttonArrow}>›</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function Stat({ value, label, gold = false }: { value: string; label: string; gold?: boolean }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, gold && styles.statValueGold]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
  page: { flexGrow: 1, backgroundColor: brand.colors.bg, padding: 16, paddingBottom: 60 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: brand.colors.bg, padding: 24 },
  muted: { color: brand.colors.muted, textAlign: "center", lineHeight: 19 },
  errorTitle: { color: brand.colors.text, fontSize: 20, fontWeight: "900" },
  coverWrap: { position: "relative", overflow: "hidden", borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.xl, backgroundColor: brand.colors.surface },
  cover: { width: "100%", height: 180, backgroundColor: brand.colors.surfaceSoft },
  coverFallback: { height: 180, justifyContent: "flex-end", overflow: "hidden", backgroundColor: brand.colors.surfaceSoft, padding: 18 },
  coverGlow: { position: "absolute", width: 220, height: 220, borderRadius: 110, top: -100, right: -80, backgroundColor: "rgba(24,213,255,0.11)" },
  coverBrand: { color: brand.colors.text, fontSize: 18, fontWeight: "900" },
  coverTagline: { marginTop: 4, color: brand.colors.gold, fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  coverLineCyan: { position: "absolute", left: 0, bottom: 0, height: 3, width: "76%", backgroundColor: brand.colors.cyan },
  coverLineGold: { position: "absolute", right: 0, bottom: 0, height: 3, width: "24%", backgroundColor: brand.colors.gold },
  hero: { alignItems: "center", marginTop: -38, marginHorizontal: 12, borderWidth: 1, borderColor: brand.colors.cyan, borderRadius: brand.radius.xl, backgroundColor: brand.colors.surface, padding: 20, ...brand.shadow },
  avatar: { width: 112, height: 112, borderRadius: 56, borderWidth: 3, borderColor: brand.colors.cyan, backgroundColor: brand.colors.surfaceSoft },
  avatarFallback: { width: 112, height: 112, borderRadius: 56, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: brand.colors.cyan, backgroundColor: brand.colors.surfaceSoft },
  avatarText: { color: brand.colors.cyanSoft, fontSize: 42, fontWeight: "900" },
  name: { marginTop: 14, color: brand.colors.text, fontSize: 28, lineHeight: 32, fontWeight: "900", textAlign: "center" },
  category: { marginTop: 5, color: brand.colors.cyan, fontSize: 14, fontWeight: "900" },
  city: { marginTop: 5, color: brand.colors.mutedStrong },
  heroChipRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 7, marginTop: 10 },
  heroChip: { borderRadius: brand.radius.pill, backgroundColor: brand.colors.surfaceRaised, paddingHorizontal: 10, paddingVertical: 6 },
  heroChipText: { color: brand.colors.cyanSoft, fontSize: 9, fontWeight: "900" },
  heroChipGold: { borderRadius: brand.radius.pill, backgroundColor: "#3c2c0d", paddingHorizontal: 10, paddingVertical: 6 },
  heroChipGoldText: { color: brand.colors.gold, fontSize: 9, fontWeight: "900" },
  statsRow: { flexDirection: "row", gap: 9, marginTop: 10 },
  statCard: { flex: 1, alignItems: "center", borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.md, backgroundColor: brand.colors.surface, paddingVertical: 11 },
  statValue: { color: brand.colors.cyan, fontSize: 18, fontWeight: "900" },
  statValueGold: { color: brand.colors.gold },
  statLabel: { marginTop: 2, color: brand.colors.muted, fontSize: 8, fontWeight: "900", letterSpacing: 0.6 },
  card: { borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.lg, backgroundColor: brand.colors.surface, paddingHorizontal: 16 },
  info: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: brand.colors.borderSoft, paddingVertical: 14 },
  infoLabel: { color: brand.colors.cyan, fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.7 },
  infoValue: { marginTop: 5, color: brand.colors.text, fontSize: 15, lineHeight: 21 },
  historyList: { gap: 9 },
  historyItem: { flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.md, backgroundColor: brand.colors.surface, padding: 12 },
  medalBadge: { width: 45, height: 45, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#3c2c0d" },
  medalText: { color: brand.colors.gold, fontSize: 10, fontWeight: "900" },
  historyCopy: { flex: 1 },
  historyName: { color: brand.colors.text, fontSize: 14, fontWeight: "900" },
  historyMeta: { marginTop: 3, color: brand.colors.muted, fontSize: 11 },
  historyPoints: { color: brand.colors.cyanSoft, fontSize: 10, fontWeight: "900" },
  emptyHistory: { borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.md, backgroundColor: brand.colors.surface, padding: 18 },
  emptyHistoryTitle: { color: brand.colors.text, fontWeight: "900", marginBottom: 5 },
  button: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18, borderWidth: 1, borderColor: brand.colors.cyanSoft, borderRadius: brand.radius.md, backgroundColor: brand.colors.cyan, paddingVertical: 14, paddingHorizontal: 16, ...brand.shadow },
  buttonText: { color: brand.colors.bgDeep, fontWeight: "900" },
  buttonArrow: { color: brand.colors.bgDeep, fontSize: 24, fontWeight: "900" },
  pressed: { opacity: 0.8 },
});
