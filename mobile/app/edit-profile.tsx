import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { db } from '@/src/config/firebase';
import { uploadToCloudinary, type LocalMedia } from '@/src/config/cloudinary';
import { useAuth } from '@/src/providers/AuthProvider';
import { CATEGORIES, saveProfile, UFS } from '@/src/services/account';
import { isPrivateProfile } from '@/src/services/privacy';
import { colors, radii, spacing } from '@/src/theme';

export default function EditProfileScreen() {
  const { user } = useAuth();
  const [nome, setNome] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('SP');
  const [modalidade, setModalidade] = useState('Vôlei de areia');
  const [posicao, setPosicao] = useState('');
  const [categoria, setCategoria] = useState('Iniciante');
  const [time, setTime] = useState('');
  const [bio, setBio] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [fotoPath, setFotoPath] = useState('');
  const [localPhoto, setLocalPhoto] = useState<LocalMedia | null>(null);
  const [privado, setPrivado] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Carregando perfil...');

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getDoc(doc(db, 'perfis', user.uid)),
      isPrivateProfile(user.uid).catch(() => false),
    ]).then(([snapshot, privacy]) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setNome(String(data.nome || user.displayName || ''));
        setCidade(String(data.cidade || ''));
        setUf(String(data.uf || 'SP').toUpperCase());
        setModalidade(String(data.modalidade || 'Vôlei de areia'));
        setPosicao(String(data.posicao || ''));
        setCategoria(String(data.categoria || 'Iniciante'));
        setTime(String(data.time || ''));
        setBio(String(data.bio || ''));
        setFotoUrl(String(data.fotoUrl || ''));
        setFotoPath(String(data.fotoPath || ''));
      }
      setPrivado(privacy);
      setStatus('');
    }).catch(() => setStatus('Não foi possível carregar todos os dados do perfil.'));
  }, [user]);

  function acceptAsset(asset: ImagePicker.ImagePickerAsset) {
    setLocalPhoto({ uri: asset.uri, mimeType: asset.mimeType || 'image/jpeg', fileName: asset.fileName, fileSize: asset.fileSize });
    setStatus('Nova foto selecionada.');
  }

  async function gallery() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1, selectionLimit: 1 });
    if (!result.canceled) acceptAsset(result.assets[0]);
  }

  async function camera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Autorize a câmera para atualizar sua foto.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], cameraType: ImagePicker.CameraType.front, allowsEditing: true, aspect: [1, 1], quality: 1 });
    if (!result.canceled) acceptAsset(result.assets[0]);
  }

  async function save() {
    if (!user || busy) return;
    setBusy(true);
    setStatus('Salvando perfil...');
    try {
      let nextFotoUrl = fotoUrl;
      let nextFotoPath = fotoPath;
      if (localPhoto) {
        if ((localPhoto.fileSize || 0) > 25 * 1024 * 1024) throw new Error('A foto deve ter no máximo 25 MB.');
        setStatus('Enviando foto em alta qualidade...');
        const upload = await uploadToCloudinary(localPhoto);
        nextFotoUrl = upload.url;
        nextFotoPath = upload.publicId;
      }
      await saveProfile(user, { nome, cidade, uf, modalidade, posicao, categoria, time, bio, fotoUrl: nextFotoUrl, fotoPath: nextFotoPath, privado });
      setFotoUrl(nextFotoUrl);
      setFotoPath(nextFotoPath);
      setLocalPhoto(null);
      setStatus('✓ Perfil atualizado no app e no site.');
      setTimeout(() => router.back(), 650);
    } catch (e: any) {
      setStatus(e?.message || 'Não foi possível salvar o perfil.');
    } finally {
      setBusy(false);
    }
  }

  const preview = localPhoto?.uri || fotoUrl;
  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Text style={styles.kicker}>MEU PERFIL</Text>
      <Text style={styles.title}>Editar perfil</Text>
      <Text style={styles.subtitle}>As alterações são gravadas na mesma coleção usada pelo site.</Text>

      <View style={styles.photoCard}>
        {preview ? <Image source={{ uri: preview }} style={styles.photo} contentFit="cover" /> : <View style={styles.photoFallback}><Text style={{ fontSize: 40 }}>🏐</Text></View>}
        <View style={styles.photoActions}>
          <Pressable style={styles.secondary} onPress={camera}><Text style={styles.secondaryText}>📷 CÂMERA</Text></Pressable>
          <Pressable style={styles.secondary} onPress={gallery}><Text style={styles.secondaryText}>▣ GALERIA</Text></Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Field label="NOME" value={nome} onChangeText={setNome} />
        <Field label="CIDADE" value={cidade} onChangeText={setCidade} />
        <Text style={styles.label}>UF</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{UFS.map(item => <Pressable key={item} style={[styles.chip, uf === item && styles.chipActive]} onPress={() => setUf(item)}><Text style={[styles.chipText, uf === item && styles.chipTextActive]}>{item}</Text></Pressable>)}</ScrollView>
        <Field label="MODALIDADE" value={modalidade} onChangeText={setModalidade} />
        <Field label="POSIÇÃO" value={posicao} onChangeText={setPosicao} />
        <Text style={styles.label}>CATEGORIA</Text>
        <View style={styles.categories}>{CATEGORIES.map(item => <Pressable key={item} style={[styles.category, categoria === item && styles.categoryActive]} onPress={() => setCategoria(item)}><Text style={[styles.categoryText, categoria === item && styles.categoryTextActive]}>{item}</Text></Pressable>)}</View>
        <Field label="EQUIPE" value={time} onChangeText={setTime} />
        <Text style={styles.label}>BIO</Text>
        <TextInput value={bio} onChangeText={setBio} maxLength={500} multiline placeholder="Sua apresentação esportiva" placeholderTextColor={colors.muted} style={[styles.input, styles.bio]} />

        <Pressable style={[styles.privacy, privado && styles.privacyActive]} onPress={() => setPrivado(value => !value)}>
          <Text style={styles.privacyIcon}>{privado ? '🔒' : '🌐'}</Text>
          <View style={{ flex: 1 }}><Text style={styles.privacyTitle}>{privado ? 'Perfil privado' : 'Perfil público'}</Text><Text style={styles.privacyText}>{privado ? 'Novos seguidores precisam de aprovação.' : 'Qualquer pessoa pode visualizar suas publicações públicas.'}</Text></View>
          <Text style={styles.privacyToggle}>{privado ? 'ON' : 'OFF'}</Text>
        </Pressable>

        {!!status && <Text style={styles.status}>{status}</Text>}
        <Pressable disabled={busy} style={[styles.save, busy && { opacity: 0.5 }]} onPress={save}><Text style={styles.saveText}>{busy ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}</Text></Pressable>
      </View>
    </ScrollView>
  );
}

function Field({ label, ...props }: any) {
  return <><Text style={styles.label}>{label}</Text><TextInput {...props} placeholderTextColor={colors.muted} style={styles.input} /></>;
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, paddingBottom: 80, backgroundColor: colors.background },
  kicker: { color: colors.cyan, fontWeight: '900', letterSpacing: 2, fontSize: 10 },
  title: { color: colors.ink, fontSize: 30, fontWeight: '900', marginTop: 5 },
  subtitle: { color: colors.muted, lineHeight: 20, marginTop: 6, marginBottom: 14 },
  photoCard: { backgroundColor: colors.navy, borderRadius: radii.lg, padding: 18, alignItems: 'center' },
  photo: { width: 122, height: 122, borderRadius: 61, borderWidth: 3, borderColor: colors.cyan },
  photoFallback: { width: 122, height: 122, borderRadius: 61, backgroundColor: colors.navySoft, borderWidth: 3, borderColor: colors.cyan, alignItems: 'center', justifyContent: 'center' },
  photoActions: { flexDirection: 'row', gap: 8, marginTop: 14, width: '100%' },
  secondary: { flex: 1, minHeight: 43, borderRadius: radii.md, backgroundColor: colors.navySoft, borderWidth: 1, borderColor: '#25445C', alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.white, fontSize: 10, fontWeight: '900' },
  card: { marginTop: 12, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  label: { color: colors.ink, fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginTop: 12, marginBottom: 6 },
  input: { minHeight: 49, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted, paddingHorizontal: 14, color: colors.ink },
  bio: { minHeight: 100, paddingTop: 12, textAlignVertical: 'top' },
  chips: { gap: 6, paddingVertical: 2 },
  chip: { minWidth: 43, height: 37, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { color: colors.ink, fontSize: 10, fontWeight: '900' },
  chipTextActive: { color: colors.white },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  category: { paddingHorizontal: 12, minHeight: 39, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  categoryActive: { backgroundColor: colors.cyan, borderColor: colors.cyan },
  categoryText: { color: colors.ink, fontSize: 10, fontWeight: '900' },
  categoryTextActive: { color: colors.white },
  privacy: { marginTop: 16, padding: 13, borderRadius: radii.md, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 },
  privacyActive: { borderColor: colors.cyan, backgroundColor: '#EFFAFF' },
  privacyIcon: { fontSize: 22 },
  privacyTitle: { color: colors.ink, fontWeight: '900' },
  privacyText: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  privacyToggle: { color: colors.cyan, fontWeight: '900', fontSize: 11 },
  status: { color: colors.muted, fontWeight: '700', lineHeight: 18, marginTop: 13 },
  save: { minHeight: 54, borderRadius: radii.md, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  saveText: { color: colors.white, fontWeight: '900', letterSpacing: 1 },
});
