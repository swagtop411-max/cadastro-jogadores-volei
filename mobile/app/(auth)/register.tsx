import { Link, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { firebaseErrorMessage } from "@/firebase/errors";
import { registerIdentity } from "@/services/identityService";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    const cleanName = name.trim();
    if (cleanName.length < 2) {
      setError("Digite seu nome com pelo menos 2 caracteres.");
      return;
    }

    if (!email.trim()) {
      setError("Digite seu e-mail.");
      return;
    }

    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não são iguais.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await registerIdentity({
        name: cleanName,
        email,
        password,
      });
      router.replace("/");
    } catch (cause) {
      setError(firebaseErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.page}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.eyebrow}>NOVA CONTA</Text>
          <Text style={styles.title}>Criar conta</Text>
          <Text style={styles.subtitle}>
            Sua conta será a mesma no aplicativo e no cadastrodeatletas.com.br.
          </Text>

          <Text style={styles.label}>Nome</Text>
          <TextInput
            autoCapitalize="words"
            autoComplete="name"
            onChangeText={setName}
            placeholder="Seu nome"
            placeholderTextColor="#718096"
            style={styles.input}
            value={name}
          />

          <Text style={styles.label}>E-mail</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="seuemail@exemplo.com"
            placeholderTextColor="#718096"
            style={styles.input}
            value={email}
          />

          <Text style={styles.label}>Senha</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="new-password"
            onChangeText={setPassword}
            placeholder="Mínimo de 6 caracteres"
            placeholderTextColor="#718096"
            secureTextEntry
            style={styles.input}
            value={password}
          />

          <Text style={styles.label}>Confirmar senha</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="new-password"
            onChangeText={setConfirmPassword}
            placeholder="Repita a senha"
            placeholderTextColor="#718096"
            secureTextEntry
            style={styles.input}
            value={confirmPassword}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            disabled={loading}
            onPress={handleRegister}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && !loading ? styles.pressed : null,
              loading ? styles.disabled : null,
            ]}
          >
            {loading ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.primaryButtonText}>Criar minha conta</Text>
            )}
          </Pressable>

          <Text style={styles.notice}>
            Depois do cadastro, o Firebase também enviará um e-mail de verificação.
          </Text>

          <View style={styles.row}>
            <Text style={styles.muted}>Já possui conta? </Text>
            <Link href="/login" style={styles.linkInline}>
              Entrar
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#071827",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    gap: 10,
    borderRadius: 22,
    backgroundColor: "#0d2235",
    padding: 22,
  },
  eyebrow: {
    color: "#48cae4",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  title: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "900",
  },
  subtitle: {
    marginBottom: 12,
    color: "#b8c7d9",
    lineHeight: 21,
  },
  label: {
    marginTop: 4,
    color: "#dce8f3",
    fontSize: 13,
    fontWeight: "800",
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#29445c",
    borderRadius: 14,
    backgroundColor: "#081a2a",
    color: "#ffffff",
    paddingHorizontal: 14,
    fontSize: 16,
  },
  error: {
    borderRadius: 12,
    backgroundColor: "#3a1620",
    color: "#ffd5dd",
    padding: 11,
    lineHeight: 19,
  },
  primaryButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: "#48cae4",
  },
  primaryButtonText: {
    color: "#042132",
    fontSize: 16,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.6,
  },
  notice: {
    color: "#9fb0c1",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 8,
  },
  muted: {
    color: "#9fb0c1",
  },
  linkInline: {
    color: "#7ddff0",
    fontWeight: "900",
  },
});
