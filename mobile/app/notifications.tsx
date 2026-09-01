import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/src/providers/AuthProvider';
import { markNotificationRead, subscribeNotifications, type NotificationItem } from '@/src/services/socialActions';
import { colors, radii, spacing } from '@/src/theme';

const iconFor = (type: NotificationItem['type']) => ({ like: '♥', comment: '💬', follow: '＋', message: '✉', mention: '@' }[type] || '•');

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!user) return;
    return subscribeNotifications(user.uid, setItems);
  }, [user]);

  async function open(item: NotificationItem) {
    if (!user) return;
    if (!item.lida) markNotificationRead(user.uid, item.id).catch(() => undefined);
    if (item.type === 'follow') router.push(`/profile/${item.actorUid}` as any);
    else if (item.type === 'message') router.push(`/chat/${item.sourceId}` as any);
    else if (item.sourceId) router.push(`/post/${item.sourceId}` as any);
  }

  return (
    <View style={styles.page}>
      <View style={styles.header}><Text style={styles.kicker}>ATIVIDADE</Text><Text style={styles.title}>Notificações</Text></View>
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma notificação ainda.</Text>}
        renderItem={({ item }) => (
          <Pressable style={[styles.card, !item.lida && styles.unread]} onPress={() => open(item)}>
            <View style={styles.icon}><Text style={styles.iconText}>{iconFor(item.type)}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.actorNome || 'Atleta'}</Text>
              <Text style={styles.text}>{item.text}</Text>
            </View>
            {!item.lida && <View style={styles.dot} />}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, backgroundColor: colors.navy },
  kicker: { color: colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  title: { color: colors.white, fontSize: 29, fontWeight: '900', marginTop: 4 },
  list: { padding: spacing.md, gap: 9, paddingBottom: 80 },
  card: { backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  unread: { backgroundColor: '#F0FAFD', borderColor: colors.cyan },
  icon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.navySoft, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: colors.white, fontWeight: '900', fontSize: 17 },
  name: { color: colors.ink, fontWeight: '900' },
  text: { color: colors.muted, marginTop: 3, fontSize: 12 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.cyan },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 50 },
});
