# Plano Mestre do App — Cadastro de Atletas V1

## 1. Visão do produto

O app do `cadastrodeatletas.com.br` será um cliente mobile nativo do mesmo produto Web. Site e app devem compartilhar autenticação, identidade, perfis, feed, relacionamentos sociais, campeonatos e dados operacionais sempre que a regra de negócio permitir.

Princípio central: **uma pessoa, um Firebase UID, um perfil público, independentemente de entrar pelo site ou pelo app**.

## 2. Objetivo do MVP

Entregar um app Android/iOS que permita ao atleta:

1. criar conta e entrar;
2. completar e editar o próprio perfil;
3. encontrar outros atletas;
4. visualizar perfis públicos;
5. consumir um feed social;
6. criar publicação;
7. acompanhar campeonatos;
8. receber notificações básicas;
9. manter os mesmos dados sincronizados com o site.

O MVP não deve tentar reproduzir todo o painel administrativo Web.

## 3. Navegação V1

### Abas principais

- **Feed**: publicações, stories e atualizações relevantes.
- **Explorar**: atletas, perfis, equipes e busca.
- **Publicar**: foto/carrossel e legenda.
- **Campeonatos**: lista e detalhes de eventos.
- **Perfil**: perfil do usuário, edição, configurações e conta.

### Rotas globais

- Login
- Cadastro
- Recuperação de senha
- Verificação de e-mail
- Notificações
- Mensagens
- Perfil público de atleta
- Equipe
- Detalhe de campeonato
- Salvos

### Depois do MVP

- Reels/vídeos
- Organizador
- Sorteador de equipes
- Ranking avançado
- Ferramentas premium
- Gestão de equipe

## 4. Arquitetura recomendada

### Stack

- Expo SDK 57
- React Native 0.86
- React 19.2
- TypeScript estrito
- Expo Router
- Expo Development Builds
- EAS Build / EAS Update
- React Native Firebase
- Firebase Auth
- Cloud Firestore
- Firebase App Check
- Firebase Crashlytics
- Firebase Analytics quando apropriado
- Cloudinary com upload assinado
- backend mínimo para operações privilegiadas

### Regra de arquitetura

A interface nunca decide permissões sensíveis. O cliente pode solicitar uma operação, mas autorização, role, billing, assinatura de upload e ações administrativas devem ser validados no servidor/Firebase Rules.

## 5. Modelo canônico de identidade

### `usuarios/{uid}`

Responsável por dados privados e operacionais:

- uid
- nome
- email
- papel
- status
- dados de plano/entitlement quando aplicável
- preferências privadas
- timestamps

### `perfis/{uid}`

Responsável por apresentação pública:

- uid
- nome
- cidade
- UF
- modalidade
- posição
- categoria
- time
- bio
- foto/capa
- handle
- redes sociais permitidas
- histórico de campeonatos
- flag de perfil completo

### `atletas/{id}`

Coleção legada. Pode continuar sendo lida por compatibilidade temporária no Web, mas novas funcionalidades do app não devem criar dependência nela.

## 6. Regra Web ↔ App

Fluxo esperado ao cadastrar no app:

1. Firebase Auth cria o usuário.
2. O UID retornado vira a chave canônica.
3. É criado `usuarios/{uid}`.
4. É criado `perfis/{uid}` com estado inicial incompleto.
5. O site passa a enxergar o perfil imediatamente.
6. Edição futura no app atualiza o mesmo documento utilizado pelo Web.

Nenhum cadastro paralelo será permitido.

## 7. Módulos técnicos

### Core

- inicialização Firebase
- App Check
- ambiente dev/staging/prod
- logging/crash reporting
- sessão
- feature flags futuras

### Repositories

Camada única de acesso a dados. Telas não devem importar Firestore diretamente.

- AuthRepository
- ProfileRepository
- AthleteRepository
- FeedRepository
- SocialRepository
- ChampionshipRepository
- TeamRepository
- NotificationRepository
- MessageRepository

### Services

- upload assinado
- push notifications
- exclusão de conta
- billing/entitlements
- analytics

### Domain

Regras puras que não conhecem React Native, DOM ou Firebase:

- regras de perfil
- sorteador
- ranking
- validações
- normalizações

## 8. Estados obrigatórios em todas as telas de dados

Toda tela que carrega rede deve prever:

- loading
- conteúdo
- vazio
- erro
- retry
- paginação quando aplicável

Nenhuma lista de tamanho desconhecido deve baixar a coleção inteira para filtrar localmente.

## 9. Segurança antes do login real

Bloqueadores obrigatórios:

1. consolidar regras duplicadas de `perfis/{uid}`;
2. substituir autorização ADM por e-mail por custom claims/role autoritativa;
3. adicionar testes Firestore allow/deny;
4. configurar App Check mobile;
5. criar upload Cloudinary assinado;
6. remover base64 de mídia no Firestore;
7. tornar billing server-owned;
8. implementar estratégia de exclusão de conta/dados;
9. não versionar `google-services.json`, `GoogleService-Info.plist`, tokens ou chaves privadas.

## 10. Roadmap de execução

### Fase 0 — Hardening da plataforma

Meta: poder conectar um cliente mobile sem ampliar a superfície de risco.

- Firestore Rules consolidadas
- claims administrativas
- testes de Rules
- uploads assinados
- política de exclusão
- ambientes definidos
- App Check preparado

**Saída:** backend seguro o suficiente para ligar Auth mobile.

### Sprint 1 — Identidade Web ↔ App

- splash/bootstrap
- login
- cadastro
- logout
- recuperação de senha
- verificação de e-mail
- criação/sincronização de `usuarios/{uid}`
- criação/sincronização de `perfis/{uid}`
- Meu Perfil
- Editar Perfil
- Perfil Público

**Critério de aceite:** cadastrar pelo app e visualizar a mesma pessoa no site com o mesmo UID.

### Sprint 2 — Descoberta

- Explorar
- busca de atletas
- filtros indexados
- lista paginada
- detalhes de atleta
- seguir/deixar de seguir

**Critério de aceite:** nenhuma busca depende de scan integral da coleção.

### Sprint 3 — Feed social

- feed paginado
- publicação de imagem/carrossel
- upload assinado
- curtidas
- comentários
- salvos
- stories básicos

**Critério de aceite:** publicação criada no app aparece no Web respeitando aprovação/visibilidade.

### Sprint 4 — Campeonatos e equipes

- lista de campeonatos
- detalhe
- equipes
- histórico do atleta
- integrações de organizador estritamente necessárias

### Sprint 5 — Comunicação

- notificações
- push
- Direct
- unread counts
- deep links

### Sprint 6 — Beta interno

- Crashlytics
- métricas essenciais
- EAS Development/Preview builds
- testes Android físicos
- testes iOS físicos
- acessibilidade
- consumo de rede
- performance
- política/termos/exclusão

### Sprint 7 — Lojas

- ícone/splash definitivos
- screenshots
- descrições
- privacy labels/data safety
- Google Play internal testing
- TestFlight
- correções finais

## 11. Matriz de prioridade

### P0 — sem isso não há beta

- identidade única Web ↔ App
- Rules testadas
- Auth
- App Check
- profile CRUD seguro
- upload seguro
- exclusão de conta
- crash reporting

### P1 — MVP público

- explorar atletas
- feed
- publicar
- campeonatos
- notificações
- deep links

### P2 — evolução

- Direct completo
- Reels
- ranking avançado
- organizador
- sorteios
- monetização avançada

## 12. Estratégia de releases

Três canais:

- `development`: build para desenvolvimento com dev client;
- `preview`: build interno para testes sem publicar em loja;
- `production`: build assinado para Play Store/App Store.

O `main` do site não deve ser usado como laboratório mobile. O desenvolvimento segue em branch/PR separado e só entra em produção após checks verdes.

## 13. Definition of Done do MVP

O MVP só é considerado pronto quando:

- conta Web e App usam o mesmo UID;
- nenhuma tela crítica acessa Firestore diretamente fora da camada de repository;
- Rules possuem testes allow/deny;
- App Check está habilitado nos builds de produção;
- uploads sensíveis são assinados;
- não existem credenciais administrativas no cliente;
- loading/empty/error/retry estão implementados;
- listas estão paginadas;
- Crashlytics captura falhas reais;
- existe fluxo de exclusão de conta;
- login/cadastro/perfil/feed são testados em Android e iOS reais;
- CI está verde antes do merge.

## 14. Primeiro marco de produto

O primeiro marco não é “ter várias telas”. É provar a integração central:

> **Criar uma conta no app e abrir o site vendo o mesmo usuário, com o mesmo UID e o mesmo perfil.**

Depois desse marco, as demais funcionalidades passam a ser incrementais e muito menos arriscadas.
