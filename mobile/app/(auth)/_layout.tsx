import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#071827" },
        headerTintColor: "#ffffff",
        contentStyle: { backgroundColor: "#071827" },
      }}
    />
  );
}
