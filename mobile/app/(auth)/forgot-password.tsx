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

import { BrandHeader } from "@/components/BrandHeader";
import { firebaseErrorMessage } from "@/firebase/errors";
import { firebaseAuthRepository } from "@/repositories/firebase/authRepository";
import { brand } from "@/ui/brand";

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
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.page}>
      <View style={styles.content}>
        <BrandHeader
          eyebrow="RECUPERE O ACESSO"
          title="Recuperar senha"
          subtitle="Use o e-mail da sua conta Banco de Atletas."
        />

        <View style={styles.card}>
          <View style={styles.cardAccent} />
          <Text style={styles.formTitle}>Vamos enviar um link</Text>
          <Text style={styles.formSubtitle}>A recuperação usa o mesmo Firebase Authentication do site.</Text>

          <Text style={styles.label}>E-mail</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="seuemail@exemplo.com"
            placeholderTextColor={brand.colors.muted}
            style={styles.input}
            value={email}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.success}>{success}</Text> : null}

          <Pressable
            disabled={loading}
            onPress={handleReset}
            style={({ pressed }) => [styles.primaryButton, pressed && !loading && styles.pressed, loading && styles.disabled]}
          >
            {loading ? <ActivityIndicator color={brand.colors.bgDeep} /> : <Text style={styles.primaryButtonText}>ENVIAR RECUPERAÇÃO</Text>}
          </Pressable>

          <Link href="/login" style={styles.link}>Voltar para entrar</Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: brand.colors.bg },
  content: { flex: 1, justifyContent: "center", padding: 18 },
  card: { position: "relative", overflow: "hidden", borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.xl, backgroundColor: brand.colors.surface, padding: 20, ...brand.shadow },
  cardAccent: { position: "absolute", top: 0, left: 0, right: 0, height: 3, backgroundColor: brand.colors.gold },
  formTitle: { color: brand.colors.text, fontSize: 22, fontWeight: "900" },
  formSubtitle: { marginTop: 4, marginBottom: 14, color: brand.colors.mutedStrong, fontSize: 12, lineHeight: 18 },
  label: { marginBottom: 6, color: brand.colors.cyanSoft, fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.7 },
  input: { minHeight: 52, borderWidth: 1, borderColor: brand.colors.border, borderRadius: brand.radius.md, backgroundColor: brand.colors.bgDeep, color: brand.colors.text, paddingHorizontal: 14, fontSize: 16 },
  error: { marginTop: 10, borderRadius: brand.radius.sm, backgroundColor: brand.colors.dangerBg, color: "#ffd5dd", padding: 11 },
  success: { marginTop: 10, borderRadius: brand.radius.sm, backgroundColor: "#123d33", color: "#c9ffe4", padding: 11 },
  primaryButton: { minHeight: 54, alignItems: "center", justifyContent: "center", marginTop: 14, borderWidth: 1, borderColor: brand.colors.cyanSoft, borderRadius: brand.radius.md, backgroundColor: brand.colors.cyan, ...brand.shadow },
  primaryButtonText: { color: brand.colors.bgDeep, fontSize: 14, fontWeight: "900", letterSpacing: 0.4 },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.6 },
  link: { alignSelf: "center", color: brand.colors.gold, fontWeight: "800", marginTop: 14 },
});
