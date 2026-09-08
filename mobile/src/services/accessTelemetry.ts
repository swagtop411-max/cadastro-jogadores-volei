import { Platform } from "react-native";
import { getAuth } from "@react-native-firebase/auth";
import {
  addDoc,
  collection,
  getFirestore,
  Timestamp,
} from "@react-native-firebase/firestore";

const TTL_MS = 90 * 24 * 60 * 60 * 1000;
let sessionUidLogged = "";

function deviceLabel(): string {
  if (Platform.OS === "android") return "Android";
  if (Platform.OS === "ios") return "iOS";
  return Platform.OS || "mobile";
}

async function writeEvent(
  type: "cadastro" | "login" | "sessao",
  page: string,
): Promise<void> {
  const user = getAuth().currentUser;
  if (!user?.uid || !user.email) return;

  const now = Timestamp.now();
  await addDoc(collection(getFirestore(), "access_logs"), {
    uid: user.uid,
    email: user.email,
    nome: user.displayName || "Usuário",
    tipo: type,
    plataforma: "app",
    dispositivo: deviceLabel(),
    pagina: page.slice(0, 200),
    fonte: "cliente",
    confiavel: false,
    criadoEm: now,
    expiraEm: Timestamp.fromMillis(now.toMillis() + TTL_MS),
  });
}

export async function recordAppLogin(): Promise<void> {
  await writeEvent("login", "/app/login");
}

export async function recordAppSignup(): Promise<void> {
  await writeEvent("cadastro", "/app/cadastro");
}

export async function recordAppSession(uid: string): Promise<void> {
  if (!uid || sessionUidLogged === uid) return;
  sessionUidLogged = uid;
  await writeEvent("sessao", "/app/sessao");
}

export async function recordAppLogout(): Promise<void> {
  const uid = getAuth().currentUser?.uid || "";
  if (!uid) return;
  await writeEvent("sessao", "/__saida__");
  if (sessionUidLogged === uid) sessionUidLogged = "";
}
