import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { db } from '@/src/config/firebase';
import type { HighlightItem } from '@/src/services/highlights';
import type { StoryItem } from '@/src/services/stories';
import { colors } from '@/src/theme';

function HighlightVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, current => { current.play(); });
  return <VideoView player={player} style={styles.media} contentFit="contain" nativeControls={false} />;
}

export default function HighlightScreen() {
  const { uid, highlightId } = useLocalSearchParams<{ uid: string; highlightId: string }>();
  const [highlight, setHighlight] = useState<HighlightItem | null>(null);
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid || !highlightId) return;
    (async () => {
      try {
        const snapshot = await getDoc(doc(db, 'destaques', uid, 'itens', highlightId));
        if (!snapshot.exists()) return;
        const item = { id: snapshot.id, ...snapshot.data() } as HighlightItem;
        setHighlight(item);
        const loaded = await Promise.all((item.storyIds || []).map(async id => {
          const story = await getDoc(doc(db, 'stories', id));
          return story.exists() ? ({ id: story.id, ...story.data() } as StoryItem) : null;
        }));
        setStories(loaded.filter(Boolean) as StoryItem[]);
      } finally {
        setLoading(false);
      }
    })();
  }, [uid, highlightId]);

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.cyan} size="large" /></View>;
  const story = stories[index];
  if (!highlight || !story) return <View style={styles.center}><Text style={styles.muted}>Destaque não encontrado.</Text><Pressable onPress={() => router.back()}><Text style={styles.back}>VOLTAR</Text></Pressable></View>;
  const video = story.tipo === 'video' || story.mediaType === 'video';

  function prev() { if (index > 0) setIndex(value => value - 1); else router.back(); }
  function next() { if (index < stories.length - 1) setIndex(value => value + 1); else router.back(); }

  return (
    <View style={styles.page}>
      <View style={styles.progressRow}>{stories.map((_, i) => <View key={i} style={[styles.progress, i <= index && styles.progressDone]} />)}</View>
      <View style={styles.top}><Text style={styles.title}>{highlight.titulo}</Text><Text style={styles.count}>{index + 1}/{stories.length}</Text><Pressable onPress={() => router.back()}><Text style={styles.close}>×</Text></Pressable></View>
      <View style={styles.content}>{video ? <HighlightVideo key={story.id} uri={story.mediaUrl} /> : <Image source={{ uri: story.mediaUrl }} style={styles.media} contentFit="contain" cachePolicy="memory-disk" />}</View>
      {!!story.legenda && <Text style={styles.caption}>{story.legenda}</Text>}
      <Pressable style={[styles.nav, styles.left]} onPress={prev} />
      <Pressable style={[styles.nav, styles.right]} onPress={next} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#02060A' },
  center: { flex: 1, backgroundColor: '#02060A', alignItems: 'center', justifyContent: 'center', padding: 20 },
  muted: { color: '#A8B6C2' },
  back: { color: colors.cyan, fontWeight: '900', marginTop: 14 },
  progressRow: { position: 'absolute', zIndex: 5, top: 48, left: 10, right: 10, flexDirection: 'row', gap: 4 },
  progress: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,.28)' },
  progressDone: { backgroundColor: colors.white },
  top: { position: 'absolute', zIndex: 5, top: 60, left: 14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, color: colors.white, fontWeight: '900' },
  count: { color: '#C7D2DC', fontSize: 11 },
  close: { color: colors.white, fontSize: 31 },
  content: { flex: 1 },
  media: { width: '100%', height: '100%' },
  caption: { position: 'absolute', left: 20, right: 20, bottom: 35, zIndex: 4, color: colors.white, textAlign: 'center', backgroundColor: 'rgba(0,0,0,.5)', borderRadius: 14, padding: 11, fontWeight: '700' },
  nav: { position: 'absolute', zIndex: 3, top: 100, bottom: 0, width: '35%' },
  left: { left: 0 },
  right: { right: 0 },
});
