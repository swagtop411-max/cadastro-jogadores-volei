# Mobile V1 — Fundação

Este diretório inicia a continuidade do aplicativo como **novo cliente do mesmo produto**, não como uma base isolada.

## Princípios

1. O app usa o mesmo projeto Firebase canônico da Web: `jogadores-de-volei`.
2. Firebase Auth UID é a identidade principal.
3. `usuarios/{uid}` contém conta/dados privados e operacionais.
4. `perfis/{uid}` contém o perfil público.
5. `atletas/{id}` é legado e não deve ser dependência de novos recursos mobile.
6. Estado financeiro, roles, uploads assinados e outras ações sensíveis são server-authoritative.
7. Nenhuma tela faz scan de coleção inteira para filtrar localmente.
8. Toda listagem deve prever `limit`, cursor, loading, empty, error e retry.
9. Regras de negócio reutilizáveis devem ser puras, sem DOM e sem Firebase.
10. O painel administrativo completo permanece Web na primeira versão.

## Stack

- React Native
- Expo
- TypeScript
- Expo Router
- Development builds / EAS quando houver dependências nativas
- Firebase Auth / Firestore
- App Check nativo
- Cloudinary via upload assinado
- backend mínimo para operações privilegiadas

A criação efetiva do projeto deve ser feita com o template oficial atual do `create-expo-app`, em vez de congelar manualmente versões de dependências neste repositório.

## Estrutura alvo

```text
mobile/
  app/
    (auth)/
      login.tsx
      register.tsx
      forgot-password.tsx
    (tabs)/
      index.tsx
      explore.tsx
      publish.tsx
      championships.tsx
      profile.tsx
    athlete/[uid].tsx
    team/[id].tsx
    championship/[id].tsx
    messages/index.tsx
    messages/[conversationId].tsx
    notifications.tsx
    saved.tsx
    reels.tsx
    organizer/
      index.tsx
      draw-teams.tsx
  src/
    core/
      firebase.ts
      appCheck.ts
      env.ts
    domain/
      contracts.ts
      organizer.ts
      ranking.ts
    repositories/
      authRepository.ts
      profileRepository.ts
      athleteRepository.ts
      feedRepository.ts
      socialRepository.ts
      championshipRepository.ts
      teamRepository.ts
    services/
      uploads.ts
      notifications.ts
      payments.ts
    hooks/
    components/
    design-system/
    utils/
  tests/
```

## Navegação V1

Bottom tabs:

1. Feed
2. Explorar
3. Publicar
4. Campeonatos
5. Perfil

Ações globais:

- Mensagens
- Notificações

Rotas secundárias:

- perfil público de atleta
- equipes
- ranking
- Reels
- salvos
- Organizador

## Fase 0 — não pular

Antes de começar telas:

- [ ] consolidar Firestore Rules de `perfis/{uid}`;
- [ ] remover fallback de autorização ADM por e-mail;
- [ ] remover/rotacionar credenciais client-side nos legados;
- [ ] migrar apoiadores base64 para Cloudinary;
- [ ] criar upload Cloudinary assinado;
- [ ] tornar billing server-owned;
- [ ] implementar testes allow/deny das regras;
- [ ] corrigir e testar algoritmo de sorteio;
- [ ] definir exclusão de conta/dados;
- [ ] centralizar contratos de dados.

## Sprint 1 — identidade Web ↔ App

Critério principal: uma conta criada no app deve aparecer imediatamente no site com o **mesmo UID e o mesmo perfil**, sem criar duplicidade.

Entregas:

- [ ] projeto Expo + TypeScript + Expo Router;
- [ ] ambientes dev/staging/prod;
- [ ] Firebase centralizado;
- [ ] App Check mobile preparado;
- [ ] login;
- [ ] cadastro;
- [ ] logout;
- [ ] recuperação de senha;
- [ ] verificação de e-mail;
- [ ] `usuarios/{uid}`;
- [ ] `perfis/{uid}`;
- [ ] Meu Perfil;
- [ ] Perfil Público;
- [ ] Todos os Atletas paginado;
- [ ] teste cruzado Web ↔ App.

## Regra do sorteador para o futuro módulo Organizador

A regra canônica deve ser:

- 2 homens + 2 mulheres;
- nível: Iniciante = 1, Intermediário = 2, Avançado = 3;
- alvo por time = 9;
- limite absoluto = 10;
- no máximo 1 Avançado por time;
- soma abaixo de 9 continua válida quando necessária;
- objetivo de equilíbrio mínimo = 90%, buscando o melhor arranjo possível.

O código atual de `Sorteio-de-times/js/sorteio.js` precisa ser corrigido porque hoje só cria candidatos de 9 ou 10 pontos.

## Definition of Done para beta interno

- regras Firestore com testes automatizados;
- App Check preparado nos builds nativos;
- nenhuma credencial administrativa no cliente;
- upload de mídia assinado;
- perfil único Web ↔ App;
- tratamento loading/empty/error/retry;
- crash/error logging;
- exclusão de conta planejada e implementável;
- documentação de migrations de schema.
