import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "@react-native-firebase/auth";

import type {
  AuthRepository,
  AuthSession,
  SignUpInput,
} from "../contracts";

function toSession(user: User): AuthSession {
  return {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
  };
}

export const firebaseAuthRepository: AuthRepository = {
  observeSession(listener) {
    return onAuthStateChanged(getAuth(), (user) => {
      listener(user ? toSession(user) : null);
    });
  },

  async signIn(email, password) {
    const credential = await signInWithEmailAndPassword(
      getAuth(),
      email.trim().toLowerCase(),
      password,
    );

    return toSession(credential.user);
  },

  async signUp(input: SignUpInput) {
    const credential = await createUserWithEmailAndPassword(
      getAuth(),
      input.email.trim().toLowerCase(),
      input.password,
    );

    await updateProfile(credential.user, {
      displayName: input.name.trim(),
    });

    return toSession(credential.user);
  },

  async signOut() {
    await signOut(getAuth());
  },

  async sendPasswordReset(email) {
    await sendPasswordResetEmail(getAuth(), email.trim().toLowerCase());
  },

  async sendEmailVerification() {
    const user = getAuth().currentUser;
    if (!user) {
      throw new Error("É necessário estar autenticado para verificar o e-mail.");
    }

    await sendEmailVerification(user);
  },

  async refreshSession() {
    const user = getAuth().currentUser;
    if (!user) return null;

    await reload(user);
    const refreshed = getAuth().currentUser;
    return refreshed ? toSession(refreshed) : null;
  },
};
