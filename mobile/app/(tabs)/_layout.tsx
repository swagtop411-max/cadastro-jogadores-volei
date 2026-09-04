import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#071827" },
        headerTintColor: "#ffffff",
        headerTitleStyle: { fontWeight: "800" },
        tabBarStyle: { backgroundColor: "#0b2234", borderTopColor: "#17384d" },
        tabBarActiveTintColor: "#d9a93f",
        tabBarInactiveTintColor: "#8fa0ac",
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Feed" }} />
      <Tabs.Screen name="explore" options={{ title: "Explorar" }} />
      <Tabs.Screen name="publish" options={{ title: "Publicar" }} />
      <Tabs.Screen name="championships" options={{ title: "Campeonatos" }} />
      <Tabs.Screen name="profile" options={{ title: "Perfil" }} />
    </Tabs>
  );
}
