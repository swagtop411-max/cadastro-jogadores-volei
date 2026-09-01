import { collection, doc, getDoc, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { db } from '@/src/config/firebase';
import { useAuth } from '@/src/providers/AuthProvider';
import { markConversationRead, profileOf, sendTextMessage } from '@/src/services/socialActions';
import { colors, radii, spacing } from '@/src/theme';

type MessageItem = { id: string; senderUid: string; text?: string; type?: string; createdAt?: unknown };

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [text, setText] = useState('');
  const [otherUid, setOtherUid] = useState('');
  const [otherName, setOtherName] = useState('Conversa');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!conversationId || !user) return;
    getDoc(doc(db, 'conversas', conversationId)).then(async snapshot => {
      if (!snapshot.exists()) return;
      const participants = (snapshot.data().participants || []) as string[];
      const uid = participants.find(value => value !== user.uid) || '';
      setOtherUid(uid);
      if (uid) {
        const profile = await profileOf(uid).catch(() => null);
        if (profile?.nome) setOtherName(profile.nome);
      }
      markConversationRead(conversationId, user.uid).catch(() => undefined);
    });

    const q = query(collection(db, 'conversas', conversationId, 'mensagens'), orderBy('createdAt', 'asc'), limit(200));
    return onSnapshot(q, snapshot => {
      setMessages(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as MessageItem)));
      markConversationRead(conversationId, user.uid).catch(() => undefined);
    });
  }, [conversationId, user]);

  async function send() {
    if (!user || !conversationId || !text.trim() || busy) return;
    setBusy(true);
    try {
      await sendTextMessage(conversationId, user, text);
      setText('');
    } finally {
      setBusy(false);
    }
  }

  const title = useMemo(() => otherName || 'Conversa', [otherName]);
  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Pressable style={styles.header} onPress={() => otherUid && router.push(`/profile/${otherUid}` as any)}>
        <View style={styles.avatar}><Text>🏐</Text></View>
        <View style={{ flex: 1 }}><Text style={styles.name}>{title}</Text><Text style={styles.meta}>Toque para abrir o perfil</Text></View>
      </Pressable>

      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const mine = item.senderUid === user?.uid;
          return <View style={[styles.bubble, mine ? styles.mine : styles.other]}><Text style={[styles.message, mine && styles.mineText]}>{item.text || (item.type === 'image' ? '📷 Foto' : 'Mensagem')}</Text></View>;
        }}
        ListEmptyComponent={<Text style={styles.empty}>Comece a conversa.</Text>}
      />

      <View style={styles.composer}>
        <TextInput value={text} onChangeText={setText} placeholder="Mensagem..." placeholderTextColor={colors.muted} maxLength={2000} style={styles.input} />
        <Pressable disabled={!text.trim() || busy} onPress={send} style={[styles.send, (!text.trim() || busy) && { opacity: 0.45 }]}><Text style={styles.sendText}>➤</Text></Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md, backgroundColor: colors.navy },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.navySoft, borderWidth: 2, borderColor: colors.cyan, alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.white, fontWeight: '900', fontSize: 17 },
  meta: { color: '#B9C8D6', fontSize: 10, marginTop: 3 },
  list: { padding: spacing.md, gap: 7, paddingBottom: 90 },
  bubble: { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 13, paddingVertical: 10 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.cyan },
  other: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  message: { color: colors.ink, lineHeight: 19 },
  mineText: { color: colors.white },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40 },
  composer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 8, padding: 10, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, minHeight: 46, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted, paddingHorizontal: 15, color: colors.ink },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.cyan, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: colors.white, fontWeight: '900', fontSize: 20 },
});
