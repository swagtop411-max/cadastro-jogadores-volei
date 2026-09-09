const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const cloudinary = require("cloudinary").v2;

initializeApp();
setGlobalOptions({
  region: "southamerica-east1",
  memory: "512MiB",
  timeoutSeconds: 180,
  maxInstances: 10,
});

const db = getFirestore();
const auth = getAuth();
const storage = getStorage();
const CLOUDINARY_CLOUD_NAME = "hmputmfr";
const CLOUDINARY_API_KEY = defineSecret("CLOUDINARY_API_KEY");
const CLOUDINARY_API_SECRET = defineSecret("CLOUDINARY_API_SECRET");
const OWNER_EMAIL = "swagtop411@gmail.com";
const LEGAL_VERSION = "2026-09-09";
const UPLOAD_WINDOW_MS = 60 * 1000;
const UPLOAD_DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
const UPLOADS_PER_MINUTE = 15;
const UPLOADS_PER_DAY = 300;

function requireUser(request) {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Entre na sua conta para continuar.");
  }
  return request.auth.uid;
}

function cleanTag(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function chunks(items, size) {
  const out = [];
  for (let index = 0; index < items.length; index += size) out.push(items.slice(index, index + size));
  return out;
}

function cloudinaryConfig() {
  const apiKey = CLOUDINARY_API_KEY.value();
  const apiSecret = CLOUDINARY_API_SECRET.value();
  if (!apiKey || !apiSecret) {
    throw new HttpsError("failed-precondition", "As credenciais seguras de mídia ainda não foram configuradas.");
  }
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  return { apiKey, apiSecret };
}

async function consumeUploadQuota(uid) {
  const ref = db.collection("upload_rate_limits").doc(uid);
  const now = Date.now();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() || {} : {};

    let minuteStartedAt = Number(data.minuteStartedAt || 0);
    let minuteCount = Number(data.minuteCount || 0);
    let dayStartedAt = Number(data.dayStartedAt || 0);
    let dayCount = Number(data.dayCount || 0);

    if (!minuteStartedAt || now - minuteStartedAt >= UPLOAD_WINDOW_MS) {
      minuteStartedAt = now;
      minuteCount = 0;
    }
    if (!dayStartedAt || now - dayStartedAt >= UPLOAD_DAILY_WINDOW_MS) {
      dayStartedAt = now;
      dayCount = 0;
    }

    if (minuteCount >= UPLOADS_PER_MINUTE || dayCount >= UPLOADS_PER_DAY) {
      throw new HttpsError("resource-exhausted", "Limite temporário de envios atingido. Aguarde e tente novamente.");
    }

    tx.set(ref, {
      uid,
      minuteStartedAt,
      minuteCount: minuteCount + 1,
      dayStartedAt,
      dayCount: dayCount + 1,
      updatedAt: now,
    }, { merge: true });
  });
}

exports.signCloudinaryUpload = onCall(
  {
    enforceAppCheck: true,
    consumeAppCheckToken: true,
    secrets: [CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET],
    timeoutSeconds: 30,
  },
  async (request) => {
    const uid = requireUser(request);
    await consumeUploadQuota(uid);
    const { apiKey, apiSecret } = cloudinaryConfig();
    const kind = cleanTag(request.data?.kind || "social");
    const allowedKinds = new Set(["photo", "video", "story", "carousel", "avatar", "cover", "direct", "social"]);
    if (!allowedKinds.has(kind)) throw new HttpsError("invalid-argument", "Tipo de envio inválido.");

    const resourceType = request.data?.resourceType === "video" ? "video" : "image";
    if (kind === "video" && resourceType !== "video") throw new HttpsError("invalid-argument", "Este envio precisa ser um vídeo.");
    if (["photo", "avatar", "cover", "carousel"].includes(kind) && resourceType !== "image") {
      throw new HttpsError("invalid-argument", "Este envio precisa ser uma imagem.");
    }

    const clientTags = Array.isArray(request.data?.tags) ? request.data.tags.map(cleanTag).filter(Boolean).slice(0, 8) : [];
    const tags = [...new Set(["cadastro-de-atletas", "signed", kind, ...clientTags])].join(",");
    const folder = `cadastro-de-atletas/${uid}/${kind}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = {
      folder,
      overwrite: false,
      tags,
      timestamp,
      unique_filename: true,
      use_filename: false,
    };
    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    return {
      cloudName: CLOUDINARY_CLOUD_NAME,
      apiKey,
      signature,
      timestamp,
      folder,
      tags,
      resourceType,
      maxBytes: resourceType === "video" ? 45 * 1024 * 1024 : kind === "avatar" ? 5 * 1024 * 1024 : kind === "cover" ? 8 * 1024 * 1024 : 25 * 1024 * 1024,
      expiresAt: timestamp + 5 * 60,
    };
  }
);

function parseBirthDate(value) {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const [year, month, day] = raw.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

function isAdult18(value, reference = new Date()) {
  const birth = parseBirthDate(value);
  if (!birth) return null;
  const cutoff = new Date(Date.UTC(reference.getUTCFullYear() - 18, reference.getUTCMonth(), reference.getUTCDate(), 23, 59, 59, 999));
  return birth.getTime() <= cutoff.getTime();
}

exports.acceptLegalTerms = onCall(
  {
    enforceAppCheck: true,
    consumeAppCheckToken: true,
    timeoutSeconds: 30,
  },
  async (request) => {
    const uid = requireUser(request);
    const version = String(request.data?.version || "").trim();
    const adultConfirmed = request.data?.adultConfirmed === true;
    if (version !== LEGAL_VERSION) {
      throw new HttpsError("failed-precondition", "A versão dos Termos mudou. Atualize a página e tente novamente.");
    }
    if (!adultConfirmed) {
      throw new HttpsError("invalid-argument", "Confirme que você tem 18 anos ou mais.");
    }

    const userRef = db.collection("usuarios").doc(uid);
    const userSnap = await userRef.get();
    const birthCheck = isAdult18(userSnap.exists ? userSnap.data()?.nascimento : "");
    if (birthCheck === false) {
      logger.warn("Tentativa de aceite legal por conta menor de idade", { uid });
      throw new HttpsError("permission-denied", "Esta plataforma é exclusiva para maiores de 18 anos.");
    }

    await userRef.set({
      termosAceitosVersao: LEGAL_VERSION,
      termosAceitosEm: FieldValue.serverTimestamp(),
      politicaPrivacidadeAceitaVersao: LEGAL_VERSION,
      politicaPrivacidadeAceitaEm: FieldValue.serverTimestamp(),
      maioridadeDeclarada: true,
      maioridadeDeclaradaEm: FieldValue.serverTimestamp(),
      aceiteLegalOrigem: "app",
      atualizadoEmLegal: FieldValue.serverTimestamp(),
    }, { merge: true });

    logger.info("Aceite legal registrado", { uid, version: LEGAL_VERSION });
    return { ok: true, version: LEGAL_VERSION };
  }
);

function isCloudinaryUrl(value) {
  return /^https:\/\/res\.cloudinary\.com\//i.test(String(value || ""));
}

function addCloudinaryAsset(assets, publicId, resourceType, url) {
  const id = String(publicId || "").trim();
  if (!id || /^https?:\/\//i.test(id)) return;
  if (url && !isCloudinaryUrl(url)) return;
  const type = resourceType === "video" ? "video" : "image";
  assets[type].add(id);
}

function collectMedia(data, assets) {
  if (!data || typeof data !== "object") return;
  addCloudinaryAsset(assets, data.imagemPath, "image", data.imagemUrl || data.imagem);
  addCloudinaryAsset(assets, data.videoPath, "video", data.videoUrl);
  addCloudinaryAsset(assets, data.mediaPath, String(data.mediaType || data.tipo).startsWith("video") ? "video" : "image", data.mediaUrl);
  addCloudinaryAsset(assets, data.fotoPath, "image", data.fotoUrl || data.foto);
  addCloudinaryAsset(assets, data.capaPath, "image", data.capaUrl);
  if (Array.isArray(data.midias)) {
    for (const item of data.midias) {
      if (!item || typeof item !== "object") continue;
      const url = item.url || item.secure_url || item.mediaUrl || "";
      const mime = String(item.mime || item.type || item.mediaType || "");
      addCloudinaryAsset(assets, item.publicId || item.path || item.public_id, mime.startsWith("video") ? "video" : "image", url);
    }
  }
}

async function deleteCloudinaryAssets(assets) {
  cloudinaryConfig();
  for (const resourceType of ["image", "video"]) {
    for (const group of chunks([...assets[resourceType]], 100)) {
      if (!group.length) continue;
      await cloudinary.api.delete_resources(group, {
        resource_type: resourceType,
        type: "upload",
        invalidate: true,
      });
    }
  }
}

async function safeRecursiveDelete(ref) {
  try {
    if (typeof db.recursiveDelete === "function") {
      await db.recursiveDelete(ref);
    } else {
      await ref.delete();
    }
  } catch (error) {
    if (error?.code === 5 || String(error?.message || "").includes("NOT_FOUND")) return;
    throw error;
  }
}

async function queryDocs(collectionName, field, operator, value) {
  return db.collection(collectionName).where(field, operator, value).get();
}

async function queryGroupDocs(groupName, field, operator, value) {
  return db.collectionGroup(groupName).where(field, operator, value).get();
}

exports.deleteMyAccount = onCall(
  {
    enforceAppCheck: true,
    consumeAppCheckToken: true,
    secrets: [CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET],
    timeoutSeconds: 300,
    memory: "1GiB",
  },
  async (request) => {
    const uid = requireUser(request);
    const email = String(request.auth.token?.email || "").trim().toLowerCase();
    if (email === OWNER_EMAIL || request.auth.token?.admin === true) {
      throw new HttpsError("failed-precondition", "A conta administrativa principal não pode ser excluída por este fluxo.");
    }
    if (String(request.data?.confirmation || "").trim().toUpperCase() !== "EXCLUIR") {
      throw new HttpsError("invalid-argument", "Confirme a exclusão digitando EXCLUIR.");
    }

    const assets = { image: new Set(), video: new Set() };
    const refs = new Map();
    const addRef = (ref) => ref && refs.set(ref.path, ref);
    const postIds = [];
    const storyIds = [];
    const athleteIds = [];

    const exactPaths = [
      `usuarios/${uid}`,
      `perfis/${uid}`,
      `config_perfis/${uid}`,
      `solicitacoes_planos/${uid}`,
      `bloqueios/${uid}`,
      `seguidores/${uid}`,
      `seguindo/${uid}`,
      `notificacoes/${uid}`,
      `salvos/${uid}`,
      `destaques/${uid}`,
      `upload_rate_limits/${uid}`,
    ];

    for (const path of exactPaths) {
      const ref = db.doc(path);
      addRef(ref);
      if (path === `perfis/${uid}` || path === `usuarios/${uid}`) {
        const snap = await ref.get().catch(() => null);
        if (snap?.exists) collectMedia(snap.data(), assets);
      }
    }

    const ownerQueries = [
      ["publicacoes", "ownerUid"],
      ["videos", "ownerUid"],
      ["stories", "ownerUid"],
      ["comentarios_publicacoes", "ownerUid"],
      ["comentarios", "ownerUid"],
      ["atletas", "ownerUid"],
      ["atletas_pendentes", "ownerUid"],
      ["equipes", "ownerUid"],
      ["equipes_pendentes", "ownerUid"],
      ["access_logs", "uid"],
      ["handles", "uid"],
      ["reivindicacoes_perfis", "solicitanteUid"],
      ["denuncias", "reportadoPorUid"],
    ];

    for (const [collectionName, field] of ownerQueries) {
      const snap = await queryDocs(collectionName, field, "==", uid).catch((error) => {
        logger.warn("Falha ao localizar dados para exclusão", { uid, collectionName, error: error?.message });
        return null;
      });
      for (const docSnap of snap?.docs || []) {
        addRef(docSnap.ref);
        collectMedia(docSnap.data(), assets);
        if (collectionName === "publicacoes" || collectionName === "videos") postIds.push(docSnap.id);
        if (collectionName === "stories") storyIds.push(docSnap.id);
        if (collectionName === "atletas" || collectionName === "atletas_pendentes") athleteIds.push(docSnap.id);
      }
    }

    const conversations = await queryDocs("conversas", "participants", "array-contains", uid).catch(() => null);
    for (const docSnap of conversations?.docs || []) {
      addRef(docSnap.ref);
      const messages = await docSnap.ref.collection("mensagens").get().catch(() => null);
      for (const message of messages?.docs || []) collectMedia(message.data(), assets);
    }

    for (const field of ["uid", "viewerUid", "userUid"]) {
      const userGroup = await queryGroupDocs("usuarios", field, "==", uid).catch(() => null);
      for (const docSnap of userGroup?.docs || []) addRef(docSnap.ref);
    }

    for (const field of ["actorUid", "targetUid", "ownerUid"]) {
      const items = await queryGroupDocs("itens", field, "==", uid).catch(() => null);
      for (const docSnap of items?.docs || []) addRef(docSnap.ref);
    }

    for (const group of chunks([...new Set(postIds)], 30)) {
      if (!group.length) continue;
      const comments = await db.collection("comentarios_publicacoes").where("publicacaoId", "in", group).get().catch(() => null);
      for (const docSnap of comments?.docs || []) addRef(docSnap.ref);
      const saved = await db.collectionGroup("publicacoes").where("postId", "in", group).get().catch(() => null);
      for (const docSnap of saved?.docs || []) addRef(docSnap.ref);
      for (const postId of group) addRef(db.doc(`curtidas_publicacoes/${postId}`));
    }

    for (const storyId of [...new Set(storyIds)]) addRef(db.doc(`story_views/${storyId}`));

    for (const athleteId of [...new Set(athleteIds)]) {
      const comments = await db.collection("comentarios").where("atletaId", "==", athleteId).get().catch(() => null);
      for (const docSnap of comments?.docs || []) addRef(docSnap.ref);
      const reports = await db.collection("denuncias").where("alvoId", "==", athleteId).get().catch(() => null);
      for (const docSnap of reports?.docs || []) addRef(docSnap.ref);
    }
    const profileReports = await db.collection("denuncias").where("alvoId", "==", uid).get().catch(() => null);
    for (const docSnap of profileReports?.docs || []) addRef(docSnap.ref);

    try {
      await deleteCloudinaryAssets(assets);
    } catch (error) {
      logger.error("Falha ao excluir mídia do Cloudinary", { uid, error: error?.message });
      throw new HttpsError("internal", "Não foi possível remover todas as mídias com segurança. Tente novamente mais tarde.");
    }

    try {
      for (const ref of refs.values()) await safeRecursiveDelete(ref);
      await storage.bucket().deleteFiles({ prefix: `usuarios/${uid}/` }).catch((error) => {
        if (error?.code !== 404) throw error;
      });
      await auth.deleteUser(uid);
      logger.info("Conta excluída pelo próprio usuário", { uid, deletedRefs: refs.size, images: assets.image.size, videos: assets.video.size });
      return { ok: true, deleted: true };
    } catch (error) {
      logger.error("Falha na exclusão da conta", { uid, error: error?.message });
      throw new HttpsError("internal", "A exclusão não foi concluída. A equipe técnica poderá finalizar a remoção com segurança.");
    }
  }
);
