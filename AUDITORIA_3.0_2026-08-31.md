# Auditoria 3.0 — Banco de Dados de Atletas

**Data:** 31 de agosto de 2026  
**Escopo:** frontend, rede social, painel administrativo, Firebase Authentication, Firestore Rules, Storage Rules, privacidade, monetização, cadastros, reivindicações, uploads, performance e pipeline de deploy.

## Resultado executivo

A auditoria 3.0 corrigiu os problemas de código e arquitetura encontrados nesta rodada e adicionou validação automática antes de cada deploy. O pipeline passou com sucesso em:

- sintaxe de todos os arquivos JavaScript;
- validação dos JSONs de configuração;
- bloqueio contra commit acidental da senha administrativa;
- verificações das regras críticas de segurança;
- compilação real das Firestore Rules no Firebase Emulator;
- compilação real das Storage Rules no Firebase Emulator;
- deploy do GitHub Pages.

> Importante: o GitHub Pages publica HTML/CSS/JS, mas não publica automaticamente as regras do projeto Firebase remoto. Portanto, o arquivo `firestore.rules` e o arquivo `storage.rules` estão corrigidos e compilados no repositório, porém precisam ser publicados no Firebase ativo para que as novas políticas de acesso passem a valer no banco e no Storage de produção.

## P0 corrigido — fraude/auto-confirmação de pagamento

Foi identificado que um cliente podia tentar criar um cadastro pago já com `pagamentoConfirmado: true`. A interface normal não fazia isso, mas as regras antigas aceitavam um booleano sem obrigar o valor inicial a ser falso.

Correção:

- cadastro pago obrigatoriamente nasce com pagamento não confirmado;
- plano gratuito obrigatoriamente nasce ativo;
- plano pago obrigatoriamente nasce como `aguardando_pagamento`;
- usuário não pode alterar plano, valor, aprovação, status financeiro ou confirmação do pagamento em um documento pendente;
- confirmação continua sendo responsabilidade administrativa.

## P0 corrigido — dados privados em perfis públicos

A aprovação antiga de uma reivindicação podia copiar dados como nascimento, contato, e-mail e informações de plano para a coleção pública `perfis`.

Correção:

- `perfis` agora aceita somente dados públicos da rede social;
- campos financeiros, nascimento, contato, e-mail e IDs internos não fazem parte do contrato público;
- foi criada a área `perfis/{uid}/privado/dados`;
- o fluxo de aprovação de reivindicação é interceptado pela camada V3 e publica somente o perfil seguro;
- perfis legados com campos sensíveis são saneados pelo painel administrativo;
- dados removidos do perfil público são preservados em documento privado antes da remoção.

## P0 corrigido — sincronização de Meu Perfil reintroduzia PII

A tela `Meu Perfil` sincronizava `nascimento` e `ownerEmail` para o documento público legado do atleta.

Correção:

- a camada V3 sobrescreve o handler de salvamento da tela;
- nascimento, contato, e-mail e pagamento ficam no documento privado `usuarios/{uid}`;
- `perfis/{uid}` recebe somente campos públicos;
- a sincronização com `atletas` passa apenas os dados esportivos públicos;
- nascimento e ownerEmail legados são removidos do documento público quando o atleta salva o perfil.

## P0 corrigido — equipe publicava contato e dados financeiros

Documentos de equipes podiam conter contato, responsável e informações financeiras no documento de leitura pública.

Correção:

- criada área `equipes/{id}/privado/dados`;
- painel administrativo possui saneamento automático dos documentos existentes;
- campos sensíveis são copiados para a área privada antes de serem removidos da parte pública;
- atualização pública pelo proprietário não permite alterar contato ou campos financeiros.

## Rede social

### Publicações

- criação obrigatoriamente autenticada;
- ownerUid precisa corresponder ao usuário autenticado;
- ownerEmail precisa corresponder ao token autenticado;
- publicação nasce pendente e não aprovada;
- autor não pode alterar aprovação/status;
- tipos, tamanho, MIME, legenda e caminhos são validados;
- uploads que falham no Firestore são removidos do Storage pela nova camada do perfil;
- rejeições administrativas removem o arquivo associado do Storage.

### Vídeos

Foi corrigida uma inconsistência importante: a Home misturava fotos e vídeos no mesmo feed, porém as regras de curtidas/comentários reconheciam somente documentos de `publicacoes`.

Agora curtidas e comentários aceitam tanto publicação aprovada quanto vídeo aprovado.

### Stories

- criação pendente e autenticada;
- expiração obrigatoriamente posterior à criação;
- stories expirados deixam de aparecer na Home;
- painel ADM remove documentos e arquivos expirados;
- rejeição também remove a mídia correspondente.

### Curtidas e comentários

- contagens da Home passaram a usar agregação `getCountFromServer`, evitando baixar todos os documentos somente para contar;
- comentários são limitados na interface;
- curtidas continuam vinculadas ao UID autenticado;
- comentários precisam apontar para conteúdo social aprovado.

### Seguidores

- usuário não pode seguir a si próprio;
- criação exige autenticação correspondente ao UID;
- o perfil de destino precisa existir;
- relacionamentos não podem ser atualizados, somente criados/removidos pelo usuário correto.

## Storage

As regras foram endurecidas:

- MIME permitido explicitamente;
- GIF removido da lista de imagens de upload;
- limites por tipo/pasta;
- escrita foi separada em `create` e `delete`;
- `update` de objetos existentes foi bloqueado para evitar sobrescrita silenciosa;
- somente proprietário ou administrador pode excluir objetos nos caminhos do usuário.

A leitura continua pública nos caminhos de mídia destinados à rede para preservar compatibilidade com o site estático atual. Conteúdo privado não deve ser gravado nesses caminhos.

## Página pública de atleta legado

A página `perfil.js` foi refeita para não exibir data de nascimento. Contato aparece apenas como restrito. A página mantém:

- foto;
- informações esportivas;
- ranking/pontuação;
- histórico;
- campeonatos;
- comentários moderados;
- compartilhamento;
- QR Code.

## Todos os atletas

A correção anterior limitava atletas legados a 50 documentos, podendo ocultar atletas além desse corte.

Correção:

- leitura em lotes ordenados por ID;
- paginação interna por cursor `startAfter`;
- união de atletas legados e perfis sociais;
- deduplicação por ownerUid;
- página dedicada pode carregar o banco completo dentro do limite operacional configurado;
- a Home não carrega mais centenas de atletas invisíveis, pois a lista está oculta na Home social.

## Painel administrativo

Além da correção N+1 da Auditoria 2.0:

- dados privados são carregados somente quando necessários;
- saneamento de atletas, equipes e perfis é executado quando o administrador abre o painel;
- reivindicações passam pelo fluxo seguro V3;
- rejeição de conteúdo limpa o Storage;
- stories expirados são limpos;
- senha administrativa não foi adicionada a nenhum arquivo do repositório.

## CI / prevenção de regressões

O workflow do GitHub Actions agora bloqueia deploy em caso de:

- erro de sintaxe JavaScript;
- JSON inválido;
- senha administrativa encontrada em arquivos do projeto;
- remoção acidental de regras críticas;
- falha de compilação do Firestore Rules;
- falha de compilação do Storage Rules.

A compilação das Rules usa os emuladores oficiais do Firebase.

## Limitações externas ao código

### 1. Rules em produção

GitHub Pages não publica Firestore Rules/Storage Rules. É necessário executar um deploy Firebase ou publicar os dois arquivos no Firebase Console. Sem esse passo, o frontend novo estará publicado, mas o backend continuará usando o ruleset que já estava ativo no Firebase.

### 2. App Check / CAPTCHA / rate limiting

Security Rules não implementam rate limiting por IP. Proteção de alto nível contra robôs exige configuração do Firebase App Check e/ou uma camada de backend/Cloud Functions. Essa configuração depende do projeto Firebase/Google Cloud e não pode ser ativada apenas por arquivos do GitHub Pages sem as credenciais/keys do projeto.

### 3. Headers HTTP

O site está no GitHub Pages, que não oferece controle completo de cabeçalhos como CSP, HSTS, Permissions-Policy e Referrer-Policy. Para controle total desses headers, o domínio precisa ficar atrás de um CDN/proxy configurável, como Cloudflare, ou migrar o hosting para uma plataforma que permita headers.

## Segurança da credencial administrativa

A senha fornecida para teste não foi gravada no GitHub nem adicionada a arquivos, commits ou documentação. Como uma senha administrativa foi compartilhada em uma conversa, recomenda-se rotacioná-la depois da auditoria.

## Conclusão

A Auditoria 3.0 fecha os bugs de código e as brechas encontradas nesta rodada, adiciona saneamento de dados antigos e cria uma barreira automática contra regressões no deploy. O código atual passa nas validações automáticas, incluindo compilação real das regras Firebase. Para que a camada de segurança do banco fique efetivamente ativa em produção, falta somente o passo externo de publicar `firestore.rules` e `storage.rules` no projeto Firebase ativo.
