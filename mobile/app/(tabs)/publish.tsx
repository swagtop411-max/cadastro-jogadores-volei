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

import { BrandHeader } from "@/components/BrandHeader";
import { publishPost } from "@/services/mobileContent";
import { deleteUploadedMedia, uploadPublicationMedia, type UploadedMedia } from "@/services/mediaUpload";
import { resolveProfile } from "@/services/profileResolver";
import { brand } from "@/ui/brand";

type SelectedMedia = {
  uri: string;
  kind: "image" | "video";
  mimeType: string | null;
  fileSize: number | null;
  fileName: string | null;
  base64: string | null;
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
    if (kind === "image" && !asset.base64) {
      setError("Não foi possível preparar a imagem para envio. Selecione a foto novamente.");
      return;
    }
    setMedia({
      uri: asset.uri,
      kind,
      mimeType: asset.mimeType ?? null,
      fileSize: size,
      fileName: asset.fileName ?? null,
      base64: asset.base64 ?? null,
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
      base64: true,
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
      base64: true,
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
          base64: media.base64,
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
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <BrandHeader
          eyebrow="COMPARTILHE SUA HISTÓRIA"
          title="Publicar"
          subtitle="Mostre seus treinos, conquistas, campeonatos e momentos para toda a rede."
        />

        <View style={styles.authorCard}>
          <View style={styles.authorBadge}>
            <Text style={styles.authorBadgeText}>{name.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.authorCopy}>
            <Text style={styles.authorName}>{name}</Text>
            <Text style={styles.authorMeta}>Publicação conectada à sua conta</Text>
          </View>
          <View style={styles.authorStatus}><Text style={styles.authorStatusText}>ATLETA</Text></View>
        </View>

        <View style={styles.composer}>
          <View style={styles.composerAccent} />
          <Text style={styles.label}>NO QUE VOCÊ ESTÁ PENSANDO?</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Compartilhe um treino, resultado, convite, campeonato ou momento do vôlei…"
            placeholderTextColor={brand.colors.muted}
            multiline
            maxLength={2200}
            textAlignVertical="top"
            style={styles.input}
          />
          <Text style={styles.counter}>{text.length}/2200</Text>

          {media ? (
            <View style={styles.previewCard}>
              {media.kind === "image" ? (
                <Image source={{ uri: media.uri }} style={styles.previewImage} resizeMode="cover" />
              ) : (
                <View style={styles.videoPreview}>
                  <View style={styles.playButton}><Text style={styles.videoIcon}>▶</Text></View>
                  <Text style={styles.videoTitle}>Vídeo selecionado</Text>
                </View>
              )}
              <View style={styles.previewFooter}>
                <View style={styles.previewCopy}>
                  <Text style={styles.previewTitle} numberOfLines={1}>{media.fileName || "Mídia selecionada"}</Text>
                  <Text style={styles.previewMeta}>{sizeLabel(media.fileSize)}</Text>
                </View>
                <Pressable disabled={sending} onPress={() => setMedia(null)} style={styles.removeButton}>
                  <Text style={styles.removeButtonText}>REMOVER</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={styles.mediaActions}>
            <Pressable disabled={sending} onPress={() => void openCamera()} style={({ pressed }) => [styles.mediaButton, pressed && styles.pressed]}>
              <Text style={styles.mediaIcon}>◉</Text>
              <View><Text style={styles.mediaButtonText}>CÂMERA</Text><Text style={styles.mediaButtonSub}>Registrar agora</Text></View>
            </Pressable>
            <Pressable disabled={sending} onPress={() => void openGallery()} style={({ pressed }) => [styles.mediaButton, pressed && styles.pressed]}>
              <Text style={styles.mediaIcon}>▣</Text>
              <View><Text style={styles.mediaButtonText}>GALERIA</Text><Text style={styles.mediaButtonSub}>Escolher arquivo</Text></View>
            </Pressable>
          </View>

          <View style={styles.infoStrip}>
            <Text style={styles.infoStripText}>FOTOS ATÉ 10 MB</Text>
            <View style={styles.infoDot} />
            <Text style={styles.infoStripText}>VÍDEOS ATÉ 45 MB</Text>
          </View>

          {message ? <Text style={styles.success}>{message}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            disabled={sending || !canPublish}
            onPress={() => void publish()}
            style={({ pressed }) => [styles.publishButton, (sending || !canPublish) && styles.publishButtonDisabled, pressed && styles.pressed]}
          >
            <Text style={styles.publishButtonText}>{sending ? "ENVIANDO E PUBLICANDO…" : "PUBLICAR NO FEED"}</Text>
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
  root: { flex: 1, backgroundColor: brand.colors.bg },
  page: { flexGrow: 1, padding: 16, paddingTop: 14, paddingBottom: 112 },
  authorCard: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.lg, backgroundColor: brand.colors.surface, padding: 14, ...brand.shadow },
  authorBadge: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: brand.colors.cyan, backgroundColor: brand.colors.surfaceSoft },
  authorBadgeText: { color: brand.colors.cyanSoft, fontSize: 20, fontWeight: "900" },
  authorCopy: { flex: 1 },
  authorName: { color: brand.colors.text, fontSize: 16, fontWeight: "900" },
  authorMeta: { marginTop: 3, color: brand.colors.muted, fontSize: 11 },
  authorStatus: { borderRadius: brand.radius.pill, borderWidth: 1, borderColor: brand.colors.gold, paddingHorizontal: 9, paddingVertical: 5 },
  authorStatusText: { color: brand.colors.gold, fontSize: 8, fontWeight: "900", letterSpacing: 0.7 },
  composer: { position: "relative", overflow: "hidden", marginTop: 12, borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.xl, backgroundColor: brand.colors.surface, padding: 15, ...brand.shadow },
  composerAccent: { position: "absolute", left: 0, right: 0, top: 0, height: 3, backgroundColor: brand.colors.cyan },
  label: { color: brand.colors.cyanSoft, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  input: { minHeight: 145, marginTop: 10, borderWidth: 1, borderColor: brand.colors.border, borderRadius: brand.radius.md, backgroundColor: brand.colors.bgDeep, color: brand.colors.text, padding: 14, fontSize: 16, lineHeight: 23 },
  counter: { alignSelf: "flex-end", marginTop: 7, color: brand.colors.muted, fontSize: 10 },
  previewCard: { marginTop: 12, overflow: "hidden", borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.md, backgroundColor: brand.colors.bgDeep },
  previewImage: { width: "100%", aspectRatio: 4 / 3, backgroundColor: brand.colors.bgDeep },
  videoPreview: { height: 170, alignItems: "center", justifyContent: "center", backgroundColor: brand.colors.bgDeep },
  playButton: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", backgroundColor: brand.colors.cyan },
  videoIcon: { marginLeft: 3, color: brand.colors.bgDeep, fontSize: 22, fontWeight: "900" },
  videoTitle: { marginTop: 8, color: brand.colors.text, fontWeight: "900" },
  previewFooter: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  previewCopy: { flex: 1 },
  previewTitle: { color: brand.colors.text, fontSize: 12, fontWeight: "800" },
  previewMeta: { marginTop: 2, color: brand.colors.muted, fontSize: 10 },
  removeButton: { borderRadius: 10, backgroundColor: brand.colors.dangerBg, paddingHorizontal: 10, paddingVertical: 8 },
  removeButtonText: { color: "#ffd5dd", fontSize: 9, fontWeight: "900" },
  mediaActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  mediaButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, borderWidth: 1, borderColor: brand.colors.border, borderRadius: brand.radius.md, backgroundColor: brand.colors.surfaceSoft, paddingVertical: 13, paddingHorizontal: 10 },
  mediaIcon: { color: brand.colors.cyan, fontSize: 19, fontWeight: "900" },
  mediaButtonText: { color: brand.colors.text, fontSize: 11, fontWeight: "900" },
  mediaButtonSub: { marginTop: 2, color: brand.colors.muted, fontSize: 8 },
  infoStrip: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12 },
  infoStripText: { color: brand.colors.muted, fontSize: 8, fontWeight: "800", letterSpacing: 0.7 },
  infoDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: brand.colors.gold },
  success: { marginTop: 14, borderRadius: brand.radius.sm, backgroundColor: "#123d33", color: "#bff7df", fontWeight: "800", padding: 11 },
  error: { marginTop: 14, borderRadius: brand.radius.sm, backgroundColor: brand.colors.dangerBg, color: "#ffd5dd", fontWeight: "800", padding: 11 },
  publishButton: { marginTop: 16, alignItems: "center", borderRadius: brand.radius.md, borderWidth: 1, borderColor: brand.colors.cyanSoft, backgroundColor: brand.colors.cyan, paddingVertical: 16, ...brand.shadow },
  publishButtonDisabled: { opacity: 0.4 },
  publishButtonText: { color: brand.colors.bgDeep, fontWeight: "900", fontSize: 14, letterSpacing: 0.4 },
  feedButton: { marginTop: 10, alignItems: "center", borderRadius: brand.radius.md, borderWidth: 1, borderColor: brand.colors.gold, paddingVertical: 13 },
  feedButtonText: { color: brand.colors.gold, fontWeight: "900" },
  pressed: { opacity: 0.78 },
});
