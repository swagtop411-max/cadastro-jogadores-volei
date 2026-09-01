import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/src/providers/AuthProvider';
import { getLikeSummary, toggleLike } from '@/src/services/socialActions';
import type { FeedPost } from '@/src/types/social';
import { colors, radii } from '@/src/theme';

const postImage = (post: FeedPost) => post.imagemUrl || post.imagem || '';

export function PostCard({ post }: { post: FeedPost }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    getLikeSummary(post.id, user?.uid).then(summary => {
      if (!alive) return;
      setLiked(summary.liked);
      setLikes(summary.count);
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

  const media = postImage(post);
  return (
    <View style={styles.card}>
      <Pressable style={styles.authorRow} onPress={() => post.ownerUid && router.push(`/profile/${post.ownerUid}` as any)}>
        <View style={styles.avatar}><Text style={styles.avatarText}>🏐</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.author}>{post.nome || 'Atleta'}</Text>
          <Text style={styles.meta}>Publicação da comunidade</Text>
        </View>
      </Pressable>

      {!!media && <Image source={{ uri: media }} style={styles.image} contentFit="contain" transition={160} cachePolicy="memory-disk" />}

      <View style={styles.body}>
        <View style={styles.actionRow}>
          <Pressable onPress={like} hitSlop={10}><Text style={[styles.action, liked && styles.liked]}>{liked ? '♥' : '♡'}</Text></Pressable>
          <Pressable onPress={() => router.push(`/post/${post.id}` as any)} hitSlop={10}><Text style={styles.action}>💬</Text></Pressable>
          <Pressable onPress={() => router.push(`/post/${post.id}` as any)} hitSlop={10}><Text style={styles.action}>↗</Text></Pressable>
        </View>
        <Text style={styles.likeCount}>{likes} {likes === 1 ? 'curtida' : 'curtidas'}</Text>
        {!!(post.legenda || post.texto) && <Text style={styles.caption}><Text style={{ fontWeight: '900' }}>{post.nome || 'Atleta'} </Text>{post.legenda || post.texto}</Text>}
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
  likeCount: { color: colors.ink, fontWeight: '900', marginTop: 8, fontSize: 12 },
  caption: { color: colors.ink, lineHeight: 20, marginTop: 7 },
  commentsLink: { color: colors.muted, fontSize: 12, marginTop: 9, fontWeight: '700' },
});
