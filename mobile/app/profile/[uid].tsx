import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { PostCard } from '@/src/components/PostCard';
import { db } from '@/src/config/firebase';
import { useAuth } from '@/src/providers/AuthProvider';
import { ensureConversation, followProfile, getFollowState, profileOf, unfollowProfile } from '@/src/services/socialActions';
import type { FeedPost, PublicProfile } from '@/src/types/social';
import { colors, radii, spacing } from '@/src/theme';

export default function PublicProfileScreen() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    profileOf(uid).then(setProfile).finally(() => setLoading(false));
    if (user && uid !== user.uid) getFollowState(uid, user.uid).then(setFollowing).catch(() => undefined);
    return onSnapshot(query(collection(db, 'publicacoes'), where('ownerUid', '==', uid), limit(60)), snapshot => {
      const next = snapshot.docs
        .map(item => ({ id: item.id, ...item.data() } as FeedPost))
        .filter(item => item.aprovado === true && item.status !== 'pendente')
        .sort((a, b) => {
          const am = (a.criadoEm as any)?.toMillis?.() || ((a.criadoEm as any)?.seconds || 0) * 1000;
          const bm = (b.criadoEm as any)?.toMillis?.() || ((b.criadoEm as any)?.seconds || 0) * 1000;
          return bm - am;
        });
      setPosts(next);
    });
  }, [uid, user]);

  async function toggleFollow() {
    if (!user || !uid || uid === user.uid || busy) return;
    setBusy(true);
    try {
      if (following) await unfollowProfile(uid, user);
      else await followProfile(uid, user);
      setFollowing(value => !value);
    } finally {
      setBusy(false);
    }
  }

  async function message() {
    if (!user || !uid || uid === user.uid) return;
    setBusy(true);
    try {
      const conversationId = await ensureConversation(user.uid, uid);
      router.push(`/chat/${conversationId}` as any);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.cyan} size="large" /></View>;
  if (!profile) return <View style={styles.center}><Text style={styles.muted}>Perfil não encontrado.</Text></View>;

  const own = user?.uid === uid;
  return (
    <FlatList
      style={styles.page}
      contentContainerStyle={styles.list}
      data={posts}
      keyExtractor={item => item.id}
      renderItem={({ item }) => <PostCard post={item} />}
      ListHeaderComponent={
        <View>
          <View style={styles.hero}>
            {profile.fotoUrl ? <Image source={{ uri: profile.fotoUrl }} style={styles.avatar} contentFit="cover" cachePolicy="memory-disk" /> : <View style={styles.avatarFallback}><Text style={{ fontSize: 30 }}>🏐</Text></View>}
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{profile.nome || 'Atleta'}</Text>
              <Text style={styles.meta}>{[profile.cidade, profile.uf, profile.categoria].filter(Boolean).join(' • ')}</Text>
              <Text style={styles.meta}>{[profile.posicao, profile.time].filter(Boolean).join(' • ')}</Text>
            </View>
          </View>
          {!!profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
          {!own && <View style={styles.actions}>
            <Pressable disabled={busy} style={[styles.follow, following && styles.following]} onPress={toggleFollow}><Text style={[styles.followText, following && styles.followingText]}>{following ? '✓ SEGUINDO' : '+ SEGUIR'}</Text></Pressable>
            <Pressable disabled={busy} style={styles.message} onPress={message}><Text style={styles.messageText}>✉ MENSAGEM</Text></Pressable>
          </View>}
          <Text style={styles.section}>PUBLICAÇÕES</Text>
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>Este atleta ainda não publicou no Feed.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, gap: spacing.md, paddingBottom: 100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  muted: { color: colors.muted },
  hero: { flexDirection: 'row', gap: 14, alignItems: 'center', backgroundColor: colors.navy, borderRadius: radii.lg, padding: spacing.lg },
  avatar: { width: 86, height: 86, borderRadius: 43, borderWidth: 3, borderColor: colors.cyan },
  avatarFallback: { width: 86, height: 86, borderRadius: 43, backgroundColor: colors.navySoft, borderWidth: 3, borderColor: colors.cyan, alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.white, fontSize: 24, fontWeight: '900' },
  meta: { color: '#B9C8D6', marginTop: 5, fontSize: 12 },
  bio: { color: colors.ink, backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: 14, lineHeight: 20, marginTop: 10 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 10 },
  follow: { flex: 1, minHeight: 48, borderRadius: radii.md, backgroundColor: colors.cyan, alignItems: 'center', justifyContent: 'center' },
  following: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cyan },
  followText: { color: colors.white, fontWeight: '900' },
  followingText: { color: colors.cyan },
  message: { flex: 1, minHeight: 48, borderRadius: radii.md, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  messageText: { color: colors.white, fontWeight: '900' },
  section: { color: colors.ink, fontSize: 12, fontWeight: '900', letterSpacing: 1.4, marginTop: 18, marginBottom: -4 },
  empty: { color: colors.muted, textAlign: 'center', padding: 30 },
});
