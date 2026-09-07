import type { ReactNode } from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function ScreenPlaceholder({ eyebrow, title, description, children }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        {children ? <View style={styles.content}>{children}</View> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#071827" },
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 28, gap: 12 },
  eyebrow: { color: "#d9a93f", fontSize: 12, fontWeight: "800", letterSpacing: 1.5 },
  title: { color: "#ffffff", fontSize: 36, lineHeight: 40, fontWeight: "900" },
  description: { color: "#c5cac5", fontSize: 16, lineHeight: 24, maxWidth: 520 },
  content: { marginTop: 12 },
});
