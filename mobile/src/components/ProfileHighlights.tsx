import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { subscribeHighlights, type HighlightItem } from '@/src/services/highlights';
import { colors } from '@/src/theme';

export function ProfileHighlights({ uid }: { uid: string }) {
  const [items, setItems] = useState<HighlightItem[]>([]);
  useEffect(() => uid ? subscribeHighlights(uid, setItems) : undefined, [uid]);
  if (!items.length) return null;
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>DESTAQUES</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map(item => (
          <Pressable key={item.id} style={styles.item} onPress={() => router.push(`/highlight/${uid}/${item.id}` as any)}>
            <View style={styles.ring}><Image source={{ uri: item.capaUrl }} style={styles.cover} contentFit="cover" cachePolicy="memory-disk" /></View>
            <Text style={styles.title} numberOfLines={1}>{item.titulo}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 14 },
  heading: { color: colors.ink, fontWeight: '900', fontSize: 10, letterSpacing: 1.4, marginBottom: 8 },
  row: { gap: 12, paddingRight: 8 },
  item: { width: 72, alignItems: 'center' },
  ring: { width: 68, height: 68, borderRadius: 34, borderWidth: 3, borderColor: colors.orange, padding: 2 },
  cover: { width: '100%', height: '100%', borderRadius: 31 },
  title: { color: colors.ink, fontSize: 9, fontWeight: '800', marginTop: 5, width: 70, textAlign: 'center' },
});
