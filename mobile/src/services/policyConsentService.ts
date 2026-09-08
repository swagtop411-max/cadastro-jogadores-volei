import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from "@react-native-firebase/firestore";

const db = getFirestore();
const acceptedCache = new Map<string, boolean>();

export const TERMS_VERSION = "2026-09-08";
export const PRIVACY_VERSION = "2026-09-08";
export const TERMS_URL = "https://cadastrodeatletas.com.br/termos-de-uso.html";
export const PRIVACY_URL = "https://cadastrodeatletas.com.br/politica-privacidade.html";
export const ACCOUNT_DELETION_URL = "https://cadastrodeatletas.com.br/excluir-conta.html";

export async function hasAcceptedCurrentPolicies(uid: string) {
  if (!uid) return false;
  if (acceptedCache.get(uid) === true) return true;
  const snapshot = await getDoc(doc(db, "consentimentos", uid));
  if (!snapshot.exists()) {
    acceptedCache.set(uid, false);
    return false;
  }
  const data = snapshot.data();
  const accepted = data?.termsVersion === TERMS_VERSION && data?.privacyVersion === PRIVACY_VERSION;
  acceptedCache.set(uid, accepted);
  return accepted;
}

export async function recordPolicyConsent(uid: string) {
  if (!uid) throw new Error("Conta inválida para registrar o aceite.");
  await setDoc(doc(db, "consentimentos", uid), {
    uid,
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    platform: "app",
    acceptedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  acceptedCache.set(uid, true);
}

export function clearPolicyConsentCache(uid?: string) {
  if (uid) acceptedCache.delete(uid);
  else acceptedCache.clear();
}
