import { Stack } from "expo-router";

import { brand } from "@/ui/brand";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: brand.colors.bgDeep },
        headerTintColor: brand.colors.text,
        contentStyle: { backgroundColor: brand.colors.bg },
      }}
    />
  );
}
