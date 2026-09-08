const crypto = require("node:crypto");

const { getFirestore } = require("firebase-admin/firestore");
const { HttpsError, onCall } = require("firebase-functions/v2/https");
const { GoogleAuth } = require("google-auth-library");

const db = getFirestore();
const PACKAGE_NAME = "br.com.cadastrodeatletas.app";
const PLAY_SCOPE = "https://www.googleapis.com/auth/androidpublisher";

const PLAN_PRODUCTS = Object.freeze({
  bronze: "team_bronze_monthly",
  prata: "team_prata_monthly",
  ouro: "team_ouro_monthly",
  premium: "team_premium_monthly",
});

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function accountHash(uid) {
  return crypto.createHash("sha256").update(uid).digest("hex");
}

function tokenHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function fetchSubscription(purchaseToken) {
  const auth = new GoogleAuth({ scopes: [PLAY_SCOPE] });
  const client = await auth.getClient();
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE_NAME)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
  const response = await client.request({ url, method: "GET" });
  return response.data || {};
}

function validLineItem(purchase, expectedProduct) {
  const items = Array.isArray(purchase.lineItems) ? purchase.lineItems : [];
  const now = Date.now();
  return items
    .filter((item) => text(item?.productId) === expectedProduct)
    .map((item) => ({ ...item, expiryMs: Date.parse(text(item?.expiryTime)) || 0 }))
    .filter((item) => item.expiryMs > now)
    .sort((a, b) => b.expiryMs - a.expiryMs)[0] || null;
}

function stateAllowsAccess(state) {
  return [
    "SUBSCRIPTION_STATE_ACTIVE",
    "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
    "SUBSCRIPTION_STATE_CANCELED",
  ].includes(state);
}

exports.verifyTeamSubscription = onCall(
  {
    enforceAppCheck: true,
    timeoutSeconds: 60,
    memory: "512MiB",
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Entre novamente na sua conta.");

    const teamRequestId = text(request.data?.teamRequestId);
    const planId = text(request.data?.planId);
    const purchaseToken = text(request.data?.purchaseToken);
    if (!teamRequestId || !purchaseToken || !PLAN_PRODUCTS[planId]) {
      throw new HttpsError("invalid-argument", "Dados da compra incompletos.");
    }

    const teamRef = db.collection("equipes_pendentes").doc(teamRequestId);
    const team = await teamRef.get();
    if (!team.exists) throw new HttpsError("not-found", "Cadastro de equipe não encontrado.");
    const teamData = team.data() || {};
    if (text(teamData.ownerUid) !== uid) throw new HttpsError("permission-denied", "Esta equipe não pertence à sua conta.");
    if (text(teamData.planoId) !== planId) throw new HttpsError("failed-precondition", "O plano comprado não corresponde ao plano selecionado.");

    let purchase;
    try {
      purchase = await fetchSubscription(purchaseToken);
    } catch (error) {
      console.error("Google Play verification failed", error);
      throw new HttpsError("unavailable", "Não foi possível confirmar a compra com a Google Play agora.");
    }

    const expectedProduct = PLAN_PRODUCTS[planId];
    const state = text(purchase.subscriptionState);
    const lineItem = validLineItem(purchase, expectedProduct);
    if (!stateAllowsAccess(state) || !lineItem) {
      throw new HttpsError("failed-precondition", "A assinatura ainda não está ativa ou o pagamento não foi concluído.");
    }

    const externalAccountId = text(purchase.externalAccountIdentifiers?.obfuscatedExternalAccountId);
    if (externalAccountId && externalAccountId !== accountHash(uid)) {
      throw new HttpsError("permission-denied", "Esta compra está vinculada a outra conta do aplicativo.");
    }

    const purchaseHash = tokenHash(purchaseToken);
    const privateRef = db.collection("billing_private").doc(teamRequestId);
    const entitlementRef = db.collection("billing_entitlements").doc(teamRequestId);
    const expiresAt = new Date(lineItem.expiryMs).toISOString();
    const now = new Date().toISOString();

    await db.runTransaction(async (transaction) => {
      const latest = await transaction.get(teamRef);
      if (!latest.exists || text(latest.data()?.ownerUid) !== uid) {
        throw new HttpsError("permission-denied", "Cadastro de equipe inválido.");
      }
      transaction.set(privateRef, {
        uid,
        teamRequestId,
        planId,
        productId: expectedProduct,
        purchaseToken,
        purchaseTokenHash: purchaseHash,
        latestSuccessfulOrderId: text(lineItem.latestSuccessfulOrderId),
        subscriptionState: state,
        expiresAt,
        updatedAt: now,
      }, { merge: true });
      transaction.set(entitlementRef, {
        uid,
        teamRequestId,
        planId,
        productId: expectedProduct,
        provider: "google_play",
        active: true,
        subscriptionState: state,
        expiresAt,
        updatedAt: now,
      }, { merge: true });
      transaction.update(teamRef, {
        planoStatus: "ativo",
        pagamentoConfirmado: true,
        pagamentoProvider: "google_play",
        pagamentoProdutoId: expectedProduct,
        pagamentoTokenHash: purchaseHash,
        pagamentoExpiraEm: expiresAt,
        pagamentoAtualizadoEm: now,
      });
    });

    return {
      verified: true,
      active: true,
      planId,
      productId: expectedProduct,
      expiresAt,
      subscriptionState: state,
    };
  },
);
