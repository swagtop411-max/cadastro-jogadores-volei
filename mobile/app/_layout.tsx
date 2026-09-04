import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { bootstrapFirebase } from "@/firebase/bootstrap";

export default function RootLayout() {
  const [ready, setReady] = useState(false);
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

  if (!ready) {
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
    </Stack>
  );
}
