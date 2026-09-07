import { getAuth } from "@react-native-firebase/auth";
import { useVideoPlayer, VideoView } from "expo-video";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  deleteStory,
  loadActiveStories,
  markStoryViewed,
  storyTimeRemaining,
  type MobileStory,
} from "@/services/storyService";
import { brand } from "@/ui/brand";

function VideoStory({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
    instance.play();
  });
  useEffect(() => {
    player.play();
    return () => player.pause();
  }, [player]);
  return <VideoView player={player} style={styles.media} contentFit="contain" nativeControls={false} />;
}

export default function StoryViewerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ ownerUid?: string }>();
  const ownerUid = String(params.ownerUid || "");
  const currentUid = getAuth().currentUser?.uid || "";
  const [stories, setStories] = useState<MobileStory[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadActiveStories()
      .then((all) => {
        if (!active) return;
        const ownerStories = all.filter((item) => item.ownerUid === ownerUid);
        setStories(ownerStories);
        const firstUnseen = ownerStories.findIndex((item) => !item.viewed);
        setIndex(firstUnseen >= 0 ? firstUnseen : 0);
      })
      .catch((cause) => active && setError(cause instanceof Error ? cause.message : "Não foi possível abrir os Stories."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [ownerUid]);

  const story = stories[index];
  const ownerName = story?.ownerName || "Story";

  useEffect(() => {
    if (!story) return;
    void markStoryViewed(story.id).catch(() => undefined);
    const timer = setTimeout(() => {
      if (index < stories.length - 1) setIndex((value) => value + 1);
      else router.back();
    }, story.mediaType === "video" ? 15_000 : 6_000);
    return () => clearTimeout(timer);
  }, [index, router, stories.length, story]);

  const initials = useMemo(() => ownerName.slice(0, 1).toUpperCase(), [ownerName]);

  async function share() {
    if (!story) return;
    await Share.share({ message: [story.caption, story.mediaUrl, `Story de ${story.ownerName} no Banco de Atletas`].filter(Boolean).join("\n\n") });
  }

  function previous() {
    if (index > 0) setIndex((value) => value - 1);
    else router.back();
  }

  function next() {
    if (index < stories.length - 1) setIndex((value) => value + 1);
    else router.back();
  }

  async function remove() {
    if (!story) return;
    try {
      await deleteStory(story.id);
      const nextStories = stories.filter((entry) => entry.id !== story.id);
      setStories(nextStories);
      if (!nextStories.length) router.back();
      else setIndex((value) => Math.min(value, nextStories.length - 1));
    } catch (cause) {
      Alert.alert("Story", cause instanceof Error ? cause.message : "Não foi possível excluir o Story.");
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={brand.colors.cyan} /><Text style={styles.muted}>Abrindo Story…</Text></View>;
  }
  if (!story || error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Story indisponível</Text>
        <Text style={styles.muted}>{error || "Este Story expirou ou não está mais disponível."}</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.backButtonText}>VOLTAR</Text></Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.mediaWrap}>
        {story.mediaType === "video" ? <VideoStory key={story.id} uri={story.mediaUrl} /> : <Image source={{ uri: story.mediaUrl }} style={styles.media} resizeMode="contain" />}
      </View>
      <SafeAreaView style={StyleSheet.absoluteFill} edges={["top", "bottom"]} pointerEvents="box-none">
        <View style={styles.progressRow}>
          {stories.map((entry, position) => (
            <View key={entry.id} style={styles.progressTrack}><View style={[styles.progressFill, position <= index && styles.progressDone]} /></View>
          ))}
        </View>
        <View style={styles.header}>
          {story.ownerPhoto ? <Image source={{ uri: story.ownerPhoto }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.avatarText}>{initials}</Text></View>}
          <Pressable style={styles.ownerCopy} onPress={() => router.push({ pathname: "/athlete/[uid]", params: { uid: story.ownerUid } })}>
            <Text style={styles.ownerName}>{story.ownerName}</Text>
            <Text style={styles.remaining}>expira em {storyTimeRemaining(story.expiresAt)}</Text>
          </Pressable>
          <Pressable onPress={() => void share()} hitSlop={10}><Text style={styles.headerAction}>↗</Text></Pressable>
          {story.ownerUid === currentUid ? <Pressable onPress={() => Alert.alert("Excluir Story", "Deseja remover este Story agora?", [{ text: "Cancelar", style: "cancel" }, { text: "Excluir", style: "destructive", onPress: () => void remove() }])} hitSlop={10}><Text style={styles.delete}>⌫</Text></Pressable> : null}
          <Pressable onPress={() => router.back()} hitSlop={10}><Text style={styles.close}>×</Text></Pressable>
        </View>
        <View style={styles.navRow} pointerEvents="box-none">
          <Pressable onPress={previous} style={styles.navSide} accessibilityLabel="Story anterior" />
          <Pressable onPress={next} style={styles.navSide} accessibilityLabel="Próximo Story" />
        </View>
        {story.caption ? <View style={styles.captionWrap} pointerEvents="none"><Text style={styles.caption}>{story.caption}</Text></View> : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000" },
  mediaWrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000" },
  media: { width: "100%", height: "100%", backgroundColor: "#000" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24, backgroundColor: brand.colors.bgDeep },
  muted: { color: brand.colors.muted, textAlign: "center" },
  errorTitle: { color: brand.colors.text, fontSize: 22, fontWeight: "900" },
  backButton: { marginTop: 8, borderRadius: brand.radius.md, backgroundColor: brand.colors.cyan, paddingHorizontal: 22, paddingVertical: 12 },
  backButtonText: { color: brand.colors.bgDeep, fontWeight: "900" },
  progressRow: { flexDirection: "row", gap: 3, paddingHorizontal: 9, paddingTop: 5 },
  progressTrack: { flex: 1, height: 2, overflow: "hidden", borderRadius: 2, backgroundColor: "rgba(255,255,255,.3)" },
  progressFill: { width: 0, height: "100%", backgroundColor: "#fff" },
  progressDone: { width: "100%" },
  header: { flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 12, paddingTop: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: brand.colors.cyan },
  avatarFallback: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: brand.colors.cyan, backgroundColor: brand.colors.surface },
  avatarText: { color: brand.colors.cyanSoft, fontWeight: "900" },
  ownerCopy: { flex: 1 },
  ownerName: { color: "#fff", fontSize: 13, fontWeight: "900", textShadowColor: "#000", textShadowRadius: 5 },
  remaining: { marginTop: 2, color: "rgba(255,255,255,.75)", fontSize: 9 },
  headerAction: { color: "#fff", fontSize: 21, fontWeight: "900" },
  delete: { color: "#ff9ba8", fontSize: 20 },
  close: { color: "#fff", fontSize: 27, lineHeight: 29 },
  navRow: { position: "absolute", left: 0, right: 0, top: 80, bottom: 0, flexDirection: "row" },
  navSide: { flex: 1 },
  captionWrap: { position: "absolute", left: 24, right: 24, bottom: 45, alignItems: "center" },
  caption: { maxWidth: 500, borderRadius: 14, backgroundColor: "rgba(0,0,0,.5)", color: "#fff", fontSize: 14, lineHeight: 20, textAlign: "center", paddingHorizontal: 13, paddingVertical: 9 },
});
