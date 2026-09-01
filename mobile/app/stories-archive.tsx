import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/src/providers/AuthProvider';
import { createHighlight, deleteHighlight, subscribeHighlights, subscribeStoryArchive, type HighlightItem } from '@/src/services/highlights';
import type { StoryItem } from '@/src/services/stories';
import { colors, radii, spacing } from '@/src/theme';

export default function StoriesArchiveScreen() {
  const { user } = useAuth();
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    const a = subscribeStoryArchive(user.uid, setStories);
    const b = subscribeHighlights(user.uid, setHighlights);
    return () => { a(); b(); };
  }, [user]);

  const chosen = useMemo(() => stories.filter(item => selected.has(item.id)).slice(0, 20), [stories, selected]);

  function toggle(id: string) {
    setSelected(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else if (next.size < 20) next.add(id);
      return next;
    });
  }

  async function create() {
    if (!user || busy) return;
    setBusy(true);
    try {
      await createHighlight(user.uid, title, chosen);
      setTitle('');
      setSelected(new Set());
    } catch (error: any) {
      Alert.alert('Destaque', error?.message || 'Não foi possível criar o Destaque.');
    } finally {
      setBusy(false);
    }
  }

  function remove(item: HighlightItem) {
    if (!user) return;
    Alert.alert('Excluir Destaque?', `O Destaque “${item.titulo}” será removido. Os Stories continuarão no arquivo.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteHighlight(user.uid, item.id).catch(() => Alert.alert('Erro', 'Não foi possível excluir.')) },
    ]);
  }

  return (
    <View style={styles.page}>
      <FlatList
        data={stories}
        keyExtractor={item => item.id}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <View style={styles.header}><Text style={styles.kicker}>MEMÓRIA ESPORTIVA</Text><Text style={styles.title}>Stories postados</Text><Text style={styles.subtitle}>Depois de 24h, o Story sai da faixa ativa, mas permanece aqui até você excluir.</Text></View>
            <Text style={styles.section}>DESTAQUES</Text>
            <View style={styles.highlights}>
              {highlights.length ? highlights.map(item => (
                <Pressable key={item.id} style={styles.highlight} onLongPress={() => remove(item)}>
                  <Image source={{ uri: item.capaUrl }} style={styles.highlightCover} contentFit="cover" />
                  <Text numberOfLines={1} style={styles.highlightTitle}>{item.titulo}</Text>
                </Pressable>
              )) : <Text style={styles.emptyInline}>Nenhum Destaque criado ainda.</Text>}
            </View>
            <View style={styles.createBox}>
              <Text style={styles.createTitle}>Criar novo Destaque</Text>
              <TextInput value={title} onChangeText={setTitle} maxLength={30} placeholder="Nome do Destaque" placeholderTextColor={colors.muted} style={styles.input} />
              <Text style={styles.counter}>{chosen.length}/20 Stories selecionados</Text>
              <Pressable disabled={!chosen.length || !title.trim() || busy} onPress={create} style={[styles.createButton, (!chosen.length || !title.trim() || busy) && { opacity: .45 }]}><Text style={styles.createButtonText}>{busy ? 'CRIANDO...' : 'CRIAR DESTAQUE'}</Text></Pressable>
            </View>
            <Text style={styles.section}>ARQUIVO DE STORIES</Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>Você ainda não publicou Stories.</Text>}
        renderItem={({ item }) => {
          const active = selected.has(item.id);
          const video = item.tipo === 'video' || item.mediaType === 'video';
          return (
            <Pressable style={[styles.story, active && styles.selected]} onPress={() => toggle(item.id)}>
              {video ? <View style={styles.videoFallback}><Text style={styles.videoIcon}>▶</Text><Text style={styles.videoText}>VÍDEO</Text></View> : <Image source={{ uri: item.mediaUrl }} style={styles.storyImage} contentFit="cover" cachePolicy="memory-disk" />}
              <View style={[styles.check, active && styles.checkActive]}><Text style={styles.checkText}>{active ? '✓' : '+'}</Text></View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, paddingBottom: 90 },
  header: { backgroundColor: colors.navy, borderRadius: radii.lg, padding: spacing.lg },
  kicker: { color: colors.orange, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  title: { color: colors.white, fontSize: 28, fontWeight: '900', marginTop: 4 },
  subtitle: { color: '#B9C8D6', lineHeight: 19, marginTop: 6 },
  section: { color: colors.ink, fontWeight: '900', fontSize: 11, letterSpacing: 1.4, marginTop: 18, marginBottom: 9 },
  highlights: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  highlight: { width: 72, alignItems: 'center' },
  highlightCover: { width: 66, height: 66, borderRadius: 33, borderWidth: 3, borderColor: colors.orange },
  highlightTitle: { color: colors.ink, fontWeight: '800', fontSize: 9, marginTop: 5, maxWidth: 70 },
  emptyInline: { color: colors.muted, fontSize: 12 },
  createBox: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: 14, marginTop: 15 },
  createTitle: { color: colors.ink, fontWeight: '900' },
  input: { minHeight: 46, backgroundColor: colors.surfaceMuted, borderRadius: radii.md, color: colors.ink, paddingHorizontal: 13, marginTop: 9 },
  counter: { color: colors.muted, fontSize: 10, marginTop: 8 },
  createButton: { minHeight: 46, borderRadius: radii.md, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center', marginTop: 9 },
  createButtonText: { color: colors.white, fontWeight: '900', fontSize: 11 },
  row: { gap: 7, marginBottom: 7 },
  story: { flex: 1, aspectRatio: 9 / 14, maxWidth: '32.5%', borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent', backgroundColor: '#071827', position: 'relative' },
  selected: { borderColor: colors.cyan },
  storyImage: { width: '100%', height: '100%' },
  videoFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy },
  videoIcon: { color: colors.white, fontSize: 28 },
  videoText: { color: colors.white, fontWeight: '900', fontSize: 8, marginTop: 5 },
  check: { position: 'absolute', right: 6, top: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,.65)', alignItems: 'center', justifyContent: 'center' },
  checkActive: { backgroundColor: colors.cyan },
  checkText: { color: colors.white, fontWeight: '900' },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 30 },
});
