import { router } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { auth } from '@/src/config/firebase';
import { colors, radii, spacing } from '@/src/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function login() {
    if (!email.trim() || !password) {
      setError('Informe e-mail e senha.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.code === 'auth/invalid-credential' ? 'E-mail ou senha inválidos.' : 'Não foi possível entrar agora.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.page}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>REDE ESPORTIVA</Text>
        <Text style={styles.title}>Banco de Atletas</Text>
        <Text style={styles.subtitle}>O mesmo perfil, o mesmo Feed e as mesmas conexões do site, agora no celular.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Entrar</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholder="E-mail"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          placeholder="Senha"
          placeholderTextColor={colors.muted}
          style={styles.input}
          onSubmitEditing={login}
        />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Pressable style={[styles.button, busy && { opacity: 0.6 }]} disabled={busy} onPress={login}>
          <Text style={styles.buttonText}>{busy ? 'ENTRANDO...' : 'ENTRAR'}</Text>
        </Pressable>
        <Text style={styles.note}>Nesta primeira fase, o aplicativo usa exatamente a mesma conta Firebase do site.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: spacing.lg },
  hero: { backgroundColor: colors.navy, borderRadius: radii.lg, padding: spacing.xl, marginBottom: spacing.md },
  kicker: { color: colors.cyan, fontWeight: '900', letterSpacing: 2, fontSize: 11 },
  title: { color: colors.white, fontWeight: '900', fontSize: 34, marginTop: 8 },
  subtitle: { color: '#B8C8D8', lineHeight: 21, marginTop: 10 },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  cardTitle: { color: colors.ink, fontWeight: '900', fontSize: 22, marginBottom: 14 },
  input: { backgroundColor: colors.surfaceMuted, color: colors.ink, borderRadius: radii.md, paddingHorizontal: 15, minHeight: 52, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  error: { color: colors.danger, fontWeight: '700', marginBottom: 10 },
  button: { minHeight: 52, borderRadius: radii.md, backgroundColor: colors.cyan, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: colors.white, fontWeight: '900', letterSpacing: 1 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 14 },
});
