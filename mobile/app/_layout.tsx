import { Stack, router, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";

import { bootstrapFirebase } from "@/firebase/bootstrap";
import type { AuthSession } from "@/repositories/contracts";
import { firebaseAuthRepository } from "@/repositories/firebase/authRepository";
import { brand } from "@/ui/brand";

export default function RootLayout() {
  const segments = useSegments();
  const [ready, setReady] = useState(false);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    bootstrapFirebase()
      .then(() => {
        if (mounted) setReady(true);
      })
      .catch((cause: unknown) => {
        if (!mounted) return;
        setError(cause instanceof Error ? cause.message : "Falha ao inicializar o Firebase.");
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    return firebaseAuthRepository.observeSession((nextSession) => {
      setSession(nextSession);
      setSessionResolved(true);
    });
  }, [ready]);

  useEffect(() => {
    if (!ready || !sessionResolved) return;
    const insideAuthGroup = segments[0] === "(auth)";
    if (!session && !insideAuthGroup) router.replace("/login");
  }, [ready, segments, session, sessionResolved]);

  if (error) {
    return (
      <View style={styles.loadingPage}>
        <Image source={require("../assets/branding/app-icon.png")} style={styles.loadingLogo} />
        <Text style={styles.errorTitle}>Não foi possível iniciar o aplicativo.</Text>
        <Text style={styles.loadingText}>{error}</Text>
      </View>
    );
  }

  if (!ready || !sessionResolved) {
    return (
      <View style={styles.loadingPage}>
        <View style={styles.loadingGlow} />
        <Image source={require("../assets/branding/app-icon.png")} style={styles.loadingLogo} />
        <Text style={styles.loadingBrand}>Banco de <Text style={styles.loadingBrandAccent}>Atletas</Text></Text>
        <Text style={styles.loadingUrl}>cadastrodeatletas.com.br</Text>
        <View style={styles.loadingRule}>
          <View style={styles.loadingRuleCyan} />
          <View style={styles.loadingRuleGold} />
        </View>
        <ActivityIndicator color={brand.colors.cyan} style={styles.spinner} />
        <Text style={styles.loadingText}>Conectando talentos, movendo o esporte…</Text>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: brand.colors.bgDeep },
        headerTintColor: brand.colors.text,
        headerTitleStyle: { fontWeight: "900" },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: brand.colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="athlete/[uid]" options={{ title: "Perfil do atleta" }} />
      <Stack.Screen name="profile/edit" options={{ title: "Editar perfil" }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingPage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: brand.colors.bg,
    padding: 28,
  },
  loadingGlow: {
    position: "absolute",
    width: 330,
    height: 330,
    borderRadius: 170,
    backgroundColor: "rgba(24,213,255,0.06)",
    top: "24%",
  },
  loadingLogo: {
    width: 132,
    height: 132,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: brand.colors.cyan,
  },
  loadingBrand: { marginTop: 18, color: brand.colors.text, fontSize: 28, fontWeight: "900" },
  loadingBrandAccent: { color: brand.colors.cyan },
  loadingUrl: { marginTop: 3, color: brand.colors.muted, fontSize: 11, letterSpacing: 1.1 },
  loadingRule: { flexDirection: "row", width: 190, gap: 5, marginTop: 20 },
  loadingRuleCyan: { flex: 1, height: 4, borderRadius: 999, backgroundColor: brand.colors.cyan },
  loadingRuleGold: { width: 46, height: 4, borderRadius: 999, backgroundColor: brand.colors.gold },
  spinner: { marginTop: 22 },
  loadingText: { marginTop: 12, color: brand.colors.mutedStrong, textAlign: "center", lineHeight: 20 },
  errorTitle: { marginTop: 18, color: brand.colors.text, fontSize: 18, fontWeight: "900", textAlign: "center" },
});
