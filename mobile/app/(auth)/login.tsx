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

import { BrandHeader } from "@/components/BrandHeader";
import { firebaseErrorMessage } from "@/firebase/errors";
import { signInIdentity } from "@/services/identityService";
import { brand } from "@/ui/brand";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError("Preencha e-mail e senha.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signInIdentity(email, password);
      router.replace("/");
    } catch (cause) {
      setError(firebaseErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.page}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <BrandHeader
          eyebrow="CONECTA TALENTOS. MOVE O ESPORTE."
          title="Bem-vindo"
          subtitle="Entre com a mesma conta usada no cadastrodeatletas.com.br."
        />

        <View style={styles.card}>
          <View style={styles.cardAccent} />
          <Text style={styles.formTitle}>Entrar na sua conta</Text>
          <Text style={styles.formSubtitle}>Sua rede esportiva em um só lugar.</Text>

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

          <Text style={styles.label}>Senha</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="password"
            onChangeText={setPassword}
            placeholder="Sua senha"
            placeholderTextColor={brand.colors.muted}
            secureTextEntry
            style={styles.input}
            value={password}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            disabled={loading}
            onPress={handleLogin}
            style={({ pressed }) => [styles.primaryButton, pressed && !loading && styles.pressed, loading && styles.disabled]}
          >
            {loading ? <ActivityIndicator color={brand.colors.bgDeep} /> : <Text style={styles.primaryButtonText}>ENTRAR</Text>}
          </Pressable>

          <Link href="/forgot-password" style={styles.link}>Esqueci minha senha</Link>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>NOVO POR AQUI?</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.row}>
            <Text style={styles.muted}>Ainda não tem conta? </Text>
            <Link href="/register" style={styles.linkInline}>Criar conta</Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: brand.colors.bg },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 18, paddingVertical: 28 },
  card: { position: "relative", overflow: "hidden", gap: 10, borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.xl, backgroundColor: brand.colors.surface, padding: 20, ...brand.shadow },
  cardAccent: { position: "absolute", top: 0, left: 0, right: 0, height: 3, backgroundColor: brand.colors.gold },
  formTitle: { color: brand.colors.text, fontSize: 22, fontWeight: "900" },
  formSubtitle: { marginBottom: 7, color: brand.colors.mutedStrong, fontSize: 12 },
  label: { marginTop: 4, color: brand.colors.cyanSoft, fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.7 },
  input: { minHeight: 52, borderWidth: 1, borderColor: brand.colors.border, borderRadius: brand.radius.md, backgroundColor: brand.colors.bgDeep, color: brand.colors.text, paddingHorizontal: 14, fontSize: 16 },
  error: { borderRadius: brand.radius.sm, backgroundColor: brand.colors.dangerBg, color: "#ffd5dd", padding: 11, lineHeight: 19 },
  primaryButton: { minHeight: 54, alignItems: "center", justifyContent: "center", marginTop: 8, borderWidth: 1, borderColor: brand.colors.cyanSoft, borderRadius: brand.radius.md, backgroundColor: brand.colors.cyan, ...brand.shadow },
  primaryButtonText: { color: brand.colors.bgDeep, fontSize: 15, fontWeight: "900", letterSpacing: 0.5 },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.6 },
  link: { alignSelf: "center", color: brand.colors.cyanSoft, fontWeight: "800", marginTop: 6 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  divider: { flex: 1, height: 1, backgroundColor: brand.colors.borderSoft },
  dividerText: { color: brand.colors.muted, fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  row: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", marginTop: 4 },
  muted: { color: brand.colors.muted },
  linkInline: { color: brand.colors.gold, fontWeight: "900" },
});
