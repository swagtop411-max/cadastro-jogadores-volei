import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { VideoView, useVideoPlayer } from 'expo-video';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { db } from '@/src/config/firebase';
import { uploadToCloudinary, type LocalMedia } from '@/src/config/cloudinary';
import { useAuth } from '@/src/providers/AuthProvider';
import { createStory } from '@/src/services/stories';
import { colors, radii, spacing } from '@/src/theme';

type PublishMode = 'feed' | 'story' | 'reel';

function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, current => { current.loop = true; current.muted = true; current.play(); });
  return <VideoView player={player} style={styles.storyPreview} contentFit="contain" nativeControls />;
}

export default function CreateScreen() {
  const { user } = useAuth();
  const [mode, setMode] = useState<PublishMode>('feed');
  const [media, setMedia] = useState<LocalMedia | null>(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const pickerTypes = mode === 'feed' ? ['images'] as const : mode === 'reel' ? ['videos'] as const : ['images', 'videos'] as const;

  function acceptAsset(asset: ImagePicker.ImagePickerAsset) {
    const fallbackMime = asset.type === 'video' ? 'video/mp4' : 'image/jpeg';
    setMedia({ uri: asset.uri, mimeType: asset.mimeType || fallbackMime, fileName: asset.fileName, fileSize: asset.fileSize });
    setStatus('');
  }

  async function camera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Autorize a câmera para capturar conteúdo pelo aplicativo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: [...pickerTypes],
      cameraType: ImagePicker.CameraType.back,
      allowsEditing: false,
      quality: 1,
      videoMaxDuration: 60,
    });
    if (!result.canceled) acceptAsset(result.assets[0]);
  }

  async function gallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: [...pickerTypes],
      allowsEditing: false,
      quality: 1,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      selectionLimit: 1,
    });
    if (!result.canceled) acceptAsset(result.assets[0]);
  }

  async function profileName() {
    if (!user) return 'Atleta';
    const profileSnap = await getDoc(doc(db, 'perfis', user.uid));
    return profileSnap.exists() ? String(profileSnap.data().nome || 'Atleta') : user.displayName || 'Atleta';
  }

  async function publishFeed() {
    if (!user || !media) return;
    if (String(media.mimeType || '').startsWith('video/')) throw new Error('O Feed simples aceita imagem. Use Reel para vídeo.');
    if ((media.fileSize || 0) > 25 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 25 MB.');
    const upload = await uploadToCloudinary(media);
    const nome = await profileName();
    const mime = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(upload.mime) ? upload.mime : 'image/jpeg';
    await addDoc(collection(db, 'publicacoes'), {
      ownerUid: user.uid,
      ownerEmail: user.email || '',
      nome,
      texto: caption.trim(),
      imagem: upload.url,
      imagemUrl: upload.url,
      imagemPath: upload.publicId,
      imagemMime: mime,
      imagemTamanho: upload.bytes,
      legenda: caption.trim(),
      tipo: 'imagem',
      midias: [],
      hashtags: [],
      mencoes: [],
      armazenamento: 'cloudinary',
      aprovado: true,
      status: 'publicado',
      criadoEm: serverTimestamp(),
    });
  }

  async function publishReel() {
    if (!user || !media) return;
    if (!String(media.mimeType || '').startsWith('video/')) throw new Error('Selecione um vídeo para publicar como Reel.');
    if ((media.fileSize || 0) > 45 * 1024 * 1024) throw new Error('O vídeo deve ter no máximo 45 MB.');
    const upload = await uploadToCloudinary(media);
    const nome = await profileName();
    const mime = ['video/mp4', 'video/webm', 'video/quicktime'].includes(upload.mime) ? upload.mime : 'video/mp4';
    await addDoc(collection(db, 'videos'), {
      ownerUid: user.uid,
      nome,
      videoUrl: upload.url,
      videoPath: upload.publicId,
      videoMime: mime,
      videoTamanho: upload.bytes,
      legenda: caption.trim(),
      hashtags: [],
      mencoes: [],
      aprovado: true,
      status: 'publicado',
      criadoEm: serverTimestamp(),
    });
  }

  async function publish() {
    if (!user || !media) return;
    setBusy(true);
    setStatus(mode === 'story' ? 'Publicando Story...' : mode === 'reel' ? 'Publicando Reel...' : 'Enviando imagem original...');
    try {
      if (mode === 'story') await createStory(media, user, caption);
      else if (mode === 'reel') await publishReel();
      else await publishFeed();
      setCaption('');
      setMedia(null);
      setStatus(mode === 'story' ? 'Story publicado por 24 horas no app e no site.' : mode === 'reel' ? 'Reel publicado no app e na área de Reels do site.' : 'Publicado! A mesma foto já pode aparecer no site.');
    } catch (error: any) {
      console.error(error);
      setStatus(error?.message || 'Não foi possível publicar.');
    } finally {
      setBusy(false);
    }
  }

  function changeMode(next: PublishMode) {
    setMode(next);
    setMedia(null);
    setStatus('');
  }

  const isVideo = String(media?.mimeType || '').startsWith('video/');
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.kicker}>PUBLICAÇÃO SINCRONIZADA</Text>
      <Text style={styles.title}>Criar</Text>
      <Text style={styles.subtitle}>Feed, Story e Reel usam o mesmo Firebase e Cloudinary do site.</Text>

      <View style={styles.modeRow}>
        <Pressable style={[styles.modeButton, mode === 'feed' && styles.modeActive]} onPress={() => changeMode('feed')}><Text style={[styles.modeText, mode === 'feed' && styles.modeTextActive]}>▣ FEED</Text></Pressable>
        <Pressable style={[styles.modeButton, mode === 'story' && styles.modeActive]} onPress={() => changeMode('story')}><Text style={[styles.modeText, mode === 'story' && styles.modeTextActive]}>◉ STORY</Text></Pressable>
        <Pressable style={[styles.modeButton, mode === 'reel' && styles.modeActive]} onPress={() => changeMode('reel')}><Text style={[styles.modeText, mode === 'reel' && styles.modeTextActive]}>▶ REEL</Text></Pressable>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.secondary} onPress={camera}><Text style={styles.secondaryText}>📷 CÂMERA</Text></Pressable>
        <Pressable style={styles.secondary} onPress={gallery}><Text style={styles.secondaryText}>▣ GALERIA</Text></Pressable>
      </View>

      {media ? (isVideo ? <VideoPreview uri={media.uri} /> : <Image source={{ uri: media.uri }} style={[styles.preview, mode !== 'feed' && styles.storyPreview]} contentFit="contain" />) : <View style={styles.empty}><Text style={styles.emptyText}>{mode === 'reel' ? 'Grave ou selecione um vídeo.' : 'Selecione ou capture uma mídia.'}</Text></View>}

      <TextInput
        value={caption}
        onChangeText={setCaption}
        placeholder={mode === 'story' ? 'Legenda do Story...' : mode === 'reel' ? 'Legenda do Reel...' : 'Escreva uma legenda...'}
        placeholderTextColor={colors.muted}
        multiline
        maxLength={2200}
        style={styles.caption}
      />
      {!!status && <Text style={styles.status}>{status}</Text>}
      <Pressable disabled={!media || busy} style={[styles.publish, (!media || busy) && { opacity: 0.45 }]} onPress={publish}>
        <Text style={styles.publishText}>{busy ? 'PUBLICANDO...' : mode === 'story' ? 'PUBLICAR STORY' : mode === 'reel' ? 'PUBLICAR REEL' : 'PUBLICAR NO APP + SITE'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, paddingBottom: 100, backgroundColor: colors.background, flexGrow: 1 },
  kicker: { color: colors.cyan, fontWeight: '900', letterSpacing: 2, fontSize: 10 },
  title: { color: colors.ink, fontSize: 30, fontWeight: '900', marginTop: 5 },
  subtitle: { color: colors.muted, lineHeight: 20, marginTop: 6, marginBottom: 14 },
  modeRow: { flexDirection: 'row', gap: 7, marginBottom: 14 },
  modeButton: { flex: 1, minHeight: 44, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  modeActive: { backgroundColor: colors.cyan, borderColor: colors.cyan },
  modeText: { color: colors.ink, fontWeight: '900', fontSize: 10 },
  modeTextActive: { color: colors.white },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  secondary: { flex: 1, minHeight: 48, borderRadius: radii.md, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  secondaryText: { color: colors.white, fontSize: 11, fontWeight: '900' },
  preview: { width: '100%', aspectRatio: 1, borderRadius: radii.lg, backgroundColor: '#E7EDF3' },
  storyPreview: { width: '100%', aspectRatio: 9 / 16, borderRadius: radii.lg, backgroundColor: '#06101A' },
  empty: { width: '100%', aspectRatio: 1.3, borderRadius: radii.lg, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.muted },
  caption: { minHeight: 110, marginTop: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 14, textAlignVertical: 'top', color: colors.ink },
  status: { color: colors.muted, fontWeight: '700', marginTop: 10 },
  publish: { minHeight: 54, borderRadius: radii.md, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  publishText: { color: colors.white, fontWeight: '900', letterSpacing: 0.8 },
});
