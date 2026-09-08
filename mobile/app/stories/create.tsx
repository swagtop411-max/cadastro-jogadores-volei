import { getAuth } from "@react-native-firebase/auth";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
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

import { deleteUploadedMedia, uploadPublicationMedia, type UploadedMedia } from "@/services/mediaUpload";
import { publishStory } from "@/services/storyService";
import { brand } from "@/ui/brand";

type Selected = {
  uri: string;
  kind: "image" | "video";
  mimeType: string | null;
  fileSize: number | null;
  fileName: string | null;
};

export default function CreateStoryScreen() {
  const router = useRouter();
  const user = getAuth().currentUser;
  const [media, setMedia] = useState<Selected | null>(null);
  const [caption, setCaption] = useState("");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);

  function useAsset(asset: ImagePicker.ImagePickerAsset) {
    const kind = asset.type === "video" ? "video" : "image";
    const max = kind === "video" ? 45 * 1024 * 1024 : 10 * 1024 * 1024;
    if (asset.fileSize && asset.fileSize > max) {
      setError(`O ${kind === "video" ? "vídeo" : "arquivo"} ultrapassa ${kind === "video" ? 45 : 10} MB.`);
      return;
    }
    if (!asset.uri) {
      setError("Não foi possível localizar esta mídia. Selecione novamente.");
      return;
    }
    setMedia({
      uri: asset.uri,
      kind,
      mimeType: asset.mimeType ?? null,
      fileSize: asset.fileSize ?? null,
      fileName: asset.fileName ?? null,
    });
    setError(null);
  }

  async function gallery() {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return setError("Permita acesso à galeria para publicar um Story.");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.9,
      allowsMultipleSelection: false,
      base64: false,
    });
    if (!result.canceled && result.assets[0]) useAsset(result.assets[0]);
  }

  async function camera() {
    setError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return setError("Permita acesso à câmera para publicar um Story.");
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.9,
      base64: false,
    });
    if (!result.canceled && result.assets[0]) useAsset(result.assets[0]);
  }

  async function submit() {
    if (!user) return setError("Entre na sua conta para publicar.");
    if (!media) return setError("Selecione uma foto ou vídeo.");
    setSending(true);
    setError(null);
    setProgress("Enviando mídia…");
    let uploaded: UploadedMedia | null = null;
    try {
      uploaded = await uploadPublicationMedia({
        uid: user.uid,
        uri: media.uri,
        kind: media.kind,
        mimeType: media.mimeType,
        fileSize: media.fileSize,
        fileName: media.fileName,
      }, "stories");
      setProgress("Publicando Story…");
      await publishStory({ uid: user.uid, caption, media: uploaded });
      setProgress("");
      router.replace("/");
    } catch (cause) {
      if (uploaded) await deleteUploadedMedia(uploaded.path, uploaded.kind).catch(() => undefined);
      setError(cause instanceof Error ? cause.message : "Não foi possível publicar o Story.");
      setProgress("");
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <Pressable disabled={sending} onPress={() => router.back()} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable>
          <View style={styles.topCopy}>
            <Text style={styles.eyebrow}>STORY • 24 HORAS</Text>
            <Text style={styles.title}>Novo Story</Text>
          </View>
          <View style={styles.timePill}><Text style={styles.timePillText}>24H</Text></View>
        </View>

        <View style={styles.preview}>
          {!media ? (
            <View style={styles.emptyPreview}>
              <Text style={styles.emptyIcon}>◉</Text>
              <Text style={styles.emptyTitle}>Mostre o momento</Text>
              <Text style={styles.emptyText}>Seu Story sai automaticamente da área ativa depois de 24 horas.</Text>
            </View>
          ) : media.kind === "image" ? (
            <Image source={{ uri: media.uri }} style={styles.previewImage} resizeMode="contain" />
          ) : (
            <View style={styles.videoPreview}>
              <Text style={styles.videoIcon}>▶</Text>
              <Text style={styles.videoText}>Vídeo selecionado</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <Pressable disabled={sending} onPress={() => void camera()} style={({ pressed }) => [styles.mediaButton, pressed && styles.pressed]}>
            <Text style={styles.mediaIcon}>◉</Text><Text style={styles.mediaText}>CÂMERA</Text>
          </Pressable>
          <Pressable disabled={sending} onPress={() => void gallery()} style={({ pressed }) => [styles.mediaButton, pressed && styles.pressed]}>
            <Text style={styles.mediaIcon}>▣</Text><Text style={styles.mediaText}>GALERIA</Text>
          </Pressable>
        </View>

        <TextInput
          value={caption}
          onChangeText={setCaption}
          placeholder="Adicione uma legenda…"
          placeholderTextColor={brand.colors.muted}
          maxLength={2200}
          multiline
          editable={!sending}
          style={styles.caption}
        />
        <Text style={styles.counter}>{caption.length}/2200</Text>

        {progress ? <View style={styles.progress}><ActivityIndicator size="small" color={brand.colors.cyan} /><Text style={styles.progressText}>{progress}</Text></View> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          disabled={!media || sending}
          onPress={() => void submit()}
          style={({ pressed }) => [styles.publish, (!media || sending) && styles.disabled, pressed && styles.pressed]}
        >
          {sending ? <ActivityIndicator color={brand.colors.bgDeep} /> : <Text style={styles.publishText}>PUBLICAR STORY POR 24H</Text>}
        </Pressable>
        <Text style={styles.note}>O Story fica ativo por 24 horas. Em caso de falha após o envio da mídia, o arquivo enviado é limpo automaticamente para não deixar mídia órfã.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.colors.bgDeep },
  page: { flexGrow: 1, padding: 14, paddingBottom: 30 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 13 },
  closeButton: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: brand.colors.surface },
  closeText: { color: brand.colors.text, fontSize: 27, lineHeight: 29 },
  topCopy: { flex: 1 },
  eyebrow: { color: brand.colors.cyan, fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  title: { marginTop: 2, color: brand.colors.text, fontSize: 25, fontWeight: "900" },
  timePill: { borderRadius: brand.radius.pill, backgroundColor: "#3c2c0d", paddingHorizontal: 11, paddingVertical: 7 },
  timePillText: { color: brand.colors.gold, fontSize: 10, fontWeight: "900" },
  preview: { overflow: "hidden", aspectRatio: 9 / 16, maxHeight: 580, borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.xl, backgroundColor: "#000" },
  emptyPreview: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, backgroundColor: brand.colors.surface },
  emptyIcon: { color: brand.colors.cyan, fontSize: 52 },
  emptyTitle: { marginTop: 10, color: brand.colors.text, fontSize: 22, fontWeight: "900" },
  emptyText: { marginTop: 7, color: brand.colors.muted, lineHeight: 20, textAlign: "center" },
  previewImage: { width: "100%", height: "100%", backgroundColor: "#000" },
  videoPreview: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000" },
  videoIcon: { color: brand.colors.cyan, fontSize: 55 },
  videoText: { marginTop: 8, color: brand.colors.text, fontWeight: "900" },
  actions: { flexDirection: "row", gap: 9, marginTop: 12 },
  mediaButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 48, borderWidth: 1, borderColor: brand.colors.border, borderRadius: brand.radius.md, backgroundColor: brand.colors.surface },
  mediaIcon: { color: brand.colors.cyan, fontSize: 18 },
  mediaText: { color: brand.colors.text, fontSize: 10, fontWeight: "900" },
  caption: { minHeight: 84, marginTop: 12, borderWidth: 1, borderColor: brand.colors.border, borderRadius: brand.radius.md, backgroundColor: brand.colors.surface, color: brand.colors.text, padding: 13, textAlignVertical: "top" },
  counter: { alignSelf: "flex-end", marginTop: 5, color: brand.colors.muted, fontSize: 9 },
  progress: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10 },
  progressText: { color: brand.colors.cyanSoft, fontSize: 10, fontWeight: "800" },
  error: { marginTop: 10, borderRadius: brand.radius.sm, backgroundColor: brand.colors.dangerBg, color: "#ffd5dd", padding: 11, fontWeight: "700" },
  publish: { minHeight: 52, marginTop: 13, alignItems: "center", justifyContent: "center", borderRadius: brand.radius.md, backgroundColor: brand.colors.gold },
  publishText: { color: brand.colors.bgDeep, fontWeight: "900", letterSpacing: 0.5 },
  disabled: { opacity: 0.42 },
  note: { marginTop: 10, color: brand.colors.muted, fontSize: 9, lineHeight: 14, textAlign: "center" },
  pressed: { opacity: 0.75 },
});
