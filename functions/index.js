const crypto = require("node:crypto");

const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { setGlobalOptions } = require("firebase-functions/v2");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { HttpsError, onCall } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");

initializeApp();
setGlobalOptions({ region: "southamerica-east1", maxInstances: 20 });

const db = getFirestore();
const auth = getAuth();
const storage = getStorage();
const CLOUDINARY_API_KEY = defineSecret("CLOUDINARY_API_KEY");
const CLOUDINARY_API_SECRET = defineSecret("CLOUDINARY_API_SECRET");
const CLOUDINARY_CLOUD_NAME = "hmputmfr";
const RECENT_AUTH_SECONDS = 10 * 60;

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cloudinaryPublicIdFromUrl(rawUrl) {
  const value = text(rawUrl);
  if (!value || !value.includes("res.cloudinary.com") || !value.includes("/upload/")) return "";
  try {
    const url = new URL(value);
    const afterUpload = url.pathname.split("/upload/")[1] || "";
    const parts = afterUpload.split("/").filter(Boolean);
    const versionIndex = parts.findIndex((part) => /^v\d+$/.test(part));
    const idParts = versionIndex >= 0 ? parts.slice(versionIndex + 1) : parts;
    if (!idParts.length) return "";
    return decodeURIComponent(idParts.join("/").replace(/\.[a-zA-Z0-9]{2,8}$/, ""));
  } catch {
    return "";
  }
}

function addMediaAsset(bucket, resourceType, path, url) {
  const publicId = text(path) || cloudinaryPublicIdFromUrl(url);
  if (!publicId) return;
  const normalizedType = resourceType === "video" ? "video" : "image";
  bucket.set(`${normalizedType}:${publicId}`, { resourceType: normalizedType, publicId });
}

function collectMediaFromData(bucket, data) {
  if (!data || typeof data !== "object") return;
  addMediaAsset(bucket, "image", data.fotoPath, data.fotoUrl);
  addMediaAsset(bucket, "image", data.capaPath, data.capaUrl);
  addMediaAsset(bucket, "image", data.imagemPath, data.imagemUrl || data.imagem);
  addMediaAsset(bucket, "video", data.videoPath, data.videoUrl);
  addMediaAsset(bucket, data.mediaType || data.tipo, data.mediaPath, data.mediaUrl);
  addMediaAsset(bucket, "image", data.logoPath, data.logo);
  if (Array.isArray(data.midias)) {
    for (const media of data.midias) {
      if (!media || typeof media !== "object") continue;
      addMediaAsset(bucket, media.tipo, media.path, media.url);
    }
  }
}

function cloudinarySignature(params, secret) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return crypto.createHash("sha1").update(`${payload}${secret}`).digest("hex");
}

async function destroyCloudinaryAsset(asset) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const params = { invalidate: "true", public_id: asset.publicId, timestamp };
  const body = new URLSearchParams({
    ...params,
    api_key: CLOUDINARY_API_KEY.value(),
    signature: cloudinarySignature(params, CLOUDINARY_API_SECRET.value()),
  });
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${asset.resourceType}/destroy`;
  const response = await fetch(endpoint, { method: "POST", body });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !["ok", "not found"].includes(String(data.result || ""))) {
    throw new Error(`Falha ao apagar mídia ${asset.resourceType}:${asset.publicId}`);
  }
}

async function queryDocuments(collectionName, field, value) {
  const snapshot = await db.collection(collectionName).where(field, "==", value).get();
  return snapshot.docs;
}

async function queryArrayDocuments(collectionName, field, value) {
  const snapshot = await db.collection(collectionName).where(field, "array-contains", value).get();
  return snapshot.docs;
}

async function queryCollectionGroup(groupName, field, value) {
  const snapshot = await db.collectionGroup(groupName).where(field, "==", value).get();
  return snapshot.docs;
}

function rememberRef(refs, ref) {
  if (ref?.path) refs.set(ref.path, ref);
}

async function collectAccountDeletionPlan(uid) {
  const refs = new Map();
  const media = new Map();

  const directPaths = [
    ["usuarios", uid],
    ["perfis", uid],
    ["config_perfis", uid],
    ["consentimentos", uid],
    ["salvos", uid],
    ["seguidores", uid],
    ["seguindo", uid],
    ["solicitacoes_seguir", uid],
    ["bloqueios", uid],
    ["notificacoes", uid],
    ["push_tokens", uid],
    ["solicitacoes_planos", uid],
  ];

  const directRefs = directPaths.map(([collectionName, id]) => db.collection(collectionName).doc(id));
  const directSnapshots = await db.getAll(...directRefs);
  for (const snapshot of directSnapshots) {
    rememberRef(refs, snapshot.ref);
    if (snapshot.exists) collectMediaFromData(media, snapshot.data());
  }

  const ownedQueries = [
    ["publicacoes", "ownerUid"],
    ["videos", "ownerUid"],
    ["stories", "ownerUid"],
    ["comentarios_publicacoes", "ownerUid"],
    ["equipes", "ownerUid"],
    ["equipes_pendentes", "ownerUid"],
    ["denuncias", "reportadoPorUid"],
    ["handles", "uid"],
    ["atletas", "uid"],
    ["atletas", "ownerUid"],
    ["equipe_convites", "atletaUid"],
    ["equipe_convites", "convidadoPorUid"],
  ];

  for (const [collectionName, field] of ownedQueries) {
    const docs = await queryDocuments(collectionName, field, uid);
    for (const snapshot of docs) {
      rememberRef(refs, snapshot.ref);
      collectMediaFromData(media, snapshot.data());
    }
  }

  const conversations = await queryArrayDocuments("conversas", "participants", uid);
  for (const snapshot of conversations) rememberRef(refs, snapshot.ref);

  for (const field of ["uid", "viewerUid"]) {
    const docs = await queryCollectionGroup("usuarios", field, uid);
    for (const snapshot of docs) rememberRef(refs, snapshot.ref);
  }

  const memberships = await queryCollectionGroup("membros", "uid", uid);
  for (const snapshot of memberships) rememberRef(refs, snapshot.ref);

  const authoredNotifications = await queryCollectionGroup("itens", "actorUid", uid);
  for (const snapshot of authoredNotifications) rememberRef(refs, snapshot.ref);

  return { refs: [...refs.values()], media: [...media.values()] };
}

async function deleteLegacyStorage(uid) {
  const bucket = storage.bucket();
  const prefixes = [`usuarios/${uid}/`, `perfis/${uid}/`, `publicacoes/${uid}/`, `stories/${uid}/`];
  for (const prefix of prefixes) {
    await bucket.deleteFiles({ prefix, force: true });
  }
}

exports.deleteAccount = onCall(
  {
    enforceAppCheck: true,
    secrets: [CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET],
    timeoutSeconds: 540,
    memory: "1GiB",
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Entre novamente na sua conta.");
    if (request.data?.confirmation !== "DELETE_ACCOUNT") {
      throw new HttpsError("invalid-argument", "Confirmação de exclusão inválida.");
    }

    const authTime = Number(request.auth?.token?.auth_time || 0);
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (!authTime || nowSeconds - authTime > RECENT_AUTH_SECONDS) {
      throw new HttpsError("failed-precondition", "Faça login novamente antes de excluir sua conta.");
    }

    logger.info("Iniciando exclusão de conta", { uid });
    const plan = await collectAccountDeletionPlan(uid);

    const mediaResults = await Promise.allSettled(plan.media.map(destroyCloudinaryAsset));
    const mediaFailures = mediaResults.filter((result) => result.status === "rejected");
    if (mediaFailures.length) {
      logger.error("Falha na remoção de mídia; exclusão interrompida antes dos dados", { uid, failures: mediaFailures.length });
      throw new HttpsError("unavailable", "Não foi possível remover todas as mídias agora. Tente novamente em alguns minutos.");
    }

    try {
      await deleteLegacyStorage(uid);
    } catch (error) {
      logger.error("Falha na limpeza do Storage legado", { uid, error: String(error) });
      throw new HttpsError("unavailable", "Não foi possível concluir a limpeza dos arquivos. Tente novamente.");
    }

    for (const ref of plan.refs) {
      await db.recursiveDelete(ref);
    }

    await auth.deleteUser(uid);
    logger.info("Conta excluída com sucesso", { uid, documents: plan.refs.length, media: plan.media.length });
    return { deleted: true };
  },
);

function routeForNotification(data) {
  const type = text(data.type);
  const sourceId = text(data.sourceId);
  const actorUid = text(data.actorUid);
  if (["like", "comment", "mention"].includes(type) && sourceId) return `/post/${sourceId}`;
  if (type === "follow" && actorUid) return `/athlete/${actorUid}`;
  if (type === "message" && actorUid) return `/messages/${actorUid}`;
  if (type === "team_invite") return "/team/invites";
  return "/activity";
}

exports.sendActivityPush = onDocumentCreated("notificacoes/{targetUid}/itens/{notificationId}", async (event) => {
  const targetUid = event.params.targetUid;
  const data = event.data?.data() || {};
  if (!targetUid) return;

  const devices = await db.collection("push_tokens").doc(targetUid).collection("devices").get();
  if (devices.empty) return;

  const actorName = text(data.actorNome) || "Banco de Atletas";
  const bodyText = text(data.text) || "Você tem uma nova atividade.";
  const route = routeForNotification(data);
  const messages = devices.docs
    .map((device) => ({ ref: device.ref, token: text(device.data()?.expoPushToken) }))
    .filter((item) => item.token.startsWith("ExponentPushToken[") || item.token.startsWith("ExpoPushToken["));

  if (!messages.length) return;

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "Accept-Encoding": "gzip, deflate" },
    body: JSON.stringify(messages.map((item) => ({
      to: item.token,
      sound: "default",
      channelId: "social",
      title: actorName,
      body: bodyText,
      data: { route, notificationId: event.params.notificationId },
      priority: "high",
    }))),
  });

  if (!response.ok) {
    logger.error("Expo Push recusou o lote", { status: response.status, targetUid });
    return;
  }

  const payload = await response.json().catch(() => ({}));
  const tickets = Array.isArray(payload.data) ? payload.data : [];
  const removals = [];
  tickets.forEach((ticket, index) => {
    if (ticket?.status === "error" && ticket?.details?.error === "DeviceNotRegistered" && messages[index]?.ref) {
      removals.push(messages[index].ref.delete());
    }
  });
  if (removals.length) await Promise.allSettled(removals);
});
