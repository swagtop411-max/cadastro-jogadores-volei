import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { PostCard } from '@/src/components/PostCard';
import { db } from '@/src/config/firebase';
import { useAuth } from '@/src/providers/AuthProvider';
import { subscribeSaved } from '@/src/services/saves';
import type { FeedPost } from '@/src/types/social';
import { colors, spacing } from '@/src/theme';

export default function SavedScreen() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);

  useEffect(() => {
    if (!user) return;
    return subscribeSaved(user.uid, refs => {
      Promise.all(refs.map(async ref => {
        const snapshot = await getDoc(doc(db, 'publicacoes', ref.postId));
        return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as FeedPost) : null;
      })).then(items => setPosts(items.filter(Boolean) as FeedPost[])).catch(() => setPosts([]));
    });
  }, [user]);

  return (
    <View style={styles.page}>
      <View style={styles.header}><Text style={styles.kicker}>SUA COLEÇÃO</Text><Text style={styles.title}>Salvos</Text><Text style={styles.subtitle}>As mesmas publicações salvas no site ficam disponíveis aqui.</Text></View>
      <FlatList data={posts} keyExtractor={item => item.id} contentContainerStyle={styles.list} renderItem={({ item }) => <PostCard post={item} />} ListEmptyComponent={<Text style={styles.empty}>Nenhuma publicação salva ainda.</Text>} />
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
  empty: { color: colors.muted, textAlign: 'center', marginTop: 50 },
});
