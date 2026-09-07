import { getAuth } from "@react-native-firebase/auth";

import type { AuthSession, SignUpInput } from "../repositories/contracts";
import { firebaseAuthRepository } from "../repositories/firebase/authRepository";
import {
  firebaseAccountRepository,
  firebaseProfileRepository,
} from "../repositories/firebase/firestoreRepositories";

function fallbackName(email: string): string {
  const local = email.split("@")[0]?.replace(/[._-]+/g, " ").trim() ?? "Atleta";
  return local.length >= 2 ? local : "Atleta";
}

async function ensureIdentityDocuments(session: AuthSession, preferredName?: string): Promise<void> {
  if (!session.email) {
    throw new Error("A conta autenticada não possui e-mail disponível.");
  }

  const currentUser = getAuth().currentUser;
  const name =
    preferredName?.trim() ||
    currentUser?.displayName?.trim() ||
    fallbackName(session.email);

  await firebaseAccountRepository.ensureInitialAccount({
    uid: session.uid,
    nome: name,
    email: session.email,
  });

  await firebaseProfileRepository.ensureInitialProfile({
    uid: session.uid,
    nome: name,
  });
}

export async function registerIdentity(input: SignUpInput): Promise<AuthSession> {
  const session = await firebaseAuthRepository.signUp(input);
  await ensureIdentityDocuments(session, input.name);

  try {
    await firebaseAuthRepository.sendEmailVerification();
  } catch {
    // A conta e o perfil já existem. A verificação poderá ser reenviada depois.
  }

  return session;
}

export async function signInIdentity(email: string, password: string): Promise<AuthSession> {
  const session = await firebaseAuthRepository.signIn(email, password);
  await ensureIdentityDocuments(session);
  return session;
}

export async function repairCurrentIdentity(): Promise<AuthSession | null> {
  const session = await firebaseAuthRepository.refreshSession();
  if (!session) return null;

  await ensureIdentityDocuments(session);
  return session;
}
