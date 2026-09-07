import { Link, router } from "expo-router";
import { useState, type ComponentProps } from "react";
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
import { registerIdentity } from "@/services/identityService";
import { brand } from "@/ui/brand";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    const cleanName = name.trim();
    if (cleanName.length < 2) return setError("Digite seu nome com pelo menos 2 caracteres.");
    if (!email.trim()) return setError("Digite seu e-mail.");
    if (password.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");
    if (password !== confirmPassword) return setError("As senhas não são iguais.");

    setLoading(true);
    setError(null);
    try {
      await registerIdentity({ name: cleanName, email, password });
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
          eyebrow="MAIS ESPORTE. MAIS OPORTUNIDADES."
          title="Criar conta"
          subtitle="Entre para a rede e use a mesma conta no aplicativo e no site."
        />

        <View style={styles.card}>
          <View style={styles.cardAccent} />
          <Text style={styles.formTitle}>Sua jornada começa aqui</Text>
          <Text style={styles.formSubtitle}>Crie sua identidade e depois complete seu perfil esportivo.</Text>

          <Field label="Nome" value={name} onChangeText={setName} placeholder="Seu nome" autoCapitalize="words" autoComplete="name" />
          <Field label="E-mail" value={email} onChangeText={setEmail} placeholder="seuemail@exemplo.com" autoCapitalize="none" autoComplete="email" keyboardType="email-address" />
          <Field label="Senha" value={password} onChangeText={setPassword} placeholder="Mínimo de 6 caracteres" autoCapitalize="none" autoComplete="new-password" secureTextEntry />
          <Field label="Confirmar senha" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repita a senha" autoCapitalize="none" autoComplete="new-password" secureTextEntry />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            disabled={loading}
            onPress={handleRegister}
            style={({ pressed }) => [styles.primaryButton, pressed && !loading && styles.pressed, loading && styles.disabled]}
          >
            {loading ? <ActivityIndicator color={brand.colors.bgDeep} /> : <Text style={styles.primaryButtonText}>CRIAR MINHA CONTA</Text>}
          </Pressable>

          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>CONTA ÚNICA</Text>
            <Text style={styles.notice}>Depois do cadastro, o Firebase enviará um e-mail de verificação. A mesma identidade vale para web e app.</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.muted}>Já possui conta? </Text>
            <Link href="/login" style={styles.linkInline}>Entrar</Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field(props: ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...inputProps } = props;
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...inputProps} placeholderTextColor={brand.colors.muted} style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: brand.colors.bg },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 18, paddingVertical: 28 },
  card: { position: "relative", overflow: "hidden", borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.xl, backgroundColor: brand.colors.surface, padding: 20, ...brand.shadow },
  cardAccent: { position: "absolute", top: 0, left: 0, right: 0, height: 3, backgroundColor: brand.colors.gold },
  formTitle: { color: brand.colors.text, fontSize: 22, fontWeight: "900" },
  formSubtitle: { marginTop: 4, marginBottom: 12, color: brand.colors.mutedStrong, fontSize: 12, lineHeight: 18 },
  fieldWrap: { marginBottom: 11 },
  label: { marginBottom: 6, color: brand.colors.cyanSoft, fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.7 },
  input: { minHeight: 52, borderWidth: 1, borderColor: brand.colors.border, borderRadius: brand.radius.md, backgroundColor: brand.colors.bgDeep, color: brand.colors.text, paddingHorizontal: 14, fontSize: 16 },
  error: { borderRadius: brand.radius.sm, backgroundColor: brand.colors.dangerBg, color: "#ffd5dd", padding: 11, lineHeight: 19 },
  primaryButton: { minHeight: 54, alignItems: "center", justifyContent: "center", marginTop: 5, borderWidth: 1, borderColor: brand.colors.cyanSoft, borderRadius: brand.radius.md, backgroundColor: brand.colors.cyan, ...brand.shadow },
  primaryButtonText: { color: brand.colors.bgDeep, fontSize: 14, fontWeight: "900", letterSpacing: 0.4 },
  noticeCard: { marginTop: 12, borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.md, backgroundColor: brand.colors.bgDeep, padding: 12 },
  noticeTitle: { color: brand.colors.gold, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  notice: { marginTop: 5, color: brand.colors.mutedStrong, fontSize: 11, lineHeight: 17 },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.6 },
  row: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", marginTop: 14 },
  muted: { color: brand.colors.muted },
  linkInline: { color: brand.colors.gold, fontWeight: "900" },
});
