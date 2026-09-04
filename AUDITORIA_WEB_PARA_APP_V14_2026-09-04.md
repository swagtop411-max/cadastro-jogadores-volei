# Auditoria completa Web → App V14

Data: 04/09/2026

## Objetivo

Auditar os repositórios atualmente acessíveis do projeto e preparar uma transição segura do site `cadastrodeatletas.com.br` para um aplicativo mobile nativo/híbrido, preservando Firebase Auth/Firestore, identidade social, feed, atletas, equipes, campeonatos, ranking, Direct, notificações e monetização.

## Repositórios auditados

### 1. `swagtop411-max/cadastro-jogadores-volei`

Status: PRODUÇÃO WEB.

É o repositório canônico do site atual. Contém frontend estático, regras Firestore/Storage, CI, App Check Web, Auth, perfis, atletas, comunidade, feed, Stories, Reels, Direct, campeonatos, apoiadores, monetização e painéis administrativos.

### 2. `swagtop411-max/mix-play-web`

Status: LEGADO / PROTÓTIPO OPERACIONAL.

Ferramenta simples de partidas/quadras baseada em HTML + localStorage. Não deve ser tratada como camada de autenticação ou backend do futuro app.

### 3. `swagtop411-max/Sorteio-de-times`

Status: PROTÓTIPO DE ORGANIZADOR / MOTOR DE SORTEIO.

Possui um algoritmo de domínio reutilizável para sorteio de quartetos e uma UI web própria. O arquivo `js/sorteio.js` é um bom candidato a virar módulo compartilhado do app, mas o repositório usa outro projeto Firebase e uma proteção administrativa client-side que não deve seguir para produção mobile.

## Situação atual do repositório principal

### Pontos positivos

- Firebase Auth e Firestore já são a identidade central do sistema.
- App Check Web usa reCAPTCHA Enterprise com renovação automática de token.
- Upload principal de perfil/feed/vídeo migrou para Cloudinary e não contém API Secret no frontend.
- Feed público trabalha com `aprovado == true` e `visibilidade == publico`.
- O diretório de atletas tolera falha parcial entre `atletas` e `perfis`.
- V13 cria perfil social básico para contas que ainda não completaram o perfil esportivo.
- Direct, Stories, notificações, seguidores, salvos e bloqueios já possuem regras específicas.
- CI compila JavaScript, executa auditorias e compila regras Firestore/Storage no Firebase Emulator.
- PWA, manifest, service worker, SEO básico e layout responsivo já existem.
- Último pipeline analisado do site: sucesso.

## Achados críticos P0

### P0.1 Credencial administrativa client-side em dois repositórios públicos

`mix-play-web` e `Sorteio-de-times` ainda usam uma senha administrativa embutida no JavaScript/HTML público.

Impacto: qualquer pessoa que visualizar o código-fonte consegue descobrir ou contornar a proteção.

Ação necessária antes do app: remover completamente autenticação por senha local desses projetos. Ferramentas administrativas devem usar Firebase Auth + custom claims/roles ou backend autorizado.

### P0.2 App Check ainda não deve ser colocado em Enforcement

O App Check Web está integrado, mas a ativação obrigatória deve ocorrer somente quando a porcentagem de tráfego legítimo verificado estiver estável. O primeiro monitoramento observado ainda tinha grande quantidade de tráfego sem atestado.

Plano: Firestore primeiro, Authentication depois.

No app mobile serão necessários provedores próprios:
- Android: Play Integrity.
- iOS: App Attest com fallback DeviceCheck quando aplicável.

A chave reCAPTCHA Enterprise Web não é usada como atestação nativa Android/iOS.

### P0.3 Pagamentos ainda são client-side/admin-click

A ativação de plano ainda depende de um administrador confirmar pagamento pelo frontend e o cliente gravar o estado final no Firestore.

Impacto: isso não é uma autoridade de pagamento adequada para assinatura mobile, renovação, chargeback, cancelamento ou benefícios pagos.

Ação: criar backend autoritativo para pagamentos antes de vender assinatura no app.

### P0.4 Upload Cloudinary unsigned

O fluxo principal usa upload preset unsigned. Funciona bem para o site atual, mas o preset pode ser explorado fora do app/site, consumindo quota ou hospedando conteúdo não desejado.

Ação para produção mobile: endpoint backend para assinatura de upload Cloudinary, limites por usuário e logging.

### P0.5 Regras Firestore duplicadas para `/perfis/{uid}`

Existem dois blocos `match /perfis/{uid}`: um legado estrito e o bloco V13 de perfil básico.

As regras são combinadas por OR, então hoje funciona, mas a duplicidade aumenta muito o risco de futuras permissões conflitantes ou amplas demais.

Ação: consolidar em um único contrato V14 antes de congelar o schema para o app.

### P0.6 Admin por e-mail como fallback

`isAdmin()` aceita custom claim OU e-mail administrativo. Para o site atual isso mantém recuperação operacional, mas um app de produção deve migrar para custom claim/role autoritativa.

## Achados P1 de arquitetura e escala

### P1.1 Modelo duplicado de identidade

Hoje existem três conceitos:
- `usuarios/{uid}`: conta privada/operacional.
- `perfis/{uid}`: perfil público social.
- `atletas/{id}`: cadastro legado, potencialmente ligado por `ownerUid`.

Para mobile, `usuarios + perfis` devem ser canônicos. `atletas` deve virar camada de migração/compatibilidade e ser aposentada gradualmente.

### P1.2 Diretório de atletas é client-side

O site pagina por ID e completa a lista em segundo plano com teto aproximado de 600 itens por fonte. Busca e filtros acontecem no navegador.

Isso não escala bem para milhares/dezenas de milhares de atletas.

Ação: paginação cursor-based real, campos normalizados de busca, índices compostos e/ou serviço de busca.

### P1.3 Painéis administrativos agregam dados no cliente

O centro de controle lê centenas de documentos e calcula saúde, duplicidades, acessos e métricas no browser.

Para o app e crescimento regional, criar agregados server-side/materializados.

### P1.4 Telemetria é não autoritativa

`access_logs` e `site_stats` são gerados no cliente e corretamente marcados como `confiavel:false`.

Continuar tratando como telemetria. Não usar esses dados para faturamento, auditoria de segurança ou premiação.

### P1.5 Configuração Firebase duplicada

O mesmo `firebaseConfig` aparece em diversos módulos.

Ação: criar uma única camada `core/firebase` compartilhada por serviços para reduzir drift e facilitar web + app.

### P1.6 Apoiadores ainda possuem mídia base64

O cadastro de apoiador ainda comprime imagem no navegador e grava base64 no Firestore.

Ação: migrar esse fluxo para Cloudinary e retirar mídia binária/base64 de documentos Firestore.

### P1.7 Projeto Firebase separado no sorteador

`Sorteio-de-times` usa outro projeto Firebase.

Ação: o módulo de organizador/sorteio do futuro app deve usar o projeto canônico `jogadores-de-volei`, com permissões por role.

## Achados P2 de qualidade e manutenção

- `index.html` é monolítico e combina estilos/overlays antigos e novos.
- Existem vários gerenciadores independentes de overlay/modal, aumentando risco de tela escurecida/orphan backdrop.
- O service worker ainda usa nome de cache V12 apesar da base V13.
- Versões de cache bust estão espalhadas manualmente por vários arquivos.
- Não há testes E2E para cadastro, login, feed, perfil, reivindicação, mensagens e admin.
- As regras Firestore são compiladas, mas não existem testes unitários `allow/deny` por cenário de segurança.
- README do projeto não descreve arquitetura, contratos ou processo de release.
- Os dois repositórios auxiliares não possuem CI equivalente ao repositório principal.

## Elementos seguros para reaproveitar no mobile

- Firebase Auth como identidade.
- Firestore como banco primário, após consolidação do schema.
- `perfis/{uid}` como identidade pública.
- Coleções sociais e IDs existentes.
- Cloudinary para entrega de mídia.
- Motor puro `js/sorteio.js` do repositório `Sorteio-de-times`, após remover dependências de UI/Firebase.
- Regras de negócio de ranking/campeonatos, após extração para módulos puros.
- Identidade visual e hierarquia de navegação do site.

## O que NÃO deve ser reaproveitado diretamente no app

- HTML/CSS/DOM.
- Senhas administrativas client-side.
- localStorage como fonte de verdade.
- lógica de pagamento client-side.
- upload unsigned como mecanismo final de produção mobile.
- scans de coleções completas para busca/admin.
- Firebase separado do sorteador.
- overlays/modais web.

## Nota de prontidão para app

### Produto / funcionalidades: 8/10

O domínio está rico: identidade, feed, perfil, social, eventos, equipes, ranking e monetização já existem.

### Dados: 6/10

Modelo funcional, mas ainda há legado `atletas`, duplicidade de regras e necessidade de contratos canônicos.

### Segurança: 6/10

App Check e regras evoluíram, porém faltam enforcement estável, claims-only admin, backend de pagamento e upload assinado.

### Escala/performance: 6/10

O site já tem paginação e limites, mas ainda depende de scans e agregações client-side.

### Prontidão mobile geral: 6.5/10

É seguro começar o esqueleto do app, desde que a Fase 0 de backend/schema ocorra em paralelo antes de monetização e lançamento público.

## Ordem recomendada de execução

1. Consolidar schema Firestore e regras V14.
2. Remover credenciais client-side dos repositórios auxiliares.
3. Migrar imagem de apoiador para Cloudinary.
4. Criar backend mínimo autoritativo: roles, pagamento, upload assinado, agregados.
5. Estabilizar App Check Web e preparar App Check Android/iOS.
6. Criar workspace mobile React Native + Expo.
7. Implementar Auth + perfil + diretório + feed.
8. Adicionar Stories/Reels/Direct/notificações.
9. Adicionar campeonatos/equipes/ranking.
10. Incorporar módulo Organizador/Sorteio.
11. Implementar monetização nativa e push notifications.
12. Testes, observabilidade, closed beta e lojas.

## Decisão de arquitetura para retomada

O desenho inicial do app já havia apontado para React Native + Expo + Firebase. Considerando que o produto atual é majoritariamente JavaScript e que o algoritmo de sorteio também é JavaScript puro, essa direção continua sendo a mais econômica e reutilizável.

Recomendação atual: React Native + Expo + TypeScript, Firebase modular SDK, Expo Router, TanStack Query para cache/orquestração de dados quando necessário e uma camada própria de repositórios/serviços para evitar Firestore espalhado pelas telas.

Ver também:
- `APP_MOBILE_HANDOFF_V1_2026-09-04.md`
- `MOBILE_DATA_CONTRACT_V1.md`
