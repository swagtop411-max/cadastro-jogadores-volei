import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PostCard } from '@/src/components/PostCard';
import { subscribeFeed } from '@/src/services/feed';
import { subscribeActiveStories, type StoryItem } from '@/src/services/stories';
import type { FeedPost } from '@/src/types/social';
import { colors, radii, spacing } from '@/src/theme';

export default function FeedScreen() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [stories, setStories] = useState<StoryItem[]>([]);
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

  useEffect(() => subscribeActiveStories(setStories), []);

  const storyRail = useMemo(() => {
    const seen = new Set<string>();
    return stories.filter(story => {
      if (!story.ownerUid || seen.has(story.ownerUid)) return false;
      seen.add(story.ownerUid);
      return true;
    }).slice(0, 40);
  }, [stories]);

  function refresh() {
    setRefreshing(true);
    setReloadKey(value => value + 1);
  }

  const header = (
    <View>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>REDE DO VÔLEI</Text>
          <Text style={styles.title}>Feed</Text>
          <Text style={styles.subtitle}>Site e aplicativo conectados à mesma comunidade.</Text>
        </View>
        <Pressable style={styles.bell} onPress={() => router.push('/notifications' as any)}><Text style={styles.bellText}>🔔</Text></Pressable>
      </View>

      <View style={styles.storySection}>
        <View style={styles.storyHeadingRow}>
          <Text style={styles.storyHeading}>STORIES</Text>
          <Pressable onPress={() => router.push('/(tabs)/create' as any)}><Text style={styles.createStory}>+ CRIAR</Text></Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyRail}>
          {storyRail.length ? storyRail.map(story => (
            <Pressable key={story.id} style={styles.storyItem} onPress={() => router.push(`/story/${story.id}` as any)}>
              <View style={styles.storyRing}><View style={styles.storyAvatar}><Text>🏐</Text></View></View>
              <Text numberOfLines={1} style={styles.storyName}>{story.nome || 'Atleta'}</Text>
            </Pressable>
          )) : <Text style={styles.noStories}>Nenhum Story ativo. Seja o primeiro.</Text>}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <View style={styles.page}>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.cyan} /></View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.cyan} />}
          ListHeaderComponent={header}
          ListEmptyComponent={<Text style={styles.empty}>{error || 'Ainda não há publicações.'}</Text>}
          renderItem={({ item }) => <PostCard post={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  top: { backgroundColor: colors.navy, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radii.lg },
  kicker: { color: colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  title: { color: colors.white, fontSize: 30, fontWeight: '900', marginTop: 3 },
  subtitle: { color: '#B9C8D6', marginTop: 5, lineHeight: 19 },
  bell: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.navySoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#35536C' },
  bellText: { fontSize: 19 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.md, gap: spacing.md, paddingBottom: 100 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 50 },
  storySection: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, marginTop: spacing.md, paddingVertical: 14 },
  storyHeadingRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, alignItems: 'center' },
  storyHeading: { color: colors.ink, fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  createStory: { color: colors.cyan, fontWeight: '900', fontSize: 11 },
  storyRail: { gap: 13, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 2 },
  storyItem: { width: 68, alignItems: 'center' },
  storyRing: { width: 61, height: 61, borderRadius: 31, borderWidth: 3, borderColor: colors.cyan, padding: 2 },
  storyAvatar: { flex: 1, borderRadius: 28, backgroundColor: colors.navySoft, alignItems: 'center', justifyContent: 'center' },
  storyName: { color: colors.ink, fontSize: 10, fontWeight: '700', marginTop: 5, maxWidth: 66 },
  noStories: { color: colors.muted, paddingVertical: 12, fontSize: 12 },
});
