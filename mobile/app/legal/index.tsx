import { useRouter } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import {
  ACCOUNT_DELETION_URL,
  CHILD_SAFETY_URL,
  PRIVACY_URL,
  TERMS_URL,
} from "@/services/policyConsentService";
import { brand } from "@/ui/brand";

export default function LegalCenterScreen() {
  const router = useRouter();
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <BrandHeader
        eyebrow="CONTA, PRIVACIDADE E SEGURANÇA"
        title="Central da conta"
        subtitle="Termos, privacidade, segurança da comunidade e controles da sua conta em um só lugar."
      />

      <View style={styles.card}>
        <Text style={styles.title}>DOCUMENTOS</Text>
        <Action title="TERMOS DE USO" subtitle="Regras da comunidade e conteúdo publicado" onPress={() => void Linking.openURL(TERMS_URL)} />
        <Action title="POLÍTICA DE PRIVACIDADE" subtitle="Como dados pessoais e esportivos são tratados" onPress={() => void Linking.openURL(PRIVACY_URL)} />
        <Action title="SEGURANÇA INFANTIL" subtitle="Padrões públicos contra abuso e exploração sexual infantil" onPress={() => void Linking.openURL(CHILD_SAFETY_URL)} />
        <Action title="EXCLUSÃO PELA WEB" subtitle="Recurso externo para solicitar exclusão de conta e dados" onPress={() => void Linking.openURL(ACCOUNT_DELETION_URL)} />
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>COMUNIDADE</Text>
        <Text style={styles.body}>Você pode denunciar publicações, perfis, comentários e equipes inadequadas diretamente no app. Também é possível bloquear usuários. Conteúdo ilegal, abusivo, discriminatório, sexual impróprio, fraudulento, invasivo, que explore menores ou que viole direitos de terceiros pode ser removido e a conta pode sofrer restrições.</Text>
      </View>

      <Pressable onPress={() => router.push("/account/delete")} style={({ pressed }) => [styles.dangerButton, pressed && styles.pressed]}>
        <Text style={styles.dangerButtonText}>EXCLUIR MINHA CONTA E DADOS</Text>
      </Pressable>
      <Text style={styles.warning}>A exclusão é permanente. O app pedirá sua senha novamente antes de iniciar o processo.</Text>
    </ScrollView>
  );
}

function Action({ title, subtitle, onPress }: { title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: brand.colors.bg, padding: 16, paddingTop: 18, paddingBottom: 80 },
  card: { marginBottom: 14, borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.lg, backgroundColor: brand.colors.surface, padding: 14 },
  title: { marginBottom: 8, color: brand.colors.gold, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  body: { color: brand.colors.mutedStrong, lineHeight: 21, fontSize: 12 },
  action: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 64, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: brand.colors.borderSoft, paddingVertical: 10 },
  actionTitle: { color: brand.colors.text, fontWeight: "900", fontSize: 12 },
  actionSubtitle: { marginTop: 4, color: brand.colors.muted, fontSize: 10, lineHeight: 15 },
  arrow: { color: brand.colors.cyan, fontSize: 26, fontWeight: "900" },
  dangerButton: { alignItems: "center", justifyContent: "center", minHeight: 54, borderWidth: 1, borderColor: brand.colors.danger, borderRadius: brand.radius.md, backgroundColor: brand.colors.dangerBg, paddingHorizontal: 14 },
  dangerButtonText: { color: "#ffd5dd", fontSize: 12, fontWeight: "900" },
  warning: { marginTop: 8, color: brand.colors.muted, fontSize: 10, lineHeight: 15, textAlign: "center" },
  pressed: { opacity: 0.75 },
});
