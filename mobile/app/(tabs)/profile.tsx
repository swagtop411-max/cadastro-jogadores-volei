import { getAuth } from "@react-native-firebase/auth";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { PublicProfileV1 } from "@/contracts/schema-v1";
import { firebaseErrorMessage } from "@/firebase/errors";
import { firebaseAuthRepository } from "@/repositories/firebase/authRepository";
import { firebaseProfileRepository } from "@/repositories/firebase/firestoreRepositories";

export default function ProfileScreen() {
  const user = getAuth().currentUser;
  const [profile, setProfile] = useState<PublicProfileV1 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setProfile(await firebaseProfileRepository.getByUid(user.uid));
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

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>IDENTIDADE WEB ↔ APP</Text>
      <Text style={styles.title}>Meu Perfil</Text>
      <Text style={styles.subtitle}>
        Estes dados vêm do mesmo Firebase usado pelo cadastrodeatletas.com.br.
      </Text>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator />
          <Text style={styles.muted}>Carregando perfil do Firestore…</Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && user ? (
        <View style={styles.card}>
          <Field label="Nome" value={profile?.nome || user.displayName || "Não informado"} />
          <Field label="E-mail" value={user.email || "Não informado"} />
          <Field label="UID Firebase" value={user.uid} mono />
          <Field label="Perfil esportivo" value={profile?.completo ? "Completo" : "Em preenchimento"} />
          <Field label="Cidade" value={profile?.cidade || "Ainda não informada"} />
          <Field label="Categoria" value={profile?.categoria || "Ainda não informada"} />
        </View>
      ) : null}

      {!loading && !profile && user ? (
        <Pressable onPress={loadProfile} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Tentar carregar novamente</Text>
        </Pressable>
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
  page: {
    flexGrow: 1,
    backgroundColor: "#071827",
    padding: 20,
    paddingBottom: 40,
  },
  eyebrow: {
    marginTop: 12,
    color: "#48cae4",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  title: {
    marginTop: 6,
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 18,
    color: "#b8c7d9",
    lineHeight: 21,
  },
  centerBox: {
    alignItems: "center",
    gap: 10,
    borderRadius: 18,
    backgroundColor: "#0d2235",
    padding: 24,
  },
  card: {
    borderRadius: 20,
    backgroundColor: "#0d2235",
    paddingHorizontal: 18,
  },
  field: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#29445c",
    paddingVertical: 15,
  },
  fieldLabel: {
    color: "#7ddff0",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  fieldValue: {
    marginTop: 5,
    color: "#ffffff",
    fontSize: 16,
  },
  mono: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
    fontSize: 13,
  },
  muted: {
    color: "#9fb0c1",
  },
  error: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: "#3a1620",
    color: "#ffd5dd",
    padding: 11,
  },
  secondaryButton: {
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#48cae4",
    borderRadius: 14,
    padding: 14,
  },
  secondaryButtonText: {
    color: "#7ddff0",
    fontWeight: "900",
  },
  signOutButton: {
    alignItems: "center",
    marginTop: 24,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    padding: 15,
  },
  signOutButtonText: {
    color: "#071827",
    fontWeight: "900",
  },
});
