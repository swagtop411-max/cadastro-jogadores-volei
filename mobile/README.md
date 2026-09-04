# Mobile V1 — Fundação

Este diretório inicia a continuidade do aplicativo como **novo cliente do mesmo produto**, não como uma base isolada.

> Acompanhe o andamento em `PHASE0_STATUS.md`.

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

## Stack decidida

- Expo SDK 57;
- React Native 0.86;
- React 19.2;
- TypeScript estrito;
- Expo Router;
- Expo Development Builds / EAS;
- React Native Firebase para integrações nativas;
- Firebase Auth / Firestore do projeto `jogadores-de-volei`;
- App Check nativo;
- Cloudinary via upload assinado;
- backend mínimo para operações privilegiadas.

Ver `ADR-001-firebase-native.md`.

## Estrutura atual

```text
mobile/
  app/
    (auth)/
      _layout.tsx
      login.tsx
      register.tsx
      forgot-password.tsx
    (tabs)/
      _layout.tsx
      index.tsx
      explore.tsx
      publish.tsx
      championships.tsx
      profile.tsx
    _layout.tsx
  src/
    components/
      ScreenPlaceholder.tsx
    contracts/
      schema-v1.ts
    domain/
      organizer.mjs
  tests/
    organizer.test.mjs
  ADR-001-firebase-native.md
  PHASE0_STATUS.md
  app.json
  package.json
  tsconfig.json
```

## Navegação V1

Bottom tabs:

1. Feed
2. Explorar
3. Publicar
4. Campeonatos
5. Perfil

Ações globais futuras:

- Mensagens
- Notificações

Rotas secundárias futuras:

- perfil público de atleta
- equipes
- ranking
- Reels
- salvos
- Organizador

## Fase 0 — não pular

- [ ] consolidar Firestore Rules de `perfis/{uid}`;
- [ ] remover fallback de autorização ADM por e-mail;
- [~] remover/rotacionar credenciais client-side nos legados;
  - `mix-play-web`: correção aberta em branch/PR próprio;
  - `Sorteio-de-times`: senha ainda bloqueia reutilização da interface legada;
- [ ] migrar apoiadores base64 para Cloudinary;
- [ ] criar upload Cloudinary assinado;
- [ ] tornar billing server-owned;
- [ ] implementar testes allow/deny das regras;
- [x] corrigir e testar algoritmo de sorteio no módulo mobile;
- [ ] definir exclusão de conta/dados;
- [x] centralizar contratos de dados V1 em TypeScript;
- [x] criar CI para testar o domínio mobile em PR;
- [x] impedir deploy do GitHub Pages a partir de PR;
- [x] iniciar workspace Expo Router com TypeScript estrito.

## Sprint 1 — identidade Web ↔ App

Critério principal: uma conta criada no app deve aparecer imediatamente no site com o **mesmo UID e o mesmo perfil**, sem criar duplicidade.

Entregas:

- [x] workspace Expo + TypeScript + Expo Router iniciado;
- [ ] ambientes dev/staging/prod;
- [ ] React Native Firebase centralizado;
- [ ] App Check mobile preparado;
- [ ] login funcional;
- [ ] cadastro funcional;
- [ ] logout;
- [ ] recuperação de senha funcional;
- [ ] verificação de e-mail;
- [ ] `usuarios/{uid}` integrado;
- [ ] `perfis/{uid}` integrado;
- [x] rota Meu Perfil criada;
- [ ] Perfil Público;
- [ ] Todos os Atletas paginado;
- [ ] teste cruzado Web ↔ App.

## Regra canônica do sorteador

- 2 homens + 2 mulheres;
- nível: Iniciante = 1, Intermediário = 2, Avançado = 3;
- alvo por time = 9;
- limite absoluto configurado = 10;
- no máximo 1 Avançado por time;
- soma abaixo de 9 continua válida quando necessária;
- objetivo de equilíbrio mínimo = 90%, buscando o melhor arranjo possível.

Observação: com quatro atletas, níveis máximos `3/2/2/2` e apenas um Avançado, a soma máxima efetivamente alcançável hoje é 9. O teto 10 foi mantido no contrato para preservar a regra de negócio e permitir evolução futura do sistema de pesos.

## Definition of Done para beta interno

- regras Firestore com testes automatizados;
- App Check preparado nos builds nativos;
- nenhuma credencial administrativa no cliente;
- upload de mídia assinado;
- perfil único Web ↔ App;
- tratamento loading/empty/error/retry;
- crash/error logging;
- exclusão de conta planejada e implementável;
- documentação de migrations de schema;
- CI com testes de domínio e typecheck mobile verdes.
