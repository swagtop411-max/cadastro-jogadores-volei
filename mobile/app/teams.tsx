import { Image } from 'expo-image';
import { collection, limit, onSnapshot, query } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { db } from '@/src/config/firebase';
import { colors, radii, spacing } from '@/src/theme';

type Team = { id: string; nome?: string; cidade?: string; modalidade?: string; categoria?: string; logo?: string; atletas?: string[]; plano?: string; status?: string };
const normalize = (value: unknown) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function TeamsScreen() {
  const [items, setItems] = useState<Team[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => onSnapshot(query(collection(db, 'equipes'), limit(200)), snapshot => {
    setItems(snapshot.docs
      .map(item => ({ id: item.id, ...item.data() } as Team))
      .filter(item => item.nome && normalize(item.status) !== 'inativo')
      .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')));
  }), []);

  const visible = useMemo(() => {
    const needle = normalize(search.trim());
    if (!needle) return items;
    return items.filter(item => normalize([item.nome, item.cidade, item.modalidade, item.categoria, ...(item.atletas || [])].join(' ')).includes(needle));
  }, [items, search]);

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.kicker}>TIMES DA REDE</Text>
        <Text style={styles.title}>Equipes</Text>
        <TextInput value={search} onChangeText={setSearch} placeholder="Equipe, cidade, atleta..." placeholderTextColor={colors.muted} style={styles.search} />
      </View>
      <FlatList
        data={visible}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma equipe encontrada.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.top}>
              {item.logo ? <Image source={{ uri: item.logo }} style={styles.logo} contentFit="contain" cachePolicy="memory-disk" /> : <View style={styles.logoFallback}><Text style={{ fontSize: 28 }}>👥</Text></View>}
              <View style={{ flex: 1 }}>
                <Text style={styles.plan}>{item.plano || 'Gratuito'}</Text>
                <Text style={styles.name}>{item.nome}</Text>
                <Text style={styles.meta}>📍 {item.cidade || 'Cidade não informada'}</Text>
              </View>
            </View>
            <View style={styles.tags}><Text style={styles.tag}>🏐 {item.modalidade || 'Modalidade'}</Text><Text style={styles.tag}>🎯 {item.categoria || 'Categoria'}</Text><Text style={styles.tag}>👥 {(item.atletas || []).length} atletas</Text></View>
            {(item.atletas || []).length > 0 && <View style={styles.roster}><Text style={styles.rosterTitle}>ATLETAS</Text><Text style={styles.rosterText}>{(item.atletas || []).slice(0, 12).join(' • ')}</Text></View>}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.navy, padding: spacing.lg },
  kicker: { color: colors.green, fontWeight: '900', letterSpacing: 2, fontSize: 10 },
  title: { color: colors.white, fontSize: 29, fontWeight: '900', marginTop: 4, marginBottom: 12 },
  search: { minHeight: 48, borderRadius: radii.md, backgroundColor: colors.surface, paddingHorizontal: 14, color: colors.ink },
  list: { padding: spacing.md, gap: 12, paddingBottom: 80 },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  top: { flexDirection: 'row', gap: 13, alignItems: 'center' },
  logo: { width: 74, height: 74, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  logoFallback: { width: 74, height: 74, borderRadius: radii.md, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  plan: { color: colors.cyan, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  name: { color: colors.ink, fontSize: 19, fontWeight: '900', marginTop: 3 },
  meta: { color: colors.muted, fontSize: 11, marginTop: 4 },
  tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 12 },
  tag: { color: colors.ink, backgroundColor: colors.surfaceMuted, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 7, fontSize: 10, fontWeight: '700' },
  roster: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 12, paddingTop: 11 },
  rosterTitle: { color: colors.ink, fontWeight: '900', fontSize: 10, letterSpacing: 1.2 },
  rosterText: { color: colors.muted, marginTop: 7, lineHeight: 18, fontSize: 11 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 50 },
});
