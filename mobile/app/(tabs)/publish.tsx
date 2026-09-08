import { getAuth } from "@react-native-firebase/auth";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { deleteUploadedMedia, uploadPublicationMedia, type UploadedMedia } from "@/services/mediaUpload";
import { resolveProfile } from "@/services/profileResolver";
import { publishSocialContent } from "@/services/socialPublishService";
import { brand } from "@/ui/brand";

type SelectedMedia = {
  uri: string;
  kind: "image" | "video";
  mimeType: string | null;
  fileSize: number | null;
  fileName: string | null;
};

function sizeLabel(size: number | null) {
  if (!size) return "—";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export default function PublishScreen() {
  const router = useRouter();
  const user = getAuth().currentUser;
  const [name, setName] = useState("Atleta");
  const [text, setText] = useState("");
  const [media, setMedia] = useState<SelectedMedia[]>([]);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    resolveProfile(user.uid).then((result) => setName(result.resolved?.nome || user.displayName || "Atleta")).catch(() => setName(user.displayName || "Atleta"));
  }, [user]);

  function normalizeAssets(assets: ImagePicker.ImagePickerAsset[]) {
    if (assets.length > 10) return setError("O carrossel aceita no máximo 10 fotos.");
    const selected = assets.map((asset): SelectedMedia => ({
      uri: asset.uri,
      kind: asset.type === "video" ? "video" : "image",
      mimeType: asset.mimeType ?? null,
      fileSize: asset.fileSize ?? null,
      fileName: asset.fileName ?? null,
    }));
    if (selected.length > 1 && selected.some((item) => item.kind === "video")) return setError("Para carrossel, selecione apenas fotos. Vídeos devem ser publicados individualmente.");
    for (const item of selected) {
      const max = item.kind === "video" ? 45 * 1024 * 1024 : 10 * 1024 * 1024;
      if (item.fileSize && item.fileSize > max) return setError(`Um arquivo ultrapassa o limite de ${item.kind === "video" ? 45 : 10} MB.`);
      if (!item.uri) return setError("Uma das mídias não pôde ser localizada. Selecione novamente.");
    }
    setMedia(selected);
    setError(null);
    setMessage(null);
  }

  async function openGallery() {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return setError("Permita o acesso à galeria para escolher fotos ou vídeo.");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.9,
      allowsMultipleSelection: true,
      selectionLimit: 10,
      base64: false,
    });
    if (!result.canceled) normalizeAssets(result.assets);
  }

  async function openCamera() {
    setError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return setError("Permita o acesso à câmera para registrar uma foto ou vídeo.");
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images", "videos"], quality: 0.9, base64: false });
    if (!result.canceled && result.assets[0]) normalizeAssets([result.assets[0]]);
  }

  async function publish() {
    if (!user?.email) return setError("Entre novamente na sua conta para publicar.");
    if (!text.trim() && !media.length) return setError("Escreva algo ou selecione uma mídia.");
    setSending(true);
    setError(null);
    setMessage(null);
    const uploaded: UploadedMedia[] = [];
    try {
      for (let index = 0; index < media.length; index += 1) {
        setProgress(`Enviando mídia ${index + 1} de ${media.length}…`);
        const item = media[index]!;
        uploaded.push(await uploadPublicationMedia({
          uid: user.uid,
          uri: item.uri,
          kind: item.kind,
          mimeType: item.mimeType,
          fileSize: item.fileSize,
          fileName: item.fileName,
        }, "posts"));
      }
      setProgress("Publicando…");
      const result = await publishSocialContent({ uid: user.uid, email: user.email, name, body: text, media: uploaded });
      setText("");
      setMedia([]);
      setProgress("");
      setMessage(media.length > 1 ? "Carrossel publicado com sucesso." : "Publicação criada com sucesso.");
      setTimeout(() => router.push({ pathname: "/post/[id]", params: { id: result.id, kind: result.kind } }), 250);
    } catch (cause) {
      await Promise.all(uploaded.map((item) => deleteUploadedMedia(item.path, item.kind).catch(() => undefined)));
      setError(cause instanceof Error ? cause.message : "Não foi possível publicar.");
      setProgress("");
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <BrandHeader eyebrow="COMPARTILHE SUA HISTÓRIA" title="Publicar" subtitle="Foto, carrossel, vídeo ou Story. Mostre sua trajetória esportiva para a rede." />

        <View style={styles.modeRow}>
          <View style={[styles.modeCard, styles.modeActive]}><Text style={styles.modeIcon}>▣</Text><View><Text style={styles.modeTitle}>FEED</Text><Text style={styles.modeText}>até 10 fotos ou 1 vídeo</Text></View></View>
          <Pressable onPress={() => router.push("/stories/create")} style={({ pressed }) => [styles.modeCard, pressed && styles.pressed]}><Text style={styles.storyIcon}>◉</Text><View><Text style={styles.modeTitle}>STORY</Text><Text style={styles.modeText}>desaparece em 24h</Text></View></Pressable>
        </View>

        <View style={styles.authorCard}>
          <View style={styles.authorBadge}><Text style={styles.authorBadgeText}>{name.slice(0, 1).toUpperCase()}</Text></View>
          <View style={styles.authorCopy}><Text style={styles.authorName}>{name}</Text><Text style={styles.authorMeta}>Publicação vinculada ao seu perfil esportivo</Text></View>
          <View style={styles.authorStatus}><Text style={styles.authorStatusText}>ATLETA</Text></View>
        </View>

        <View style={styles.composer}>
          <View style={styles.composerAccent} />
          <Text style={styles.label}>LEGENDA</Text>
          <TextInput value={text} onChangeText={setText} placeholder="Treino, resultado, convite… use #hashtags e @menções" placeholderTextColor={brand.colors.muted} multiline maxLength={2200} textAlignVertical="top" style={styles.input} />
          <Text style={styles.counter}>{text.length}/2200</Text>

          {media.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewRow}>
              {media.map((item, index) => (
                <View key={`${item.uri}-${index}`} style={styles.previewCard}>
                  {item.kind === "image" ? <Image source={{ uri: item.uri }} style={styles.previewImage} resizeMode="cover" /> : <View style={styles.videoPreview}><Text style={styles.videoIcon}>▶</Text><Text style={styles.videoTitle}>VÍDEO</Text></View>}
                  <View style={styles.orderBadge}><Text style={styles.orderText}>{index + 1}</Text></View>
                  <Pressable disabled={sending} onPress={() => setMedia((current) => current.filter((_, position) => position !== index))} style={styles.remove}><Text style={styles.removeText}>×</Text></Pressable>
                  <Text style={styles.size}>{sizeLabel(item.fileSize)}</Text>
                </View>
              ))}
            </ScrollView>
          ) : null}

          <View style={styles.mediaActions}>
            <Pressable disabled={sending} onPress={() => void openCamera()} style={({ pressed }) => [styles.mediaButton, pressed && styles.pressed]}><Text style={styles.mediaIcon}>◉</Text><View><Text style={styles.mediaButtonText}>CÂMERA</Text><Text style={styles.mediaButtonSub}>foto ou vídeo</Text></View></Pressable>
            <Pressable disabled={sending} onPress={() => void openGallery()} style={({ pressed }) => [styles.mediaButton, pressed && styles.pressed]}><Text style={styles.mediaIcon}>▣</Text><View><Text style={styles.mediaButtonText}>GALERIA</Text><Text style={styles.mediaButtonSub}>até 10 fotos</Text></View></Pressable>
          </View>

          <View style={styles.infoStrip}><Text style={styles.infoText}># HASHTAGS</Text><View style={styles.dot} /><Text style={styles.infoText}>@ MENÇÕES</Text><View style={styles.dot} /><Text style={styles.infoText}>CARROSSEL</Text></View>
          {progress ? <View style={styles.progress}><ActivityIndicator size="small" color={brand.colors.cyan} /><Text style={styles.progressText}>{progress}</Text></View> : null}
          {message ? <Text style={styles.success}>{message}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable disabled={sending || (!text.trim() && !media.length)} onPress={() => void publish()} style={({ pressed }) => [styles.publishButton, (sending || (!text.trim() && !media.length)) && styles.disabled, pressed && styles.pressed]}><Text style={styles.publishText}>{sending ? "PUBLICANDO…" : media.length > 1 ? `PUBLICAR CARROSSEL (${media.length})` : "PUBLICAR NO FEED"}</Text></Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: brand.colors.bg },
  page: { flexGrow: 1, padding: 16, paddingTop: 14, paddingBottom: 112 },
  modeRow: { flexDirection: "row", gap: 9, marginBottom: 10 },
  modeCard: { flex: 1, flexDirection: "row", alignItems: "center", gap: 9, minHeight: 62, borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.md, backgroundColor: brand.colors.surface, padding: 11 },
  modeActive: { borderColor: brand.colors.cyan, backgroundColor: "#092b40" },
  modeIcon: { color: brand.colors.cyan, fontSize: 21 },
  storyIcon: { color: brand.colors.gold, fontSize: 22 },
  modeTitle: { color: brand.colors.text, fontSize: 11, fontWeight: "900" },
  modeText: { marginTop: 2, color: brand.colors.muted, fontSize: 8 },
  authorCard: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.lg, backgroundColor: brand.colors.surface, padding: 14, ...brand.shadow },
  authorBadge: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: brand.colors.cyan, backgroundColor: brand.colors.surfaceSoft },
  authorBadgeText: { color: brand.colors.cyanSoft, fontSize: 20, fontWeight: "900" },
  authorCopy: { flex: 1 },
  authorName: { color: brand.colors.text, fontSize: 16, fontWeight: "900" },
  authorMeta: { marginTop: 3, color: brand.colors.muted, fontSize: 10 },
  authorStatus: { borderRadius: brand.radius.pill, borderWidth: 1, borderColor: brand.colors.gold, paddingHorizontal: 9, paddingVertical: 5 },
  authorStatusText: { color: brand.colors.gold, fontSize: 8, fontWeight: "900" },
  composer: { position: "relative", overflow: "hidden", marginTop: 12, borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.xl, backgroundColor: brand.colors.surface, padding: 15, ...brand.shadow },
  composerAccent: { position: "absolute", left: 0, right: 0, top: 0, height: 3, backgroundColor: brand.colors.cyan },
  label: { color: brand.colors.cyanSoft, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  input: { minHeight: 130, marginTop: 10, borderWidth: 1, borderColor: brand.colors.border, borderRadius: brand.radius.md, backgroundColor: brand.colors.bgDeep, color: brand.colors.text, padding: 14, fontSize: 15, lineHeight: 22 },
  counter: { alignSelf: "flex-end", marginTop: 6, color: brand.colors.muted, fontSize: 9 },
  previewRow: { gap: 9, paddingTop: 12, paddingBottom: 3 },
  previewCard: { position: "relative", width: 126, overflow: "hidden", borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: 14, backgroundColor: brand.colors.bgDeep },
  previewImage: { width: 124, height: 154, backgroundColor: brand.colors.bgDeep },
  videoPreview: { width: 124, height: 154, alignItems: "center", justifyContent: "center", backgroundColor: "#000" },
  videoIcon: { color: brand.colors.cyan, fontSize: 30 },
  videoTitle: { marginTop: 5, color: brand.colors.text, fontSize: 9, fontWeight: "900" },
  orderBadge: { position: "absolute", left: 6, top: 6, width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,.72)" },
  orderText: { color: "#fff", fontSize: 9, fontWeight: "900" },
  remove: { position: "absolute", right: 6, top: 6, width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(159,31,47,.9)" },
  removeText: { color: "#fff", fontSize: 17, lineHeight: 19 },
  size: { color: brand.colors.muted, fontSize: 8, padding: 6, textAlign: "center" },
  mediaActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  mediaButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, borderWidth: 1, borderColor: brand.colors.border, borderRadius: brand.radius.md, backgroundColor: brand.colors.surfaceSoft, paddingVertical: 13, paddingHorizontal: 9 },
  mediaIcon: { color: brand.colors.cyan, fontSize: 19, fontWeight: "900" },
  mediaButtonText: { color: brand.colors.text, fontSize: 10, fontWeight: "900" },
  mediaButtonSub: { marginTop: 2, color: brand.colors.muted, fontSize: 8 },
  infoStrip: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 12 },
  infoText: { color: brand.colors.muted, fontSize: 8, fontWeight: "800" },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: brand.colors.gold },
  progress: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12 },
  progressText: { color: brand.colors.cyanSoft, fontSize: 10, fontWeight: "700" },
  success: { marginTop: 12, borderRadius: brand.radius.sm, backgroundColor: "#123d33", color: "#bff7df", fontWeight: "800", padding: 11 },
  error: { marginTop: 12, borderRadius: brand.radius.sm, backgroundColor: brand.colors.dangerBg, color: "#ffd5dd", fontWeight: "800", padding: 11 },
  publishButton: { marginTop: 15, alignItems: "center", borderRadius: brand.radius.md, backgroundColor: brand.colors.gold, paddingVertical: 16, ...brand.shadow },
  publishText: { color: brand.colors.bgDeep, fontWeight: "900", fontSize: 13, letterSpacing: 0.4 },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.76 },
});
