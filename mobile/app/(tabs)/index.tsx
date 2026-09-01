import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { subscribeFeed } from '@/src/services/feed';
import type { FeedPost } from '@/src/types/social';
import { colors, radii, spacing } from '@/src/theme';

function postImage(post: FeedPost) {
  return post.imagemUrl || post.imagem || '';
}

export default function FeedScreen() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError('');
    const unsubscribe = subscribeFeed(
      data => {
        setPosts(data);
        setLoading(false);
        setRefreshing(false);
      },
      () => {
        setError('Não foi possível carregar o Feed agora.');
        setLoading(false);
        setRefreshing(false);
      },
    );
    return unsubscribe;
  }, [reloadKey]);

  function refresh() {
    setRefreshing(true);
    setReloadKey(value => value + 1);
  }

  return (
    <View style={styles.page}>
      <View style={styles.top}>
        <Text style={styles.kicker}>REDE DO VÔLEI</Text>
        <Text style={styles.title}>Feed</Text>
        <Text style={styles.subtitle}>Tudo que for publicado no site ou no app aparece aqui pela mesma base.</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.cyan} /></View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.cyan} />}
          ListEmptyComponent={<Text style={styles.empty}>{error || 'Ainda não há publicações.'}</Text>}
          renderItem={({ item }) => {
            const media = postImage(item);
            return (
              <View style={styles.card}>
                <View style={styles.authorRow}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>🏐</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.author}>{item.nome || 'Atleta'}</Text>
                    <Text style={styles.meta}>Publicação da comunidade</Text>
                  </View>
                </View>
                {!!media && <Image source={{ uri: media }} style={styles.image} contentFit="contain" transition={180} cachePolicy="memory-disk" />}
                <View style={styles.body}>
                  <Text style={styles.actions}>♡   💬   ↗</Text>
                  {!!(item.legenda || item.texto) && <Text style={styles.caption}>{item.legenda || item.texto}</Text>}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  top: { backgroundColor: colors.navy, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
  kicker: { color: colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  title: { color: colors.white, fontSize: 30, fontWeight: '900', marginTop: 3 },
  subtitle: { color: '#B9C8D6', marginTop: 5, lineHeight: 19 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.md, gap: spacing.md, paddingBottom: 100 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 50 },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.navySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18 },
  author: { color: colors.ink, fontWeight: '900' },
  meta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  image: { width: '100%', aspectRatio: 1, backgroundColor: '#E9EEF3' },
  body: { padding: 14 },
  actions: { color: colors.ink, fontSize: 22, letterSpacing: 3 },
  caption: { color: colors.ink, lineHeight: 20, marginTop: 8 },
});
