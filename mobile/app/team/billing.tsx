import { getAuth } from "@react-native-firebase/auth";
import { finishTransaction, getAvailablePurchases, useIAP } from "expo-iap";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TEAM_PLANS, type TeamPlan } from "@/services/teamService";
import {
  isPaidTeamPlan,
  productIdForPlan,
  verifyTeamSubscription,
  type PaidTeamPlan,
} from "@/services/teamBillingService";
import { brand } from "@/ui/brand";

type AndroidOffer = { offerToken?: string };
type SubscriptionView = {
  id?: string;
  displayPrice?: string;
  title?: string;
  subscriptionOfferDetailsAndroid?: AndroidOffer[];
};

export default function TeamBillingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ teamRequestId?: string; planId?: string }>();
  const user = getAuth().currentUser;
  const teamRequestId = String(params.teamRequestId || "").trim();
  const rawPlan = String(params.planId || "").trim() as TeamPlan;
  const planId: PaidTeamPlan | null = isPaidTeamPlan(rawPlan) ? rawPlan : null;
  const productId = planId ? productIdForPlan(planId) : "";
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState("Conectando à Google Play…");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function processPurchase(purchase: any) {
    if (!planId || !teamRequestId || done) return;
    const token = String(purchase?.purchaseToken || "").trim();
    if (!token) throw new Error("A compra não retornou um token válido.");
    setProcessing(true);
    setError(null);
    setStatus("Confirmando pagamento com a Google Play…");
    try {
      await verifyTeamSubscription({ teamRequestId, planId, purchaseToken: token });
      setStatus("Finalizando compra…");
      await finishTransaction({ purchase, isConsumable: false });
      setDone(true);
      setStatus("Plano ativado com sucesso.");
      setTimeout(() => router.replace("/teams"), 700);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível validar a assinatura.");
      setStatus("Pagamento ainda não confirmado.");
    } finally {
      setProcessing(false);
    }
  }

  const { connected, subscriptions, fetchProducts, requestPurchase } = useIAP({
    onPurchaseSuccess: (purchase) => {
      void processPurchase(purchase);
    },
    onPurchaseError: (purchaseError) => {
      const code = String(purchaseError?.code || "").toLowerCase();
      if (!code.includes("cancel")) setError(purchaseError?.message || "A compra não foi concluída.");
      setProcessing(false);
      setStatus(code.includes("cancel") ? "Compra cancelada." : "Não foi possível concluir a compra.");
    },
    onError: (cause) => setError(cause.message),
  });

  useEffect(() => {
    if (!connected || !productId) return;
    setStatus("Carregando plano na Google Play…");
    void fetchProducts({ skus: [productId], type: "subs" })
      .then(() => setStatus("Plano pronto para assinatura."))
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Não foi possível carregar o plano."));
  }, [connected, productId, fetchProducts]);

  const subscription = useMemo(
    () => subscriptions.find((item) => item.id === productId) as unknown as SubscriptionView | undefined,
    [subscriptions, productId],
  );

  async function buy() {
    if (!user || !planId || !teamRequestId || !productId) return setError("Dados do checkout inválidos.");
    if (!connected) return setError("A Google Play ainda não está conectada. Tente novamente em instantes.");
    if (!subscription) return setError("Este plano ainda não está disponível na Google Play.");
    setProcessing(true);
    setError(null);
    setStatus("Abrindo pagamento seguro da Google Play…");
    const offers = (subscription.subscriptionOfferDetailsAndroid || [])
      .filter((offer) => Boolean(offer.offerToken))
      .map((offer) => ({ sku: productId, offerToken: String(offer.offerToken) }));
    if (!offers.length) {
      setProcessing(false);
      return setError("O plano está sem oferta/base plan ativo na Google Play Console.");
    }
    try {
      await requestPurchase({
        request: {
          apple: { sku: productId },
          google: {
            skus: [productId],
            subscriptionOffers: offers,
            obfuscatedAccountId: user.uid,
          },
        },
        type: "subs",
      });
    } catch (cause) {
      setProcessing(false);
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir o pagamento.");
    }
  }

  async function restore() {
    if (!planId || !teamRequestId || !productId) return;
    setProcessing(true);
    setError(null);
    setStatus("Procurando assinatura existente…");
    try {
      const purchases = await getAvailablePurchases();
      const purchase = purchases.find((item) => item.productId === productId && item.purchaseToken);
      if (!purchase) throw new Error("Nenhuma assinatura ativa deste plano foi encontrada nesta conta Google Play.");
      await processPurchase(purchase);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível restaurar a assinatura.");
      setProcessing(false);
    }
  }

  const plan = planId ? TEAM_PLANS[planId] : null;
  if (!planId || !teamRequestId || !plan) {
    return <SafeAreaView style={s.safe}><View style={s.center}><Text style={s.error}>Checkout inválido. Volte ao cadastro da equipe e selecione o plano novamente.</Text><Pressable onPress={() => router.back()} style={s.secondary}><Text style={s.secondaryText}>VOLTAR</Text></Pressable></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={s.page}>
        <Pressable disabled={processing} onPress={() => router.back()} style={s.back}><Text style={s.backText}>‹ VOLTAR</Text></Pressable>
        <Text style={s.eyebrow}>GOOGLE PLAY BILLING</Text>
        <Text style={s.title}>Ativar plano {plan.name}</Text>
        <Text style={s.subtitle}>O pagamento é processado pela Google Play. O plano só é liberado depois que nosso servidor confirma a assinatura diretamente com o Google.</Text>

        <View style={s.card}>
          <Text style={s.planName}>{plan.name.toUpperCase()}</Text>
          <Text style={s.price}>{subscription?.displayPrice || `R$ ${plan.value.toFixed(2).replace(".", ",")}/mês`}</Text>
          <Text style={s.caption}>Assinatura mensal • renovação gerenciada pela Google Play</Text>
          <View style={s.line} />
          <Text style={s.status}>{status}</Text>
          {!connected ? <Text style={s.hint}>Aguardando conexão com a loja…</Text> : null}
          {error ? <Text style={s.error}>{error}</Text> : null}

          <Pressable disabled={processing || done || !connected} onPress={() => void buy()} style={[s.buy, (processing || done || !connected) && s.disabled]}>
            {processing ? <ActivityIndicator color={brand.colors.bgDeep} /> : <Text style={s.buyText}>{done ? "PLANO ATIVADO" : "ASSINAR COM GOOGLE PLAY"}</Text>}
          </Pressable>
          <Pressable disabled={processing || done} onPress={() => void restore()} style={[s.secondary, (processing || done) && s.disabled]}>
            <Text style={s.secondaryText}>RESTAURAR ASSINATURA</Text>
          </Pressable>
        </View>

        <Text style={s.legal}>A cobrança, renovação, cancelamento e método de pagamento são gerenciados pela sua conta Google Play. O aplicativo não recebe os dados do seu cartão.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.colors.bg },
  page: { flexGrow: 1, padding: 18, paddingBottom: 50 },
  center: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: brand.colors.bg },
  back: { alignSelf: "flex-start", marginBottom: 22, borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  backText: { color: brand.colors.cyanSoft, fontSize: 10, fontWeight: "900" },
  eyebrow: { color: brand.colors.gold, fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  title: { marginTop: 6, color: brand.colors.text, fontSize: 28, lineHeight: 32, fontWeight: "900" },
  subtitle: { marginTop: 8, color: brand.colors.mutedStrong, fontSize: 12, lineHeight: 19 },
  card: { marginTop: 22, borderWidth: 1, borderColor: brand.colors.gold, borderRadius: brand.radius.xl, backgroundColor: brand.colors.surface, padding: 18, ...brand.shadow },
  planName: { color: brand.colors.gold, fontSize: 12, fontWeight: "900", letterSpacing: 1 },
  price: { marginTop: 7, color: brand.colors.text, fontSize: 30, fontWeight: "900" },
  caption: { marginTop: 4, color: brand.colors.muted, fontSize: 10 },
  line: { height: 1, marginVertical: 18, backgroundColor: brand.colors.borderSoft },
  status: { color: brand.colors.cyanSoft, fontSize: 11, fontWeight: "800", textAlign: "center" },
  hint: { marginTop: 5, color: brand.colors.muted, fontSize: 9, textAlign: "center" },
  error: { marginTop: 12, borderRadius: brand.radius.sm, backgroundColor: brand.colors.dangerBg, color: "#ffd5dd", padding: 11, fontSize: 10, lineHeight: 16 },
  buy: { minHeight: 54, marginTop: 18, alignItems: "center", justifyContent: "center", borderRadius: brand.radius.md, backgroundColor: brand.colors.gold },
  buyText: { color: brand.colors.bgDeep, fontSize: 11, fontWeight: "900", letterSpacing: 0.4 },
  secondary: { minHeight: 48, marginTop: 9, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: brand.colors.cyan, borderRadius: brand.radius.md },
  secondaryText: { color: brand.colors.cyanSoft, fontSize: 10, fontWeight: "900" },
  disabled: { opacity: 0.45 },
  legal: { marginTop: 14, color: brand.colors.muted, fontSize: 9, lineHeight: 15, textAlign: "center" },
});
