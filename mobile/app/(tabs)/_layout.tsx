import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors } from '@/src/theme';

const icon = (emoji: string, color: string) => <Text style={{ fontSize: 19, color }}>{emoji}</Text>;

export default function TabsLayout() {
  const { user, loading } = useAuth();
  if (!loading && !user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '900' },
        tabBarActiveTintColor: colors.cyan,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 64, paddingBottom: 8 },
        tabBarLabelStyle: { fontWeight: '700', fontSize: 10 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: ({ color }) => icon('🏠', color) }} />
      <Tabs.Screen name="explore" options={{ title: 'Explorar', tabBarIcon: ({ color }) => icon('⌕', color) }} />
      <Tabs.Screen name="create" options={{ title: 'Criar', tabBarIcon: ({ color }) => icon('＋', color) }} />
      <Tabs.Screen name="messages" options={{ title: 'Direct', tabBarIcon: ({ color }) => icon('✉️', color) }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: ({ color }) => icon('👤', color) }} />
    </Tabs>
  );
}
