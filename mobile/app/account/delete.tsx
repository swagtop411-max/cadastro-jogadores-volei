import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import { deleteCurrentAccount } from "@/services/accountDeletionService";
import { brand } from "@/ui/brand";

export default function DeleteAccountScreen() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = confirmation.trim().toUpperCase() === "EXCLUIR" && password.trim().length > 0;

  async function remove() {
    if (!ready || loading) return;
    setLoading(true);
    setError(null);
    try {
      await deleteCurrentAccount(password);
      router.replace("/login");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível excluir a conta agora.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <BrandHeader
        eyebrow="CONTROLE DE DADOS"
        title="Excluir conta"
        subtitle="Esta ação remove sua conta e inicia a exclusão dos dados associados à sua identidade na plataforma."
      />

      <View style={styles.warningCard}>
        <Text style={styles.warningTitle}>AÇÃO PERMANENTE</Text>
        <Text style={styles.warningText}>Serão removidos, quando associados à sua conta: perfil, publicações, Stories, vídeos, comentários, seguidores, salvos, mensagens/conversas, convites, notificações, tokens de push e mídias identificadas no armazenamento. Dados que precisem ser mantidos por obrigação legal ou segurança podem ser retidos pelo período estritamente necessário.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>SUA SENHA</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Digite sua senha"
          placeholderTextColor={brand.colors.muted}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          style={styles.input}
        />
        <Text style={styles.label}>CONFIRMAÇÃO</Text>
        <TextInput
          value={confirmation}
          onChangeText={setConfirmation}
          placeholder="Digite EXCLUIR"
          placeholderTextColor={brand.colors.muted}
          autoCapitalize="characters"
          style={styles.input}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable disabled={!ready || loading} onPress={remove} style={({ pressed }) => [styles.deleteButton, (!ready || loading) && styles.disabled, pressed && ready && !loading && styles.pressed]}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.deleteText}>EXCLUIR CONTA E DADOS</Text>}
        </Pressable>
        <Pressable disabled={loading} onPress={() => router.back()} style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
          <Text style={styles.cancelText}>CANCELAR</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: brand.colors.bg, padding: 16, paddingTop: 18, paddingBottom: 70 },
  warningCard: { marginBottom: 14, borderWidth: 1, borderColor: brand.colors.danger, borderRadius: brand.radius.lg, backgroundColor: brand.colors.dangerBg, padding: 15 },
  warningTitle: { color: "#ffd5dd", fontSize: 11, fontWeight: "900", letterSpacing: 0.8 },
  warningText: { marginTop: 7, color: "#f4cbd2", fontSize: 11, lineHeight: 18 },
  card: { borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.lg, backgroundColor: brand.colors.surface, padding: 16 },
  label: { marginTop: 8, marginBottom: 6, color: brand.colors.cyanSoft, fontSize: 10, fontWeight: "900", letterSpacing: 0.7 },
  input: { minHeight: 52, borderWidth: 1, borderColor: brand.colors.border, borderRadius: brand.radius.md, backgroundColor: brand.colors.bgDeep, color: brand.colors.text, paddingHorizontal: 14, fontSize: 15 },
  error: { marginTop: 12, borderRadius: brand.radius.sm, backgroundColor: brand.colors.dangerBg, color: "#ffd5dd", padding: 10, lineHeight: 18 },
  deleteButton: { minHeight: 54, alignItems: "center", justifyContent: "center", marginTop: 16, borderRadius: brand.radius.md, backgroundColor: brand.colors.danger },
  deleteText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  cancelButton: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 9, borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.md },
  cancelText: { color: brand.colors.mutedStrong, fontSize: 11, fontWeight: "900" },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.72 },
});
