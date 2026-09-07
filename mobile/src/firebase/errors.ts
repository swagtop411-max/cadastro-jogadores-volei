export function firebaseErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";

  switch (code) {
    case "auth/invalid-email":
      return "Digite um e-mail válido.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "E-mail ou senha incorretos.";
    case "auth/email-already-in-use":
      return "Este e-mail já possui uma conta.";
    case "auth/weak-password":
      return "Escolha uma senha mais forte.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Aguarde um pouco e tente novamente.";
    case "auth/network-request-failed":
      return "Não foi possível acessar a internet. Verifique sua conexão.";
    case "firestore/permission-denied":
      return "O Firebase bloqueou esta operação pelas regras de segurança.";
    case "app-check/token-error":
      return "Não foi possível validar este dispositivo no App Check.";
    default:
      return error instanceof Error && error.message
        ? error.message
        : "Não foi possível concluir a operação.";
  }
}
