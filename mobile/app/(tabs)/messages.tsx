import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { db } from '@/src/config/firebase';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, radii, spacing } from '@/src/theme';

type ConversationRow = {
  id: string;
  otherUid: string;
  otherName: string;
  lastMessage: string;
  unread: boolean;
};

export default function MessagesScreen() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ConversationRow[]>([]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db, 'conversas'), where('participants', 'array-contains', user.uid)), async snapshot => {
      const next = await Promise.all(snapshot.docs.map(async conversation => {
        const data = conversation.data();
        const otherUid = (data.participants || []).find((uid: string) => uid !== user.uid) || '';
        let otherName = 'Atleta';
        if (otherUid) {
          try {
            const profile = await getDoc(doc(db, 'perfis', otherUid));
            if (profile.exists()) otherName = String(profile.data().nome || 'Atleta');
          } catch {}
        }
        return {
          id: conversation.id,
          otherUid,
          otherName,
          lastMessage: String(data.lastMessage || 'Inicie uma conversa'),
          unread: data.lastSenderUid && data.lastSenderUid !== user.uid && !(data.lastReadBy || []).includes(user.uid),
        };
      }));
      setRows(next);
    });
  }, [user]);

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.kicker}>DIRECT</Text>
        <Text style={styles.title}>Mensagens</Text>
        <Text style={styles.subtitle}>As conversas são as mesmas do site. O chat completo entra na próxima etapa.</Text>
      </View>
      <FlatList
        data={rows}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma conversa ainda.</Text>}
        renderItem={({ item }) => (
          <View style={[styles.card, item.unread && styles.unread]}>
            <View style={styles.avatar}><Text>🏐</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.otherName}</Text>
              <Text numberOfLines={1} style={styles.message}>{item.lastMessage}</Text>
            </View>
            {item.unread && <View style={styles.dot} />}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.navy, padding: spacing.lg },
  kicker: { color: colors.cyan, fontWeight: '900', letterSpacing: 2, fontSize: 10 },
  title: { color: colors.white, fontWeight: '900', fontSize: 29, marginTop: 4 },
  subtitle: { color: '#B9C8D6', marginTop: 5, lineHeight: 18 },
  list: { padding: spacing.md, gap: 9, paddingBottom: 100 },
  card: { backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  unread: { borderColor: colors.cyan, backgroundColor: '#F1FBFE' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.ink, fontWeight: '900' },
  message: { color: colors.muted, marginTop: 4, fontSize: 12 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.cyan },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 50 },
});
