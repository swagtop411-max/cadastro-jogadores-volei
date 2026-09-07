import { Stack, router, useSegments } from "expo-router";
import { useEffect, useState } from "react";

import { LaunchScreen } from "@/components/LaunchScreen";
import { bootstrapFirebase } from "@/firebase/bootstrap";
import type { AuthSession } from "@/repositories/contracts";
import { firebaseAuthRepository } from "@/repositories/firebase/authRepository";
import { brand } from "@/ui/brand";

export default function RootLayout() {
  const segments = useSegments();
  const [ready, setReady] = useState(false);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [minimumLaunchElapsed, setMinimumLaunchElapsed] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setMinimumLaunchElapsed(true), 1400);
    return () => clearTimeout(timer);
  }, []);

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
    return <LaunchScreen message={error} error />;
  }

  if (!ready || !sessionResolved || !minimumLaunchElapsed) {
    return <LaunchScreen />;
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
