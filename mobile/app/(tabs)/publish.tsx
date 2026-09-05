import { getAuth } from "@react-native-firebase/auth";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { publishPost } from "@/services/mobileContent";
import {
  deleteUploadedMedia,
  uploadPublicationMedia,
  type UploadedMedia,
} from "@/services/mediaUpload";
import { resolveProfile } from "@/services/profileResolver";

type SelectedMedia = {
  uri: string;
  kind: "image" | "video";
  mimeType: string | null;
  fileSize: number | null;
  fileName: string | null;
};

function sizeLabel(size: number | null): string {
  if (!size) return "Tamanho não informado";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export default function PublishScreen() {
  const router = useRouter();
  const user = getAuth().currentUser;
  const [name, setName] = useState("Atleta");
  const [text, setText] = useState("");
  const [media, setMedia] = useState<SelectedMedia | null>(null);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    resolveProfile(user.uid)
      .then((result) => setName(result.resolved?.nome || user.displayName || "Atleta"))
      .catch(() => setName(user.displayName || "Atleta"));
  }, [user]);

  function useAsset(asset: ImagePicker.ImagePickerAsset) {
    const kind = asset.type === "video" ? "video" : "image";
    const size = asset.fileSize ?? null;
    const max = kind === "video" ? 45 * 1024 * 1024 : 10 * 1024 * 1024;
    if (size && size > max) {
      setError(`O ${kind === "video" ? "vídeo" : "arquivo"} ultrapassa o limite de ${kind === "video" ? 45 : 10} MB.`);
      return;
    }
    setMedia({
      uri: asset.uri,
      kind,
      mimeType: asset.mimeType ?? null,
      fileSize: size,
      fileName: asset.fileName ?? null,
    });
    setError(null);
    setMessage(null);
  }

  async function openGallery() {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Permita o acesso à galeria para escolher uma foto ou vídeo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.9,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]) useAsset(result.assets[0]);
  }

  async function openCamera() {
    setError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Permita o acesso à câmera para registrar uma foto ou vídeo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) useAsset(result.assets[0]);
  }

  async function publish() {
    if (!user?.email) {
      setError("Sua sessão não possui um e-mail válido.");
      return;
    }

    setSending(true);
    setError(null);
    setMessage(null);
    let uploaded: UploadedMedia | null = null;
    try {
      if (media) {
        uploaded = await uploadPublicationMedia({
          uid: user.uid,
          uri: media.uri,
          kind: media.kind,
          mimeType: media.mimeType,
          fileSize: media.fileSize,
          fileName: media.fileName,
        });
      }
      await publishPost({
        uid: user.uid,
        email: user.email,
        nome: name,
        text,
        media: uploaded,
      });
      setText("");
      setMedia(null);
      setMessage("Publicação criada com sucesso no mesmo feed do site.");
    } catch (cause) {
      if (uploaded?.path) await deleteUploadedMedia(uploaded.path).catch(() => undefined);
      setError(cause instanceof Error ? cause.message : "Não foi possível publicar.");
    } finally {
      setSending(false);
    }
  }

  const canPublish = Boolean(text.trim() || media);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>CONTEÚDO</Text>
        <Text style={styles.title}>Criar publicação</Text>
        <Text style={styles.subtitle}>Publique texto, foto ou vídeo no mesmo feed do site.</Text>

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

          <View style={styles.mediaActions}>
            <Pressable disabled={sending} onPress={() => void openCamera()} style={styles.mediaButton}>
              <Text style={styles.mediaIcon}>📷</Text>
              <Text style={styles.mediaButtonText}>CÂMERA</Text>
            </Pressable>
            <Pressable disabled={sending} onPress={() => void openGallery()} style={styles.mediaButton}>
              <Text style={styles.mediaIcon}>🖼️</Text>
              <Text style={styles.mediaButtonText}>GALERIA</Text>
            </Pressable>
          </View>

          {media ? (
            <View style={styles.previewCard}>
              {media.kind === "image" ? (
                <Image source={{ uri: media.uri }} style={styles.previewImage} resizeMode="cover" />
              ) : (
                <View style={styles.videoPreview}>
                  <Text style={styles.videoIcon}>▶</Text>
                  <Text style={styles.videoTitle}>Vídeo selecionado</Text>
                </View>
              )}
              <View style={styles.previewFooter}>
                <View style={styles.previewCopy}>
                  <Text style={styles.previewTitle} numberOfLines={1}>
                    {media.fileName || (media.kind === "image" ? "Foto selecionada" : "Vídeo selecionado")}
                  </Text>
                  <Text style={styles.previewMeta}>{sizeLabel(media.fileSize)}</Text>
                </View>
                <Pressable disabled={sending} onPress={() => setMedia(null)} style={styles.removeButton}>
                  <Text style={styles.removeButtonText}>REMOVER</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {message ? <Text style={styles.success}>{message}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            disabled={sending || !canPublish}
            onPress={() => void publish()}
            style={({ pressed }) => [
              styles.publishButton,
              (sending || !canPublish) && styles.publishButtonDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.publishButtonText}>
              {sending ? "ENVIANDO E PUBLICANDO…" : "PUBLICAR NO FEED"}
            </Text>
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
  authorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 18,
    borderRadius: 18,
    backgroundColor: "#0d2235",
    padding: 14,
  },
  authorBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#17384d",
  },
  authorBadgeText: { color: "#7ddff0", fontSize: 19, fontWeight: "900" },
  authorCopy: { flex: 1 },
  authorName: { color: "#ffffff", fontSize: 16, fontWeight: "900" },
  authorMeta: { marginTop: 3, color: "#8fa0ac", fontSize: 11 },
  composer: { marginTop: 14, borderRadius: 22, backgroundColor: "#0d2235", padding: 16 },
  label: { color: "#7ddff0", fontSize: 12, fontWeight: "900", letterSpacing: 0.5 },
  input: {
    minHeight: 160,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#29445c",
    borderRadius: 16,
    backgroundColor: "#071827",
    color: "#ffffff",
    padding: 14,
    fontSize: 16,
    lineHeight: 23,
  },
  counter: { alignSelf: "flex-end", marginTop: 7, color: "#8fa0ac", fontSize: 11 },
  mediaActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  mediaButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: "#29445c",
    borderRadius: 14,
    backgroundColor: "#102c42",
    paddingVertical: 13,
  },
  mediaIcon: { fontSize: 17 },
  mediaButtonText: { color: "#ffffff", fontSize: 12, fontWeight: "900" },
  previewCard: { marginTop: 12, overflow: "hidden", borderRadius: 16, backgroundColor: "#071827" },
  previewImage: { width: "100%", aspectRatio: 4 / 3, backgroundColor: "#06121d" },
  videoPreview: { height: 170, alignItems: "center", justifyContent: "center", backgroundColor: "#06121d" },
  videoIcon: { color: "#48cae4", fontSize: 38, fontWeight: "900" },
  videoTitle: { marginTop: 8, color: "#ffffff", fontWeight: "900" },
  previewFooter: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  previewCopy: { flex: 1 },
  previewTitle: { color: "#ffffff", fontSize: 12, fontWeight: "800" },
  previewMeta: { marginTop: 2, color: "#8fa0ac", fontSize: 10 },
  removeButton: { borderRadius: 10, backgroundColor: "#3a1620", paddingHorizontal: 10, paddingVertical: 8 },
  removeButtonText: { color: "#ffd5dd", fontSize: 9, fontWeight: "900" },
  success: { marginTop: 14, color: "#73e2ae", fontWeight: "800" },
  error: { marginTop: 14, color: "#ff9b9b", fontWeight: "800" },
  publishButton: { marginTop: 16, alignItems: "center", borderRadius: 16, backgroundColor: "#48cae4", paddingVertical: 15 },
  publishButtonDisabled: { opacity: 0.4 },
  publishButtonText: { color: "#071827", fontWeight: "900", fontSize: 14 },
  feedButton: { marginTop: 10, alignItems: "center", borderRadius: 16, borderWidth: 1, borderColor: "#48cae4", paddingVertical: 13 },
  feedButtonText: { color: "#7ddff0", fontWeight: "900" },
  pressed: { opacity: 0.75 },
});
