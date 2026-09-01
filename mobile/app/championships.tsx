import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { db } from '@/src/config/firebase';
import { colors, radii, spacing } from '@/src/theme';

type Championship = { id: string; nome?: string; organizador?: string; data?: string; local?: string; descricao?: string; imagem?: string; publicado?: boolean };

const today = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

function extractLink(description?: string) {
  const text = String(description || '');
  const match = text.match(/\[link\](https?:\/\/[^\s\[]+)\[\/link\]/i);
  return { link: match?.[1] || '', description: text.replace(/\s*\[link\][\s\S]*?\[\/link\]\s*/gi, ' ').trim() };
}

function dateLabel(value?: string) {
  if (!value) return 'Data não informada';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-BR');
}

export default function ChampionshipsScreen() {
  const [items, setItems] = useState<Championship[]>([]);

  useEffect(() => onSnapshot(query(collection(db, 'campeonatos'), where('publicado', '==', true), limit(60)), snapshot => {
    const now = today();
    setItems(snapshot.docs
      .map(item => ({ id: item.id, ...item.data() } as Championship))
      .filter(item => String(item.data || '') >= now)
      .sort((a, b) => String(a.data || '').localeCompare(String(b.data || ''))));
  }), []);

  return (
    <View style={styles.page}>
      <View style={styles.header}><Text style={styles.kicker}>AGENDA ESPORTIVA</Text><Text style={styles.title}>Campeonatos</Text><Text style={styles.subtitle}>Os mesmos eventos publicados no site aparecem aqui automaticamente.</Text></View>
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Ainda não há campeonatos futuros publicados.</Text>}
        renderItem={({ item }) => {
          const parsed = extractLink(item.descricao);
          return (
            <View style={styles.card}>
              <Pressable disabled={!parsed.link} onPress={() => parsed.link && Linking.openURL(parsed.link)}>
                {item.imagem ? <Image source={{ uri: item.imagem }} style={styles.poster} contentFit="contain" cachePolicy="memory-disk" /> : <View style={styles.posterFallback}><Text style={{ fontSize: 38 }}>🏆</Text></View>}
              </Pressable>
              <View style={styles.body}>
                <Text style={styles.tag}>🏆 CAMPEONATO</Text>
                <Text style={styles.name}>{item.nome || 'Campeonato'}</Text>
                <Text style={styles.meta}>📅 {dateLabel(item.data)}</Text>
                <Text style={styles.meta}>📍 {item.local || 'Local não informado'}</Text>
                <Text style={styles.meta}>👤 {item.organizador || 'Organizador não informado'}</Text>
                {!!parsed.description && <Text style={styles.description}>{parsed.description}</Text>}
                {!!parsed.link && <Pressable style={styles.link} onPress={() => Linking.openURL(parsed.link)}><Text style={styles.linkText}>ABRIR PÁGINA / INSCRIÇÕES →</Text></Pressable>}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, backgroundColor: colors.navy },
  kicker: { color: colors.orange, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  title: { color: colors.white, fontSize: 29, fontWeight: '900', marginTop: 4 },
  subtitle: { color: '#B9C8D6', lineHeight: 19, marginTop: 5 },
  list: { padding: spacing.md, gap: 14, paddingBottom: 80 },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  poster: { width: '100%', aspectRatio: 1.25, backgroundColor: '#E8EEF4' },
  posterFallback: { width: '100%', aspectRatio: 1.25, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  body: { padding: spacing.md },
  tag: { color: colors.orange, fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  name: { color: colors.ink, fontSize: 20, fontWeight: '900', marginTop: 5, marginBottom: 8 },
  meta: { color: colors.muted, marginTop: 4, fontSize: 12 },
  description: { color: colors.ink, lineHeight: 19, marginTop: 11 },
  link: { minHeight: 46, borderRadius: radii.md, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', marginTop: 13 },
  linkText: { color: colors.white, fontSize: 11, fontWeight: '900' },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 50 },
});
