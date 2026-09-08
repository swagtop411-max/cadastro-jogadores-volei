const crypto = require("node:crypto");

const { getFirestore } = require("firebase-admin/firestore");
const { onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { HttpsError, onCall } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
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

function tokenHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function publisherClient() {
  const auth = new GoogleAuth({ scopes: [PLAY_SCOPE] });
  return auth.getClient();
}

function subscriptionUrl(purchaseToken, action = "") {
  const suffix = action ? `:${action}` : "";
  return `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE_NAME)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}${suffix}`;
}

async function fetchSubscription(purchaseToken) {
  const client = await publisherClient();
  const response = await client.request({ url: subscriptionUrl(purchaseToken), method: "GET" });
  return response.data || {};
}

async function stopRenewal(purchaseToken) {
  const token = text(purchaseToken);
  if (!token) return false;

  let purchase;
  try {
    purchase = await fetchSubscription(token);
  } catch (error) {
    const status = Number(error?.response?.status || 0);
    if ([404, 410].includes(status)) return false;
    throw error;
  }

  const state = text(purchase.subscriptionState);
  if ([
    "SUBSCRIPTION_STATE_CANCELED",
    "SUBSCRIPTION_STATE_EXPIRED",
    "SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED",
  ].includes(state)) return false;

  const client = await publisherClient();
  try {
    await client.request({
      url: subscriptionUrl(token, "cancel"),
      method: "POST",
      data: {
        cancellationContext: {
          cancellationType: "USER_REQUESTED_STOP_RENEWALS",
        },
      },
    });
    return true;
  } catch (error) {
    const status = Number(error?.response?.status || 0);
    if ([400, 404, 410].includes(status)) {
      console.warn("Subscription renewal already stopped or unavailable", { status });
      return false;
    }
    throw error;
  }
}

function lineItemsForProduct(purchase, expectedProduct) {
  const items = Array.isArray(purchase.lineItems) ? purchase.lineItems : [];
  return items
    .filter((item) => text(item?.productId) === expectedProduct)
    .map((item) => ({ ...item, expiryMs: Date.parse(text(item?.expiryTime)) || 0 }))
    .sort((a, b) => b.expiryMs - a.expiryMs);
}

function activeLineItem(purchase, expectedProduct) {
  const now = Date.now();
  return lineItemsForProduct(purchase, expectedProduct).find((item) => item.expiryMs > now) || null;
}

function stateAllowsAccess(state) {
  return [
    "SUBSCRIPTION_STATE_ACTIVE",
    "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
    "SUBSCRIPTION_STATE_CANCELED",
  ].includes(state);
}

function planStatusFor(state, active) {
  if (active) return "ativo";
  if (state === "SUBSCRIPTION_STATE_ON_HOLD" || state === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD") return "em_atraso";
  if (state === "SUBSCRIPTION_STATE_PAUSED") return "pausado";
  return "expirado";
}

async function persistEntitlement({ uid, teamRequestId, planId, purchaseToken, purchase }) {
  const expectedProduct = PLAN_PRODUCTS[planId];
  if (!expectedProduct) throw new Error("Plano desconhecido.");
  const state = text(purchase.subscriptionState);
  const lineItem = activeLineItem(purchase, expectedProduct);
  const active = Boolean(lineItem && stateAllowsAccess(state));
  const latest = lineItem || lineItemsForProduct(purchase, expectedProduct)[0] || null;
  const expiresAt = latest?.expiryMs ? new Date(latest.expiryMs).toISOString() : "";
  const purchaseHash = tokenHash(purchaseToken);
  const now = new Date().toISOString();
  const privateRef = db.collection("billing_private").doc(teamRequestId);
  const entitlementRef = db.collection("billing_entitlements").doc(teamRequestId);
  const teamRef = db.collection("equipes_pendentes").doc(teamRequestId);
  const team = await teamRef.get();

  const batch = db.batch();
  batch.set(privateRef, {
    uid,
    teamRequestId,
    planId,
    productId: expectedProduct,
    purchaseToken,
    purchaseTokenHash: purchaseHash,
    latestSuccessfulOrderId: text(latest?.latestSuccessfulOrderId),
    subscriptionState: state,
    expiresAt,
    updatedAt: now,
  }, { merge: true });
  batch.set(entitlementRef, {
    uid,
    teamRequestId,
    planId,
    productId: expectedProduct,
    provider: "google_play",
    active,
    subscriptionState: state,
    expiresAt,
    updatedAt: now,
  }, { merge: true });
  if (team.exists && text(team.data()?.ownerUid) === uid) {
    batch.update(teamRef, {
      planoStatus: planStatusFor(state, active),
      pagamentoConfirmado: active,
      pagamentoProvider: "google_play",
      pagamentoProdutoId: expectedProduct,
      pagamentoTokenHash: purchaseHash,
      pagamentoExpiraEm: expiresAt,
      pagamentoAtualizadoEm: now,
    });
  }
  await batch.commit();
  return { active, expiresAt, state, productId: expectedProduct };
}

async function billingPrivateForUid(uid) {
  const snapshot = await db.collection("billing_private").where("uid", "==", uid).get();
  return snapshot.docs;
}

async function cancelBillingForUid(uid) {
  const privateDocs = await billingPrivateForUid(uid);
  let canceled = 0;
  for (const entry of privateDocs) {
    const purchaseToken = text(entry.data()?.purchaseToken);
    if (!purchaseToken) continue;
    if (await stopRenewal(purchaseToken)) canceled += 1;
  }
  return canceled;
}

async function deleteBillingForUid(uid) {
  const [privateSnapshot, entitlementSnapshot] = await Promise.all([
    db.collection("billing_private").where("uid", "==", uid).get(),
    db.collection("billing_entitlements").where("uid", "==", uid).get(),
  ]);
  const refs = [...privateSnapshot.docs, ...entitlementSnapshot.docs].map((entry) => entry.ref);
  for (let index = 0; index < refs.length; index += 400) {
    const batch = db.batch();
    for (const ref of refs.slice(index, index + 400)) batch.delete(ref);
    await batch.commit();
  }
  return refs.length;
}

async function cancelAndDeleteBillingForUid(uid) {
  const canceled = await cancelBillingForUid(uid);
  const deleted = await deleteBillingForUid(uid);
  return { canceled, deleted };
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

    const externalAccountId = text(purchase.externalAccountIdentifiers?.obfuscatedExternalAccountId);
    if (externalAccountId && externalAccountId !== uid) {
      throw new HttpsError("permission-denied", "Esta compra está vinculada a outra conta do aplicativo.");
    }

    const result = await persistEntitlement({ uid, teamRequestId, planId, purchaseToken, purchase });
    if (!result.active) {
      throw new HttpsError("failed-precondition", "A assinatura ainda não está ativa ou o pagamento não foi concluído.");
    }

    return {
      verified: true,
      active: true,
      planId,
      productId: result.productId,
      expiresAt: result.expiresAt,
      subscriptionState: result.state,
    };
  },
);

exports.refreshTeamSubscriptions = onSchedule(
  {
    schedule: "every 6 hours",
    timeZone: "America/Sao_Paulo",
    timeoutSeconds: 540,
    memory: "1GiB",
  },
  async () => {
    const snapshot = await db.collection("billing_private").limit(500).get();
    const missingUsers = new Set();
    let updated = 0;
    let canceled = 0;
    let removed = 0;
    let failed = 0;
    for (const entry of snapshot.docs) {
      const data = entry.data() || {};
      const uid = text(data.uid);
      const teamRequestId = text(data.teamRequestId) || entry.id;
      const planId = text(data.planId);
      const purchaseToken = text(data.purchaseToken);
      if (!uid || !teamRequestId || !PLAN_PRODUCTS[planId] || !purchaseToken) continue;
      try {
        const account = await db.collection("usuarios").doc(uid).get();
        if (!account.exists) {
          if (!missingUsers.has(uid)) {
            missingUsers.add(uid);
            const cleanup = await cancelAndDeleteBillingForUid(uid);
            canceled += cleanup.canceled;
            removed += cleanup.deleted;
          }
          continue;
        }
        const purchase = await fetchSubscription(purchaseToken);
        await persistEntitlement({ uid, teamRequestId, planId, purchaseToken, purchase });
        updated += 1;
      } catch (error) {
        failed += 1;
        console.error("Subscription reconciliation failed", { teamRequestId, error: String(error) });
      }
    }
    console.log("Subscription reconciliation complete", { checked: snapshot.size, updated, canceled, removed, failed });
  },
);

exports.cleanupBillingAfterAccountDeletion = onDocumentDeleted(
  {
    document: "usuarios/{uid}",
    retry: true,
  },
  async (event) => {
    const uid = text(event.params.uid);
    if (!uid) return;
    const result = await cancelAndDeleteBillingForUid(uid);
    console.log("Billing cleanup after account deletion complete", { uid, ...result });
  },
);
