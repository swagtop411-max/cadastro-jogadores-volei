# Mobile V2 — Firestore + Push

Este documento descreve o que precisa ser publicado no Firebase **antes do primeiro build distribuído** do aplicativo.

## 1. Instagram no perfil público

Hoje `perfis/{uid}` não aceita o campo `instagram`. Antes de habilitar edição de Instagram pelo app, adicionar `instagram` às listas `hasOnly` de CREATE e UPDATE em `perfis/{uid}` e validar:

```rules
&& request.resource.data.get('instagram','') is string
&& request.resource.data.get('instagram','').size() <= 300
```

Se o documento privado `usuarios/{uid}` também armazenar a cópia do Instagram, adicionar `instagram` às listas `hasOnly` de CREATE e UPDATE dessa coleção.

## 2. Tokens push por dispositivo

Adicionar dentro de `match /databases/{database}/documents`:

```rules
match /push_tokens/{uid}/devices/{deviceId} {
  allow read: if isAdmin() || isOwner(uid);
  allow create, update: if isOwner(uid)
    && request.resource.data.uid == uid
    && request.resource.data.token is string
    && request.resource.data.token.size() >= 10
    && request.resource.data.token.size() <= 500
    && request.resource.data.provider == 'expo'
    && request.resource.data.platform in ['android','ios']
    && request.resource.data.ativo is bool
    && request.resource.data.atualizadoEm is timestamp
    && request.resource.data.criadoEm is timestamp
    && request.resource.data.keys().hasOnly([
      'uid','token','provider','platform','ativo','atualizadoEm','criadoEm'
    ]);
  allow delete: if isAdmin() || isOwner(uid);
}
```

Tokens são privados. Nunca devem aparecer em `perfis` ou em documentos de leitura pública.

## 3. EAS projectId

Depois de vincular o projeto à conta Expo/EAS, configurar no ambiente de build:

```text
EXPO_PUBLIC_EAS_PROJECT_ID=<project-id-gerado-pelo-EAS>
```

O app não contém projectId falso. Enquanto essa variável não existir, o botão de notificações informa que o EAS ainda precisa ser vinculado.

## 4. Emissor de push

Registrar token no Firestore não envia notificações sozinho. A fase seguinte deve ter um emissor confiável (Cloud Functions ou outro backend) que observe/crie eventos sociais e envie para os tokens ativos. **API keys/segredos do emissor nunca entram no aplicativo.**

## 5. Builds

- `eas build --profile preview --platform android` → APK interno de teste.
- `eas build --profile production --platform android` → Android para Play Store.
- `eas build --profile production --platform ios` → iOS para App Store.

O perfil `preview` do `eas.json` foi configurado para gerar APK.
