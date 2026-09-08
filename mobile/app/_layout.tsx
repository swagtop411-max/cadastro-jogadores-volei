import { Stack, router, useSegments } from "expo-router";
import { useEffect, useState } from "react";

import { LaunchScreen } from "@/components/LaunchScreen";
import { bootstrapFirebase } from "@/firebase/bootstrap";
import type { AuthSession } from "@/repositories/contracts";
import { firebaseAuthRepository } from "@/repositories/firebase/authRepository";
import { recordAppSession } from "@/services/accessTelemetry";
import { registerPushNotifications, subscribePushResponse } from "@/services/pushService";
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
      .then(() => { if (mounted) setReady(true); })
      .catch((cause: unknown) => { if (mounted) setError(cause instanceof Error ? cause.message : "Falha ao inicializar o Firebase."); });
    return () => { mounted = false; };
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

  useEffect(() => {
    if (!ready || !session?.uid) return;
    void recordAppSession(session.uid).catch(() => undefined);
    void registerPushNotifications(session.uid).catch(() => undefined);
  }, [ready, session?.uid]);

  useEffect(() => subscribePushResponse((route) => router.push(route as never)), []);

  if (error) return <LaunchScreen message={error} error />;
  if (!ready || !sessionResolved || !minimumLaunchElapsed) return <LaunchScreen />;

  const noHeader = { headerShown: false } as const;
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
      <Stack.Screen name="(tabs)" options={noHeader} />
      <Stack.Screen name="(auth)" options={noHeader} />
      <Stack.Screen name="athlete/[uid]" options={{ title: "Perfil do atleta" }} />
      <Stack.Screen name="profile/edit" options={{ title: "Editar perfil" }} />
      <Stack.Screen name="post/[id]" options={noHeader} />
      <Stack.Screen name="stories/create" options={noHeader} />
      <Stack.Screen name="stories/[ownerUid]" options={noHeader} />
      <Stack.Screen name="activity" options={noHeader} />
      <Stack.Screen name="messages/index" options={noHeader} />
      <Stack.Screen name="messages/[uid]" options={noHeader} />
      <Stack.Screen name="connections/[uid]" options={noHeader} />
      <Stack.Screen name="saved" options={noHeader} />
      <Stack.Screen name="reels" options={noHeader} />
      <Stack.Screen name="ranking" options={noHeader} />
      <Stack.Screen name="teams" options={noHeader} />
      <Stack.Screen name="team/[id]" options={noHeader} />
      <Stack.Screen name="team/create" options={noHeader} />
      <Stack.Screen name="team/invite" options={noHeader} />
      <Stack.Screen name="team/invites" options={noHeader} />
    </Stack>
  );
}
