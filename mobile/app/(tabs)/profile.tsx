import { getAuth } from "@react-native-firebase/auth";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { BrandHeader, SectionTitle } from "@/components/BrandHeader";
import type { ChampionshipHistoryItemV1, PublicProfileV1 } from "@/contracts/schema-v1";
import { firebaseErrorMessage } from "@/firebase/errors";
import { firebaseAuthRepository } from "@/repositories/firebase/authRepository";
import { resolveProfile, type ResolvedProfile } from "@/services/profileResolver";
import { brand } from "@/ui/brand";

const SOURCE_LABEL: Record<ResolvedProfile["source"], string> = {
  perfil: "Perfil público",
  "perfil+usuario": "Perfil + conta",
  "perfil+atleta": "Perfil + cadastro esportivo",
  "perfil+usuario+atleta": "Perfil + conta + cadastro esportivo",
  usuario: "Conta",
  atleta: "Cadastro esportivo",
  nenhuma: "Nenhuma fonte encontrada",
};

function historyName(item: ChampionshipHistoryItemV1): string {
  return String(item.campeonato || item.nome || item.evento || "Campeonato");
}

function historyMeta(item: ChampionshipHistoryItemV1): string {
  return [item.colocacao || item.resultado, item.ano || item.data].filter(Boolean).join(" • ");
}

export default function ProfileScreen() {
  const router = useRouter();
  const user = getAuth().currentUser;
  const [profile, setProfile] = useState<PublicProfileV1 | null>(null);
  const [source, setSource] = useState<ResolvedProfile["source"]>("nenhuma");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setSource("nenhuma");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await resolveProfile(user.uid);
      setProfile(result.resolved);
      setSource(result.source);
    } catch (cause) {
      setError(firebaseErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  async function handleSignOut() {
    setError(null);
    try {
      await firebaseAuthRepository.signOut();
    } catch (cause) {
      setError(firebaseErrorMessage(cause));
    }
  }

  const city = [profile?.cidade, profile?.uf].filter(Boolean).join(" / ");
  const history = profile?.historicoCampeonatos || [];

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <BrandHeader
        eyebrow="SEU TALENTO EM DESTAQUE"
        title="Perfil"
        subtitle="Sua identidade esportiva conectada ao mesmo cadastro utilizado no site."
      />

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={brand.colors.cyan} />
          <Text style={styles.muted}>Sincronizando dados do perfil…</Text>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && user ? (
        <>
          <View style={styles.identityCard}>
            <View style={styles.heroGlow} />
            {profile?.fotoUrl ? (
              <Image source={{ uri: profile.fotoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>{(profile?.nome || user.displayName || "A").slice(0, 1).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.identityText}>
              <View style={styles.nameRow}>
                <Text numberOfLines={2} style={styles.identityName}>{profile?.nome || user.displayName || "Atleta"}</Text>
                {profile?.completo ? <View style={styles.verified}><Text style={styles.verifiedText}>✓</Text></View> : null}
              </View>
              <Text style={styles.identityMeta}>{profile?.categoria || "Categoria não informada"}</Text>
              <Text style={styles.identityCity}>{city || "Cidade não informada"}</Text>
              <View style={styles.chipRow}>
                <View style={styles.chip}><Text style={styles.chipText}>{profile?.modalidade || "Atleta"}</Text></View>
                {profile?.time ? <View style={styles.chipGold}><Text style={styles.chipGoldText}>{profile.time}</Text></View> : null}
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <Stat value={String(history.length)} label="CAMPEONATOS" />
            <Stat value={profile?.completo ? "100%" : "—"} label="PERFIL" />
            <Stat value={profile?.categoria ? "OK" : "—"} label="CATEGORIA" gold />
          </View>

          <Pressable onPress={() => router.push("/profile/edit")} style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}>
            <Text style={styles.editButtonText}>EDITAR PERFIL</Text>
            <Text style={styles.editArrow}>›</Text>
          </Pressable>

          <SectionTitle eyebrow="DADOS ESPORTIVOS" title="Informações do atleta" />
          <View style={styles.card}>
            <Field label="E-mail" value={user.email || "Não informado"} />
            <Field label="Cidade" value={city || "Ainda não informada"} />
            <Field label="Modalidade" value={profile?.modalidade || "Ainda não informada"} />
            <Field label="Posição" value={profile?.posicao || "Ainda não informada"} />
            <Field label="Categoria" value={profile?.categoria || "Ainda não informada"} />
            <Field label="Time / equipe" value={profile?.time || "Ainda não informado"} />
            {profile?.bio ? <Field label="Sobre" value={profile.bio} /> : null}
          </View>

          <SectionTitle eyebrow="TRAJETÓRIA" title="Histórico de campeonatos" action={`${history.length} REGISTRO${history.length === 1 ? "" : "S"}`} />
          {history.length ? (
            <View style={styles.historyList}>
              {history.map((item, index) => (
                <View key={`${historyName(item)}-${historyMeta(item)}-${index}`} style={styles.historyItem}>
                  <View style={styles.historyBadge}><Text style={styles.historyBadgeText}>🏆</Text></View>
                  <View style={styles.historyCopy}>
                    <Text style={styles.historyName}>{historyName(item)}</Text>
                    <Text style={styles.historyMeta}>{historyMeta(item) || "Participação registrada"}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>Nenhum campeonato no histórico</Text>
              <Text style={styles.noticeText}>Você pode adicionar campeonatos diretamente no editor do app.</Text>
            </View>
          )}

          <View style={styles.systemCard}>
            <Text style={styles.systemEyebrow}>SINCRONIZAÇÃO</Text>
            <Text style={styles.systemTitle}>{SOURCE_LABEL[source]}</Text>
            <Text selectable style={styles.mono}>{user.uid}</Text>
          </View>

          <Pressable onPress={loadProfile} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>ATUALIZAR DADOS</Text>
          </Pressable>
        </>
      ) : null}

      {!loading && !profile && user ? (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Perfil esportivo ainda não encontrado</Text>
          <Text style={styles.noticeText}>A conta está autenticada. Complete o perfil diretamente pelo app.</Text>
        </View>
      ) : null}

      <Pressable onPress={handleSignOut} style={styles.signOutButton}>
        <Text style={styles.signOutButtonText}>SAIR DA CONTA</Text>
      </Pressable>
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text selectable style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: brand.colors.bg, padding: 16, paddingTop: 14, paddingBottom: 122 },
  centerBox: { alignItems: "center", gap: 10, borderRadius: brand.radius.lg, backgroundColor: brand.colors.surface, padding: 24 },
  identityCard: { position: "relative", overflow: "hidden", flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderColor: brand.colors.cyan, borderRadius: brand.radius.xl, backgroundColor: brand.colors.surface, padding: 16, ...brand.shadow },
  heroGlow: { position: "absolute", width: 150, height: 150, borderRadius: 75, right: -65, top: -72, backgroundColor: "rgba(24,213,255,0.09)" },
  avatar: { width: 86, height: 86, borderRadius: 43, borderWidth: 2, borderColor: brand.colors.cyan, backgroundColor: brand.colors.surfaceSoft },
  avatarFallback: { width: 86, height: 86, alignItems: "center", justifyContent: "center", borderRadius: 43, borderWidth: 2, borderColor: brand.colors.cyan, backgroundColor: brand.colors.surfaceSoft },
  avatarFallbackText: { color: brand.colors.cyanSoft, fontSize: 32, fontWeight: "900" },
  identityText: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  identityName: { flexShrink: 1, color: brand.colors.text, fontSize: 22, lineHeight: 26, fontWeight: "900" },
  verified: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: brand.colors.cyan },
  verifiedText: { color: brand.colors.bgDeep, fontSize: 11, fontWeight: "900" },
  identityMeta: { marginTop: 4, color: brand.colors.cyanSoft, fontSize: 12, fontWeight: "800" },
  identityCity: { marginTop: 3, color: brand.colors.mutedStrong, fontSize: 11 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 9 },
  chip: { borderRadius: brand.radius.pill, backgroundColor: brand.colors.surfaceRaised, paddingHorizontal: 9, paddingVertical: 5 },
  chipText: { color: brand.colors.cyanSoft, fontSize: 9, fontWeight: "900" },
  chipGold: { borderRadius: brand.radius.pill, backgroundColor: "#3c2c0d", paddingHorizontal: 9, paddingVertical: 5 },
  chipGoldText: { color: brand.colors.gold, fontSize: 9, fontWeight: "900" },
  statsRow: { flexDirection: "row", gap: 9, marginTop: 10 },
  statCard: { flex: 1, alignItems: "center", borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.md, backgroundColor: brand.colors.surface, paddingVertical: 11 },
  statValue: { color: brand.colors.cyan, fontSize: 18, fontWeight: "900" },
  statValueGold: { color: brand.colors.gold },
  statLabel: { marginTop: 2, color: brand.colors.muted, fontSize: 8, fontWeight: "900", letterSpacing: 0.6 },
  editButton: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 11, borderRadius: brand.radius.md, borderWidth: 1, borderColor: brand.colors.cyanSoft, backgroundColor: brand.colors.cyan, paddingVertical: 14, paddingHorizontal: 16, ...brand.shadow },
  editButtonText: { color: brand.colors.bgDeep, fontWeight: "900", letterSpacing: 0.3 },
  editArrow: { color: brand.colors.bgDeep, fontSize: 24, fontWeight: "900" },
  card: { borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.lg, backgroundColor: brand.colors.surface, paddingHorizontal: 16 },
  field: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: brand.colors.borderSoft, paddingVertical: 14 },
  fieldLabel: { color: brand.colors.cyan, fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.7 },
  fieldValue: { marginTop: 5, color: brand.colors.text, fontSize: 15, lineHeight: 21 },
  muted: { color: brand.colors.muted },
  error: { marginBottom: 12, borderRadius: brand.radius.sm, backgroundColor: brand.colors.dangerBg, color: "#ffd5dd", padding: 11 },
  historyList: { gap: 8 },
  historyItem: { flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.md, backgroundColor: brand.colors.surface, padding: 12 },
  historyBadge: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#3c2c0d" },
  historyBadgeText: { fontSize: 18 },
  historyCopy: { flex: 1 },
  historyName: { color: brand.colors.text, fontSize: 14, fontWeight: "900" },
  historyMeta: { marginTop: 4, color: brand.colors.muted, fontSize: 11 },
  notice: { marginTop: 10, borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.md, backgroundColor: brand.colors.surface, padding: 16 },
  noticeTitle: { color: brand.colors.text, fontWeight: "900" },
  noticeText: { marginTop: 6, color: brand.colors.mutedStrong, lineHeight: 20 },
  systemCard: { marginTop: 16, borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.md, backgroundColor: brand.colors.bgDeep, padding: 14 },
  systemEyebrow: { color: brand.colors.gold, fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  systemTitle: { marginTop: 4, color: brand.colors.text, fontSize: 12, fontWeight: "800" },
  mono: { marginTop: 7, color: brand.colors.muted, fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }), fontSize: 10 },
  secondaryButton: { alignItems: "center", marginTop: 10, borderWidth: 1, borderColor: brand.colors.cyan, borderRadius: brand.radius.md, padding: 13 },
  secondaryButtonText: { color: brand.colors.cyanSoft, fontWeight: "900", fontSize: 11 },
  signOutButton: { alignItems: "center", marginTop: 18, borderWidth: 1, borderColor: brand.colors.danger, borderRadius: brand.radius.md, backgroundColor: "transparent", padding: 14 },
  signOutButtonText: { color: brand.colors.danger, fontWeight: "900", fontSize: 11 },
  pressed: { opacity: 0.8 },
});
