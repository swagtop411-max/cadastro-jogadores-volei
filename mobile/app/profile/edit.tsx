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

import type { AthleteCategory, ChampionshipHistoryItemV1 } from "@/contracts/schema-v1";
import {
  loadOwnProfileForEdit,
  saveOwnProfile,
  type ProfileEditValues,
} from "@/services/profileEditor";
import {
  deleteUploadedMedia,
  uploadProfileImage,
  type UploadedMedia,
} from "@/services/mediaUpload";

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
        nextValues = {
          ...values,
          fotoUrl: uploaded.url,
          fotoPath: uploaded.path,
        };
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
        <ActivityIndicator color="#48cae4" />
        <Text style={styles.muted}>Carregando seu perfil correto…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>SEU PERFIL</Text>
        <Text style={styles.title}>Editar perfil esportivo</Text>
        <Text style={styles.subtitle}>
          As alterações permanecem no app e sincronizam com o mesmo Firebase usado pelo site.
        </Text>

        <View style={styles.photoCard}>
          <Image
            source={{ uri: selectedPhoto?.uri || values.fotoUrl || undefined }}
            style={styles.avatar}
          />
          <View style={styles.photoActions}>
            <Pressable onPress={() => void choosePhoto("camera")} style={styles.smallButton}>
              <Text style={styles.smallButtonText}>📷 CÂMERA</Text>
            </Pressable>
            <Pressable onPress={() => void choosePhoto("gallery")} style={styles.smallButton}>
              <Text style={styles.smallButtonText}>🖼️ GALERIA</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.formCard}>
          <Field label="Nome completo / nome esportivo" value={values.nome} onChangeText={(value) => setField("nome", value)} />
          <Field label="Data de nascimento" value={values.nascimento} onChangeText={(value) => setField("nascimento", value)} placeholder="AAAA-MM-DD" />
          <View style={styles.inlineFields}>
            <View style={styles.flexField}>
              <Field label="Cidade" value={values.cidade} onChangeText={(value) => setField("cidade", value)} />
            </View>
            <View style={styles.ufField}>
              <Field label="UF" value={values.uf} onChangeText={(value) => setField("uf", value.toUpperCase().slice(0, 2))} maxLength={2} />
            </View>
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
                <Text style={[styles.categoryText, values.categoria === category && styles.categoryTextActive]}>
                  {category}
                </Text>
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
            placeholderTextColor="#718695"
            multiline
            textAlignVertical="top"
            style={[styles.input, styles.bioInput]}
          />
        </View>

        <View style={styles.historySection}>
          <View style={styles.historyHeading}>
            <View style={styles.historyHeadingCopy}>
              <Text style={styles.sectionEyebrow}>TRAJETÓRIA</Text>
              <Text style={styles.sectionTitle}>Histórico de campeonatos</Text>
            </View>
            <Pressable onPress={addHistory} style={styles.addButton}>
              <Text style={styles.addButtonText}>＋ ADICIONAR</Text>
            </Pressable>
          </View>

          {values.historicoCampeonatos.length ? (
            values.historicoCampeonatos.map((item, index) => (
              <View key={`history-${index}`} style={styles.historyCard}>
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
                <Pressable onPress={() => removeHistory(index)} style={styles.removeHistory}>
                  <Text style={styles.removeHistoryText}>REMOVER CAMPEONATO</Text>
                </Pressable>
              </View>
            ))
          ) : (
            <View style={styles.emptyHistory}>
              <Text style={styles.muted}>Nenhum campeonato registrado. Toque em ADICIONAR.</Text>
            </View>
          )}
        </View>

        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable disabled={saving} onPress={() => void save()} style={[styles.saveButton, saving && styles.disabled]}>
          <Text style={styles.saveButtonText}>{saving ? "SALVANDO…" : "SALVAR PERFIL"}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  ...props
}: {
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
      <TextInput
        {...props}
        placeholderTextColor="#718695"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#071827" },
  page: { padding: 18, paddingBottom: 70 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#071827" },
  muted: { color: "#9fb0bf", lineHeight: 19 },
  eyebrow: { color: "#d9a93f", fontSize: 11, fontWeight: "900", letterSpacing: 1.1 },
  title: { marginTop: 4, color: "#ffffff", fontSize: 30, fontWeight: "900" },
  subtitle: { marginTop: 6, color: "#b8c7d9", lineHeight: 20 },
  photoCard: { marginTop: 18, alignItems: "center", borderRadius: 22, backgroundColor: "#0d2235", padding: 18 },
  avatar: { width: 110, height: 110, borderRadius: 55, backgroundColor: "#17384d" },
  photoActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  smallButton: { borderRadius: 12, backgroundColor: "#17384d", paddingHorizontal: 13, paddingVertical: 10 },
  smallButtonText: { color: "#ffffff", fontSize: 11, fontWeight: "900" },
  formCard: { marginTop: 14, borderRadius: 22, backgroundColor: "#0d2235", padding: 16 },
  fieldWrap: { marginBottom: 13 },
  label: { marginBottom: 6, color: "#7ddff0", fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  input: { borderWidth: 1, borderColor: "#29445c", borderRadius: 13, backgroundColor: "#071827", color: "#ffffff", paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  bioInput: { minHeight: 100 },
  inlineFields: { flexDirection: "row", gap: 10 },
  flexField: { flex: 1 },
  ufField: { width: 78 },
  yearField: { width: 90 },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 13 },
  categoryButton: { borderWidth: 1, borderColor: "#29445c", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  categoryActive: { borderColor: "#48cae4", backgroundColor: "#17384d" },
  categoryText: { color: "#a8bac8", fontSize: 11, fontWeight: "800" },
  categoryTextActive: { color: "#7ddff0" },
  historySection: { marginTop: 18 },
  historyHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 },
  historyHeadingCopy: { flex: 1 },
  sectionEyebrow: { color: "#d9a93f", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  sectionTitle: { marginTop: 3, color: "#ffffff", fontSize: 19, fontWeight: "900" },
  addButton: { borderRadius: 12, backgroundColor: "#17384d", paddingHorizontal: 11, paddingVertical: 10 },
  addButtonText: { color: "#7ddff0", fontSize: 10, fontWeight: "900" },
  historyCard: { marginBottom: 10, borderRadius: 18, backgroundColor: "#0d2235", padding: 14 },
  removeHistory: { alignItems: "center", borderRadius: 11, backgroundColor: "#3a1620", paddingVertical: 9 },
  removeHistoryText: { color: "#ffd5dd", fontSize: 10, fontWeight: "900" },
  emptyHistory: { borderRadius: 17, backgroundColor: "#0d2235", padding: 16 },
  success: { marginTop: 14, borderRadius: 12, backgroundColor: "#123d33", color: "#9df2c8", padding: 12, fontWeight: "800" },
  error: { marginTop: 14, borderRadius: 12, backgroundColor: "#3a1620", color: "#ffd5dd", padding: 12, fontWeight: "800" },
  saveButton: { marginTop: 18, alignItems: "center", borderRadius: 15, backgroundColor: "#48cae4", paddingVertical: 15 },
  saveButtonText: { color: "#071827", fontWeight: "900", fontSize: 14 },
  disabled: { opacity: 0.45 },
});
