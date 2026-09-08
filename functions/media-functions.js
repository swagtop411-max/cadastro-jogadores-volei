const crypto = require("node:crypto");

const { getFirestore } = require("firebase-admin/firestore");
const { HttpsError, onCall } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const db = getFirestore();
const CLOUDINARY_API_KEY = defineSecret("CLOUDINARY_API_KEY");
const CLOUDINARY_API_SECRET = defineSecret("CLOUDINARY_API_SECRET");
const CLOUDINARY_CLOUD_NAME = "hmputmfr";
const ALLOWED_PURPOSES = new Set(["posts", "stories", "profiles", "teams", "messages"]);
const ALLOWED_KINDS = new Set(["image", "video"]);

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function sign(params, secret) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return crypto.createHash("sha1").update(`${payload}${secret}`).digest("hex");
}

function requireUid(request) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Entre novamente na sua conta.");
  return uid;
}

function mediaFolder(uid, purpose) {
  const clean = text(purpose);
  if (!ALLOWED_PURPOSES.has(clean)) {
    throw new HttpsError("invalid-argument", "Destino de mídia inválido.");
  }
  return `cadastro_atletas/${uid}/${clean}`;
}

exports.createMediaUploadSignature = onCall(
  {
    enforceAppCheck: true,
    secrets: [CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET],
    timeoutSeconds: 30,
  },
  async (request) => {
    const uid = requireUid(request);
    const kind = text(request.data?.kind);
    if (!ALLOWED_KINDS.has(kind)) throw new HttpsError("invalid-argument", "Tipo de mídia inválido.");

    const folder = mediaFolder(uid, request.data?.purpose);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const tags = `cadastro-de-atletas,mobile,uid-${uid}`;
    const params = { folder, tags, timestamp };

    return {
      cloudName: CLOUDINARY_CLOUD_NAME,
      apiKey: CLOUDINARY_API_KEY.value(),
      folder,
      tags,
      timestamp,
      signature: sign(params, CLOUDINARY_API_SECRET.value()),
      resourceType: kind === "video" ? "video" : "image",
    };
  },
);

exports.deleteMediaAsset = onCall(
  {
    enforceAppCheck: true,
    secrets: [CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET],
    timeoutSeconds: 30,
  },
  async (request) => {
    const uid = requireUid(request);
    const publicId = text(request.data?.publicId);
    const kind = text(request.data?.kind);
    if (!ALLOWED_KINDS.has(kind)) throw new HttpsError("invalid-argument", "Tipo de mídia inválido.");
    if (!publicId.startsWith(`cadastro_atletas/${uid}/`)) {
      throw new HttpsError("permission-denied", "Esta mídia não pertence à sua conta.");
    }

    const timestamp = String(Math.floor(Date.now() / 1000));
    const params = { invalidate: "true", public_id: publicId, timestamp };
    const body = new URLSearchParams({
      ...params,
      api_key: CLOUDINARY_API_KEY.value(),
      signature: sign(params, CLOUDINARY_API_SECRET.value()),
    });
    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${kind}/destroy`;
    const response = await fetch(endpoint, { method: "POST", body });
    const payload = await response.json().catch(() => ({}));
    const result = text(payload.result);
    if (!response.ok || !["ok", "not found"].includes(result)) {
      throw new HttpsError("unavailable", "Não foi possível limpar a mídia enviada.");
    }

    await db.collection("media_cleanup_log").add({
      uid,
      publicId,
      kind,
      result,
      createdAt: new Date().toISOString(),
    }).catch(() => undefined);
    return { deleted: true };
  },
);
