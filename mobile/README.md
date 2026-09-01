# Banco de Atletas Mobile

Aplicativo Android/iOS que trabalha lado a lado com `cadastrodeatletas.com.br`.

## Arquitetura

- Expo SDK 57 + React Native + TypeScript
- Expo Router
- Firebase Authentication compartilhado com o site
- Firestore compartilhado com o site
- Cloudinary compartilhado para fotos/vídeos

O app está isolado na branch `mobile-foundation`. O site em `main` não precisa ser alterado para desenvolver esta primeira fase.

## V1 já estruturada

- Login com a mesma conta Firebase do site
- Feed lendo `publicacoes`
- Explorar lendo `perfis`
- Criar publicação por câmera ou galeria
- Upload da mídia pelo mesmo Cloudinary
- Gravação da publicação na mesma coleção do site
- Inbox lendo `conversas`
- Perfil lendo `perfis/{uid}` em tempo real

## Rodar localmente

Requer Node.js 22.13+ para Expo SDK 57.

```bash
cd mobile
npm install
npx expo install --fix
npm run typecheck
npm start
```

Para abrir:
- Android: pressione `a` ou use um development build
- iOS: pressione `i` em macOS/Xcode ou use EAS Build

## Próximos marcos

### Fase 1.1
- Chat completo no Direct
- Curtidas e comentários
- Feed de Stories
- Publicar Story
- Perfil público de outros atletas

### Fase 1.2
- Seguir/deixar de seguir
- Perfis privados e solicitações
- Notificações internas
- Push notifications em development build

### Fase 1.3
- Reels
- Campeonatos
- Equipes
- Ranking
- Destaques de Stories

### Fase 2
- Backend confiável para operações sensíveis
- App Check
- Push server-side
- pagamentos/planos
- verificação esportiva
- analytics mobile

## Segurança

Nunca adicionar ao app:
- senha administrativa
- Cloudinary API Secret
- chave privada
- credenciais de conta de serviço

Firebase Web API Key, Cloudinary Cloud Name e unsigned upload preset são identificadores/configuração cliente, não segredos de servidor.

## Compatibilidade

Leia `DATA_CONTRACT.md` antes de alterar campos do Firestore.
