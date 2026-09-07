import { useVideoPlayer, VideoView } from "expo-video";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { formatFirebaseDate } from "@/services/mobileContent";
import type { MobileFeedItemV2, MobileFeedMedia } from "@/services/feedService";
import { loadPostSocialState, toggleLike, toggleSaved, type SocialPostState } from "@/services/socialService";
import { brand } from "@/ui/brand";
import { FullScreenImageViewer } from "./FullScreenImageViewer";

const EMPTY: SocialPostState = { liked: false, saved: false, likeCount: 0, commentCount: 0 };

function VideoMedia({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri);
  return <VideoView player={player} style={styles.media} contentFit="cover" nativeControls />;
}

export function SocialPostCard({ item }: { item: MobileFeedItemV2 }) {
  const router = useRouter();
  const [social, setSocial] = useState<SocialPostState>(EMPTY);
  const [loadingSocial, setLoadingSocial] = useState(true);
  const [acting, setActing] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [viewer, setViewer] = useState<MobileFeedMedia | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoadingSocial(true);
    loadPostSocialState(item.id).then((next) => mounted && setSocial(next)).catch(() => undefined).finally(() => mounted && setLoadingSocial(false));
    return () => { mounted = false; };
  }, [item.id]);

  const openPost = () => router.push({ pathname: "/post/[id]", params: { id: item.id, kind: item.kind } });
  const openAthlete = () => item.ownerUid && router.push({ pathname: "/athlete/[uid]", params: { uid: item.ownerUid } });

  const handleLike = useCallback(async () => {
    if (acting) return;
    setActing(true);
    try {
      const liked = await toggleLike(item.id, social.liked);
      setSocial((previous) => ({ ...previous, liked, likeCount: Math.max(0, previous.likeCount + (liked ? 1 : -1)) }));
    } catch (cause) {
      Alert.alert("Curtida", cause instanceof Error ? cause.message : "Não foi possível curtir.");
    } finally { setActing(false); }
  }, [acting, item.id, social.liked]);

  const handleSave = useCallback(async () => {
    if (acting) return;
    setActing(true);
    try {
      const saved = await toggleSaved(item.id, item.kind, social.saved);
      setSocial((previous) => ({ ...previous, saved }));
    } catch (cause) {
      Alert.alert("Salvar", cause instanceof Error ? cause.message : "Não foi possível salvar.");
    } finally { setActing(false); }
  }, [acting, item.id, item.kind, social.saved]);

  const share = useCallback(async () => {
    await Share.share({ message: [item.text, item.media[mediaIndex]?.url || item.mediaUrl, `Publicado por ${item.authorName} no Banco de Atletas`].filter(Boolean).join("\n\n") });
  }, [item, mediaIndex]);

  const onCarouselScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const width = event.nativeEvent.layoutMeasurement.width || 1;
    setMediaIndex(Math.max(0, Math.min(item.media.length - 1, Math.round(event.nativeEvent.contentOffset.x / width))));
  };

  return (
    <View style={styles.card}>
      <View style={styles.accent} />
      <Pressable onPress={openAthlete} disabled={!item.ownerUid} style={({ pressed }) => [styles.authorRow, pressed && styles.pressed]}>
        {item.authorPhoto ? <Image source={{ uri: item.authorPhoto }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.avatarText}>{item.authorName.slice(0, 1).toUpperCase()}</Text></View>}
        <View style={styles.authorCopy}><Text style={styles.authorName}>{item.authorName}</Text><Text style={styles.date}>{formatFirebaseDate(item.createdAt)}</Text></View>
        <View style={styles.kindPill}><Text style={styles.kind}>{item.media.length > 1 ? `${item.media.length} FOTOS` : item.kind === "video" ? "VÍDEO" : "POST"}</Text></View>
      </Pressable>

      {item.text ? <Pressable onPress={openPost}><Text style={styles.postText}>{item.text}</Text></Pressable> : null}

      {item.media.length ? (
        <View style={styles.mediaWrap}>
          <ScrollView horizontal pagingEnabled nestedScrollEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onCarouselScroll}>
            {item.media.map((media, index) => (
              <View key={`${media.url}-${index}`} style={styles.mediaPage}>
                {media.kind === "video" ? <VideoMedia uri={media.url} /> : <Pressable onPress={() => setViewer(media)} style={styles.mediaPress}><Image source={{ uri: media.url }} style={styles.media} resizeMode="cover" /></Pressable>}
              </View>
            ))}
          </ScrollView>
          {item.media.length > 1 ? <View style={styles.counter}><Text style={styles.counterText}>{mediaIndex + 1}/{item.media.length}</Text></View> : null}
          {item.media.length > 1 ? <View style={styles.dots}>{item.media.map((_, index) => <View key={index} style={[styles.dot, index === mediaIndex && styles.dotActive]} />)}</View> : null}
        </View>
      ) : null}

      {item.hashtags.length ? <View style={styles.tags}>{item.hashtags.slice(0, 8).map((tag) => <Text key={tag} style={styles.tag}>#{tag}</Text>)}</View> : null}

      <View style={styles.socialRow}>
        <Pressable onPress={() => void handleLike()} style={styles.socialButton}><Text style={[styles.socialIcon, social.liked && styles.liked]}>{social.liked ? "♥" : "♡"}</Text><Text style={styles.socialCount}>{loadingSocial ? "…" : social.likeCount}</Text></Pressable>
        <Pressable onPress={openPost} style={styles.socialButton}><Text style={styles.socialIcon}>◌</Text><Text style={styles.socialCount}>{loadingSocial ? "…" : social.commentCount}</Text></Pressable>
        <Pressable onPress={() => void share()} style={styles.socialButton}><Text style={styles.socialIcon}>↗</Text><Text style={styles.socialLabel}>ENVIAR</Text></Pressable>
        <View style={styles.socialSpacer} />
        <Pressable onPress={() => void handleSave()} style={styles.socialButton}>{acting ? <ActivityIndicator size="small" color={brand.colors.cyan} /> : <Text style={[styles.socialIcon, social.saved && styles.saved]}>{social.saved ? "◆" : "◇"}</Text>}</Pressable>
      </View>

      <View style={styles.footerActions}>
        <Pressable disabled={!item.ownerUid} onPress={openAthlete} style={styles.profileButton}><Text style={styles.profileIcon}>◎</Text><Text style={styles.profileText}>VER ATLETA</Text></Pressable>
        <Pressable onPress={openPost} style={styles.postButton}><Text style={styles.postButtonText}>ABRIR PUBLICAÇÃO ›</Text></Pressable>
      </View>

      <FullScreenImageViewer visible={Boolean(viewer)} uri={viewer?.url || ""} authorName={item.authorName} caption={item.text} onClose={() => setViewer(null)} />
    </View>
  );
}

const cardWidth = Math.min(Dimensions.get("window").width - 32, 720);
const styles = StyleSheet.create({
  card: { position: "relative", overflow: "hidden", borderRadius: brand.radius.xl, borderWidth: 1, borderColor: brand.colors.borderSoft, backgroundColor: brand.colors.surface, ...brand.shadow },
  accent: { position: "absolute", left: 0, right: 0, top: 0, height: 3, backgroundColor: brand.colors.cyan, zIndex: 2 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 11, padding: 14 },
  avatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: brand.colors.cyan },
  avatarFallback: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: brand.colors.cyan, backgroundColor: brand.colors.bgDeep },
  avatarText: { color: brand.colors.cyanSoft, fontSize: 17, fontWeight: "900" },
  authorCopy: { flex: 1 },
  authorName: { color: brand.colors.text, fontSize: 14, fontWeight: "900" },
  date: { marginTop: 3, color: brand.colors.muted, fontSize: 10 },
  kindPill: { borderWidth: 1, borderColor: brand.colors.border, borderRadius: brand.radius.pill, backgroundColor: brand.colors.bgDeep, paddingHorizontal: 9, paddingVertical: 6 },
  kind: { color: brand.colors.cyan, fontSize: 8, fontWeight: "900", letterSpacing: 0.7 },
  postText: { color: brand.colors.text, fontSize: 14, lineHeight: 20, paddingHorizontal: 14, paddingBottom: 13 },
  mediaWrap: { position: "relative", backgroundColor: "#000" },
  mediaPage: { width: cardWidth, maxWidth: "100%", aspectRatio: 4 / 3, backgroundColor: "#000" },
  mediaPress: { flex: 1 },
  media: { width: "100%", height: "100%", backgroundColor: "#000" },
  counter: { position: "absolute", right: 10, top: 10, borderRadius: brand.radius.pill, backgroundColor: "rgba(0,0,0,.7)", paddingHorizontal: 9, paddingVertical: 5 },
  counterText: { color: "#fff", fontSize: 9, fontWeight: "900" },
  dots: { position: "absolute", left: 0, right: 0, bottom: 8, flexDirection: "row", justifyContent: "center", gap: 4 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,.45)" },
  dotActive: { width: 13, backgroundColor: brand.colors.cyan },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 14, paddingTop: 11 },
  tag: { color: brand.colors.cyan, fontSize: 10, fontWeight: "800" },
  socialRow: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, paddingTop: 10, paddingBottom: 7 },
  socialButton: { minWidth: 44, minHeight: 38, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 5 },
  socialIcon: { color: brand.colors.text, fontSize: 22, fontWeight: "800" },
  liked: { color: "#ff6277" },
  saved: { color: brand.colors.gold },
  socialCount: { color: brand.colors.mutedStrong, fontSize: 9, fontWeight: "800" },
  socialLabel: { color: brand.colors.muted, fontSize: 7, fontWeight: "900" },
  socialSpacer: { flex: 1 },
  footerActions: { flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingBottom: 13 },
  profileButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 42, borderWidth: 1, borderColor: brand.colors.cyan, borderRadius: brand.radius.md, backgroundColor: brand.colors.bgDeep },
  profileIcon: { color: brand.colors.cyan, fontSize: 15 },
  profileText: { color: brand.colors.cyanSoft, fontSize: 9, fontWeight: "900" },
  postButton: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 42, borderWidth: 1, borderColor: brand.colors.gold, borderRadius: brand.radius.md, backgroundColor: "#3c2c0d" },
  postButtonText: { color: brand.colors.gold, fontSize: 9, fontWeight: "900" },
  pressed: { opacity: 0.75 },
});
