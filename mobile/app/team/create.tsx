import { getAuth } from "@react-native-firebase/auth";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { deleteUploadedMedia, uploadProfileImage, type UploadedMedia } from "@/services/mediaUpload";
import { submitTeam, TEAM_PLANS, type TeamPlan } from "@/services/teamService";
import { isPaidTeamPlan } from "@/services/teamBillingService";
import { brand } from "@/ui/brand";

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
const CATEGORIES = ["Iniciante", "Intermediário", "Avançado"];
const MODALITIES = ["Vôlei de Praia", "Vôlei de Quadra"];

type SelectedLogo = {
  uri: string;
  mimeType: string | null;
  fileSize: number | null;
  fileName: string | null;
};

export default function CreateTeamScreen() {
  const router = useRouter();
  const user = getAuth().currentUser;
  const [nome, setNome] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [uf, setUf] = useState("SP");
  const [cidade, setCidade] = useState("");
  const [modalidade, setModalidade] = useState("Vôlei de Praia");
  const [categoria, setCategoria] = useState("Iniciante");
  const [contato, setContato] = useState("");
  const [roster, setRoster] = useState("");
  const [plan, setPlan] = useState<TeamPlan>("gratuito");
  const [logo, setLogo] = useState<SelectedLogo | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function pickLogo() {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return setError("Permita acesso à galeria para escolher a logo.");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9, base64: false });
    const asset = !result.canceled ? result.assets[0] : null;
    if (!asset) return;
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) return setError("A logo deve ter no máximo 5 MB.");
    if (!asset.uri) return setError("Não foi possível localizar a imagem selecionada.");
    setLogo({
      uri: asset.uri,
      mimeType: asset.mimeType ?? null,
      fileSize: asset.fileSize ?? null,
      fileName: asset.fileName ?? null,
    });
  }

  async function submit() {
    if (!user) return setError("Entre na sua conta para cadastrar uma equipe.");
    setSending(true);
    setError(null);
    setSuccess(null);
    let uploadedLogo: UploadedMedia | null = null;
    try {
      let logoUrl = "";
      if (logo) {
        uploadedLogo = await uploadProfileImage({
          uid: user.uid,
          uri: logo.uri,
          mimeType: logo.mimeType,
          fileSize: logo.fileSize,
          fileName: logo.fileName,
        }, "teams");
        logoUrl = uploadedLogo.url;
      }
      const id = await submitTeam({
        nome,
        responsavel,
        uf,
        cidade,
        modalidade,
        categoria,
        contato,
        logo: logoUrl,
        atletas: roster.split(/\r?\n|,/).map((value) => value.trim()).filter(Boolean),
        plan,
      });
      if (isPaidTeamPlan(plan)) {
        setSuccess("Equipe registrada. Abrindo pagamento seguro da Google Play…");
        router.replace({ pathname: "/team/billing", params: { teamRequestId: id, planId: plan } });
      } else {
        setSuccess(`Equipe enviada para análise. Protocolo ${id.slice(0, 8).toUpperCase()}.`);
        setTimeout(() => router.replace("/teams"), 800);
      }
    } catch (cause) {
      if (uploadedLogo) await deleteUploadedMedia(uploadedLogo.path, uploadedLogo.kind).catch(() => undefined);
      setError(cause instanceof Error ? cause.message : "Não foi possível cadastrar a equipe.");
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Pressable disabled={sending} onPress={() => router.back()} style={s.back}><Text style={s.backText}>‹</Text></Pressable>
          <View><Text style={s.eyebrow}>NOVO TIME</Text><Text style={s.title}>Cadastrar equipe</Text></View>
        </View>
        <View style={s.card}>
          <Pressable disabled={sending} onPress={() => void pickLogo()} style={s.logoPicker}>
            {logo ? <Image source={{ uri: logo.uri }} style={s.logo} /> : <View style={s.logoFallback}><Text style={s.logoIcon}>＋</Text><Text style={s.logoHint}>LOGO</Text></View>}
          </Pressable>
          <Field label="NOME DA EQUIPE *" value={nome} onChange={setNome} />
          <Field label="RESPONSÁVEL *" value={responsavel} onChange={setResponsavel} />
          <Text style={s.label}>ESTADO *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>{UFS.map((item) => <Chip key={item} label={item} active={uf === item} onPress={() => setUf(item)} />)}</ScrollView>
          <Field label="CIDADE *" value={cidade} onChange={setCidade} />
          <Text style={s.label}>MODALIDADE *</Text><View style={s.two}>{MODALITIES.map((item) => <Chip key={item} label={item} active={modalidade === item} onPress={() => setModalidade(item)} />)}</View>
          <Text style={s.label}>CATEGORIA *</Text><View style={s.two}>{CATEGORIES.map((item) => <Chip key={item} label={item} active={categoria === item} onPress={() => setCategoria(item)} />)}</View>
          <Field label="CONTATO *" value={contato} onChange={setContato} keyboardType="phone-pad" />
          <Text style={s.label}>ELENCO</Text>
          <TextInput value={roster} onChangeText={setRoster} placeholder="Um atleta por linha" placeholderTextColor={brand.colors.muted} multiline style={s.textarea} />
          <Text style={s.label}>PLANO</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.plans}>
            {(Object.keys(TEAM_PLANS) as TeamPlan[]).map((key) => {
              const current = TEAM_PLANS[key];
              return <Pressable key={key} disabled={sending} onPress={() => setPlan(key)} style={[s.plan, plan === key && s.planActive]}><Text style={[s.planName, plan === key && s.planNameActive]}>{current.name}</Text><Text style={s.planValue}>{current.value ? `R$ ${current.value.toFixed(2).replace(".", ",")}/mês` : "GRÁTIS"}</Text></Pressable>;
            })}
          </ScrollView>
          {plan !== "gratuito" ? <View style={s.notice}><Text style={s.noticeTitle}>Pagamento pela Google Play</Text><Text style={s.noticeText}>Depois de registrar a equipe, o app abrirá o checkout oficial da Google Play. O plano só será ativado após confirmação automática do pagamento.</Text></View> : null}
          {error ? <Text style={s.error}>{error}</Text> : null}
          {success ? <Text style={s.success}>{success}</Text> : null}
          <Pressable disabled={sending} onPress={() => void submit()} style={[s.submit, sending && s.disabled]}>{sending ? <ActivityIndicator color={brand.colors.bgDeep} /> : <Text style={s.submitText}>{plan === "gratuito" ? "ENVIAR EQUIPE PARA ANÁLISE" : "CONTINUAR PARA PAGAMENTO"}</Text>}</Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChange, keyboardType }: { label: string; value: string; onChange: (value: string) => void; keyboardType?: "default" | "phone-pad" }) {
  return <View><Text style={s.label}>{label}</Text><TextInput value={value} onChangeText={onChange} keyboardType={keyboardType || "default"} placeholderTextColor={brand.colors.muted} style={s.input} /></View>;
}
function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[s.chip, active && s.chipActive]}><Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text></Pressable>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.colors.bg }, page: { padding: 16, paddingBottom: 40 }, header: { flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 12 }, back: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: brand.colors.borderSoft, backgroundColor: brand.colors.surface }, backText: { color: brand.colors.text, fontSize: 32, lineHeight: 34 }, eyebrow: { color: brand.colors.cyan, fontSize: 8, fontWeight: "900", letterSpacing: 1 }, title: { color: brand.colors.text, fontSize: 24, fontWeight: "900" }, card: { gap: 10, borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.xl, backgroundColor: brand.colors.surface, padding: 15 }, logoPicker: { alignSelf: "center", marginBottom: 4 }, logo: { width: 100, height: 100, borderRadius: 24, borderWidth: 2, borderColor: brand.colors.cyan }, logoFallback: { width: 100, height: 100, borderRadius: 24, alignItems: "center", justifyContent: "center", borderWidth: 2, borderStyle: "dashed", borderColor: brand.colors.cyan, backgroundColor: brand.colors.bgDeep }, logoIcon: { color: brand.colors.cyan, fontSize: 28 }, logoHint: { marginTop: 2, color: brand.colors.muted, fontSize: 8, fontWeight: "900" }, label: { marginTop: 3, color: brand.colors.cyanSoft, fontSize: 9, fontWeight: "900", letterSpacing: 0.7 }, input: { borderWidth: 1, borderColor: brand.colors.border, borderRadius: brand.radius.md, backgroundColor: brand.colors.bgDeep, color: brand.colors.text, paddingHorizontal: 12, paddingVertical: 12 }, textarea: { minHeight: 100, borderWidth: 1, borderColor: brand.colors.border, borderRadius: brand.radius.md, backgroundColor: brand.colors.bgDeep, color: brand.colors.text, padding: 12, textAlignVertical: "top" }, chips: { gap: 6, paddingVertical: 2 }, two: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, chip: { borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.pill, backgroundColor: brand.colors.bgDeep, paddingHorizontal: 11, paddingVertical: 7 }, chipActive: { borderColor: brand.colors.cyan, backgroundColor: "#0a4160" }, chipText: { color: brand.colors.mutedStrong, fontSize: 9, fontWeight: "800" }, chipTextActive: { color: brand.colors.cyanSoft }, plans: { gap: 7, paddingVertical: 2 }, plan: { minWidth: 105, borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.md, backgroundColor: brand.colors.bgDeep, padding: 10 }, planActive: { borderColor: brand.colors.gold, backgroundColor: "#3c2c0d" }, planName: { color: brand.colors.text, fontSize: 10, fontWeight: "900" }, planNameActive: { color: brand.colors.gold }, planValue: { marginTop: 4, color: brand.colors.muted, fontSize: 8 }, notice: { borderWidth: 1, borderColor: "#594513", borderRadius: brand.radius.md, backgroundColor: "#2a210d", padding: 11 }, noticeTitle: { color: brand.colors.gold, fontSize: 10, fontWeight: "900" }, noticeText: { marginTop: 4, color: brand.colors.mutedStrong, fontSize: 9, lineHeight: 14 }, error: { borderRadius: brand.radius.md, backgroundColor: brand.colors.dangerBg, color: "#ffd5dd", padding: 11, fontWeight: "700" }, success: { borderRadius: brand.radius.md, backgroundColor: "#123d33", color: "#bff7df", padding: 11, fontWeight: "800" }, submit: { minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: brand.radius.md, backgroundColor: brand.colors.gold, marginTop: 4 }, submitText: { color: brand.colors.bgDeep, fontSize: 11, fontWeight: "900", letterSpacing: 0.4 }, disabled: { opacity: 0.45 },
});
