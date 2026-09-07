import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { formatFirebaseDate } from "@/services/mobileContent";
import {
  markAllNotificationsRead,
  markNotificationRead,
  notificationLabel,
  subscribeNotifications,
  type MobileNotification,
} from "@/services/notificationService";
import { brand } from "@/ui/brand";

type Filter = "all" | "unread" | "interactions" | "network" | "messages";

export default function ActivityScreen() {
  const router = useRouter();
  const [items, setItems] = useState<MobileNotification[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => subscribeNotifications(
    (next) => { setItems(next); setLoading(false); setError(null); },
    (cause) => { setError(cause.message); setLoading(false); },
  ), []);

  const unread = items.filter((item) => !item.read).length;
  const visible = useMemo(() => items.filter((item) => {
    if (filter === "unread") return !item.read;
    if (filter === "interactions") return item.type === "like" || item.type === "comment" || item.type === "mention";
    if (filter === "network") return item.type === "follow";
    if (filter === "messages") return item.type === "message";
    return true;
  }), [filter, items]);

  async function open(item: MobileNotification) {
    if (!item.read) await markNotificationRead(item.id).catch(() => undefined);
    if (item.type === "message") {
      router.push({ pathname: "/messages/[uid]", params: { uid: item.actorUid } });
      return;
    }
    if (item.type === "follow") {
      router.push({ pathname: "/athlete/[uid]", params: { uid: item.actorUid } });
      return;
    }
    if (item.sourceId) router.push({ pathname: "/post/[id]", params: { id: item.sourceId } });
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>CENTRAL SOCIAL</Text>
          <Text style={styles.title}>Atividades</Text>
          <Text style={styles.subtitle}>{unread ? `${unread} não lida${unread === 1 ? "" : "s"}` : "Tudo em dia"}</Text>
        </View>
        {unread ? <Pressable onPress={() => void markAllNotificationsRead(items)} style={styles.readAll}><Text style={styles.readAllText}>LER TODAS</Text></Pressable> : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        <Chip label="Tudo" active={filter === "all"} onPress={() => setFilter("all")} />
        <Chip label={`Não lidas ${unread || ""}`.trim()} active={filter === "unread"} onPress={() => setFilter("unread")} />
        <Chip label="Interações" active={filter === "interactions"} onPress={() => setFilter("interactions")} />
        <Chip label="Rede" active={filter === "network"} onPress={() => setFilter("network")} />
        <Chip label="Mensagens" active={filter === "messages"} onPress={() => setFilter("messages")} />
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list}>
        {loading ? <View style={styles.center}><ActivityIndicator color={brand.colors.cyan} /><Text style={styles.muted}>Carregando atividades…</Text></View> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && !visible.length ? <View style={styles.empty}><Text style={styles.emptyIcon}>✓</Text><Text style={styles.emptyTitle}>Nenhuma atividade neste filtro</Text><Text style={styles.muted}>Novas curtidas, comentários, seguidores, menções e mensagens aparecem aqui em tempo real.</Text></View> : null}
        {visible.map((item) => (
          <Pressable key={item.id} onPress={() => void open(item)} style={({ pressed }) => [styles.row, !item.read && styles.rowUnread, pressed && styles.pressed]}>
            {item.actorPhoto ? <Image source={{ uri: item.actorPhoto }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.avatarText}>{item.actorName.slice(0, 1).toUpperCase()}</Text></View>}
            <View style={styles.copy}>
              <Text style={styles.message}><Text style={styles.actor}>{item.actorName}</Text> {notificationLabel(item.type)}</Text>
              {item.text && item.text !== notificationLabel(item.type) ? <Text numberOfLines={2} style={styles.detail}>{item.text}</Text> : null}
              <Text style={styles.time}>{formatFirebaseDate(item.createdAt)}</Text>
            </View>
            <View style={[styles.typeBadge, item.type === "message" && styles.typeBadgeGold]}><Text style={[styles.typeText, item.type === "message" && styles.typeTextGold]}>{iconFor(item.type)}</Text></View>
            {!item.read ? <View style={styles.unreadDot} /> : null}
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function iconFor(type: MobileNotification["type"]) {
  if (type === "like") return "♥";
  if (type === "comment") return "◌";
  if (type === "follow") return "+";
  if (type === "message") return "✉";
  return "@";
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}><Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 15, paddingTop: 8, paddingBottom: 12 },
  back: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: brand.colors.borderSoft, backgroundColor: brand.colors.surface },
  backText: { color: brand.colors.text, fontSize: 32, lineHeight: 34 },
  headerCopy: { flex: 1 },
  eyebrow: { color: brand.colors.cyan, fontSize: 8, fontWeight: "900", letterSpacing: 1.1 },
  title: { color: brand.colors.text, fontSize: 25, fontWeight: "900" },
  subtitle: { marginTop: 1, color: brand.colors.muted, fontSize: 10 },
  readAll: { borderRadius: brand.radius.pill, backgroundColor: "#3c2c0d", paddingHorizontal: 10, paddingVertical: 8 },
  readAllText: { color: brand.colors.gold, fontSize: 8, fontWeight: "900" },
  filters: { gap: 8, paddingHorizontal: 15, paddingBottom: 11 },
  chip: { borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.pill, backgroundColor: brand.colors.surface, paddingHorizontal: 13, paddingVertical: 8 },
  chipActive: { borderColor: brand.colors.cyan, backgroundColor: "#0a4160" },
  chipText: { color: brand.colors.mutedStrong, fontSize: 10, fontWeight: "800" },
  chipTextActive: { color: brand.colors.cyanSoft },
  list: { gap: 8, padding: 14, paddingTop: 5, paddingBottom: 35 },
  row: { position: "relative", flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.lg, backgroundColor: brand.colors.surface, padding: 12 },
  rowUnread: { borderColor: brand.colors.cyan, backgroundColor: "#092b40" },
  avatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: brand.colors.cyan },
  avatarFallback: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: brand.colors.cyan, backgroundColor: brand.colors.bgDeep },
  avatarText: { color: brand.colors.cyanSoft, fontWeight: "900", fontSize: 18 },
  copy: { flex: 1 },
  message: { color: brand.colors.text, fontSize: 12, lineHeight: 17 },
  actor: { fontWeight: "900" },
  detail: { marginTop: 3, color: brand.colors.mutedStrong, fontSize: 10, lineHeight: 14 },
  time: { marginTop: 5, color: brand.colors.muted, fontSize: 8 },
  typeBadge: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#0a4160" },
  typeBadgeGold: { backgroundColor: "#3c2c0d" },
  typeText: { color: brand.colors.cyan, fontSize: 15, fontWeight: "900" },
  typeTextGold: { color: brand.colors.gold },
  unreadDot: { position: "absolute", right: 6, top: 6, width: 7, height: 7, borderRadius: 4, backgroundColor: brand.colors.cyan },
  center: { alignItems: "center", gap: 9, paddingVertical: 45 },
  muted: { color: brand.colors.muted, textAlign: "center", lineHeight: 19 },
  empty: { alignItems: "center", borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.xl, backgroundColor: brand.colors.surface, padding: 26 },
  emptyIcon: { color: brand.colors.success, fontSize: 34, fontWeight: "900" },
  emptyTitle: { marginTop: 8, marginBottom: 6, color: brand.colors.text, fontSize: 17, fontWeight: "900" },
  error: { borderRadius: brand.radius.md, backgroundColor: brand.colors.dangerBg, color: "#ffd5dd", padding: 12 },
  pressed: { opacity: 0.74 },
});
