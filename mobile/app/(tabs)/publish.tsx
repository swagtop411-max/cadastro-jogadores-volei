import { getAuth } from "@react-native-firebase/auth";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { resolveProfile } from "@/services/profileResolver";
import { publishTextPost } from "@/services/mobileContent";

export default function PublishScreen() {
  const router = useRouter();
  const user = getAuth().currentUser;
  const [name, setName] = useState("Atleta");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    resolveProfile(user.uid)
      .then((result) => setName(result.resolved?.nome || user.displayName || "Atleta"))
      .catch(() => setName(user.displayName || "Atleta"));
  }, [user]);

  async function publish() {
    if (!user?.email) {
      setError("Sua sessão não possui um e-mail válido.");
      return;
    }

    setSending(true);
    setError(null);
    setMessage(null);
    try {
      await publishTextPost({ uid: user.uid, email: user.email, nome: name, text });
      setText("");
      setMessage("Publicação criada com sucesso no mesmo feed do site.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível publicar.");
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>CONTEÚDO</Text>
        <Text style={styles.title}>Criar publicação</Text>
        <Text style={styles.subtitle}>
          Publique agora no mesmo feed do cadastrodeatletas.com.br.
        </Text>

        <View style={styles.authorCard}>
          <View style={styles.authorBadge}>
            <Text style={styles.authorBadgeText}>{name.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.authorCopy}>
            <Text style={styles.authorName}>{name}</Text>
            <Text style={styles.authorMeta}>Publicação vinculada à sua conta Firebase</Text>
          </View>
        </View>

        <View style={styles.composer}>
          <Text style={styles.label}>O que você quer compartilhar?</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Conte um treino, resultado, convite, campeonato ou momento do vôlei…"
            placeholderTextColor="#718695"
            multiline
            maxLength={2200}
            textAlignVertical="top"
            style={styles.input}
          />
          <Text style={styles.counter}>{text.length}/2200</Text>

          <View style={styles.mediaNotice}>
            <Text style={styles.mediaNoticeTitle}>Fotos e vídeos</Text>
            <Text style={styles.mediaNoticeText}>
              O envio de mídia será liberado quando o upload assinado estiver ativo. Isso evita colocar um fluxo inseguro dentro do app.
            </Text>
          </View>

          {message ? <Text style={styles.success}>{message}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            disabled={sending || !text.trim()}
            onPress={() => void publish()}
            style={({ pressed }) => [
              styles.publishButton,
              (sending || !text.trim()) && styles.publishButtonDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.publishButtonText}>{sending ? "PUBLICANDO…" : "PUBLICAR NO FEED"}</Text>
          </Pressable>

          {message ? (
            <Pressable onPress={() => router.replace("/")} style={styles.feedButton}>
              <Text style={styles.feedButtonText}>VER NO FEED</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#071827" },
  page: { flexGrow: 1, padding: 18, paddingBottom: 120 },
  eyebrow: { color: "#d9a93f", fontSize: 12, fontWeight: "900", letterSpacing: 1.1 },
  title: { marginTop: 4, color: "#ffffff", fontSize: 32, fontWeight: "900" },
  subtitle: { marginTop: 6, color: "#b8c7d9", lineHeight: 20 },
  authorCard: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 18, borderRadius: 18, backgroundColor: "#0d2235", padding: 14 },
  authorBadge: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "#17384d" },
  authorBadgeText: { color: "#7ddff0", fontSize: 19, fontWeight: "900" },
  authorCopy: { flex: 1 },
  authorName: { color: "#ffffff", fontSize: 16, fontWeight: "900" },
  authorMeta: { marginTop: 3, color: "#8fa0ac", fontSize: 11 },
  composer: { marginTop: 14, borderRadius: 22, backgroundColor: "#0d2235", padding: 16 },
  label: { color: "#7ddff0", fontSize: 12, fontWeight: "900", letterSpacing: 0.5 },
  input: { minHeight: 180, marginTop: 10, borderWidth: 1, borderColor: "#29445c", borderRadius: 16, backgroundColor: "#071827", color: "#ffffff", padding: 14, fontSize: 16, lineHeight: 23 },
  counter: { alignSelf: "flex-end", marginTop: 7, color: "#8fa0ac", fontSize: 11 },
  mediaNotice: { marginTop: 14, borderRadius: 14, backgroundColor: "#102c42", padding: 12 },
  mediaNoticeTitle: { color: "#ffffff", fontWeight: "900" },
  mediaNoticeText: { marginTop: 4, color: "#a8bac8", fontSize: 12, lineHeight: 18 },
  success: { marginTop: 14, color: "#73e2ae", fontWeight: "800" },
  error: { marginTop: 14, color: "#ff9b9b", fontWeight: "800" },
  publishButton: { marginTop: 16, alignItems: "center", borderRadius: 16, backgroundColor: "#48cae4", paddingVertical: 15 },
  publishButtonDisabled: { opacity: 0.4 },
  publishButtonText: { color: "#071827", fontWeight: "900", fontSize: 14 },
  feedButton: { marginTop: 10, alignItems: "center", borderRadius: 16, borderWidth: 1, borderColor: "#48cae4", paddingVertical: 13 },
  feedButtonText: { color: "#7ddff0", fontWeight: "900" },
  pressed: { opacity: 0.75 },
});
