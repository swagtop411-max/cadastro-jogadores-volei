import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { subscribeConversations } from "@/services/messageService";
import { subscribeNotifications } from "@/services/notificationService";
import { brand } from "@/ui/brand";

export function SocialQuickActions() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(0);
  const [messages, setMessages] = useState(0);

  useEffect(() => {
    const stopNotifications = subscribeNotifications((items) => setNotifications(items.filter((item) => !item.read).length));
    const stopMessages = subscribeConversations((items) => setMessages(items.filter((item) => item.unread).length));
    return () => { stopNotifications(); stopMessages(); };
  }, []);

  return (
    <View style={styles.row}>
      <Pressable onPress={() => router.push("/activity")} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>♢</Text>
          {notifications ? <Badge value={notifications} /> : null}
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>ATIVIDADES</Text>
          <Text style={styles.subtitle}>{notifications ? `${notifications} nova${notifications === 1 ? "" : "s"}` : "Tudo em dia"}</Text>
        </View>
      </Pressable>
      <Pressable onPress={() => router.push("/messages")} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <View style={styles.iconWrapGold}>
          <Text style={styles.iconGold}>✉</Text>
          {messages ? <Badge value={messages} gold /> : null}
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>DIRECT</Text>
          <Text style={styles.subtitle}>{messages ? `${messages} não lida${messages === 1 ? "" : "s"}` : "Mensagens"}</Text>
        </View>
      </Pressable>
    </View>
  );
}

function Badge({ value, gold = false }: { value: number; gold?: boolean }) {
  return <View style={[styles.badge, gold && styles.badgeGold]}><Text style={styles.badgeText}>{value > 99 ? "99+" : value}</Text></View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, marginBottom: 12 },
  button: { flex: 1, flexDirection: "row", alignItems: "center", gap: 9, minHeight: 58, borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.lg, backgroundColor: brand.colors.surface, padding: 10 },
  iconWrap: { position: "relative", width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#0a4160" },
  iconWrapGold: { position: "relative", width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#3c2c0d" },
  icon: { color: brand.colors.cyan, fontSize: 21, fontWeight: "900" },
  iconGold: { color: brand.colors.gold, fontSize: 16, fontWeight: "900" },
  badge: { position: "absolute", right: -6, top: -6, minWidth: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, backgroundColor: brand.colors.cyan, borderWidth: 2, borderColor: brand.colors.surface },
  badgeGold: { backgroundColor: brand.colors.gold },
  badgeText: { color: brand.colors.bgDeep, fontSize: 7, fontWeight: "900" },
  copy: { flex: 1 },
  title: { color: brand.colors.text, fontSize: 9, fontWeight: "900", letterSpacing: 0.6 },
  subtitle: { marginTop: 3, color: brand.colors.muted, fontSize: 8 },
  pressed: { opacity: 0.75 },
});
