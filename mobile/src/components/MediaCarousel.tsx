import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import type { FeedMedia } from '@/src/types/social';
import { colors } from '@/src/theme';

function VideoSlide({ uri, width }: { uri: string; width: number }) {
  const player = useVideoPlayer(uri, current => { current.loop = true; current.muted = true; });
  return <VideoView player={player} style={[styles.media, { width }]} contentFit="contain" nativeControls />;
}

export function MediaCarousel({ media }: { media: FeedMedia[] }) {
  const { width: screenWidth } = useWindowDimensions();
  const width = Math.min(screenWidth - 32, 720);
  const [index, setIndex] = useState(0);
  const list = useRef<FlatList<FeedMedia>>(null);
  if (!media.length) return null;

  function onMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(event.nativeEvent.contentOffset.x / Math.max(1, width));
    setIndex(Math.min(media.length - 1, Math.max(0, next)));
  }

  return (
    <View style={[styles.wrap, { width }]}>
      <FlatList
        ref={list}
        data={media}
        keyExtractor={(item, i) => `${item.url}-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => {
          const isVideo = String(item.tipo || item.type || item.mime || '').startsWith('video');
          return isVideo
            ? <VideoSlide uri={item.url} width={width} />
            : <Image source={{ uri: item.url }} style={[styles.media, { width }]} contentFit="contain" cachePolicy="memory-disk" transition={120} />;
        }}
      />
      {media.length > 1 && <>
        <View style={styles.counter}><Text style={styles.counterText}>{index + 1}/{media.length}</Text></View>
        <View style={styles.dots}>{media.map((_, i) => <View key={i} style={[styles.dot, i === index && styles.dotActive]} />)}</View>
      </>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center', position: 'relative', backgroundColor: '#020609', overflow: 'hidden' },
  media: { aspectRatio: 1, backgroundColor: '#020609' },
  counter: { position: 'absolute', right: 10, top: 10, backgroundColor: 'rgba(0,0,0,.65)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  counterText: { color: colors.white, fontSize: 10, fontWeight: '900' },
  dots: { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,.5)' },
  dotActive: { backgroundColor: colors.cyan },
});
