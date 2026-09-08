# Release Candidate RC1 — Auditoria para Google Play

Data: 08/09/2026

## Estado geral

O produto Web/PWA está funcional como rede esportiva mobile e já possui navegação inferior, autenticação, perfil, feed, mídia, Stories, Destaques, campeonatos e painel administrativo. Nesta rodada foram corrigidos pontos diretamente ligados ao lançamento do aplicativo.

O RC1 ainda **não deve ser enviado para produção na Play Store** até os itens P0 abaixo serem fechados.

## Alterações aplicadas nesta rodada

### Modo APP oficial

- `manifest.webmanifest` agora inicia em `/?app=1`.
- O shell mobile reconhece `app=1`, PWA standalone e contexto TWA.
- O lançamento não depende mais exclusivamente do antigo sinalizador Beta.
- Service Worker atualizado para cache V41.

### Conta e privacidade

- Criada a página pública `exclusao-conta.html`.
- Adicionado `EXCLUIR MINHA CONTA` na área autenticada.
- Adicionado acesso à exclusão no painel mobile da conta.
- Política de Privacidade atualizada para site + aplicativo.
- Política agora referencia Firebase, Firestore, Cloudinary, App Check, retenção e exclusão.
- Termos de Uso atualizados para moderação UGC.

### Segurança da comunidade

Criado `ugc-safety-v41.js` com:

- denúncia de publicação/perfil;
- protocolo local da denúncia;
- encaminhamento ao canal oficial de moderação;
- bloqueio de usuário;
- ocultação das publicações do usuário bloqueado no aparelho;
- ocultação de conversas do usuário bloqueado no aparelho;
- bloqueio no perfil público;
- opção de desbloqueio.

### Infraestrutura já existente confirmada

- Firebase Authentication.
- Firebase App Check Web com reCAPTCHA Enterprise.
- Firestore Rules.
- Storage Rules com validação de proprietário, tipo e tamanho de arquivo.
- Cloudinary para novas mídias sociais.

---

# P0 — Bloqueadores antes da produção

## P0.1 Exclusão completa de conta e dados

**Estado:** PARCIAL.

Existe agora um caminho público e dentro da conta para iniciar a solicitação. O processo ainda depende de atendimento/moderação para concluir a remoção.

Antes da produção deve existir um procedimento autoritativo para remover ou anonimizar, quando aplicável:

- Firebase Authentication;
- `usuarios/{uid}`;
- `perfis/{uid}`;
- publicações;
- vídeos;
- Stories;
- comentários;
- curtidas;
- salvos;
- seguidores/seguindo;
- mensagens/conversas conforme política aplicável;
- notificações;
- mídia armazenada no Cloudinary/Firebase Storage;
- demais documentos diretamente vinculados ao UID.

Observação: nas Rules atuais, o próprio usuário não pode apagar `usuarios/{uid}`. A exclusão completa deve ser feita por backend/admin autorizado, e não por uma cascata insegura no navegador.

## P0.2 Moderação UGC persistente

**Estado:** PARCIAL.

A interface de denúncia e bloqueio já existe no RC1. O bloqueio atual é persistido localmente no aparelho e as denúncias são encaminhadas ao canal de moderação.

Antes da produção, recomenda-se fortemente migrar para backend autoritativo:

- coleção de denúncias;
- fila administrativa;
- status da denúncia;
- auditoria de decisão;
- bloqueios persistentes por UID, sincronizados entre aparelhos;
- bloqueio aplicado também ao Direct e demais consultas sociais;
- ações administrativas de ocultar conteúdo/suspender usuário.

## P0.3 Upload Cloudinary assinado

**Estado:** PENDENTE.

`cloudinary-upload.js` envia `upload_preset` diretamente pelo cliente. Para produção pública, criar endpoint/backend de assinatura e impor:

- UID autenticado;
- pasta/namespace por usuário;
- limite de tamanho;
- tipos MIME permitidos;
- rate limiting;
- expiração de assinatura;
- registro de auditoria quando necessário.

## P0.4 Projeto Android/TWA

**Estado:** NÃO EXISTE NO REPOSITÓRIO.

Criar wrapper Android com Trusted Web Activity para `https://cadastrodeatletas.com.br/?app=1`.

Requisitos:

- package id definitivo;
- target SDK/API exigida pela Play Store;
- min SDK definido;
- Android App Bundle (`.aab`);
- Play App Signing / upload key;
- ícone adaptive/maskable;
- splash/theme;
- Digital Asset Links;
- arquivo `/.well-known/assetlinks.json` no domínio;
- validação de domínio TWA sem barra de navegador.

## P0.5 Assets obrigatórios de Android/Play

**Estado:** INCOMPLETO.

O PWA possui hoje `assets/app-icon.svg`. Preparar:

- PNG 192x192;
- PNG 512x512;
- ícone maskable/adaptive;
- ícone da Play Store 512x512;
- feature graphic 1024x500;
- screenshots reais do aplicativo em celulares.

## P0.6 Público-alvo e menores

**Estado:** DECISÃO DE PRODUTO NECESSÁRIA.

A plataforma aceita data de nascimento e a política menciona crianças/adolescentes. Antes do Play Console é obrigatório decidir a faixa de público real do app e alinhar:

- cadastro;
- consentimento/autorizações quando aplicável;
- moderação;
- classificação indicativa;
- respostas de público-alvo no Play Console;
- Termos e Privacidade.

Não marcar faixas etárias no Play Console sem alinhar o comportamento real do produto.

---

# P1 — Alta prioridade antes ou imediatamente após o primeiro beta fechado

## P1.1 Administração por Custom Claims

As regras ainda possuem compatibilidade com e-mail administrativo fixo. Migrar autorização administrativa para Custom Claims/roles autoritativas e manter o e-mail apenas como mecanismo de recuperação operacional, se necessário.

## P1.2 Observabilidade

Adicionar monitoramento de erros e desempenho. Para TWA, considerar telemetria web compatível e logs de backend. Para eventual cliente nativo, usar Crashlytics ou solução equivalente.

## P1.3 Testes automatizados de Rules

Criar testes allow/deny para:

- perfil público/privado;
- dono versus terceiros;
- publicação;
- comentário;
- seguir;
- Direct;
- admin;
- bloqueios;
- exclusão.

## P1.4 Teste E2E

Validar em aparelhos reais:

1. criar conta;
2. entrar/sair/resetar senha;
3. completar perfil;
4. publicar foto;
5. publicar vídeo;
6. publicar carrossel;
7. publicar Story;
8. abrir Story pela foto de perfil;
9. expiração de Story e Destaques;
10. curtir/comentar/salvar;
11. seguir/deixar de seguir;
12. denunciar/bloquear/desbloquear;
13. Direct;
14. notificações;
15. campeonatos;
16. painel ADM em mobile;
17. exclusão de conta.

---

# Play Console — Itens ainda externos ao código

- criar/confirmar conta de desenvolvedor;
- criar app no Play Console;
- preencher App access;
- fornecer conta de teste para revisão quando necessário;
- preencher Segurança dos dados;
- informar URL da Política de Privacidade;
- informar URL pública de exclusão de conta;
- preencher classificação de conteúdo;
- declarar publicidade, caso exista;
- definir público-alvo;
- enviar screenshots/ícone/feature graphic;
- criar teste interno/fechado;
- cumprir eventual requisito de testadores da conta;
- enviar AAB;
- corrigir Pre-launch report;
- solicitar produção.

---

# Critério para chamar a próxima versão de RC2

RC2 começa quando os seguintes itens estiverem concluídos:

1. backend de exclusão de conta;
2. denúncias/bloqueios persistentes;
3. upload Cloudinary assinado;
4. projeto Android/TWA criado;
5. Digital Asset Links funcionando;
6. build AAB com target API correto;
7. assets finais disponíveis;
8. fluxo E2E principal aprovado em Android real.

Depois disso, o trabalho deixa de ser desenvolvimento de base e passa a ser preparação de Play Console e teste de distribuição.
