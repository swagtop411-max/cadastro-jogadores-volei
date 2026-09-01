import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { VideoView, useVideoPlayer } from 'expo-video';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { db } from '@/src/config/firebase';
import { uploadToCloudinary, type LocalMedia } from '@/src/config/cloudinary';
import { useAuth } from '@/src/providers/AuthProvider';
import { publishCarousel } from '@/src/services/carousel';
import { createStory } from '@/src/services/stories';
import { colors, radii, spacing } from '@/src/theme';

type PublishMode = 'feed' | 'carousel' | 'story' | 'reel';

function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, current => { current.loop = true; current.muted = true; current.play(); });
  return <VideoView player={player} style={styles.storyPreview} contentFit="contain" nativeControls />;
}

function toMedia(asset: ImagePicker.ImagePickerAsset): LocalMedia {
  const fallbackMime = asset.type === 'video' ? 'video/mp4' : 'image/jpeg';
  return { uri: asset.uri, mimeType: asset.mimeType || fallbackMime, fileName: asset.fileName, fileSize: asset.fileSize };
}

export default function CreateScreen() {
  const { user } = useAuth();
  const [mode, setMode] = useState<PublishMode>('feed');
  const [media, setMedia] = useState<LocalMedia | null>(null);
  const [carouselMedia, setCarouselMedia] = useState<LocalMedia[]>([]);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const pickerTypes = mode === 'feed' ? ['images'] as const : mode === 'reel' ? ['videos'] as const : ['images', 'videos'] as const;

  function acceptAsset(asset: ImagePicker.ImagePickerAsset) {
    const next = toMedia(asset);
    if (mode === 'carousel') setCarouselMedia(current => [...current, next].slice(0, 10));
    else setMedia(next);
    setStatus('');
  }

  async function camera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Autorize a câmera para capturar conteúdo pelo aplicativo.');
      return;
    }
    if (mode === 'carousel' && carouselMedia.length >= 10) {
      setStatus('O carrossel aceita no máximo 10 mídias.');
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
    const multiple = mode === 'carousel';
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: [...pickerTypes],
      allowsEditing: false,
      allowsMultipleSelection: multiple,
      quality: 1,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      selectionLimit: multiple ? Math.max(1, 10 - carouselMedia.length) : 1,
    });
    if (!result.canceled) {
      if (multiple) setCarouselMedia(current => [...current, ...result.assets.map(toMedia)].slice(0, 10));
      else acceptAsset(result.assets[0]);
    }
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
    const cleanCaption = caption.trim();
    await addDoc(collection(db, 'publicacoes'), {
      ownerUid: user.uid,
      ownerEmail: user.email || '',
      nome,
      texto: cleanCaption,
      imagem: upload.url,
      imagemUrl: upload.url,
      imagemPath: upload.publicId,
      imagemMime: mime,
      imagemTamanho: upload.bytes,
      legenda: cleanCaption,
      tipo: 'imagem',
      midias: [],
      hashtags: [...new Set((cleanCaption.match(/#[\p{L}\p{N}_-]+/gu) || []).map(item => item.slice(1).toLowerCase()))].slice(0, 30),
      mencoes: [...new Set((cleanCaption.match(/@[a-z0-9_-]+/gi) || []).map(item => item.slice(1).toLowerCase()))].slice(0, 20),
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
    const cleanCaption = caption.trim();
    await addDoc(collection(db, 'videos'), {
      ownerUid: user.uid,
      nome,
      videoUrl: upload.url,
      videoPath: upload.publicId,
      videoMime: mime,
      videoTamanho: upload.bytes,
      legenda: cleanCaption,
      hashtags: [...new Set((cleanCaption.match(/#[\p{L}\p{N}_-]+/gu) || []).map(item => item.slice(1).toLowerCase()))].slice(0, 30),
      mencoes: [...new Set((cleanCaption.match(/@[a-z0-9_-]+/gi) || []).map(item => item.slice(1).toLowerCase()))].slice(0, 20),
      aprovado: true,
      status: 'publicado',
      criadoEm: serverTimestamp(),
    });
  }

  async function publish() {
    if (!user) return;
    if (mode === 'carousel' && carouselMedia.length < 2) {
      setStatus('Selecione pelo menos 2 mídias para o carrossel.');
      return;
    }
    if (mode !== 'carousel' && !media) return;
    setBusy(true);
    setStatus(mode === 'story' ? 'Publicando Story...' : mode === 'reel' ? 'Publicando Reel...' : mode === 'carousel' ? `Enviando ${carouselMedia.length} mídias...` : 'Enviando imagem original...');
    try {
      if (mode === 'story' && media) await createStory(media, user, caption);
      else if (mode === 'reel') await publishReel();
      else if (mode === 'carousel') await publishCarousel(user, carouselMedia, caption);
      else await publishFeed();
      setCaption('');
      setMedia(null);
      setCarouselMedia([]);
      setStatus(mode === 'story' ? 'Story publicado por 24 horas no app e no site.' : mode === 'reel' ? 'Reel publicado no app e na área de Reels do site.' : mode === 'carousel' ? 'Carrossel publicado no app e no site.' : 'Publicado! A mesma foto já pode aparecer no site.');
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
    setCarouselMedia([]);
    setStatus('');
  }

  const isVideo = String(media?.mimeType || '').startsWith('video/');
  const hasMedia = mode === 'carousel' ? carouselMedia.length >= 2 : !!media;
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.kicker}>PUBLICAÇÃO SINCRONIZADA</Text>
      <Text style={styles.title}>Criar</Text>
      <Text style={styles.subtitle}>Feed, Carrossel, Story e Reel usam o mesmo Firebase e Cloudinary do site.</Text>

      <View style={styles.modeRow}>
        <Mode label="▣ FEED" active={mode === 'feed'} onPress={() => changeMode('feed')} />
        <Mode label="▦ CARROSSEL" active={mode === 'carousel'} onPress={() => changeMode('carousel')} />
        <Mode label="◉ STORY" active={mode === 'story'} onPress={() => changeMode('story')} />
        <Mode label="▶ REEL" active={mode === 'reel'} onPress={() => changeMode('reel')} />
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.secondary} onPress={camera}><Text style={styles.secondaryText}>📷 CÂMERA</Text></Pressable>
        <Pressable style={styles.secondary} onPress={gallery}><Text style={styles.secondaryText}>▣ GALERIA</Text></Pressable>
      </View>

      {mode === 'carousel' ? (
        carouselMedia.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselPreview}>
          {carouselMedia.map((item, index) => {
            const video = String(item.mimeType || '').startsWith('video/');
            return <View style={styles.carouselItem} key={`${item.uri}-${index}`}>
              {video ? <View style={styles.videoTile}><Text style={styles.videoTileIcon}>▶</Text><Text style={styles.videoTileText}>VÍDEO</Text></View> : <Image source={{ uri: item.uri }} style={styles.carouselImage} contentFit="cover" />}
              <Text style={styles.carouselIndex}>{index + 1}</Text>
              <Pressable style={styles.remove} onPress={() => setCarouselMedia(current => current.filter((_, i) => i !== index))}><Text style={styles.removeText}>×</Text></Pressable>
            </View>;
          })}
        </ScrollView> : <View style={styles.empty}><Text style={styles.emptyText}>Selecione de 2 a 10 fotos/vídeos. Inclua pelo menos uma foto.</Text></View>
      ) : media ? (isVideo ? <VideoPreview uri={media.uri} /> : <Image source={{ uri: media.uri }} style={[styles.preview, mode !== 'feed' && styles.storyPreview]} contentFit="contain" />) : <View style={styles.empty}><Text style={styles.emptyText}>{mode === 'reel' ? 'Grave ou selecione um vídeo.' : 'Selecione ou capture uma mídia.'}</Text></View>}

      <TextInput value={caption} onChangeText={setCaption} placeholder={mode === 'story' ? 'Legenda do Story...' : mode === 'reel' ? 'Legenda do Reel...' : 'Use legenda, #hashtags e @menções...'} placeholderTextColor={colors.muted} multiline maxLength={2200} style={styles.caption} />
      {!!status && <Text style={styles.status}>{status}</Text>}
      <Pressable disabled={!hasMedia || busy} style={[styles.publish, (!hasMedia || busy) && { opacity: 0.45 }]} onPress={publish}>
        <Text style={styles.publishText}>{busy ? 'PUBLICANDO...' : mode === 'story' ? 'PUBLICAR STORY' : mode === 'reel' ? 'PUBLICAR REEL' : mode === 'carousel' ? 'PUBLICAR CARROSSEL' : 'PUBLICAR NO APP + SITE'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Mode({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable style={[styles.modeButton, active && styles.modeActive]} onPress={onPress}><Text style={[styles.modeText, active && styles.modeTextActive]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, paddingBottom: 100, backgroundColor: colors.background, flexGrow: 1 },
  kicker: { color: colors.cyan, fontWeight: '900', letterSpacing: 2, fontSize: 10 },
  title: { color: colors.ink, fontSize: 30, fontWeight: '900', marginTop: 5 },
  subtitle: { color: colors.muted, lineHeight: 20, marginTop: 6, marginBottom: 14 },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 },
  modeButton: { width: '48%', minHeight: 44, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  modeActive: { backgroundColor: colors.cyan, borderColor: colors.cyan },
  modeText: { color: colors.ink, fontWeight: '900', fontSize: 10 },
  modeTextActive: { color: colors.white },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  secondary: { flex: 1, minHeight: 48, borderRadius: radii.md, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  secondaryText: { color: colors.white, fontSize: 11, fontWeight: '900' },
  preview: { width: '100%', aspectRatio: 1, borderRadius: radii.lg, backgroundColor: '#E7EDF3' },
  storyPreview: { width: '100%', aspectRatio: 9 / 16, borderRadius: radii.lg, backgroundColor: '#06101A' },
  empty: { width: '100%', minHeight: 250, borderRadius: radii.lg, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', padding: 25 },
  emptyText: { color: colors.muted, textAlign: 'center', lineHeight: 19 },
  carouselPreview: { gap: 9, paddingVertical: 4 },
  carouselItem: { width: 155, height: 205, borderRadius: radii.md, overflow: 'hidden', backgroundColor: colors.navy, position: 'relative' },
  carouselImage: { width: '100%', height: '100%' },
  videoTile: { flex: 1, backgroundColor: '#06101A', alignItems: 'center', justifyContent: 'center' },
  videoTileIcon: { color: colors.cyan, fontSize: 34 },
  videoTileText: { color: colors.white, fontSize: 10, fontWeight: '900', marginTop: 5 },
  carouselIndex: { position: 'absolute', left: 7, top: 7, minWidth: 25, textAlign: 'center', paddingVertical: 4, borderRadius: 20, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,.65)', color: colors.white, fontWeight: '900', fontSize: 9 },
  remove: { position: 'absolute', right: 7, top: 7, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,.7)', alignItems: 'center', justifyContent: 'center' },
  removeText: { color: colors.white, fontWeight: '900', fontSize: 18 },
  caption: { minHeight: 110, marginTop: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 14, textAlignVertical: 'top', color: colors.ink },
  status: { color: colors.muted, fontWeight: '700', marginTop: 10 },
  publish: { minHeight: 54, borderRadius: radii.md, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  publishText: { color: colors.white, fontWeight: '900', letterSpacing: 0.8 },
});
