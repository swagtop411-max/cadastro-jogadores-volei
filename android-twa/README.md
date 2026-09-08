# Cadastro de Atletas — Android / Google Play

Wrapper Android oficial em Trusted Web Activity (TWA) para `https://cadastrodeatletas.com.br/?app=1`.

## Identidade inicial

- Application ID: `br.com.cadastrodeatletas.app`
- Version code: `1`
- Version name: `1.0.0`
- Min SDK: 23
- Compile SDK: 36
- Target SDK: 36
- Android Browser Helper: 2.7.2
- JDK: 17
- Android Gradle Plugin: 9.3.0
- Gradle: 9.5.0

O `applicationId` deve ser considerado definitivo a partir do primeiro envio criado no Google Play Console.

## Build local de teste

Com Android SDK 36 e Gradle 9.5 disponíveis:

```bash
cd android-twa
gradle :app:assembleDebug
```

APK de teste:

`app/build/outputs/apk/debug/app-debug.apk`

## Assinatura de release

Nunca envie a chave `.jks` ou senhas para o Git.

Copie `keystore.properties.example` para `keystore.properties` e preencha com a sua upload key.

```bash
cd android-twa
gradle :app:bundleRelease
```

AAB:

`app/build/outputs/bundle/release/app-release.aab`

O workflow `.github/workflows/android-twa.yml` também pode gerar o AAB quando os secrets abaixo estiverem configurados no GitHub:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

## Digital Asset Links

A TWA só abre como experiência confiável, sem a barra de Custom Tab, depois que o domínio publicar:

`https://cadastrodeatletas.com.br/.well-known/assetlinks.json`

O arquivo precisa usar:

- package: `br.com.cadastrodeatletas.app`
- impressão SHA-256 do certificado de **App Signing do Google Play**.

Depois de o Play Console fornecer a impressão digital, gere o arquivo com:

```bash
ANDROID_SHA256_CERT_FINGERPRINT='AA:BB:CC:...' node scripts/generate-assetlinks.mjs
```

Revise e publique `.well-known/assetlinks.json` no domínio.

## Antes de enviar para produção

1. Implantar as Cloud Functions de produção e configurar os secrets Cloudinary.
2. Validar login, perfil, feed, foto, vídeo, Story, Destaques, comentários, seguidores, bloqueios, denúncias, Direct e notificações em aparelho Android real.
3. Validar exclusão de conta completa.
4. Validar `assetlinks.json` com o certificado correto do Google Play.
5. Gerar AAB assinado.
6. Criar teste interno/fechado no Play Console e revisar o Pre-launch report.
