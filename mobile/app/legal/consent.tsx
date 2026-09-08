import { getAuth } from "@react-native-firebase/auth";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import {
  PRIVACY_URL,
  TERMS_URL,
  recordPolicyConsent,
} from "@/services/policyConsentService";
import { brand } from "@/ui/brand";

export default function ConsentScreen() {
  const router = useRouter();
  const user = getAuth().currentUser;
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    if (!user) return router.replace("/login");
    if (!terms || !privacy) return setError("Marque as duas confirmações para continuar.");
    setLoading(true);
    setError(null);
    try {
      await recordPolicyConsent(user.uid);
      router.replace("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível registrar o aceite.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <BrandHeader
        eyebrow="ATUALIZAÇÃO OBRIGATÓRIA"
        title="Termos e privacidade"
        subtitle="Antes de continuar usando os recursos sociais, confirme que leu as regras atuais da plataforma."
      />

      <View style={styles.card}>
        <CheckRow checked={terms} onPress={() => setTerms((value) => !value)} label="Li e aceito os Termos de Uso e as regras da comunidade." />
        <Pressable onPress={() => void Linking.openURL(TERMS_URL)}><Text style={styles.link}>LER TERMOS DE USO</Text></Pressable>
        <CheckRow checked={privacy} onPress={() => setPrivacy((value) => !value)} label="Li a Política de Privacidade e entendo como meus dados são tratados." />
        <Pressable onPress={() => void Linking.openURL(PRIVACY_URL)}><Text style={styles.link}>LER POLÍTICA DE PRIVACIDADE</Text></Pressable>
        <Text style={styles.note}>Você pode denunciar conteúdo e bloquear usuários. Ao publicar, você confirma que possui direito de usar o material enviado e que ele respeita as regras da comunidade.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable disabled={loading} onPress={accept} style={({ pressed }) => [styles.primary, pressed && !loading && styles.pressed, loading && styles.disabled]}>
          {loading ? <ActivityIndicator color={brand.colors.bgDeep} /> : <Text style={styles.primaryText}>ACEITAR E CONTINUAR</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function CheckRow({ checked, onPress, label }: { checked: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.checkRow, pressed && styles.pressed]}>
      <View style={[styles.checkbox, checked && styles.checkboxActive]}><Text style={styles.checkmark}>{checked ? "✓" : ""}</Text></View>
      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, justifyContent: "center", backgroundColor: brand.colors.bg, padding: 18, paddingVertical: 28 },
  card: { borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.xl, backgroundColor: brand.colors.surface, padding: 18 },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 11, marginTop: 10 },
  checkbox: { width: 24, height: 24, borderWidth: 1, borderColor: brand.colors.border, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: brand.colors.bgDeep },
  checkboxActive: { borderColor: brand.colors.cyan, backgroundColor: brand.colors.cyan },
  checkmark: { color: brand.colors.bgDeep, fontWeight: "900" },
  checkLabel: { flex: 1, color: brand.colors.text, fontSize: 13, lineHeight: 19 },
  link: { marginLeft: 35, marginTop: 5, marginBottom: 8, color: brand.colors.gold, fontSize: 10, fontWeight: "900" },
  note: { marginTop: 12, borderRadius: brand.radius.md, backgroundColor: brand.colors.bgDeep, color: brand.colors.mutedStrong, padding: 12, fontSize: 11, lineHeight: 17 },
  error: { marginTop: 12, borderRadius: brand.radius.sm, backgroundColor: brand.colors.dangerBg, color: "#ffd5dd", padding: 10 },
  primary: { minHeight: 54, alignItems: "center", justifyContent: "center", marginTop: 14, borderRadius: brand.radius.md, backgroundColor: brand.colors.cyan },
  primaryText: { color: brand.colors.bgDeep, fontSize: 13, fontWeight: "900" },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.55 },
});
