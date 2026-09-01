import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/src/providers/AuthProvider';
import { getStory, markStoryViewed, type StoryItem } from '@/src/services/stories';
import { colors } from '@/src/theme';

function StoryVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, current => { current.loop = false; current.play(); });
  return <VideoView player={player} style={styles.media} contentFit="contain" nativeControls={false} />;
}

export default function StoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [story, setStory] = useState<StoryItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getStory(id).then(item => {
      setStory(item);
      setLoading(false);
      if (item && user) markStoryViewed(item.id, user.uid).catch(() => undefined);
    }).catch(() => setLoading(false));
  }, [id, user]);

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.cyan} size="large" /></View>;
  if (!story) return <View style={styles.center}><Text style={styles.muted}>Story não encontrado.</Text></View>;

  const isVideo = story.tipo === 'video' || story.mediaType === 'video';
  return (
    <View style={styles.page}>
      <View style={styles.topBar}>
        <Pressable style={styles.user} onPress={() => story.ownerUid && router.push(`/profile/${story.ownerUid}` as any)}>
          <View style={styles.avatar}><Text>🏐</Text></View>
          <Text style={styles.name}>{story.nome || 'Atleta'}</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} hitSlop={12}><Text style={styles.close}>×</Text></Pressable>
      </View>
      <View style={styles.mediaWrap}>
        {isVideo ? <StoryVideo uri={story.mediaUrl} /> : <Image source={{ uri: story.mediaUrl }} style={styles.media} contentFit="contain" cachePolicy="memory-disk" transition={120} />}
      </View>
      {!!story.legenda && <View style={styles.captionBox}><Text style={styles.caption}>{story.legenda}</Text></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#02060A' },
  center: { flex: 1, backgroundColor: '#02060A', alignItems: 'center', justifyContent: 'center' },
  muted: { color: '#A7B6C4' },
  topBar: { position: 'absolute', zIndex: 4, top: 0, left: 0, right: 0, paddingTop: 56, paddingHorizontal: 16, paddingBottom: 14, backgroundColor: 'rgba(2,6,10,.62)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  user: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.navySoft, borderWidth: 2, borderColor: colors.cyan, alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.white, fontWeight: '900' },
  close: { color: colors.white, fontSize: 34, lineHeight: 36 },
  mediaWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  media: { width: '100%', height: '100%' },
  captionBox: { position: 'absolute', left: 20, right: 20, bottom: 40, backgroundColor: 'rgba(0,0,0,.55)', borderRadius: 16, padding: 13 },
  caption: { color: colors.white, textAlign: 'center', lineHeight: 20, fontWeight: '700' },
});
