import { Link } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { firebaseErrorMessage } from "@/firebase/errors";
import { firebaseAuthRepository } from "@/repositories/firebase/authRepository";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleReset() {
    if (!email.trim()) {
      setError("Digite o e-mail da sua conta.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await firebaseAuthRepository.sendPasswordReset(email);
      setSuccess("Enviamos as instruções de recuperação para o seu e-mail.");
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
      <View style={styles.card}>
        <Text style={styles.eyebrow}>RECUPERAÇÃO</Text>
        <Text style={styles.title}>Recuperar senha</Text>
        <Text style={styles.subtitle}>
          O e-mail será enviado pelo mesmo Firebase Authentication usado pelo site.
        </Text>

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

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}

        <Pressable
          disabled={loading}
          onPress={handleReset}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && !loading ? styles.pressed : null,
            loading ? styles.disabled : null,
          ]}
        >
          {loading ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.primaryButtonText}>Enviar recuperação</Text>
          )}
        </Pressable>

        <Link href="/login" style={styles.link}>
          Voltar para entrar
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#071827",
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
    fontSize: 30,
    fontWeight: "900",
  },
  subtitle: {
    marginBottom: 12,
    color: "#b8c7d9",
    lineHeight: 21,
  },
  label: {
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
  },
  success: {
    borderRadius: 12,
    backgroundColor: "#12372b",
    color: "#c9ffe4",
    padding: 11,
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
  link: {
    alignSelf: "center",
    color: "#7ddff0",
    fontWeight: "800",
    marginTop: 8,
  },
});
