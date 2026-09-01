import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/src/providers/AuthProvider';
import { colors } from '@/src/theme';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.navy },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: '900' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="profile/[uid]" options={{ title: 'Perfil do atleta' }} />
        <Stack.Screen name="post/[id]" options={{ title: 'Publicação' }} />
        <Stack.Screen name="chat/[conversationId]" options={{ title: 'Direct' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notificações' }} />
        <Stack.Screen name="championships" options={{ title: 'Campeonatos' }} />
        <Stack.Screen name="teams" options={{ title: 'Equipes' }} />
        <Stack.Screen name="story/[id]" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="reels" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      </Stack>
    </AuthProvider>
  );
}
