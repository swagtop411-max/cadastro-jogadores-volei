import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CATEGORIES, registerAccount, UFS } from '@/src/services/account';
import { colors, radii, spacing } from '@/src/theme';

export default function SignupScreen() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('SP');
  const [modalidade, setModalidade] = useState('Vôlei de areia');
  const [posicao, setPosicao] = useState('');
  const [categoria, setCategoria] = useState('Iniciante');
  const [time, setTime] = useState('');
  const [bio, setBio] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await registerAccount({ nome, email, password, cidade, uf, modalidade, posicao, categoria, time, bio });
      router.replace('/(tabs)');
    } catch (e: any) {
      const code = String(e?.code || '');
      if (code === 'auth/email-already-in-use') setError('Este e-mail já possui uma conta.');
      else if (code === 'auth/invalid-email') setError('Informe um e-mail válido.');
      else setError(e?.message || 'Não foi possível criar sua conta.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>NOVO ATLETA</Text>
        <Text style={styles.title}>Crie seu perfil</Text>
        <Text style={styles.subtitle}>A mesma conta funcionará no aplicativo e no site.</Text>

        <View style={styles.card}>
          <Field label="NOME" value={nome} onChangeText={setNome} placeholder="Seu nome" />
          <Field label="E-MAIL" value={email} onChangeText={setEmail} placeholder="voce@email.com" keyboardType="email-address" autoCapitalize="none" />
          <Field label="SENHA" value={password} onChangeText={setPassword} placeholder="Mínimo 6 caracteres" secureTextEntry />
          <Field label="CIDADE" value={cidade} onChangeText={setCidade} placeholder="Sertãozinho" />

          <Text style={styles.label}>UF</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {UFS.map(item => <Pressable key={item} style={[styles.chip, uf === item && styles.chipActive]} onPress={() => setUf(item)}><Text style={[styles.chipText, uf === item && styles.chipTextActive]}>{item}</Text></Pressable>)}
          </ScrollView>

          <Field label="MODALIDADE" value={modalidade} onChangeText={setModalidade} placeholder="Vôlei de areia" />
          <Field label="POSIÇÃO" value={posicao} onChangeText={setPosicao} placeholder="Ex.: Levantador, defensor..." />

          <Text style={styles.label}>CATEGORIA</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map(item => <Pressable key={item} style={[styles.category, categoria === item && styles.categoryActive]} onPress={() => setCategoria(item)}><Text style={[styles.categoryText, categoria === item && styles.categoryTextActive]}>{item}</Text></Pressable>)}
          </View>

          <Field label="EQUIPE (OPCIONAL)" value={time} onChangeText={setTime} placeholder="Nome da equipe" />
          <Text style={styles.label}>BIO</Text>
          <TextInput value={bio} onChangeText={setBio} placeholder="Conte um pouco sobre seu perfil esportivo" placeholderTextColor={colors.muted} multiline maxLength={500} style={[styles.input, styles.bio]} />

          {!!error && <Text style={styles.error}>{error}</Text>}
          <Pressable disabled={busy} style={[styles.submit, busy && { opacity: 0.55 }]} onPress={submit}>
            <Text style={styles.submitText}>{busy ? 'CRIANDO PERFIL...' : 'CRIAR CONTA'}</Text>
          </Pressable>
          <Pressable onPress={() => router.back()}><Text style={styles.login}>Já tenho conta • ENTRAR</Text></Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field(props: any) {
  const { label, ...inputProps } = props;
  return <><Text style={styles.label}>{label}</Text><TextInput {...inputProps} placeholderTextColor={colors.muted} style={styles.input} /></>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 50 },
  kicker: { color: colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 31, fontWeight: '900', marginTop: 5 },
  subtitle: { color: colors.muted, lineHeight: 20, marginTop: 6, marginBottom: 16 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.lg },
  label: { color: colors.ink, fontSize: 9, fontWeight: '900', letterSpacing: 1.3, marginTop: 12, marginBottom: 6 },
  input: { minHeight: 49, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted, paddingHorizontal: 14, color: colors.ink },
  bio: { minHeight: 100, paddingTop: 13, textAlignVertical: 'top' },
  chips: { gap: 6, paddingVertical: 2 },
  chip: { minWidth: 43, height: 37, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  chipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { color: colors.ink, fontWeight: '900', fontSize: 10 },
  chipTextActive: { color: colors.white },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  category: { paddingHorizontal: 12, minHeight: 39, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  categoryActive: { backgroundColor: colors.cyan, borderColor: colors.cyan },
  categoryText: { color: colors.ink, fontWeight: '800', fontSize: 10 },
  categoryTextActive: { color: colors.white },
  error: { color: colors.danger, fontWeight: '700', marginTop: 13, lineHeight: 18 },
  submit: { minHeight: 54, borderRadius: radii.md, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  submitText: { color: colors.white, fontWeight: '900', letterSpacing: 1 },
  login: { color: colors.cyan, fontWeight: '900', textAlign: 'center', marginTop: 17 },
});
