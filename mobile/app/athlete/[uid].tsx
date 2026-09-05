import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
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

import type { PublicProfileV1 } from "@/contracts/schema-v1";
import { firebaseProfileRepository } from "@/repositories/firebase/firestoreRepositories";

export default function AthleteScreen() {
  const params = useLocalSearchParams<{ uid?: string }>();
  const uid = typeof params.uid === "string" ? params.uid : "";
  const [profile, setProfile] = useState<PublicProfileV1 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!uid) {
      setLoading(false);
      setError("Atleta não informado.");
      return;
    }

    firebaseProfileRepository
      .getByUid(uid)
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
  }, [uid]);

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
        <Text style={styles.muted}>{error || "Este perfil ainda não possui dados públicos."}</Text>
      </View>
    );
  }

  const city = [profile.cidade, profile.uf].filter(Boolean).join(" / ");

  return (
    <ScrollView contentContainerStyle={styles.page}>
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
      </View>

      <View style={styles.card}>
        <Info label="Modalidade" value={profile.modalidade || "Não informada"} />
        <Info label="Posição" value={profile.posicao || "Não informada"} />
        <Info label="Time / equipe" value={profile.time || "Não informado"} />
        {profile.bio ? <Info label="Sobre" value={profile.bio} /> : null}
      </View>

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
  page: { flexGrow: 1, backgroundColor: "#071827", padding: 20, paddingBottom: 50 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#071827", padding: 24 },
  muted: { color: "#9fb0bf", textAlign: "center" },
  errorTitle: { color: "#ffffff", fontSize: 20, fontWeight: "900" },
  hero: { alignItems: "center", borderRadius: 24, backgroundColor: "#0d2235", padding: 22 },
  avatar: { width: 112, height: 112, borderRadius: 56, backgroundColor: "#17384d" },
  avatarFallback: { width: 112, height: 112, borderRadius: 56, alignItems: "center", justifyContent: "center", backgroundColor: "#17384d" },
  avatarText: { color: "#7ddff0", fontSize: 42, fontWeight: "900" },
  name: { marginTop: 14, color: "#ffffff", fontSize: 28, fontWeight: "900", textAlign: "center" },
  category: { marginTop: 5, color: "#48cae4", fontSize: 15, fontWeight: "800" },
  city: { marginTop: 5, color: "#b8c7d9" },
  card: { marginTop: 14, borderRadius: 22, backgroundColor: "#0d2235", paddingHorizontal: 18 },
  info: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#29445c", paddingVertical: 15 },
  infoLabel: { color: "#7ddff0", fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  infoValue: { marginTop: 5, color: "#ffffff", fontSize: 16, lineHeight: 22 },
  button: { marginTop: 14, alignItems: "center", borderRadius: 15, backgroundColor: "#48cae4", paddingVertical: 14 },
  buttonText: { color: "#071827", fontWeight: "900" },
});
