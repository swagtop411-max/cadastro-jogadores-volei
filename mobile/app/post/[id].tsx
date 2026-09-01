import { doc, getDoc } from 'firebase/firestore';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { PostCard } from '@/src/components/PostCard';
import { db } from '@/src/config/firebase';
import { useAuth } from '@/src/providers/AuthProvider';
import { addComment, subscribeComments, type CommentItem } from '@/src/services/socialActions';
import type { FeedPost } from '@/src/types/social';
import { colors, radii, spacing } from '@/src/theme';

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [post, setPost] = useState<FeedPost | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, 'publicacoes', id)).then(snapshot => {
      setPost(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as FeedPost) : null);
      setLoading(false);
    }).catch(() => setLoading(false));
    return subscribeComments(id, setComments);
  }, [id]);

  async function send() {
    if (!user || !post || !text.trim() || busy) return;
    setBusy(true);
    try {
      await addComment(post, user, text);
      setText('');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.cyan} size="large" /></View>;
  if (!post) return <View style={styles.center}><Text style={styles.muted}>Publicação não encontrada.</Text></View>;

  return (
    <View style={styles.page}>
      <FlatList
        data={comments}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<PostCard post={post} />}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum comentário ainda.</Text>}
        renderItem={({ item }) => (
          <View style={styles.comment}>
            <View style={styles.avatar}><Text>🏐</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.commentName}>{item.nome || 'Atleta'}</Text>
              <Text style={styles.commentText}>{item.texto}</Text>
            </View>
          </View>
        )}
      />
      <View style={styles.composer}>
        <TextInput value={text} onChangeText={setText} placeholder="Adicionar comentário..." placeholderTextColor={colors.muted} maxLength={500} style={styles.input} />
        <Pressable disabled={!text.trim() || busy} onPress={send} style={[styles.send, (!text.trim() || busy) && { opacity: 0.45 }]}><Text style={styles.sendText}>ENVIAR</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, gap: 9, paddingBottom: 100 },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.muted },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 28 },
  comment: { backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: 12, flexDirection: 'row', gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  commentName: { color: colors.ink, fontWeight: '900', fontSize: 12 },
  commentText: { color: colors.ink, marginTop: 4, lineHeight: 19 },
  composer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 10, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', gap: 8 },
  input: { flex: 1, minHeight: 46, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted, paddingHorizontal: 15, color: colors.ink },
  send: { paddingHorizontal: 16, borderRadius: radii.pill, backgroundColor: colors.cyan, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: colors.white, fontWeight: '900', fontSize: 11 },
});
