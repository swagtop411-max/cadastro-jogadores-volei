# App Mobile Handoff V1

Data: 04/09/2026

## Onde a criação do app havia parado

O primeiro desenho técnico recuperado do projeto, de 31/03/2026, já apontava para:

- React Native com Expo.
- Firebase/Firestore.
- Home/feed com busca e filtros.
- Perfil de atleta estilo rede social.
- Cadastro de usuário e atleta.
- Avaliações, histórico e comentários.

Não há, nos repositórios GitHub atualmente conectados, um projeto React Native/Expo, Flutter, Android nativo ou iOS nativo em execução. Portanto, não existe um build mobile persistido para continuar diretamente.

Desde o desenho inicial, o site evoluiu muito e agora já possui uma base social e de segurança bem mais madura. O app deve ser retomado usando essa base atual, não o schema antigo do protótipo.

## Decisão técnica de retomada

### Stack recomendada

- React Native.
- Expo.
- TypeScript.
- Expo Router.
- Firebase Auth.
- Cloud Firestore.
- Firebase App Check nativo.
- Firebase Analytics/Crashlytics quando compatível com o fluxo de build escolhido.
- Cloudinary para mídia, preferencialmente via upload assinado por backend.

### Motivos

- O domínio atual é JavaScript e pode ter lógica pura reaproveitada.
- O motor de sorteio existente já é JavaScript puro.
- Firebase é a infraestrutura já usada pelo produto.
- Expo reduz custo e complexidade operacional de Android/iOS.
- TypeScript ajuda a congelar contratos de dados que hoje ainda são implícitos no frontend web.

## Projeto Firebase canônico

O app deve usar o mesmo projeto canônico do site:

`jogadores-de-volei`

Não criar um terceiro backend para o app.

O Firebase separado do protótipo de sorteio deve ser considerado legado e migrado quando o módulo Organizador entrar no app.

## App Check mobile

O App Check Web atual usa reCAPTCHA Enterprise.

No mobile:

### Android

Usar Play Integrity.

### iOS

Usar App Attest e fallback DeviceCheck quando necessário.

A chave reCAPTCHA Enterprise do site NÃO deve ser reutilizada como provider nativo Android/iOS.

## Estrutura sugerida do workspace mobile

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
      cloudinary.ts
      env.ts
    domain/
      athlete.ts
      profile.ts
      post.ts
      team.ts
      championship.ts
      ranking.ts
      organizer.ts
    repositories/
      authRepository.ts
      profileRepository.ts
      feedRepository.ts
      athleteRepository.ts
      socialRepository.ts
      championshipRepository.ts
      teamRepository.ts
      organizerRepository.ts
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

1. Feed.
2. Explorar.
3. Publicar.
4. Campeonatos.
5. Perfil.

Ações de topo:

- Mensagens.
- Notificações.

Rotas auxiliares:

- Todos os atletas.
- Perfil do atleta.
- Equipes.
- Ranking.
- Reels.
- Salvos.
- Organizador.

O painel ADM completo deve permanecer Web na primeira versão mobile. O app pode possuir somente ferramentas de Organizador/Equipe com role explícita.

## Módulos por fase

### Fase 0 — Fundação compartilhada

- Consolidar Firestore Rules V14.
- Consolidar `usuarios/perfis` como fonte canônica.
- Definir contratos TypeScript.
- Criar backend mínimo.
- Remover senhas client-side dos repositórios auxiliares.
- Migrar apoiadores base64 para Cloudinary.

### Fase 1 — Skeleton + Auth

- Criar projeto Expo TypeScript.
- Configurar ambientes dev/staging/prod.
- Firebase Auth.
- App Check Android/iOS.
- Login, cadastro, recuperação de senha e verificação de e-mail.
- Perfil social básico V13-equivalent.

Critério de saída: usuário cria conta no app e o mesmo UID/perfil aparece imediatamente no site.

### Fase 2 — Identidade e descoberta

- Meu Perfil.
- Perfil público.
- Todos os atletas.
- Busca/filtros paginados.
- Seguir/deixar de seguir.
- Bloquear/privacidade.
- Ranking.

Critério de saída: mesma conta e mesmo perfil funcionam Web ↔ App sem duplicidade.

### Fase 3 — Conteúdo social

- Feed.
- Publicação imagem/carrossel.
- Vídeos/Reels.
- Stories.
- Curtidas.
- Comentários.
- Salvos.
- Menções/hashtags.

Critério de saída: conteúdo criado no app aparece no site e vice-versa.

### Fase 4 — Comunicação

- Direct.
- Notificações in-app.
- Push notifications.
- Contadores não lidos.

Critério de saída: conversa é única por par de UIDs e sincroniza Web ↔ App.

### Fase 5 — Competições e organizador

- Campeonatos.
- Equipes.
- Histórico/resultados.
- Ferramentas de organizador.
- Incorporar algoritmo `sortearTimes` como módulo de domínio.

Critério de saída: organizador monta rodada/sorteio sem depender de Firebase legado separado.

### Fase 6 — Monetização

Somente depois de backend autoritativo:

- planos de atleta;
- planos de equipe/organizador;
- patrocinadores;
- compras/assinaturas adequadas às políticas das lojas;
- webhooks/receipts;
- entitlement server-side.

## Backend mínimo necessário

Antes de beta público do app, criar endpoints/functions para:

- atribuição de roles/custom claims;
- upload Cloudinary assinado;
- confirmação e reconciliação de pagamentos;
- agregados de ranking/contagens quando necessário;
- envio de push notification;
- tarefas de manutenção/migração;
- ações administrativas sensíveis.

## Estratégia de compartilhamento Web ↔ App

Não tentar reutilizar HTML/CSS/DOM.

Compartilhar:

- contratos de dados;
- validações puras;
- normalizadores;
- regras de ranking;
- algoritmo de sorteio;
- regras de negócio de campeonato;
- constantes de categoria/UF/planos, quando não forem autoridade financeira.

## Primeiro sprint mobile recomendado

Objetivo: provar identidade única Web ↔ App.

Entregas:

1. Expo + TypeScript + Expo Router.
2. Firebase centralizado.
3. App Check Android dev/prod preparado.
4. Login/cadastro/logout/reset.
5. `usuarios/{uid}`.
6. `perfis/{uid}` básico e completo.
7. Tela Meu Perfil.
8. Tela Perfil Público.
9. Tela Todos os Atletas com paginação.
10. Teste real: conta criada no app aparece no site com o mesmo UID.

## Critérios antes de Play Store / App Store

- App Check Enforcement estável.
- Nenhuma senha administrativa client-side.
- Pagamentos autoritativos.
- Política de privacidade atualizada para app.
- exclusão de conta e dados disponível.
- tratamento de denúncia/bloqueio funcional.
- rate limiting/back-end abuse controls.
- crash reporting/observabilidade.
- testes de regras Firestore allow/deny.
- testes E2E dos fluxos principais.

## Próximo checkpoint

A partir deste handoff, o projeto mobile deve ser tratado como uma nova camada cliente do mesmo produto e do mesmo backend, e não como um app separado que replica dados.
