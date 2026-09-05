import { Stack, router, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { bootstrapFirebase } from "@/firebase/bootstrap";
import type { AuthSession } from "@/repositories/contracts";
import { firebaseAuthRepository } from "@/repositories/firebase/authRepository";

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
        const message = cause instanceof Error ? cause.message : "Falha ao inicializar o Firebase.";
        setError(message);
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
    if (!session && !insideAuthGroup) {
      router.replace("/login");
    }
  }, [ready, segments, session, sessionResolved]);

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#071827",
          padding: 24,
        }}
      >
        <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "800", textAlign: "center" }}>
          Não foi possível iniciar o aplicativo.
        </Text>
        <Text style={{ color: "#b8c7d9", marginTop: 8, textAlign: "center" }}>{error}</Text>
      </View>
    );
  }

  if (!ready || !sessionResolved) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#071827",
        }}
      >
        <ActivityIndicator size="large" />
        <Text style={{ color: "#b8c7d9", marginTop: 12 }}>Conectando ao Cadastro de Atletas…</Text>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#071827" },
        headerTintColor: "#ffffff",
        headerTitleStyle: { fontWeight: "800" },
        contentStyle: { backgroundColor: "#071827" },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="athlete/[uid]" options={{ title: "Atleta" }} />
    </Stack>
  );
}
