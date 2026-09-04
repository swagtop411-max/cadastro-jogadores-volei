# Auditoria Web → App V15

Data: 04/09/2026
Branch de preparação: `mobile-v1-foundation`

## Escopo

Auditoria do repositório principal `cadastro-jogadores-volei`, do legado `mix-play-web` e do protótipo `Sorteio-de-times`, com foco em estabilidade do site atual, segurança, Firestore, autenticação, mídia, desempenho, arquitetura social e prontidão para continuidade do aplicativo mobile.

## Estado do site principal

O `main` está com pipeline verde no commit `94dac3454c2886116837bedc79ceac282b8833c5`.

O CI atual valida:

- sintaxe de todos os arquivos JavaScript;
- auditorias de regressão V8 e V11/V13;
- JSON;
- presença de regras críticas;
- ausência da senha administrativa conhecida no repositório principal;
- compilação das regras Firestore e Storage em emulador;
- deploy do GitHub Pages.

Isso comprova integridade sintática e regressões conhecidas, mas não substitui testes E2E nem testes comportamentais allow/deny das regras.

## P0 — bloqueadores antes de beta público mobile

### 1. Credencial administrativa exposta em código cliente legado

`mix-play-web` ainda contém autenticação por senha no JavaScript público.

`Sorteio-de-times` também contém senha administrativa no cliente e grava dados em um projeto Firebase separado.

A senha deve ser tratada como comprometida, removida dos repositórios e rotacionada. Nenhum app mobile deve carregar segredo administrativo no bundle.

Correção-alvo: Firebase Auth + custom claims/roles e backend autorizado.

### 2. Administração ainda possui fallback por e-mail

`firestore.rules` e `storage.rules` aceitam `token.admin == true` OU e-mail administrativo específico. Módulos administrativos também verificam o e-mail no cliente.

Correção-alvo: autorização server-issued por custom claim/role. O e-mail pode continuar como dado de conta, nunca como autoridade.

### 3. Regras duplicadas para `perfis/{uid}`

Há dois blocos `match /perfis/{uid}`: o contrato antigo completo e o V13 para perfil social básico.

Como regras Firestore em caminhos sobrepostos se combinam por OR, a duplicidade funciona hoje, mas torna evolução e revisão de segurança mais arriscadas.

Correção-alvo: consolidar em um único contrato V14/V15 com `completo: boolean`, timestamps e validação explícita.

### 4. Monetização não é server-authoritative

O usuário cria `solicitacoes_planos`; depois o painel ADM confirma manualmente e o próprio frontend autenticado grava `planoStatus`, `pagamentoConfirmado` e demais campos na conta.

É aceitável como fluxo administrativo manual do site atual, mas inadequado para assinaturas mobile, renovação, chargeback, recibos de loja e entitlement.

Correção-alvo: backend/Cloud Functions + receipts/webhooks + documento financeiro server-owned.

### 5. Upload Cloudinary unsigned

Fotos e vídeos principais usam preset unsigned diretamente no cliente. Não há API secret exposto, o que é positivo, mas o preset pode ser usado fora do produto para consumir quota/hospedar conteúdo.

Correção-alvo: endpoint assinado, limites por usuário/tipo/tamanho, logging e App Check no backend.

### 6. Apoiadores ainda armazenam imagem base64 no Firestore

`apoio.js` comprime a imagem em canvas, chama `toDataURL()` e grava o resultado no documento de solicitação.

Isso aumenta documento, custo de leitura, tráfego e risco de atingir limites do Firestore.

Correção-alvo: Cloudinary, gravando apenas URL/public ID e metadados.

## P1 — arquitetura e escala

### 7. Três modelos de identidade coexistem

- `usuarios/{uid}`: conta/operacional;
- `perfis/{uid}`: identidade pública social;
- `atletas/{id}`: legado.

Direção canônica do app:

- Auth UID = identidade;
- `usuarios/{uid}` = privado/operacional;
- `perfis/{uid}` = público;
- `atletas` = compatibilidade/migração até aposentadoria.

### 8. Diretório de atletas ainda é filtrado no cliente

`public.js` lê `atletas` e `perfis` em páginas, mas completa em background com teto de até 600 documentos por fonte e depois busca/filtra no navegador.

Funciona no volume atual, mas não escala para milhares/dezenas de milhares de perfis.

Correção-alvo mobile: paginação real por cursor, filtros indexáveis, campos normalizados e busca dedicada quando necessário.

### 9. Ranking é recalculado no cliente

`ranking.js` lê até 1000 atletas + 1000 perfis, mescla históricos e calcula classificação no browser.

Correção-alvo: ranking materializado/server-calculated, com filtros/temporadas indexados.

### 10. Painéis administrativos fazem agregações client-side

Continuarão úteis na Web no curto prazo, mas métricas e operações em escala devem migrar para agregados server-side.

### 11. `firebaseConfig` está duplicado em vários módulos

A configuração pública do Firebase não é segredo, porém a repetição cria drift e dificulta Web + App.

Correção-alvo: uma camada central de configuração por ambiente.

### 12. App Check Web está correto, mas não é o App Check mobile

A Web usa reCAPTCHA Enterprise com token auto-refresh.

No mobile, configurar provedores nativos: Android Play Integrity; iOS App Attest/DeviceCheck conforme suporte. O app deverá usar development builds quando módulos nativos forem necessários.

### 13. Ausência de exclusão de conta self-service

A política de privacidade permite solicitar exclusão por contato administrativo, mas a aplicação ainda não oferece fluxo self-service completo de exclusão de conta e dados.

Correção-alvo antes de lojas: tela/fluxo de exclusão, reautenticação, fila backend para apagar/anonimizar dados e mídia, com política de retenção.

## P1 — bug de domínio encontrado no sorteador

### 14. Sorteador rejeita times válidos abaixo de 9 pontos

`js/sorteio.js` define alvo 9 e máximo 10, porém `criarCandidatos()` só adiciona equipes quando a soma é exatamente 9 ou 10.

Isso transforma o alvo em mínimo implícito e pode fazer o sorteio falhar mesmo quando existem quartetos válidos com soma menor que 9.

Regra correta para o produto:

- 10 = limite absoluto;
- 9 = alvo preferencial;
- valores abaixo de 9 continuam válidos quando necessários;
- no máximo 1 Avançado por time;
- 2 homens + 2 mulheres;
- otimizar equilíbrio entre equipes.

Corrigir e cobrir com testes determinísticos/propriedade antes de portar para o app.

## P2 — manutenção, UX e qualidade

### 15. `index.html` e shell visual ainda são monolíticos

Há CSS inline extenso, muitas regras `!important`, blocos `home-legacy`, drawers/modais antigos e novos e runtime que injeta/reescreve partes do menu.

Não portar DOM/CSS para React Native. Extrair apenas regras de negócio e design tokens.

### 16. Service worker tem versionamento V12 em base V13/V15

Não quebra o site, mas demonstra versionamento manual disperso. Centralizar versão/build hash.

### 17. PWA tem apenas ícone SVG

Adicionar PNG 192/512 e demais metadados quando a PWA voltar a ser prioridade. O app nativo terá assets próprios.

### 18. Auditoria atual é majoritariamente baseada em padrões de texto

`scripts/audit-v11.mjs` é um bom regression guard, mas verifica presença/ausência de strings. Não prova comportamento real de login, CRUD, privacidade, Direct, bloqueios ou permissões.

Correção-alvo: Firebase Emulator tests allow/deny + E2E.

## O que está bom e deve ser preservado

- Firebase Auth como identidade.
- `usuarios/{uid}` com proteção contra alteração client-side de papel/status.
- `perfis/{uid}` e perfil social básico automático.
- separação crescente entre dados públicos e privados.
- feed com `aprovado`, `status` e `visibilidade`.
- bloqueios, seguidores, Direct, salvos, notificações e Stories com regras dedicadas.
- proteção contra open redirect no fluxo de login.
- App Check Web com reCAPTCHA Enterprise.
- Cloudinary sem API secret no frontend.
- pipeline de validação/deploy verde.
- algoritmo de sorteio já isolado do DOM em módulo puro, após corrigir a regra de pontuação.

## Decisão atualizada para o app

Stack recomendada:

- React Native + Expo;
- TypeScript;
- Expo Router;
- development builds/EAS para módulos nativos;
- Firebase no mesmo projeto `jogadores-de-volei`;
- camada `core` e repositórios, sem Firestore espalhado nas telas;
- App Check nativo;
- Cloudinary com upload assinado;
- backend mínimo para roles, uploads, pagamentos, push e agregados;
- painel ADM completo permanece Web no V1 mobile.

## Fase 0 obrigatória

1. Consolidar `perfis/{uid}` em regras únicas.
2. Migrar autorização ADM para claims/roles.
3. Remover e rotacionar senhas dos repositórios auxiliares.
4. Migrar mídia de apoiadores de base64 para Cloudinary.
5. Corrigir e testar `sortearTimes`.
6. Definir contratos TypeScript compartilhados.
7. Implementar testes Firestore allow/deny.
8. Criar backend mínimo server-authoritative.
9. Definir estratégia de exclusão de conta/dados.
10. Só então ligar monetização nativa e enforcement total do App Check.

## Sprint mobile 1 após a Fase 0

- criar projeto Expo TypeScript pelo template oficial atual;
- Expo Router;
- dev/staging/prod;
- Auth: cadastro, login, logout, reset e verificação de e-mail;
- `usuarios/{uid}`;
- `perfis/{uid}` básico/completo;
- Meu Perfil;
- Perfil Público;
- Todos os Atletas com cursor real;
- teste Web ↔ App usando o mesmo UID.

## Nota de prontidão atual

- Produto/funcionalidades: 8/10
- Dados: 6/10
- Segurança: 6/10
- Escala/performance: 6/10
- Testabilidade: 5/10
- Prontidão mobile geral: 6.5/10

Conclusão: o produto já tem domínio suficiente para começar o app, mas a Fase 0 precisa transformar a base atual de “frontend web com Firebase” em uma plataforma compartilhada Web + Mobile com autoridade server-side nas áreas sensíveis.
