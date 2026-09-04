# Firebase nativo — configuração do app

Data: 04/09/2026

## Projeto canônico

O aplicativo mobile usa o mesmo projeto Firebase do site:

- Project ID: `jogadores-de-volei`
- Android package: `br.com.cadastrodeatletas.app`
- iOS bundle identifier: `br.com.cadastrodeatletas.app`

A identidade do usuário é o Firebase Auth UID. O app cria/reutiliza:

- `usuarios/{uid}` para conta privada/operacional;
- `perfis/{uid}` para perfil público compartilhado com o site.

## Android

O app Android já foi registrado no Firebase e o `google-services.json` foi validado fora do repositório.

O arquivo não deve ser commitado. Para desenvolvimento local ele deve existir em:

```text
mobile/google-services.json
```

Para EAS Build, criar uma variável de ambiente do tipo **file** e visibilidade **secret** chamada:

```text
GOOGLE_SERVICES_JSON
```

O `app.config.js` usa automaticamente o caminho fornecido pelo EAS e cai para `./google-services.json` em desenvolvimento local.

## iOS

Ainda é necessário registrar o app iOS no mesmo projeto Firebase com o bundle identifier:

```text
br.com.cadastrodeatletas.app
```

Depois baixar `GoogleService-Info.plist`.

Para EAS Build, o arquivo deve ser cadastrado como variável **file/secret**:

```text
GOOGLE_SERVICE_INFO_PLIST
```

O iOS já está preparado para React Native Firebase com frameworks estáticos por `expo-build-properties`.

## React Native Firebase instalado

- `@react-native-firebase/app`
- `@react-native-firebase/auth`
- `@react-native-firebase/firestore`
- `@react-native-firebase/app-check`

## Authentication

O aplicativo já possui implementação nativa para:

- observar sessão;
- login por e-mail/senha;
- cadastro por e-mail/senha;
- logout;
- recuperação de senha;
- envio de verificação de e-mail;
- restauração/atualização da sessão.

Após cadastro ou login, o app garante os documentos `usuarios/{uid}` e `perfis/{uid}` para manter identidade Web ↔ App.

### Console Firebase

Antes do teste, confirmar em **Authentication > Sign-in method** que **E-mail/Senha** está habilitado.

## Firestore

Repositories implementados:

- conta por UID;
- criação segura de conta inicial;
- perfil público por UID;
- criação de perfil público mínimo (`completo=false`);
- atualização do próprio perfil;
- listagem paginada inicial de perfis.

As regras atuais ainda possuem dois blocos `match /perfis/{uid}` e devem ser consolidadas antes de release de produção.

## App Check

Inicialização ocorre antes da navegação do aplicativo.

Providers configurados no código:

- Android desenvolvimento: `debug`;
- Android produção: `playIntegrity`;
- iOS desenvolvimento: `debug`;
- iOS produção: `appAttestWithDeviceCheckFallback`.

### Primeiro teste Android

Não ativar enforcement do App Check ainda.

No primeiro Development Build Android, registrar o **debug token** exibido pelo SDK no Firebase Console em **App Check > aplicativo Android > Manage debug tokens**. Depois validar Auth/Firestore. Somente quando os clientes Web e Mobile estiverem emitindo tokens válidos deve-se avaliar ativar enforcement.

## EAS

Os perfis `development`, `preview` e `production` estão ligados aos ambientes EAS de mesmo nome.

Para o primeiro APK instalável:

1. criar/conectar o projeto no Expo/EAS;
2. cadastrar `GOOGLE_SERVICES_JSON` como file secret no ambiente `development`;
3. gerar Development Build Android;
4. registrar o App Check debug token;
5. testar login, cadastro, perfil, logout e recuperação de senha;
6. confirmar o mesmo UID e perfil no site.

## Estado atual

CI validado com sucesso após integração React Native Firebase:

- instalação das dependências: OK;
- TypeScript: OK;
- JSON: OK;
- auditorias Web: OK;
- testes do domínio mobile: OK;
- Firestore/Storage Rules compilando: OK.

O deploy do site permanece bloqueado em PR e foi ignorado durante esta validação.
