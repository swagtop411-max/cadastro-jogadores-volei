import { Image } from 'expo-image';
import { router } from 'expo-router';
import { collection, limit, onSnapshot, query } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { db } from '@/src/config/firebase';
import type { PublicProfile } from '@/src/types/social';
import { colors, radii, spacing } from '@/src/theme';

const normalize = (value: unknown) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function ExploreScreen() {
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => onSnapshot(query(collection(db, 'perfis'), limit(100)), snapshot => {
    setProfiles(snapshot.docs.map(item => ({ uid: item.id, ...item.data() } as PublicProfile)));
  }), []);

  const visible = useMemo(() => {
    const needle = normalize(search.trim());
    if (!needle) return profiles;
    return profiles.filter(profile => normalize([
      profile.nome,
      profile.cidade,
      profile.uf,
      profile.categoria,
      profile.posicao,
      profile.time,
      profile.modalidade,
    ].join(' ')).includes(needle));
  }, [profiles, search]);

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.kicker}>DESCOBRIR</Text>
        <Text style={styles.title}>Atletas</Text>
        <TextInput value={search} onChangeText={setSearch} placeholder="Nome, cidade, categoria, posição..." placeholderTextColor={colors.muted} style={styles.search} />
      </View>
      <FlatList
        data={visible}
        keyExtractor={item => item.uid}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum atleta encontrado.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/profile/${item.uid}` as any)}>
            {item.fotoUrl ? <Image source={{ uri: item.fotoUrl }} style={styles.avatar} contentFit="cover" cachePolicy="memory-disk" /> : <View style={styles.avatarFallback}><Text>🏐</Text></View>}
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.nome || 'Atleta'}</Text>
              <Text style={styles.meta}>{[item.cidade, item.uf, item.categoria].filter(Boolean).join(' • ')}</Text>
              <Text style={styles.meta}>{[item.posicao, item.time].filter(Boolean).join(' • ')}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.md, backgroundColor: colors.navy },
  kicker: { color: colors.cyan, fontWeight: '900', letterSpacing: 2, fontSize: 10 },
  title: { color: colors.white, fontWeight: '900', fontSize: 29, marginTop: 4, marginBottom: 12 },
  search: { backgroundColor: colors.surface, borderRadius: radii.md, minHeight: 48, paddingHorizontal: 14, color: colors.ink },
  list: { padding: spacing.md, gap: 10, paddingBottom: 100 },
  card: { backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarFallback: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.ink, fontWeight: '900', fontSize: 16 },
  meta: { color: colors.muted, fontSize: 11, marginTop: 4 },
  arrow: { color: colors.cyan, fontSize: 30, fontWeight: '700' },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 50 },
});
