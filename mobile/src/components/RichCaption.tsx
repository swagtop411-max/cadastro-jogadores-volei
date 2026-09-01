import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { colors } from '@/src/theme';

export function RichCaption({ text, author }: { text?: string; author?: string }) {
  const raw = String(text || '');
  const parts = raw.split(/(#[\p{L}\p{N}_-]+)/giu);
  return (
    <Text style={styles.caption}>
      {!!author && <Text style={styles.author}>{author} </Text>}
      {parts.map((part, index) => part.startsWith('#')
        ? <Text key={`${part}-${index}`} style={styles.link} onPress={() => router.push(`/hashtag/${encodeURIComponent(part.slice(1).toLowerCase())}` as any)}>{part}</Text>
        : <Text key={`${part}-${index}`}>{part}</Text>)}
    </Text>
  );
}

const styles = StyleSheet.create({
  caption: { color: colors.ink, lineHeight: 20, marginTop: 7 },
  author: { fontWeight: '900' },
  link: { color: colors.cyan, fontWeight: '900' },
});
