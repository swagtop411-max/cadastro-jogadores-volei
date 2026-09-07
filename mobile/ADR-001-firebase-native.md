# ADR-001 — Firebase nativo no app mobile

Status: **aceito para a fundação V1**

Data: 04/09/2026

## Contexto

O site usa Firebase Web SDK e App Check com reCAPTCHA Enterprise. O aplicativo precisa compartilhar o mesmo Firebase Auth/Firestore, mas também precisa de capacidades nativas para produção, principalmente App Check Android/iOS, Crashlytics e Analytics.

## Decisão

O cliente mobile será construído com:

- Expo SDK 57;
- React Native 0.86;
- React 19.2;
- TypeScript;
- Expo Router;
- Expo Development Builds / EAS;
- React Native Firebase para os módulos nativos necessários;
- mesmo projeto Firebase canônico `jogadores-de-volei`.

Não usaremos Expo Go como ambiente principal de desenvolvimento do produto final, porque React Native Firebase contém código nativo.

## App Check

- Android: Play Integrity.
- iOS: App Attest, com fallback compatível quando necessário.
- Web permanece com reCAPTCHA Enterprise.

A chave/provider Web nunca será reutilizada como provider nativo.

## Identidade

Firebase Auth UID continua sendo a identidade global. Web e App devem enxergar o mesmo usuário e os mesmos documentos `usuarios/{uid}` e `perfis/{uid}`.

## Dados

Novos recursos mobile não podem depender de `atletas/{id}`. Essa coleção permanece apenas como legado/migração até sua aposentadoria.

## Consequências

### Positivas

- App Check realmente nativo.
- caminho direto para Crashlytics/Analytics nativos;
- integração melhor com push e recursos Firebase de dispositivo;
- um único backend e uma única identidade entre Web e App.

### Custos

- exige development build, não apenas Expo Go;
- mudanças em módulos nativos exigem novo build;
- configuração Android/iOS precisa ser mantida via CNG/config plugins e arquivos Firebase próprios de cada plataforma.

## Regra operacional

Segredos de backend, service accounts, chaves privadas, credenciais administrativas e assinatura Cloudinary nunca entram no bundle mobile nem no repositório público.
