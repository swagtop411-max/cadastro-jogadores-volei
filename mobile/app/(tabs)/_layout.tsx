import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppTabIcon } from "@/components/AppTabIcon";
import { brand } from "@/ui/brand";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: brand.colors.bg },
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          position: "absolute",
          left: 12,
          right: 12,
          bottom: 10,
          height: 72,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: brand.colors.borderSoft,
          borderRadius: 24,
          backgroundColor: brand.colors.surface,
          paddingTop: 8,
          paddingBottom: 8,
          ...brand.shadow,
        },
        tabBarActiveTintColor: brand.colors.gold,
        tabBarInactiveTintColor: brand.colors.muted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "800", marginTop: 2 },
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
          tabBarIcon: ({ color, size }) => (
            <View style={styles.publishIcon}>
              <AppTabIcon name="publish" color={brand.colors.bgDeep} size={Math.max(size - 2, 22)} />
            </View>
          ),
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

const styles = StyleSheet.create({
  publishIcon: {
    width: 40,
    height: 40,
    marginTop: -10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#ffd96b",
    backgroundColor: brand.colors.gold,
    ...brand.shadow,
  },
});
