import { getAuth } from "@react-native-firebase/auth";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FullScreenImageViewer } from "@/components/FullScreenImageViewer";
import { loadCompleteMobileFeed } from "@/services/feedService";
import { formatFirebaseDate, type MobileFeedItem } from "@/services/mobileContent";
import {
  addComment,
  deleteOwnComment,
  loadComments,
  loadPostSocialState,
  toggleLike,
  toggleSaved,
  type SocialComment,
  type SocialPostState,
} from "@/services/socialService";
import { brand } from "@/ui/brand";

const EMPTY_STATE: SocialPostState = {
  liked: false,
  saved: false,
  likeCount: 0,
  commentCount: 0,
};

export default function PostDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; kind?: "image" | "video" }>();
  const postId = String(params.id || "");
  const kind = params.kind === "video" ? "video" : "image";
  const [item, setItem] = useState<MobileFeedItem | null>(null);
  const [social, setSocial] = useState<SocialPostState>(EMPTY_STATE);
  const [comments, setComments] = useState<SocialComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingComment, setSendingComment] = useState(false);
  const [updatingAction, setUpdatingAction] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentUid = getAuth().currentUser?.uid || "";

  const refreshSocial = useCallback(async () => {
    if (!postId) return;
    const [nextSocial, nextComments] = await Promise.all([
      loadPostSocialState(postId),
      loadComments(postId),
    ]);
    setSocial(nextSocial);
    setComments(nextComments);
  }, [postId]);

  const load = useCallback(async () => {
    if (!postId) {
      setError("Publicação inválida.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const feed = await loadCompleteMobileFeed();
      const found = feed.find((entry) => entry.id === postId && entry.kind === kind)
        || feed.find((entry) => entry.id === postId);
      if (!found) throw new Error("Esta publicação não está mais disponível.");
      setItem(found);
      await refreshSocial();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir a publicação.");
    } finally {
      setLoading(false);
    }
  }, [kind, postId, refreshSocial]);

  useEffect(() => {
    void load();
  }, [load]);

  const sharePost = useCallback(async () => {
    if (!item) return;
    const parts = [
      item.text,
      item.mediaUrl,
      `Publicado por ${item.authorName} no Banco de Atletas`,
    ].filter(Boolean);
    await Share.share({ message: parts.join("\n\n") });
  }, [item]);

  const handleLike = useCallback(async () => {
    if (!item || updatingAction) return;
    setUpdatingAction(true);
    try {
      const liked = await toggleLike(item.id, social.liked);
      setSocial((previous) => ({
        ...previous,
        liked,
        likeCount: Math.max(0, previous.likeCount + (liked ? 1 : -1)),
      }));
    } catch (cause) {
      Alert.alert("Curtida", cause instanceof Error ? cause.message : "Não foi possível atualizar a curtida.");
    } finally {
      setUpdatingAction(false);
    }
  }, [item, social.liked, updatingAction]);

  const handleSave = useCallback(async () => {
    if (!item || updatingAction) return;
    setUpdatingAction(true);
    try {
      const saved = await toggleSaved(item.id, item.kind, social.saved);
      setSocial((previous) => ({ ...previous, saved }));
    } catch (cause) {
      Alert.alert("Salvar publicação", cause instanceof Error ? cause.message : "Não foi possível salvar.");
    } finally {
      setUpdatingAction(false);
    }
  }, [item, social.saved, updatingAction]);

  const handleComment = useCallback(async () => {
    if (!item || sendingComment) return;
    setSendingComment(true);
    try {
      await addComment(item.id, commentText);
      setCommentText("");
      await refreshSocial();
    } catch (cause) {
      Alert.alert("Comentário", cause instanceof Error ? cause.message : "Não foi possível comentar.");
    } finally {
      setSendingComment(false);
    }
  }, [commentText, item, refreshSocial, sendingComment]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    try {
      await deleteOwnComment(commentId);
      await refreshSocial();
    } catch (cause) {
      Alert.alert("Comentário", cause instanceof Error ? cause.message : "Não foi possível excluir o comentário.");
    }
  }, [refreshSocial]);

  const authorInitial = useMemo(() => item?.authorName.slice(0, 1).toUpperCase() || "A", [item?.authorName]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={brand.colors.cyan} />
        <Text style={styles.muted}>Abrindo publicação…</Text>
      </View>
    );
  }

  if (!item || error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Publicação indisponível</Text>
        <Text style={styles.muted}>{error || "Não foi possível carregar."}</Text>
        <Pressable onPress={() => router.back()} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>VOLTAR</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SafeAreaView edges={["bottom"]}>
          <View style={styles.card}>
            <Pressable
              onPress={() => item.ownerUid && router.push({ pathname: "/athlete/[uid]", params: { uid: item.ownerUid } })}
              style={styles.authorRow}
            >
              {item.authorPhoto ? (
                <Image source={{ uri: item.authorPhoto }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}><Text style={styles.avatarText}>{authorInitial}</Text></View>
              )}
              <View style={styles.authorCopy}>
                <Text style={styles.authorName}>{item.authorName}</Text>
                <Text style={styles.date}>{formatFirebaseDate(item.createdAt)}</Text>
              </View>
              <Text style={styles.openProfile}>VER PERFIL</Text>
            </Pressable>

            {item.kind === "image" && item.mediaUrl ? (
              <Pressable onPress={() => setViewerOpen(true)}>
                <Image source={{ uri: item.mediaUrl }} resizeMode="contain" style={styles.media} />
              </Pressable>
            ) : (
              <View style={styles.videoPlaceholder}>
                <Text style={styles.videoIcon}>▶</Text>
                <Text style={styles.videoTitle}>Vídeo da comunidade</Text>
              </View>
            )}

            {item.text ? <Text style={styles.caption}>{item.text}</Text> : null}

            <View style={styles.socialRow}>
              <SocialButton
                icon={social.liked ? "♥" : "♡"}
                label={`${social.likeCount}`}
                active={social.liked}
                onPress={() => void handleLike()}
              />
              <SocialButton icon="◌" label={`${social.commentCount}`} onPress={() => undefined} />
              <SocialButton icon={social.saved ? "◆" : "◇"} label={social.saved ? "SALVO" : "SALVAR"} active={social.saved} onPress={() => void handleSave()} />
              <SocialButton icon="↗" label="ENVIAR" gold onPress={() => void sharePost()} />
            </View>
          </View>

          <View style={styles.commentsCard}>
            <Text style={styles.sectionEyebrow}>COMUNIDADE</Text>
            <Text style={styles.sectionTitle}>Comentários</Text>

            <View style={styles.composer}>
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Adicione um comentário…"
                placeholderTextColor={brand.colors.muted}
                maxLength={500}
                multiline
                style={styles.commentInput}
              />
              <Pressable
                disabled={sendingComment || !commentText.trim()}
                onPress={() => void handleComment()}
                style={({ pressed }) => [styles.sendButton, (!commentText.trim() || sendingComment) && styles.disabled, pressed && styles.pressed]}
              >
                <Text style={styles.sendButtonText}>{sendingComment ? "…" : "PUBLICAR"}</Text>
              </Pressable>
            </View>

            {comments.length === 0 ? (
              <Text style={styles.emptyComments}>Seja a primeira pessoa a comentar.</Text>
            ) : comments.map((comment) => (
              <View key={comment.id} style={styles.commentRow}>
                <View style={styles.commentAvatar}><Text style={styles.commentAvatarText}>{comment.nome.slice(0, 1).toUpperCase()}</Text></View>
                <View style={styles.commentCopy}>
                  <Text style={styles.commentName}>{comment.nome}</Text>
                  <Text style={styles.commentText}>{comment.texto}</Text>
                </View>
                {comment.ownerUid === currentUid ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Excluir comentário"
                    onPress={() => Alert.alert("Excluir comentário", "Deseja excluir este comentário?", [
                      { text: "Cancelar", style: "cancel" },
                      { text: "Excluir", style: "destructive", onPress: () => void handleDeleteComment(comment.id) },
                    ])}
                    hitSlop={10}
                  >
                    <Text style={styles.deleteComment}>×</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        </SafeAreaView>
      </ScrollView>

      <FullScreenImageViewer
        visible={viewerOpen}
        uri={item.mediaUrl}
        authorName={item.authorName}
        caption={item.text}
        onClose={() => setViewerOpen(false)}
      />
    </>
  );
}

function SocialButton({
  icon,
  label,
  active = false,
  gold = false,
  onPress,
}: {
  icon: string;
  label: string;
  active?: boolean;
  gold?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.socialButton, pressed && styles.pressed]}>
      <Text style={[styles.socialIcon, active && styles.socialIconActive, gold && styles.socialIconGold]}>{icon}</Text>
      <Text style={[styles.socialLabel, active && styles.socialLabelActive, gold && styles.socialLabelGold]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: brand.colors.bg },
  content: { padding: 14, paddingBottom: 34, gap: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24, backgroundColor: brand.colors.bg },
  muted: { color: brand.colors.muted, textAlign: "center", lineHeight: 20 },
  errorTitle: { color: brand.colors.text, fontSize: 22, fontWeight: "900" },
  primaryButton: { marginTop: 12, borderRadius: brand.radius.md, backgroundColor: brand.colors.cyan, paddingHorizontal: 24, paddingVertical: 13 },
  primaryButtonText: { color: brand.colors.bgDeep, fontWeight: "900", letterSpacing: 0.8 },
  card: { overflow: "hidden", borderRadius: brand.radius.xl, borderWidth: 1, borderColor: brand.colors.borderSoft, backgroundColor: brand.colors.surface, ...brand.shadow },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 11, padding: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: brand.colors.cyan },
  avatarFallback: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: brand.colors.surfaceSoft, borderWidth: 1, borderColor: brand.colors.cyan },
  avatarText: { color: brand.colors.cyanSoft, fontSize: 18, fontWeight: "900" },
  authorCopy: { flex: 1 },
  authorName: { color: brand.colors.text, fontSize: 16, fontWeight: "900" },
  date: { color: brand.colors.muted, marginTop: 3, fontSize: 11 },
  openProfile: { color: brand.colors.cyan, fontSize: 9, fontWeight: "900", letterSpacing: 0.6 },
  media: { width: "100%", aspectRatio: 4 / 3, backgroundColor: "#000000" },
  videoPlaceholder: { minHeight: 300, alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#000000" },
  videoIcon: { color: brand.colors.cyan, fontSize: 50 },
  videoTitle: { color: brand.colors.text, fontWeight: "900" },
  caption: { color: brand.colors.text, fontSize: 15, lineHeight: 22, paddingHorizontal: 14, paddingTop: 14 },
  socialRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10, paddingVertical: 13 },
  socialButton: { minWidth: 56, alignItems: "center", justifyContent: "center", gap: 3, paddingHorizontal: 4 },
  socialIcon: { color: brand.colors.text, fontSize: 23, fontWeight: "800" },
  socialIconActive: { color: "#ff5f75" },
  socialIconGold: { color: brand.colors.gold },
  socialLabel: { color: brand.colors.mutedStrong, fontSize: 8, fontWeight: "900" },
  socialLabelActive: { color: "#ff8e9e" },
  socialLabelGold: { color: brand.colors.gold },
  commentsCard: { marginTop: 14, borderRadius: brand.radius.xl, borderWidth: 1, borderColor: brand.colors.borderSoft, backgroundColor: brand.colors.surface, padding: 14 },
  sectionEyebrow: { color: brand.colors.gold, fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  sectionTitle: { color: brand.colors.text, fontSize: 24, fontWeight: "900", marginTop: 4, marginBottom: 14 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 14 },
  commentInput: { flex: 1, minHeight: 46, maxHeight: 110, borderWidth: 1, borderColor: brand.colors.border, borderRadius: brand.radius.md, backgroundColor: brand.colors.bgDeep, color: brand.colors.text, paddingHorizontal: 12, paddingVertical: 10 },
  sendButton: { minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: brand.radius.md, backgroundColor: brand.colors.cyan, paddingHorizontal: 13 },
  sendButtonText: { color: brand.colors.bgDeep, fontSize: 9, fontWeight: "900", letterSpacing: 0.6 },
  disabled: { opacity: 0.42 },
  pressed: { opacity: 0.72 },
  emptyComments: { color: brand.colors.muted, textAlign: "center", paddingVertical: 18 },
  commentRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 11, borderTopWidth: 1, borderTopColor: brand.colors.borderSoft },
  commentAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: brand.colors.surfaceSoft },
  commentAvatarText: { color: brand.colors.cyanSoft, fontWeight: "900" },
  commentCopy: { flex: 1 },
  commentName: { color: brand.colors.text, fontSize: 12, fontWeight: "900" },
  commentText: { color: brand.colors.mutedStrong, marginTop: 3, fontSize: 12, lineHeight: 17 },
  deleteComment: { color: brand.colors.muted, fontSize: 22, lineHeight: 24 },
});