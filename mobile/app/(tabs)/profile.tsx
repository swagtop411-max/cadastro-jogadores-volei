import { getAuth } from "@react-native-firebase/auth";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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

import type { ChampionshipHistoryItemV1, PublicProfileV1 } from "@/contracts/schema-v1";
import { firebaseErrorMessage } from "@/firebase/errors";
import { firebaseAuthRepository } from "@/repositories/firebase/authRepository";
import { resolveProfile, type ResolvedProfile } from "@/services/profileResolver";

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

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

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
      <Text style={styles.eyebrow}>IDENTIDADE WEB ↔ APP</Text>
      <Text style={styles.title}>Meu Perfil</Text>
      <Text style={styles.subtitle}>
        O app combina perfil público, conta e cadastro esportivo do mesmo Firebase.
      </Text>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color="#48cae4" />
          <Text style={styles.muted}>Sincronizando dados do perfil…</Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && user ? (
        <>
          <View style={styles.identityCard}>
            {profile?.fotoUrl ? (
              <Image source={{ uri: profile.fotoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>
                  {(profile?.nome || user.displayName || "A").slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}

            <View style={styles.identityText}>
              <Text style={styles.identityName}>{profile?.nome || user.displayName || "Atleta"}</Text>
              <Text style={styles.identityMeta}>{profile?.categoria || "Categoria não informada"}</Text>
              <View style={[styles.statusPill, profile?.completo ? styles.statusComplete : null]}>
                <Text style={styles.statusText}>
                  {profile?.completo ? "Perfil esportivo completo" : "Perfil em preenchimento"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Field label="E-mail" value={user.email || "Não informado"} />
            <Field label="Cidade" value={city || "Ainda não informada"} />
            <Field label="Modalidade" value={profile?.modalidade || "Ainda não informada"} />
            <Field label="Posição" value={profile?.posicao || "Ainda não informada"} />
            <Field label="Categoria" value={profile?.categoria || "Ainda não informada"} />
            <Field label="Time / equipe" value={profile?.time || "Ainda não informado"} />
            {profile?.bio ? <Field label="Sobre" value={profile.bio} /> : null}
            <Field label="Fonte dos dados" value={SOURCE_LABEL[source]} />
            <Field label="UID Firebase" value={user.uid} mono />
          </View>

          <View style={styles.historyHeader}>
            <View>
              <Text style={styles.historyEyebrow}>TRAJETÓRIA</Text>
              <Text style={styles.historyTitle}>Histórico de campeonatos</Text>
            </View>
            <Text style={styles.historyCount}>{history.length}</Text>
          </View>
          {history.length ? (
            <View style={styles.historyList}>
              {history.map((item, index) => (
                <View key={`${historyName(item)}-${historyMeta(item)}-${index}`} style={styles.historyItem}>
                  <Text style={styles.historyName}>{historyName(item)}</Text>
                  <Text style={styles.historyMeta}>{historyMeta(item) || "Participação registrada"}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>Nenhum campeonato no histórico</Text>
              <Text style={styles.noticeText}>Você pode adicionar campeonatos diretamente no editor do app.</Text>
            </View>
          )}

          <Pressable onPress={loadProfile} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Atualizar dados do perfil</Text>
          </Pressable>

          <Pressable onPress={() => router.push("/profile/edit")} style={styles.editButton}>
            <Text style={styles.editButtonText}>EDITAR / COMPLETAR PERFIL NO APP</Text>
          </Pressable>
        </>
      ) : null}

      {!loading && !profile && user ? (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Perfil esportivo ainda não encontrado</Text>
          <Text style={styles.noticeText}>
            A conta está autenticada corretamente. Use o editor do app para completar o perfil.
          </Text>
        </View>
      ) : null}

      <Pressable onPress={handleSignOut} style={styles.signOutButton}>
        <Text style={styles.signOutButtonText}>Sair da conta</Text>
      </Pressable>
    </ScrollView>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text selectable style={[styles.fieldValue, mono ? styles.mono : null]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: "#071827", padding: 20, paddingBottom: 150 },
  eyebrow: { marginTop: 12, color: "#48cae4", fontSize: 12, fontWeight: "900", letterSpacing: 1.1 },
  title: { marginTop: 6, color: "#ffffff", fontSize: 32, fontWeight: "900" },
  subtitle: { marginTop: 8, marginBottom: 18, color: "#b8c7d9", lineHeight: 21 },
  centerBox: { alignItems: "center", gap: 10, borderRadius: 18, backgroundColor: "#0d2235", padding: 24 },
  identityCard: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14, borderRadius: 20, backgroundColor: "#0d2235", padding: 16 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#17384d" },
  avatarFallback: { width: 72, height: 72, alignItems: "center", justifyContent: "center", borderRadius: 36, backgroundColor: "#17384d" },
  avatarFallbackText: { color: "#7ddff0", fontSize: 28, fontWeight: "900" },
  identityText: { flex: 1 },
  identityName: { color: "#ffffff", fontSize: 22, fontWeight: "900" },
  identityMeta: { marginTop: 3, color: "#b8c7d9" },
  statusPill: { alignSelf: "flex-start", marginTop: 9, borderRadius: 999, backgroundColor: "#59451d", paddingHorizontal: 10, paddingVertical: 5 },
  statusComplete: { backgroundColor: "#123d33" },
  statusText: { color: "#ffffff", fontSize: 11, fontWeight: "800" },
  card: { borderRadius: 20, backgroundColor: "#0d2235", paddingHorizontal: 18 },
  field: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#29445c", paddingVertical: 15 },
  fieldLabel: { color: "#7ddff0", fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  fieldValue: { marginTop: 5, color: "#ffffff", fontSize: 16, lineHeight: 22 },
  mono: { fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }), fontSize: 13 },
  muted: { color: "#9fb0c1" },
  error: { marginBottom: 12, borderRadius: 12, backgroundColor: "#3a1620", color: "#ffd5dd", padding: 11 },
  historyHeader: { marginTop: 22, marginBottom: 9, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  historyEyebrow: { color: "#d9a93f", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  historyTitle: { marginTop: 3, color: "#ffffff", fontSize: 19, fontWeight: "900" },
  historyCount: { minWidth: 35, textAlign: "center", borderRadius: 12, backgroundColor: "#17384d", color: "#7ddff0", padding: 8, fontWeight: "900" },
  historyList: { gap: 8 },
  historyItem: { borderRadius: 15, backgroundColor: "#0d2235", padding: 13 },
  historyName: { color: "#ffffff", fontSize: 14, fontWeight: "900" },
  historyMeta: { marginTop: 4, color: "#9fb0bf", fontSize: 12 },
  notice: { marginTop: 14, borderRadius: 16, backgroundColor: "#0d2235", padding: 16 },
  noticeTitle: { color: "#ffffff", fontWeight: "900" },
  noticeText: { marginTop: 6, color: "#b8c7d9", lineHeight: 20 },
  secondaryButton: { alignItems: "center", marginTop: 14, borderWidth: 1, borderColor: "#48cae4", borderRadius: 14, padding: 14 },
  secondaryButtonText: { color: "#7ddff0", fontWeight: "900" },
  editButton: { alignItems: "center", marginTop: 10, borderRadius: 14, backgroundColor: "#17384d", padding: 14 },
  editButtonText: { color: "#ffffff", fontWeight: "900" },
  signOutButton: { alignItems: "center", marginTop: 24, borderRadius: 14, backgroundColor: "#ffffff", padding: 15 },
  signOutButtonText: { color: "#071827", fontWeight: "900" },
});
