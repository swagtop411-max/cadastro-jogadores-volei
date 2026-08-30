# Evidências iniciais da auditoria

## Site público
- URL: https://cadastrodeatletas.com.br/index.html
- Título: Banco de Dados de Atletas | Vôlei de Praia.
- A página carrega a estrutura visual e navegação, mas os blocos de stories, publicações e apoiadores aparecem inicialmente como "Carregando..." na captura.
- Há links para comunidade, conta, campeonatos, atletas, políticas e painel administrativo.
- A página informa uso de analytics opcional com botões para aceitar ou rejeitar.
- Existe link público de WhatsApp com número de contato.

## Console Firebase
- A URL do console redirecionou para login do Google; não foi possível validar visualmente as regras publicadas sem uma sessão autenticada.
- As regras versionadas no repositório foram analisadas separadamente.

## Repositório
- Repositório clonado de swagtop411-max/cadastro-jogadores-volei.
- O código frontend contém configuração Firebase pública com projectId jogadores-de-volei e apiKey no JavaScript; a presença da apiKey, isoladamente, não é segredo, mas exige restrições e regras corretas.
- Existem arquivos firestore.rules e storage.rules versionados.
- A análise posterior deve priorizar XSS/HTML injection, autorização por proprietário, uploads, abuso de gravações públicas, privacidade de PII, custos e disponibilidade.

## Achados técnicos confirmados

As regras locais tornam públicas as leituras de `perfis`, `atletas`, `apoiadores` e `equipes` (`firestore.rules:23-24`, `38-39`, `56-58`, `222-224`). Isso expõe dados que incluem contato, cidade, nascimento, e-mail ou outros campos caso estejam no documento público; o cadastro privado de contato em `atletas/{id}/privado/dados` é protegido, mas a separação precisa ser aplicada consistentemente.

As coleções `atletas_pendentes`, `campeonatos_pendentes` e `apoiadores_pendentes` aceitam criação pública ou de usuários autenticados, sem autenticação forte, CAPTCHA, rate limit ou mecanismo de idempotência. As regras validam formato e campos, mas não impedem spam, enumeração e custo por gravações.

Em `publicacoes`, usuários autenticados podem criar diretamente com `aprovado == true` e `status == 'publicado'` (`firestore.rules:302-311`), portanto a publicação é pré-aprovada pelo próprio autor. A atualização do próprio documento não restringe campos (`firestore.rules:320-323`), permitindo que o proprietário tente alterar campos de moderação e metadados; o mesmo padrão amplo aparece em `stories` e `videos` (`396-407`). A solução deve separar criação pendente de aprovação administrativa e usar listas explícitas de campos imutáveis/editáveis.

Em `usuarios` e `perfis`, as atualizações também não usam `keys().hasOnly(...)` nem limites completos de schema (`firestore.rules:16-19`, `31-34`). Há risco de adulteração de perfil, campos inesperados e documentos excessivamente grandes, ainda que o UID/papel tenha algumas proteções.

`storage.rules` permite leitura pública de todo conteúdo em `usuarios/{uid}/...` e escrita autenticada de imagens ou vídeos de até 50 MB. Não há limite de quantidade, quota por usuário, validação robusta de extensão/conteúdo, expiração ou limpeza automática. O cliente limita imagens a 600 KB e vídeos a 45 MB em `perfil-social.js:121-126`, mas validações no cliente não são controle de segurança.

`public.js` lê coleções públicas inteiras (`atletas`, `perfis`, `equipes`, `apoiadores`) em `public.js:15-18` e `12`, sem paginação. O crescimento do banco aumenta tempo de carregamento e custo de leituras. O código usa escape HTML em vários pontos, porém `foto()` aceita qualquer URL `http://` ou `https://` (`public.js:4`) e há múltiplas renderizações com `innerHTML`; URLs devem ser validadas por allowlist e imagens devem ser servidas por Storage/CDN confiável.

Os cabeçalhos do domínio retornam GitHub Pages e incluem `access-control-allow-origin: *`; não foram observados cabeçalhos de CSP, HSTS, X-Content-Type-Options, Referrer-Policy ou Permissions-Policy. Recomenda-se configurar esses controles no host/CDN, observando que GitHub Pages puro limita headers customizados.

O console Firebase redirecionou para login nesta sessão, portanto as regras remotas não foram confirmadas diretamente. A documentação local registra publicações anteriores, mas o estado remoto precisa ser conferido com o proprietário antes de qualquer conclusão sobre produção.
