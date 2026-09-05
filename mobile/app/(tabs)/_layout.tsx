import { Tabs } from "expo-router";

import { AppTabIcon } from "@/components/AppTabIcon";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#071827" },
        headerTintColor: "#ffffff",
        headerTitleStyle: { fontWeight: "800" },
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: "#0b2234",
          borderTopColor: "#17384d",
          height: 70,
          paddingTop: 7,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: "#d9a93f",
        tabBarInactiveTintColor: "#8fa0ac",
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Feed",
          tabBarIcon: ({ color, size }) => <AppTabIcon name="feed" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explorar",
          tabBarIcon: ({ color, size }) => <AppTabIcon name="explore" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="publish"
        options={{
          title: "Publicar",
          tabBarIcon: ({ color, size }) => <AppTabIcon name="publish" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="championships"
        options={{
          title: "Campeonatos",
          tabBarLabel: "Torneios",
          tabBarIcon: ({ color, size }) => <AppTabIcon name="championships" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => <AppTabIcon name="profile" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
