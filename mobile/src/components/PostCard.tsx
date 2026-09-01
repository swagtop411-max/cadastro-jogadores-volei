import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { MediaCarousel } from '@/src/components/MediaCarousel';
import { RichCaption } from '@/src/components/RichCaption';
import { useAuth } from '@/src/providers/AuthProvider';
import { isSaved, toggleSave } from '@/src/services/saves';
import { getLikeSummary, toggleLike } from '@/src/services/socialActions';
import type { FeedPost, FeedMedia } from '@/src/types/social';
import { colors, radii } from '@/src/theme';

const postImage = (post: FeedPost) => post.imagemUrl || post.imagem || '';
const postMedia = (post: FeedPost): FeedMedia[] => {
  if (post.tipo === 'carrossel' && Array.isArray(post.midias) && post.midias.length) return post.midias.filter(item => !!item?.url);
  const image = postImage(post);
  return image ? [{ url: image, tipo: 'image' }] : [];
};

export function PostCard({ post }: { post: FeedPost }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likes, setLikes] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      getLikeSummary(post.id, user?.uid),
      user ? isSaved(user.uid, post.id).catch(() => false) : Promise.resolve(false),
    ]).then(([summary, savedState]) => {
      if (!alive) return;
      setLiked(summary.liked);
      setLikes(summary.count);
      setSaved(savedState);
    }).catch(() => undefined);
    return () => { alive = false; };
  }, [post.id, user?.uid]);

  async function like() {
    if (!user || busy) return;
    setBusy(true);
    const previous = liked;
    setLiked(!previous);
    setLikes(value => Math.max(0, value + (previous ? -1 : 1)));
    try {
      const next = await toggleLike(post, user);
      if (next !== !previous) {
        setLiked(next);
        const summary = await getLikeSummary(post.id, user.uid);
        setLikes(summary.count);
      }
    } catch {
      setLiked(previous);
      setLikes(value => Math.max(0, value + (previous ? 1 : -1)));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!user || busy) return;
    setBusy(true);
    const previous = saved;
    setSaved(!previous);
    try {
      setSaved(await toggleSave(user.uid, post.id, 'post'));
    } catch {
      setSaved(previous);
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    await Share.share({
      message: `${post.legenda || post.texto || 'Confira esta publicação'}\nhttps://cadastrodeatletas.com.br/perfil-social.html?uid=${encodeURIComponent(post.ownerUid || '')}`,
    });
  }

  const media = postMedia(post);
  return (
    <View style={styles.card}>
      <Pressable style={styles.authorRow} onPress={() => post.ownerUid && router.push(`/profile/${post.ownerUid}` as any)}>
        <View style={styles.avatar}><Text style={styles.avatarText}>🏐</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.author}>{post.nome || 'Atleta'}</Text>
          <Text style={styles.meta}>{post.tipo === 'carrossel' ? `Carrossel • ${media.length} mídias` : 'Publicação da comunidade'}</Text>
        </View>
      </Pressable>

      {post.tipo === 'carrossel' && media.length > 1
        ? <MediaCarousel media={media} />
        : media[0] ? <Image source={{ uri: media[0].url }} style={styles.image} contentFit="contain" transition={160} cachePolicy="memory-disk" /> : null}

      <View style={styles.body}>
        <View style={styles.actionRow}>
          <Pressable onPress={like} hitSlop={10}><Text style={[styles.action, liked && styles.liked]}>{liked ? '♥' : '♡'}</Text></Pressable>
          <Pressable onPress={() => router.push(`/post/${post.id}` as any)} hitSlop={10}><Text style={styles.action}>💬</Text></Pressable>
          <Pressable onPress={share} hitSlop={10}><Text style={styles.action}>↗</Text></Pressable>
          <View style={{ flex: 1 }} />
          <Pressable onPress={save} hitSlop={10}><Text style={[styles.action, saved && styles.saved]}>{saved ? '▣' : '▢'}</Text></Pressable>
        </View>
        <Text style={styles.likeCount}>{likes} {likes === 1 ? 'curtida' : 'curtidas'}</Text>
        {!!(post.legenda || post.texto) && <RichCaption author={post.nome || 'Atleta'} text={post.legenda || post.texto} />}
        <Pressable onPress={() => router.push(`/post/${post.id}` as any)}><Text style={styles.commentsLink}>Ver comentários</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.navySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18 },
  author: { color: colors.ink, fontWeight: '900' },
  meta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  image: { width: '100%', aspectRatio: 1, backgroundColor: '#E9EEF3' },
  body: { padding: 14 },
  actionRow: { flexDirection: 'row', gap: 18, alignItems: 'center' },
  action: { color: colors.ink, fontSize: 25 },
  liked: { color: colors.danger },
  saved: { color: colors.cyan },
  likeCount: { color: colors.ink, fontWeight: '900', marginTop: 8, fontSize: 12 },
  commentsLink: { color: colors.muted, fontSize: 12, marginTop: 9, fontWeight: '700' },
});
