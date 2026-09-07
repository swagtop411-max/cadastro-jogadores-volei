import { getAuth } from "@react-native-firebase/auth";
import * as ImagePicker from "expo-image-picker";
import { useVideoPlayer, VideoView } from "expo-video";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { formatFirebaseDate } from "@/services/mobileContent";
import { deleteOwnMessage, sendDirectMessage, subscribeMessages, type DirectMessage } from "@/services/messageService";
import { uploadPublicationMedia } from "@/services/mediaUpload";
import { resolveProfile } from "@/services/profileResolver";
import { brand } from "@/ui/brand";

function ChatVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri);
  return <VideoView player={player} style={styles.messageMedia} contentFit="cover" nativeControls />;
}

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ uid?: string }>();
  const otherUid = String(params.uid || "");
  const currentUid = getAuth().currentUser?.uid || "";
  const listRef = useRef<FlatList<DirectMessage>>(null);
  const [name, setName] = useState("Atleta");
  const [photo, setPhoto] = useState("");
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!otherUid) return;
    resolveProfile(otherUid).then((result) => {
      setName(result.resolved?.nome || "Atleta");
      setPhoto(result.resolved?.fotoUrl || "");
    }).catch(() => undefined);
    return subscribeMessages(otherUid, (next) => {
      setMessages(next);
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }, (cause) => { setLoading(false); setError(cause.message); });
  }, [otherUid]);

  async function send() {
    if (!text.trim() || sending) return;
    setSending(true);
    setError(null);
    const value = text;
    setText("");
    try {
      await sendDirectMessage({ otherUid, text: value });
    } catch (cause) {
      setText(value);
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar.");
    } finally {
      setSending(false);
    }
  }

  async function attach() {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return setError("Permita acesso à galeria para enviar mídia.");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"], quality: 0.85, base64: true });
    const asset = !result.canceled ? result.assets[0] : null;
    if (!asset) return;
    const kind = asset.type === "video" ? "video" as const : "image" as const;
    if (kind === "image" && !asset.base64) return setError("Não foi possível preparar a imagem.");
    setSending(true);
    try {
      const uploaded = await uploadPublicationMedia({
        uid: currentUid,
        uri: asset.uri,
        kind,
        mimeType: asset.mimeType ?? null,
        fileSize: asset.fileSize ?? null,
        fileName: asset.fileName ?? null,
        base64: asset.base64 ?? null,
      });
      await sendDirectMessage({ otherUid, media: uploaded, text: "" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar a mídia.");
    } finally {
      setSending(false);
    }
  }

  function confirmDelete(message: DirectMessage) {
    Alert.alert("Desfazer envio", "Excluir esta mensagem para a conversa?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => void deleteOwnMessage([currentUid, otherUid].sort().join("__"), message.id).catch((cause) => setError(cause instanceof Error ? cause.message : "Não foi possível excluir.")) },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
          <Pressable onPress={() => router.push({ pathname: "/athlete/[uid]", params: { uid: otherUid } })} style={styles.identity}>
            {photo ? <Image source={{ uri: photo }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text></View>}
            <View style={styles.copy}><Text numberOfLines={1} style={styles.name}>{name}</Text><Text style={styles.online}>BANCO DE ATLETAS • DIRECT</Text></View>
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <View style={styles.center}><ActivityIndicator color={brand.colors.cyan} /><Text style={styles.muted}>Abrindo conversa…</Text></View> : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messages}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyIcon}>✉</Text><Text style={styles.emptyTitle}>Comece a conversa</Text><Text style={styles.muted}>Envie uma mensagem, foto ou vídeo para {name}.</Text></View>}
            renderItem={({ item }) => {
              const mine = item.senderUid === currentUid;
              return (
                <Pressable onLongPress={() => mine && confirmDelete(item)} style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                  {item.type === "image" && item.mediaUrl ? <Image source={{ uri: item.mediaUrl }} style={styles.messageMedia} resizeMode="cover" /> : null}
                  {item.type === "video" && item.mediaUrl ? <ChatVideo uri={item.mediaUrl} /> : null}
                  {item.text ? <Text style={[styles.messageText, mine && styles.messageTextMine]}>{item.text}</Text> : null}
                  <Text style={[styles.messageTime, mine && styles.messageTimeMine]}>{formatFirebaseDate(item.createdAt)}</Text>
                </Pressable>
              );
            }}
          />
        )}

        <View style={styles.composer}>
          <Pressable disabled={sending} onPress={() => void attach()} style={styles.attach}><Text style={styles.attachText}>＋</Text></Pressable>
          <TextInput value={text} onChangeText={setText} placeholder="Mensagem…" placeholderTextColor={brand.colors.muted} maxLength={2000} multiline style={styles.input} />
          <Pressable disabled={sending || !text.trim()} onPress={() => void send()} style={[styles.send, (!text.trim() || sending) && styles.disabled]}>
            {sending ? <ActivityIndicator size="small" color={brand.colors.bgDeep} /> : <Text style={styles.sendText}>➤</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.colors.bg },
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: brand.colors.borderSoft, backgroundColor: brand.colors.surface },
  back: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  backText: { color: brand.colors.text, fontSize: 34, lineHeight: 36 },
  identity: { flex: 1, flexDirection: "row", alignItems: "center", gap: 9 },
  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: brand.colors.cyan },
  avatarFallback: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: brand.colors.cyan, backgroundColor: brand.colors.bgDeep },
  avatarText: { color: brand.colors.cyanSoft, fontWeight: "900" },
  copy: { flex: 1 },
  name: { color: brand.colors.text, fontSize: 14, fontWeight: "900" },
  online: { marginTop: 2, color: brand.colors.cyan, fontSize: 7, fontWeight: "900", letterSpacing: 0.7 },
  messages: { flexGrow: 1, gap: 7, padding: 13, paddingBottom: 18 },
  bubble: { maxWidth: "80%", overflow: "hidden", borderRadius: 17, padding: 9 },
  bubbleMine: { alignSelf: "flex-end", backgroundColor: brand.colors.gold },
  bubbleOther: { alignSelf: "flex-start", borderWidth: 1, borderColor: brand.colors.borderSoft, backgroundColor: brand.colors.surface },
  messageText: { color: brand.colors.text, fontSize: 13, lineHeight: 18 },
  messageTextMine: { color: brand.colors.bgDeep },
  messageTime: { alignSelf: "flex-end", marginTop: 4, color: brand.colors.muted, fontSize: 7 },
  messageTimeMine: { color: "rgba(1,20,35,.6)" },
  messageMedia: { width: 230, height: 230, borderRadius: 12, backgroundColor: "#000", marginBottom: 5 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: brand.colors.borderSoft, backgroundColor: brand.colors.surface },
  attach: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: brand.colors.border, backgroundColor: brand.colors.bgDeep },
  attachText: { color: brand.colors.cyan, fontSize: 25, lineHeight: 27 },
  input: { flex: 1, maxHeight: 110, minHeight: 42, borderWidth: 1, borderColor: brand.colors.border, borderRadius: 21, backgroundColor: brand.colors.bgDeep, color: brand.colors.text, paddingHorizontal: 13, paddingVertical: 9 },
  send: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: brand.colors.gold },
  sendText: { color: brand.colors.bgDeep, fontSize: 18, fontWeight: "900" },
  disabled: { opacity: 0.4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 9 },
  muted: { color: brand.colors.muted, textAlign: "center", lineHeight: 18 },
  empty: { alignItems: "center", margin: 20, marginTop: 70, borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.xl, backgroundColor: brand.colors.surface, padding: 25 },
  emptyIcon: { color: brand.colors.cyan, fontSize: 34 },
  emptyTitle: { marginTop: 8, marginBottom: 6, color: brand.colors.text, fontSize: 17, fontWeight: "900" },
  error: { marginHorizontal: 12, marginTop: 6, borderRadius: brand.radius.sm, backgroundColor: brand.colors.dangerBg, color: "#ffd5dd", padding: 9 },
});
