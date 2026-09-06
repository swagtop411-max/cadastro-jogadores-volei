import { getAuth } from "@react-native-firebase/auth";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { BrandHeader, SectionTitle } from "@/components/BrandHeader";
import type { AthleteCategory, ChampionshipHistoryItemV1 } from "@/contracts/schema-v1";
import { deleteUploadedMedia, uploadProfileImage, type UploadedMedia } from "@/services/mediaUpload";
import { loadOwnProfileForEdit, saveOwnProfile, type ProfileEditValues } from "@/services/profileEditor";
import { brand } from "@/ui/brand";

const EMPTY: ProfileEditValues = {
  nome: "",
  nascimento: "",
  cidade: "",
  uf: "",
  modalidade: "",
  posicao: "",
  categoria: "",
  time: "",
  contato: "",
  bio: "",
  instagramUrl: "",
  historicoCampeonatos: [],
  fotoUrl: "",
  fotoPath: "",
};

export default function EditProfileScreen() {
  const router = useRouter();
  const user = getAuth().currentUser;
  const [values, setValues] = useState<ProfileEditValues>(EMPTY);
  const [selectedPhoto, setSelectedPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setError("Sessão não encontrada.");
      return;
    }
    loadOwnProfileForEdit(user.uid)
      .then(setValues)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Não foi possível abrir o perfil."))
      .finally(() => setLoading(false));
  }, [user]);

  function setField<K extends keyof ProfileEditValues>(key: K, value: ProfileEditValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setMessage(null);
  }

  function updateHistory(index: number, patch: ChampionshipHistoryItemV1) {
    const next = [...values.historicoCampeonatos];
    next[index] = { ...(next[index] || {}), ...patch };
    setField("historicoCampeonatos", next);
  }

  function addHistory() {
    if (values.historicoCampeonatos.length >= 30) {
      setError("O histórico aceita no máximo 30 campeonatos.");
      return;
    }
    setField("historicoCampeonatos", [
      ...values.historicoCampeonatos,
      { campeonato: "", colocacao: "", ano: "" },
    ]);
  }

  function removeHistory(index: number) {
    setField(
      "historicoCampeonatos",
      values.historicoCampeonatos.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  async function choosePhoto(source: "camera" | "gallery") {
    setError(null);
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(source === "camera" ? "Permita o uso da câmera." : "Permita o acesso à galeria.");
      return;
    }
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.9 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      setError("A foto de perfil deve ter no máximo 5 MB.");
      return;
    }
    setSelectedPhoto(asset);
  }

  async function save() {
    if (!user?.email) {
      setError("Sua sessão não possui um e-mail válido.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    let uploaded: UploadedMedia | null = null;
    const oldPhotoPath = values.fotoPath;
    try {
      let nextValues = values;
      if (selectedPhoto) {
        uploaded = await uploadProfileImage({
          uid: user.uid,
          uri: selectedPhoto.uri,
          mimeType: selectedPhoto.mimeType,
          fileSize: selectedPhoto.fileSize,
          fileName: selectedPhoto.fileName,
        });
        nextValues = { ...values, fotoUrl: uploaded.url, fotoPath: uploaded.path };
      }
      const saved = await saveOwnProfile({ uid: user.uid, email: user.email, values: nextValues });
      setValues((current) => ({ ...current, ...saved, nascimento: nextValues.nascimento, contato: nextValues.contato }));
      setSelectedPhoto(null);
      if (uploaded && oldPhotoPath && oldPhotoPath !== uploaded.path) {
        await deleteUploadedMedia(oldPhotoPath).catch(() => undefined);
      }
      setMessage("Perfil salvo e sincronizado com o cadastro esportivo.");
      setTimeout(() => router.back(), 650);
    } catch (cause) {
      if (uploaded?.path) await deleteUploadedMedia(uploaded.path).catch(() => undefined);
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar o perfil.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={brand.colors.cyan} />
        <Text style={styles.muted}>Carregando seu perfil…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <BrandHeader
          eyebrow="SEU TALENTO EM DESTAQUE"
          title="Editar perfil"
          subtitle="Mantenha sua identidade esportiva atualizada no app e no site."
        />

        <View style={styles.photoCard}>
          <View style={styles.photoGlow} />
          {selectedPhoto?.uri || values.fotoUrl ? (
            <Image source={{ uri: selectedPhoto?.uri || values.fotoUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}><Text style={styles.avatarFallbackText}>{values.nome.slice(0, 1).toUpperCase() || "A"}</Text></View>
          )}
          <Text style={styles.photoTitle}>{values.nome || "Seu perfil"}</Text>
          <Text style={styles.photoSubtitle}>{values.categoria || "Complete sua categoria"}</Text>
          <View style={styles.photoActions}>
            <Pressable onPress={() => void choosePhoto("camera")} style={({ pressed }) => [styles.smallButton, pressed && styles.pressed]}>
              <Text style={styles.smallButtonIcon}>◉</Text><Text style={styles.smallButtonText}>CÂMERA</Text>
            </Pressable>
            <Pressable onPress={() => void choosePhoto("gallery")} style={({ pressed }) => [styles.smallButton, pressed && styles.pressed]}>
              <Text style={styles.smallButtonIcon}>▣</Text><Text style={styles.smallButtonText}>GALERIA</Text>
            </Pressable>
          </View>
        </View>

        <SectionTitle eyebrow="IDENTIDADE" title="Dados do atleta" />
        <View style={styles.formCard}>
          <Field label="Nome completo / nome esportivo" value={values.nome} onChangeText={(value) => setField("nome", value)} />
          <Field label="Data de nascimento" value={values.nascimento} onChangeText={(value) => setField("nascimento", value)} placeholder="AAAA-MM-DD" />
          <View style={styles.inlineFields}>
            <View style={styles.flexField}><Field label="Cidade" value={values.cidade} onChangeText={(value) => setField("cidade", value)} /></View>
            <View style={styles.ufField}><Field label="UF" value={values.uf} onChangeText={(value) => setField("uf", value.toUpperCase().slice(0, 2))} maxLength={2} /></View>
          </View>
          <Field label="Modalidade(s)" value={values.modalidade} onChangeText={(value) => setField("modalidade", value)} placeholder="Ex.: Vôlei de praia" />
          <Field label="Posição(ões)" value={values.posicao} onChangeText={(value) => setField("posicao", value)} placeholder="Ex.: Universal, Ponteiro" />

          <Text style={styles.label}>Categoria</Text>
          <View style={styles.categoryRow}>
            {(["Iniciante", "Intermediário", "Avançado"] as AthleteCategory[]).map((category) => (
              <Pressable
                key={category}
                onPress={() => setField("categoria", category)}
                style={[styles.categoryButton, values.categoria === category && styles.categoryActive]}
              >
                <Text style={[styles.categoryText, values.categoria === category && styles.categoryTextActive]}>{category}</Text>
              </Pressable>
            ))}
          </View>

          <Field label="Time / equipe atual" value={values.time} onChangeText={(value) => setField("time", value)} />
          <Field label="WhatsApp / contato" value={values.contato} onChangeText={(value) => setField("contato", value)} keyboardType="phone-pad" />
          <Field label="Instagram" value={values.instagramUrl} onChangeText={(value) => setField("instagramUrl", value)} placeholder="https://instagram.com/..." autoCapitalize="none" />
          <Text style={styles.label}>Sobre você</Text>
          <TextInput
            value={values.bio}
            onChangeText={(value) => setField("bio", value.slice(0, 500))}
            placeholder="Conte um pouco da sua trajetória esportiva…"
            placeholderTextColor={brand.colors.muted}
            multiline
            textAlignVertical="top"
            style={[styles.input, styles.bioInput]}
          />
        </View>

        <SectionTitle eyebrow="TRAJETÓRIA" title="Histórico de campeonatos" action={`${values.historicoCampeonatos.length}/30`} />
        <Pressable onPress={addHistory} style={styles.addButton}><Text style={styles.addButtonText}>＋ ADICIONAR CAMPEONATO</Text></Pressable>

        {values.historicoCampeonatos.length ? (
          values.historicoCampeonatos.map((item, index) => (
            <View key={`history-${index}`} style={styles.historyCard}>
              <View style={styles.historyIndex}><Text style={styles.historyIndexText}>{index + 1}</Text></View>
              <Field
                label="Campeonato"
                value={String(item.campeonato || item.nome || item.evento || "")}
                onChangeText={(value) => updateHistory(index, { campeonato: value })}
                placeholder="Nome do campeonato"
              />
              <View style={styles.inlineFields}>
                <View style={styles.flexField}>
                  <Field
                    label="Colocação"
                    value={String(item.colocacao || item.resultado || "")}
                    onChangeText={(value) => updateHistory(index, { colocacao: value })}
                    placeholder="Ex.: 1º lugar"
                  />
                </View>
                <View style={styles.yearField}>
                  <Field
                    label="Ano"
                    value={String(item.ano || item.data || "")}
                    onChangeText={(value) => updateHistory(index, { ano: value })}
                    keyboardType="numeric"
                    maxLength={4}
                  />
                </View>
              </View>
              <Pressable onPress={() => removeHistory(index)} style={styles.removeHistory}><Text style={styles.removeHistoryText}>REMOVER CAMPEONATO</Text></Pressable>
            </View>
          ))
        ) : (
          <View style={styles.emptyHistory}><Text style={styles.muted}>Nenhum campeonato registrado. Use o botão acima para iniciar seu histórico.</Text></View>
        )}

        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable disabled={saving} onPress={() => void save()} style={({ pressed }) => [styles.saveButton, saving && styles.disabled, pressed && styles.pressed]}>
          <Text style={styles.saveButtonText}>{saving ? "SALVANDO…" : "SALVAR PERFIL"}</Text>
          <Text style={styles.saveArrow}>›</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, ...props }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  keyboardType?: "default" | "phone-pad" | "numeric";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...props} placeholderTextColor={brand.colors.muted} style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: brand.colors.bg },
  page: { padding: 16, paddingTop: 14, paddingBottom: 70 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: brand.colors.bg },
  muted: { color: brand.colors.muted, lineHeight: 19 },
  photoCard: { position: "relative", overflow: "hidden", alignItems: "center", borderWidth: 1, borderColor: brand.colors.cyan, borderRadius: brand.radius.xl, backgroundColor: brand.colors.surface, padding: 18, ...brand.shadow },
  photoGlow: { position: "absolute", width: 180, height: 180, borderRadius: 90, right: -80, top: -90, backgroundColor: "rgba(24,213,255,0.10)" },
  avatar: { width: 112, height: 112, borderRadius: 56, borderWidth: 2, borderColor: brand.colors.cyan, backgroundColor: brand.colors.surfaceSoft },
  avatarFallback: { width: 112, height: 112, borderRadius: 56, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: brand.colors.cyan, backgroundColor: brand.colors.surfaceSoft },
  avatarFallbackText: { color: brand.colors.cyanSoft, fontSize: 38, fontWeight: "900" },
  photoTitle: { marginTop: 10, color: brand.colors.text, fontSize: 20, fontWeight: "900" },
  photoSubtitle: { marginTop: 3, color: brand.colors.cyanSoft, fontSize: 11, fontWeight: "800" },
  photoActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  smallButton: { flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1, borderColor: brand.colors.border, borderRadius: brand.radius.sm, backgroundColor: brand.colors.surfaceRaised, paddingHorizontal: 13, paddingVertical: 10 },
  smallButtonIcon: { color: brand.colors.cyan, fontWeight: "900" },
  smallButtonText: { color: brand.colors.text, fontSize: 10, fontWeight: "900" },
  formCard: { borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.xl, backgroundColor: brand.colors.surface, padding: 15, ...brand.shadow },
  fieldWrap: { marginBottom: 13 },
  label: { marginBottom: 6, color: brand.colors.cyanSoft, fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.6 },
  input: { borderWidth: 1, borderColor: brand.colors.border, borderRadius: brand.radius.sm, backgroundColor: brand.colors.bgDeep, color: brand.colors.text, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  bioInput: { minHeight: 100 },
  inlineFields: { flexDirection: "row", gap: 10 },
  flexField: { flex: 1 },
  ufField: { width: 78 },
  yearField: { width: 90 },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 13 },
  categoryButton: { borderWidth: 1, borderColor: brand.colors.border, borderRadius: brand.radius.pill, backgroundColor: brand.colors.bgDeep, paddingHorizontal: 12, paddingVertical: 9 },
  categoryActive: { borderColor: brand.colors.cyan, backgroundColor: "#0a4160" },
  categoryText: { color: brand.colors.mutedStrong, fontSize: 11, fontWeight: "800" },
  categoryTextActive: { color: brand.colors.cyanSoft },
  addButton: { alignItems: "center", marginBottom: 10, borderWidth: 1, borderColor: brand.colors.gold, borderRadius: brand.radius.md, backgroundColor: "#3c2c0d", paddingVertical: 11 },
  addButtonText: { color: brand.colors.gold, fontSize: 10, fontWeight: "900", letterSpacing: 0.6 },
  historyCard: { position: "relative", marginBottom: 10, borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.lg, backgroundColor: brand.colors.surface, padding: 14 },
  historyIndex: { position: "absolute", right: 12, top: 12, width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#3c2c0d" },
  historyIndexText: { color: brand.colors.gold, fontSize: 10, fontWeight: "900" },
  removeHistory: { alignItems: "center", borderRadius: brand.radius.sm, backgroundColor: brand.colors.dangerBg, paddingVertical: 9 },
  removeHistoryText: { color: "#ffd5dd", fontSize: 9, fontWeight: "900" },
  emptyHistory: { borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.md, backgroundColor: brand.colors.surface, padding: 16 },
  success: { marginTop: 14, borderRadius: brand.radius.sm, backgroundColor: "#123d33", color: "#9df2c8", padding: 12, fontWeight: "800" },
  error: { marginTop: 14, borderRadius: brand.radius.sm, backgroundColor: brand.colors.dangerBg, color: "#ffd5dd", padding: 12, fontWeight: "800" },
  saveButton: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18, borderWidth: 1, borderColor: brand.colors.cyanSoft, borderRadius: brand.radius.md, backgroundColor: brand.colors.cyan, paddingVertical: 15, paddingHorizontal: 16, ...brand.shadow },
  saveButtonText: { color: brand.colors.bgDeep, fontWeight: "900", fontSize: 14 },
  saveArrow: { color: brand.colors.bgDeep, fontSize: 24, fontWeight: "900" },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
});
