import { getApp } from "@react-native-firebase/app";
import {
  EmailAuthProvider,
  getAuth,
  reauthenticateWithCredential,
} from "@react-native-firebase/auth";
import { getFunctions, httpsCallable } from "@react-native-firebase/functions";

const REGION = "southamerica-east1";

export async function deleteCurrentAccount(password: string) {
  const user = getAuth().currentUser;
  if (!user || !user.email) throw new Error("Entre novamente na sua conta para continuar.");
  const cleanPassword = password.trim();
  if (!cleanPassword) throw new Error("Digite sua senha para confirmar a exclusão.");

  const credential = EmailAuthProvider.credential(user.email, cleanPassword);
  await reauthenticateWithCredential(user, credential);

  const functions = getFunctions(getApp(), REGION);
  const callable = httpsCallable(functions, "deleteAccount");
  await callable({ confirmation: "DELETE_ACCOUNT" });
}
