import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { formatFirebaseDate } from "@/services/mobileContent";
import { subscribeConversations, type ConversationPreview } from "@/services/messageService";
import { brand } from "@/ui/brand";

function norm(value: unknown) {
  return String(value || "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export default function MessagesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ConversationPreview[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => subscribeConversations(
    (next) => { setItems(next); setLoading(false); setError(null); },
    (cause) => { setLoading(false); setError(cause.message); },
  ), []);

  const visible = useMemo(() => {
    const term = norm(search.trim());
    if (!term) return items;
    return items.filter((item) => norm(`${item.otherName} ${item.lastMessage}`).includes(term));
  }, [items, search]);
  const unread = items.filter((item) => item.unread).length;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>DIRECT</Text>
          <Text style={styles.title}>Mensagens</Text>
          <Text style={styles.subtitle}>{unread ? `${unread} conversa${unread === 1 ? "" : "s"} não lida${unread === 1 ? "" : "s"}` : "Converse com atletas da rede"}</Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput value={search} onChangeText={setSearch} placeholder="Buscar conversa…" placeholderTextColor={brand.colors.muted} style={styles.search} />
        {search ? <Pressable onPress={() => setSearch("")}><Text style={styles.clear}>×</Text></Pressable> : null}
      </View>

      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {loading ? <View style={styles.center}><ActivityIndicator color={brand.colors.cyan} /><Text style={styles.muted}>Carregando conversas…</Text></View> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && !visible.length ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>✉</Text>
            <Text style={styles.emptyTitle}>Nenhuma conversa ainda</Text>
            <Text style={styles.muted}>Abra o perfil de um atleta e toque em MENSAGEM para iniciar um Direct.</Text>
            <Pressable onPress={() => router.push("/(tabs)/explore")} style={styles.exploreButton}><Text style={styles.exploreButtonText}>ENCONTRAR ATLETAS</Text></Pressable>
          </View>
        ) : null}
        {visible.map((item) => (
          <Pressable key={item.id} onPress={() => router.push({ pathname: "/messages/[uid]", params: { uid: item.otherUid } })} style={({ pressed }) => [styles.row, item.unread && styles.rowUnread, pressed && styles.pressed]}>
            {item.otherPhoto ? <Image source={{ uri: item.otherPhoto }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.avatarText}>{item.otherName.slice(0, 1).toUpperCase()}</Text></View>}
            <View style={styles.copy}>
              <View style={styles.nameRow}><Text numberOfLines={1} style={styles.name}>{item.otherName}</Text>{item.unread ? <View style={styles.dot} /> : null}</View>
              <Text numberOfLines={1} style={[styles.preview, item.unread && styles.previewUnread]}>{item.lastMessage || "Conversa iniciada"}</Text>
            </View>
            <Text style={styles.time}>{formatFirebaseDate(item.lastMessageAt)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 15, paddingTop: 8, paddingBottom: 12 },
  back: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: brand.colors.borderSoft, backgroundColor: brand.colors.surface },
  backText: { color: brand.colors.text, fontSize: 32, lineHeight: 34 },
  headerCopy: { flex: 1 },
  eyebrow: { color: brand.colors.gold, fontSize: 8, fontWeight: "900", letterSpacing: 1.1 },
  title: { color: brand.colors.text, fontSize: 25, fontWeight: "900" },
  subtitle: { marginTop: 1, color: brand.colors.muted, fontSize: 10 },
  searchWrap: { flexDirection: "row", alignItems: "center", marginHorizontal: 14, marginBottom: 10, borderWidth: 1, borderColor: brand.colors.border, borderRadius: brand.radius.md, backgroundColor: brand.colors.surface, paddingHorizontal: 12 },
  searchIcon: { color: brand.colors.cyan, fontSize: 23, marginRight: 7 },
  search: { flex: 1, color: brand.colors.text, paddingVertical: 12 },
  clear: { color: brand.colors.mutedStrong, fontSize: 23 },
  list: { gap: 8, padding: 14, paddingTop: 3, paddingBottom: 35 },
  row: { flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.lg, backgroundColor: brand.colors.surface, padding: 12 },
  rowUnread: { borderColor: brand.colors.cyan, backgroundColor: "#092b40" },
  avatar: { width: 54, height: 54, borderRadius: 27, borderWidth: 1, borderColor: brand.colors.cyan },
  avatarFallback: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: brand.colors.cyan, backgroundColor: brand.colors.bgDeep },
  avatarText: { color: brand.colors.cyanSoft, fontSize: 18, fontWeight: "900" },
  copy: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { flexShrink: 1, color: brand.colors.text, fontWeight: "900", fontSize: 14 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: brand.colors.cyan },
  preview: { marginTop: 4, color: brand.colors.muted, fontSize: 11 },
  previewUnread: { color: brand.colors.cyanSoft, fontWeight: "800" },
  time: { color: brand.colors.muted, fontSize: 8 },
  center: { alignItems: "center", gap: 9, paddingVertical: 45 },
  muted: { color: brand.colors.muted, textAlign: "center", lineHeight: 19 },
  empty: { alignItems: "center", borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.xl, backgroundColor: brand.colors.surface, padding: 25 },
  emptyIcon: { color: brand.colors.gold, fontSize: 32 },
  emptyTitle: { marginTop: 8, marginBottom: 6, color: brand.colors.text, fontSize: 17, fontWeight: "900" },
  exploreButton: { marginTop: 14, borderRadius: brand.radius.md, backgroundColor: brand.colors.cyan, paddingHorizontal: 18, paddingVertical: 12 },
  exploreButtonText: { color: brand.colors.bgDeep, fontSize: 10, fontWeight: "900" },
  error: { borderRadius: brand.radius.md, backgroundColor: brand.colors.dangerBg, color: "#ffd5dd", padding: 12 },
  pressed: { opacity: 0.74 },
});
