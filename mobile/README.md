# Banco de Atletas Mobile

Aplicativo Android/iOS que trabalha lado a lado com `cadastrodeatletas.com.br`.

## Arquitetura

- Expo SDK 57 + React Native + TypeScript
- Expo Router
- Firebase Authentication compartilhado com o site
- Firestore compartilhado com o site
- Cloudinary compartilhado para fotos/vídeos
- Expo Notifications preparado para push
- EAS Build preparado para APK interno, Android e iOS de produção

O app permanece isolado na branch `mobile-foundation`. O site em `main` continua separado durante o desenvolvimento.

## Implementado

### Conta e perfil
- Login com a mesma conta Firebase do site
- Cadastro de nova conta/atleta no app
- Rollback da conta se a criação do perfil falhar
- Perfil próprio em tempo real
- Edição de foto e dados esportivos
- Perfil público/privado
- Solicitações para seguir, aprovação e recusa
- Perfis públicos de outros atletas
- Seguir/deixar de seguir
- Bloquear/desbloquear

### Feed e conteúdo
- Feed sincronizado com `publicacoes`
- Curtidas e comentários
- Salvos
- Hashtags
- Feed simples com foto
- Carrossel de 2 a 10 fotos/vídeos, com foto de capa
- Stories foto/vídeo por 24h
- Arquivo de Stories
- Destaques
- Reels verticais
- Publicação de Reel por câmera/galeria

### Direct e notificações
- Inbox em tempo real
- Chat em tempo real
- Foto e vídeo no Direct
- Notificações internas
- Registro de Expo Push Token preparado
- Ativação de push somente por ação explícita do usuário

### Descoberta esportiva
- Explorar atletas
- Equipes
- Campeonatos
- Link do organizador/inscrição nos campeonatos

## Rodar localmente

Requer Node.js 22.13+ para Expo SDK 57.

```bash
cd mobile
npm install
npx expo install --check
npm run typecheck
npm start
```

## Build de teste Android

O perfil `preview` do EAS está configurado para APK interno:

```bash
eas build --profile preview --platform android
```

Antes do primeiro build com push, vincular o projeto ao EAS e configurar:

```text
EXPO_PUBLIC_EAS_PROJECT_ID=<project-id-do-eas>
```

Veja `MOBILE_V2_FIRESTORE_AND_PUSH.md`.

## Próximos marcos

### Antes do primeiro APK distribuído
- Publicar regra privada de `push_tokens`
- Vincular projeto Expo/EAS
- Configurar credenciais FCM/APNs
- Testar em Android físico
- Corrigir incompatibilidades encontradas no teste real

### Antes das lojas
- Ícone e splash definitivos
- Política de privacidade mobile
- Termos/consentimentos revisados
- Emitter server-side para push
- App Check
- testes de abuso e segurança
- analytics mobile
- screenshots e textos das lojas

### Evolução comercial
- Atleta Pro
- Equipe Pro
- Organizador Pro
- métricas para patrocinadores
- pagamentos server-side
- verificação esportiva

## Segurança

Nunca adicionar ao app:
- senha administrativa
- Cloudinary API Secret
- chave privada
- credenciais de conta de serviço
- segredo de provedor de push

Firebase Web API Key, Cloudinary Cloud Name e unsigned upload preset são configuração cliente e não devem ser confundidos com segredos de servidor.

## Compatibilidade

Leia `DATA_CONTRACT.md` antes de alterar campos do Firestore. O site e o app devem continuar compartilhando o mesmo contrato de dados.
