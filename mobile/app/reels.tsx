import { router } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, Share, StyleSheet, Text, useWindowDimensions, View, type ViewToken } from 'react-native';
import { db } from '@/src/config/firebase';
import { useAuth } from '@/src/providers/AuthProvider';
import { getLikeSummary, profileOf, toggleLike } from '@/src/services/socialActions';
import type { FeedPost, PublicProfile } from '@/src/types/social';
import { colors } from '@/src/theme';

type Reel = { id: string; ownerUid: string; nome?: string; videoUrl: string; legenda?: string; aprovado?: boolean; status?: string; criadoEm?: any };

function ReelCard({ reel, active, height }: { reel: Reel; active: boolean; height: number }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [busy, setBusy] = useState(false);
  const player = useVideoPlayer(reel.videoUrl, current => {
    current.loop = true;
    current.muted = false;
  });

  useEffect(() => {
    profileOf(reel.ownerUid).then(setProfile).catch(() => undefined);
    getLikeSummary(reel.id, user?.uid).then(summary => { setLiked(summary.liked); setLikes(summary.count); }).catch(() => undefined);
  }, [reel.id, reel.ownerUid, user?.uid]);

  useEffect(() => {
    if (active) player.play();
    else player.pause();
  }, [active, player]);

  async function like() {
    if (!user || busy) return;
    setBusy(true);
    const previous = liked;
    setLiked(!previous);
    setLikes(value => Math.max(0, value + (previous ? -1 : 1)));
    try {
      const next = await toggleLike({ id: reel.id, ownerUid: reel.ownerUid } as FeedPost, user);
      setLiked(next);
    } catch {
      setLiked(previous);
      setLikes(value => Math.max(0, value + (previous ? 1 : -1)));
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    await Share.share({ message: `${reel.legenda || 'Confira este vídeo de atleta'}\nhttps://cadastrodeatletas.com.br/perfil-social.html?uid=${encodeURIComponent(reel.ownerUid)}` });
  }

  return (
    <View style={[styles.reel, { height }]}>
      <VideoView player={player} style={styles.video} contentFit="contain" nativeControls={false} />
      <View style={styles.gradient} pointerEvents="none" />
      <View style={styles.info}>
        <Pressable onPress={() => router.push(`/profile/${reel.ownerUid}` as any)}>
          <Text style={styles.author}>@ {profile?.nome || reel.nome || 'Atleta'}</Text>
        </Pressable>
        {!!reel.legenda && <Text style={styles.caption}>{reel.legenda}</Text>}
      </View>
      <View style={styles.tools}>
        <Pressable style={styles.tool} onPress={like}><Text style={[styles.toolIcon, liked && { color: '#FF5B69' }]}>{liked ? '♥' : '♡'}</Text><Text style={styles.toolLabel}>{likes}</Text></Pressable>
        <Pressable style={styles.tool} onPress={share}><Text style={styles.toolIcon}>↗</Text><Text style={styles.toolLabel}>Enviar</Text></Pressable>
        <Pressable style={styles.tool} onPress={() => router.push(`/profile/${reel.ownerUid}` as any)}><Text style={styles.toolIcon}>◎</Text><Text style={styles.toolLabel}>Perfil</Text></Pressable>
      </View>
    </View>
  );
}

export default function ReelsScreen() {
  const { height } = useWindowDimensions();
  const reelHeight = Math.max(520, height - 110);
  const [items, setItems] = useState<Reel[]>([]);
  const [activeId, setActiveId] = useState('');
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 72 }).current;
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken<Reel>[] }) => {
    const first = viewableItems.find(item => item.isViewable)?.item;
    if (first) setActiveId(first.id);
  }, []);

  useEffect(() => onSnapshot(query(collection(db, 'videos'), where('aprovado', '==', true), limit(120)), snapshot => {
    const next = snapshot.docs
      .map(item => ({ id: item.id, ...item.data() } as Reel))
      .filter(item => !!item.videoUrl && !!item.ownerUid && item.status !== 'pendente')
      .sort((a, b) => (b.criadoEm?.toMillis?.() || b.criadoEm?.seconds * 1000 || 0) - (a.criadoEm?.toMillis?.() || a.criadoEm?.seconds * 1000 || 0));
    setItems(next);
    if (!activeId && next[0]) setActiveId(next[0].id);
  }), [activeId]);

  return (
    <View style={styles.page}>
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        pagingEnabled
        snapToInterval={reelHeight}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        renderItem={({ item }) => <ReelCard reel={item} active={item.id === activeId} height={reelHeight} />}
        ListEmptyComponent={<View style={[styles.empty, { height: reelHeight }]}><Text style={styles.emptyTitle}>Nenhum Reel ainda</Text><Text style={styles.emptyText}>Vídeos publicados no site aparecerão aqui automaticamente.</Text></View>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#000' },
  reel: { position: 'relative', backgroundColor: '#000', overflow: 'hidden' },
  video: { ...StyleSheet.absoluteFillObject },
  gradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '48%', backgroundColor: 'rgba(0,0,0,.28)' },
  info: { position: 'absolute', left: 16, right: 82, bottom: 30 },
  author: { color: colors.white, fontWeight: '900', fontSize: 14 },
  caption: { color: colors.white, lineHeight: 20, marginTop: 8, fontSize: 12 },
  tools: { position: 'absolute', right: 12, bottom: 24, gap: 10 },
  tool: { width: 56, alignItems: 'center' },
  toolIcon: { color: colors.white, fontSize: 28, fontWeight: '800' },
  toolLabel: { color: colors.white, fontSize: 9, fontWeight: '800', marginTop: 2 },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { color: colors.white, fontWeight: '900', fontSize: 20 },
  emptyText: { color: '#AEB9C5', textAlign: 'center', lineHeight: 19, marginTop: 7 },
});
