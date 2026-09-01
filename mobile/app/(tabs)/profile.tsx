import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { db } from '@/src/config/firebase';
import { useAuth } from '@/src/providers/AuthProvider';
import type { PublicProfile } from '@/src/types/social';
import { colors, radii, spacing } from '@/src/theme';

function instagramUrl(value?: string) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https:\/\//i.test(raw)) return raw;
  return `https://www.instagram.com/${raw.replace(/^@/, '').replace(/\/$/, '')}/`;
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, 'perfis', user.uid), snapshot => {
      setProfile(snapshot.exists() ? ({ uid: snapshot.id, ...snapshot.data() } as PublicProfile) : null);
      setLoading(false);
    }, () => setLoading(false));
  }, [user]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.cyan} /></View>;

  const insta = instagramUrl(profile?.instagram);
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.hero}>
        {profile?.fotoUrl ? <Image source={{ uri: profile.fotoUrl }} style={styles.avatar} contentFit="cover" cachePolicy="memory-disk" /> : <View style={styles.avatarFallback}><Text style={{ fontSize: 34 }}>🏐</Text></View>}
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{profile?.nome || user?.displayName || 'Atleta'}</Text>
          <Text style={styles.location}>{[profile?.cidade, profile?.uf].filter(Boolean).join(' • ') || 'Localização não informada'}</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}><Text style={styles.statValue}>{profile?.categoria || '—'}</Text><Text style={styles.statLabel}>Categoria</Text></View>
        <View style={styles.stat}><Text style={styles.statValue}>{profile?.posicao || '—'}</Text><Text style={styles.statLabel}>Posição</Text></View>
        <View style={styles.stat}><Text style={styles.statValue}>{profile?.time || '—'}</Text><Text style={styles.statLabel}>Equipe</Text></View>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>Perfil esportivo</Text>
        <Text style={styles.bio}>{profile?.bio || 'Adicione sua bio no site ou, em breve, diretamente no aplicativo.'}</Text>
        {!!insta && <Pressable style={styles.instagram} onPress={() => Linking.openURL(insta)}><Text style={styles.instagramText}>◎ ABRIR INSTAGRAM</Text></Pressable>}
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>Sincronização</Text>
        <Text style={styles.bio}>Este perfil lê a coleção pública `perfis`. Alterações feitas no site aparecem aqui automaticamente.</Text>
      </View>

      <Pressable style={styles.logout} onPress={logout}><Text style={styles.logoutText}>SAIR DA CONTA</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background, padding: spacing.md, paddingBottom: 100, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  hero: { flexDirection: 'row', gap: 16, alignItems: 'center', backgroundColor: colors.navy, borderRadius: radii.lg, padding: spacing.lg },
  avatar: { width: 86, height: 86, borderRadius: 43, borderWidth: 3, borderColor: colors.cyan },
  avatarFallback: { width: 86, height: 86, borderRadius: 43, backgroundColor: colors.navySoft, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.cyan },
  name: { color: colors.white, fontSize: 25, fontWeight: '900' },
  location: { color: '#B9C8D6', marginTop: 5 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 12 },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radii.md, padding: 12, borderWidth: 1, borderColor: colors.border },
  statValue: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  statLabel: { color: colors.muted, fontSize: 10, marginTop: 4 },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginTop: 12 },
  heading: { color: colors.ink, fontWeight: '900', fontSize: 18, marginBottom: 8 },
  bio: { color: colors.muted, lineHeight: 20 },
  instagram: { alignSelf: 'flex-start', backgroundColor: colors.navy, borderRadius: radii.pill, paddingHorizontal: 16, paddingVertical: 11, marginTop: 14 },
  instagramText: { color: colors.white, fontSize: 11, fontWeight: '900' },
  logout: { minHeight: 50, borderRadius: radii.md, borderWidth: 1, borderColor: colors.danger, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  logoutText: { color: colors.danger, fontWeight: '900' },
});
