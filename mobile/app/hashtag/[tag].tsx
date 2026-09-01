import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { PostCard } from '@/src/components/PostCard';
import { db } from '@/src/config/firebase';
import type { FeedPost } from '@/src/types/social';
import { colors, spacing } from '@/src/theme';

export default function HashtagScreen() {
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const cleanTag = decodeURIComponent(String(tag || '')).replace(/^#/, '').toLowerCase();
  const [posts, setPosts] = useState<FeedPost[]>([]);

  useEffect(() => {
    if (!cleanTag) return;
    return onSnapshot(query(collection(db, 'publicacoes'), where('hashtags', 'array-contains', cleanTag), limit(100)), snapshot => {
      setPosts(snapshot.docs
        .map(item => ({ id: item.id, ...item.data() } as FeedPost))
        .filter(item => item.aprovado === true && item.status !== 'pendente'));
    });
  }, [cleanTag]);

  return (
    <View style={styles.page}>
      <View style={styles.header}><Text style={styles.kicker}>HASHTAG</Text><Text style={styles.title}>#{cleanTag}</Text><Text style={styles.subtitle}>Publicações da mesma conversa esportiva no app e no site.</Text></View>
      <FlatList data={posts} keyExtractor={item => item.id} contentContainerStyle={styles.list} renderItem={({ item }) => <PostCard post={item} />} ListEmptyComponent={<Text style={styles.empty}>Nenhuma publicação encontrada para #{cleanTag}.</Text>} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.navy, padding: spacing.lg },
  kicker: { color: colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  title: { color: colors.white, fontSize: 29, fontWeight: '900', marginTop: 4 },
  subtitle: { color: '#B9C8D6', marginTop: 5, lineHeight: 19 },
  list: { padding: spacing.md, gap: spacing.md, paddingBottom: 90 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 50, paddingHorizontal: 20 },
});
