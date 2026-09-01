import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { VideoView, useVideoPlayer } from 'expo-video';
import { collection, doc, getDoc, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { db } from '@/src/config/firebase';
import type { LocalMedia } from '@/src/config/cloudinary';
import { useAuth } from '@/src/providers/AuthProvider';
import { sendMediaMessage } from '@/src/services/directMedia';
import { markConversationRead, profileOf, sendTextMessage } from '@/src/services/socialActions';
import { colors, radii, spacing } from '@/src/theme';

type MessageItem = { id: string; senderUid: string; text?: string; type?: 'text' | 'image' | 'video'; mediaUrl?: string; createdAt?: unknown };

function ChatVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri);
  return <VideoView player={player} style={styles.media} contentFit="contain" nativeControls />;
}

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

  async function sendMedia(media: LocalMedia) {
    if (!user || !conversationId || busy) return;
    setBusy(true);
    try {
      await sendMediaMessage(conversationId, user, media);
    } catch (error: any) {
      Alert.alert('Não foi possível enviar', error?.message || 'Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  async function camera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return Alert.alert('Permissão necessária', 'Autorize a câmera para enviar foto ou vídeo.');
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], cameraType: ImagePicker.CameraType.back, quality: 1, videoMaxDuration: 60 });
    if (!result.canceled) {
      const asset = result.assets[0];
      await sendMedia({ uri: asset.uri, mimeType: asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'), fileName: asset.fileName, fileSize: asset.fileSize });
    }
  }

  async function gallery() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 1, selectionLimit: 1 });
    if (!result.canceled) {
      const asset = result.assets[0];
      await sendMedia({ uri: asset.uri, mimeType: asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'), fileName: asset.fileName, fileSize: asset.fileSize });
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
          return <View style={[styles.bubble, mine ? styles.mine : styles.other, item.type !== 'text' && styles.mediaBubble]}>
            {item.type === 'image' && item.mediaUrl ? <Image source={{ uri: item.mediaUrl }} style={styles.media} contentFit="cover" cachePolicy="memory-disk" /> : item.type === 'video' && item.mediaUrl ? <ChatVideo uri={item.mediaUrl} /> : <Text style={[styles.message, mine && styles.mineText]}>{item.text || 'Mensagem'}</Text>}
          </View>;
        }}
        ListEmptyComponent={<Text style={styles.empty}>Comece a conversa.</Text>}
      />

      <View style={styles.composer}>
        <Pressable disabled={busy} onPress={camera} style={styles.mediaButton}><Text style={styles.mediaButtonText}>📷</Text></Pressable>
        <Pressable disabled={busy} onPress={gallery} style={styles.mediaButton}><Text style={styles.mediaButtonText}>▣</Text></Pressable>
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
  mediaBubble: { padding: 3, overflow: 'hidden' },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.cyan },
  other: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  message: { color: colors.ink, lineHeight: 19 },
  mineText: { color: colors.white },
  media: { width: 220, height: 260, borderRadius: 15, backgroundColor: '#071827' },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40 },
  composer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 6, padding: 10, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  mediaButton: { width: 38, height: 46, borderRadius: 19, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  mediaButtonText: { fontSize: 16 },
  input: { flex: 1, minHeight: 46, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted, paddingHorizontal: 15, color: colors.ink },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.cyan, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: colors.white, fontWeight: '900', fontSize: 20 },
});
