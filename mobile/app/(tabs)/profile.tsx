import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { db } from '@/src/config/firebase';
import { useAuth } from '@/src/providers/AuthProvider';
import { approveFollowRequest, isPrivateProfile, rejectFollowRequest, subscribeFollowRequests, type FollowRequest } from '@/src/services/privacy';
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
  const [privateProfile, setPrivateProfile] = useState(false);
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [busyUid, setBusyUid] = useState('');

  useEffect(() => {
    if (!user) return;
    isPrivateProfile(user.uid).then(setPrivateProfile).catch(() => undefined);
    const unsubProfile = onSnapshot(doc(db, 'perfis', user.uid), snapshot => {
      setProfile(snapshot.exists() ? ({ uid: snapshot.id, ...snapshot.data() } as PublicProfile) : null);
      setLoading(false);
    }, () => setLoading(false));
    const unsubRequests = subscribeFollowRequests(user.uid, setRequests);
    return () => { unsubProfile(); unsubRequests(); };
  }, [user]);

  async function decide(requesterUid: string, approve: boolean) {
    if (!user || busyUid) return;
    setBusyUid(requesterUid);
    try {
      if (approve) await approveFollowRequest(user.uid, requesterUid);
      else await rejectFollowRequest(user.uid, requesterUid);
    } finally {
      setBusyUid('');
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.cyan} /></View>;

  const insta = instagramUrl(profile?.instagram);
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.hero}>
        {profile?.fotoUrl ? <Image source={{ uri: profile.fotoUrl }} style={styles.avatar} contentFit="cover" cachePolicy="memory-disk" /> : <View style={styles.avatarFallback}><Text style={{ fontSize: 34 }}>🏐</Text></View>}
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{profile?.nome || user?.displayName || 'Atleta'} {privateProfile ? '🔒' : ''}</Text>
          <Text style={styles.location}>{[profile?.cidade, profile?.uf].filter(Boolean).join(' • ') || 'Localização não informada'}</Text>
        </View>
      </View>

      <Pressable style={styles.editProfile} onPress={() => router.push('/edit-profile' as any)}>
        <Text style={styles.editProfileText}>✎ EDITAR PERFIL</Text>
      </Pressable>

      <View style={styles.stats}>
        <View style={styles.stat}><Text style={styles.statValue}>{profile?.categoria || '—'}</Text><Text style={styles.statLabel}>Categoria</Text></View>
        <View style={styles.stat}><Text style={styles.statValue}>{profile?.posicao || '—'}</Text><Text style={styles.statLabel}>Posição</Text></View>
        <View style={styles.stat}><Text style={styles.statValue}>{profile?.time || '—'}</Text><Text style={styles.statLabel}>Equipe</Text></View>
      </View>

      <View style={styles.quickActions}>
        <Pressable style={styles.quickButton} onPress={() => router.push('/stories-archive' as any)}><Text style={styles.quickIcon}>◉</Text><Text style={styles.quickText}>STORIES POSTADOS</Text></Pressable>
        <Pressable style={styles.quickButton} onPress={() => router.push('/saved' as any)}><Text style={styles.quickIcon}>▣</Text><Text style={styles.quickText}>SALVOS</Text></Pressable>
        <Pressable style={styles.quickButton} onPress={() => router.push('/reels' as any)}><Text style={styles.quickIcon}>▶</Text><Text style={styles.quickText}>REELS</Text></Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>Perfil esportivo</Text>
        <Text style={styles.bio}>{profile?.bio || 'Use Editar Perfil para adicionar sua apresentação esportiva.'}</Text>
        {!!insta && <Pressable style={styles.instagram} onPress={() => Linking.openURL(insta)}><Text style={styles.instagramText}>◎ ABRIR INSTAGRAM</Text></Pressable>}
      </View>

      {requests.length > 0 && <View style={styles.card}>
        <Text style={styles.heading}>Solicitações para seguir</Text>
        <Text style={styles.bio}>Aprove quem poderá acompanhar seu perfil privado.</Text>
        <View style={styles.requests}>
          {requests.map(request => (
            <View style={styles.request} key={request.uid}>
              {request.profile?.fotoUrl ? <Image source={{ uri: request.profile.fotoUrl }} style={styles.requestAvatar} contentFit="cover" /> : <View style={styles.requestAvatarFallback}><Text>🏐</Text></View>}
              <View style={{ flex: 1 }}><Text style={styles.requestName}>{request.profile?.nome || 'Atleta'}</Text><Text style={styles.requestMeta}>{[request.profile?.cidade, request.profile?.categoria].filter(Boolean).join(' • ')}</Text></View>
              <View style={styles.requestActions}>
                <Pressable disabled={!!busyUid} style={styles.approve} onPress={() => decide(request.uid, true)}><Text style={styles.approveText}>✓</Text></Pressable>
                <Pressable disabled={!!busyUid} style={styles.reject} onPress={() => decide(request.uid, false)}><Text style={styles.rejectText}>×</Text></Pressable>
              </View>
            </View>
          ))}
        </View>
      </View>}

      <View style={styles.card}>
        <Text style={styles.heading}>Sincronização</Text>
        <Text style={styles.bio}>Este perfil lê a mesma coleção pública `perfis` do site. Alterações feitas em uma plataforma aparecem na outra.</Text>
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
  editProfile: { minHeight: 46, borderRadius: radii.md, backgroundColor: colors.cyan, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  editProfileText: { color: colors.white, fontWeight: '900', letterSpacing: 1 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 12 },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radii.md, padding: 12, borderWidth: 1, borderColor: colors.border },
  statValue: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  statLabel: { color: colors.muted, fontSize: 10, marginTop: 4 },
  quickActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  quickButton: { flex: 1, minHeight: 68, borderRadius: radii.md, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', padding: 6 },
  quickIcon: { color: colors.cyan, fontSize: 19, fontWeight: '900' },
  quickText: { color: colors.white, fontSize: 8, fontWeight: '900', textAlign: 'center', marginTop: 5 },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginTop: 12 },
  heading: { color: colors.ink, fontWeight: '900', fontSize: 18, marginBottom: 8 },
  bio: { color: colors.muted, lineHeight: 20 },
  instagram: { alignSelf: 'flex-start', backgroundColor: colors.navy, borderRadius: radii.pill, paddingHorizontal: 16, paddingVertical: 11, marginTop: 14 },
  instagramText: { color: colors.white, fontSize: 11, fontWeight: '900' },
  requests: { gap: 9, marginTop: 13 },
  request: { flexDirection: 'row', gap: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  requestAvatar: { width: 44, height: 44, borderRadius: 22 },
  requestAvatarFallback: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  requestName: { color: colors.ink, fontWeight: '900', fontSize: 13 },
  requestMeta: { color: colors.muted, fontSize: 10, marginTop: 3 },
  requestActions: { flexDirection: 'row', gap: 6 },
  approve: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  reject: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  approveText: { color: colors.white, fontWeight: '900', fontSize: 18 },
  rejectText: { color: colors.danger, fontWeight: '900', fontSize: 20 },
  logout: { minHeight: 50, borderRadius: radii.md, borderWidth: 1, borderColor: colors.danger, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  logoutText: { color: colors.danger, fontWeight: '900' },
});
