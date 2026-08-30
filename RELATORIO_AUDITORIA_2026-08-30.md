# Auditoria completa — Banco de Dados de Atletas

**Data da auditoria:** 30 de agosto de 2026.  
**Escopo:** domínio público, frontend publicado, repositório GitHub, regras versionadas do Firestore e Cloud Storage.  
**Resultado geral:** o site está operacional e os arquivos críticos publicados correspondem ao repositório analisado, mas a plataforma possui riscos relevantes de **autorização, privacidade, abuso de gravações, governança de conteúdo e escalabilidade**. Recomendo corrigir os itens críticos antes de ampliar a comunidade ou iniciar cobrança recorrente.

> **Limitação importante:** a tela do Firebase Console redirecionou para login nesta sessão. Portanto, o conteúdo remoto das regras não foi lido diretamente no console. O relatório confirma o arquivo versionado e verificou que `index.html`, `public.js`, `firestore.rules`, `storage.rules`, `perfil-social.js` e `admin.js` servidos pelo domínio têm os mesmos hashes dos arquivos locais. A confirmação final do ruleset ativo deve ser feita no Firebase Console ou por um deploy controlado.

## 1. Sumário executivo

| Prioridade | Achado | Impacto | Ação recomendada |
|---|---|---|---|
| **P0 — crítico** | Usuários autenticados podem criar `publicacoes` já com `aprovado: true` e `status: publicado`. | Bypass da moderação, spam e publicação de conteúdo ilícito ou abusivo. | Criar sempre como `pendente`; somente backend/admin deve aprovar e publicar. |
| **P0 — crítico** | Proprietários podem atualizar documentos sociais sem lista de campos permitidos. | Possível adulteração de `aprovado`, `status`, URLs e metadados; mass assignment. | Aplicar `diff().affectedKeys().hasOnly(...)` e tornar campos de moderação imutáveis para o usuário. |
| **P0 — crítico** | Coleções de perfis, atletas e equipes têm leitura pública integral. | Exposição direta de qualquer campo existente no documento, inclusive PII acidental. | Separar documentos públicos/privados e retirar `allow read: if true` de dados pessoais. |
| **P1 — alto** | Entradas públicas aceitam gravações sem CAPTCHA, rate limit, quota ou idempotência. | Spam, aumento de custos e degradação do serviço. | Usar Cloud Function/backend para ingestão, App Check, CAPTCHA, limites por IP/UID e fila. |
| **P1 — alto** | Storage aceita upload autenticado de vídeo até 50 MB e leitura pública sem quota por usuário. | Consumo abusivo de armazenamento/banda e arquivos órfãos. | Limitar tipos/tamanho no servidor, quota, limpeza de órfãos e URLs controladas. |
| **P1 — alto** | O frontend faz leituras de coleções inteiras sem paginação. | Lentidão, alto custo por leitura e falha de disponibilidade conforme o banco cresce. | Usar `limit`, cursores, índices e agregados pré-calculados. |
| **P1 — alto** | O domínio não entrega CSP, HSTS, `nosniff`, `Referrer-Policy` ou `Permissions-Policy`; `Access-Control-Allow-Origin: *` está presente. | Maior superfície para clickjacking, MIME sniffing, vazamento de referrer e uso indevido entre origens. | Colocar o site atrás de CDN/hosting que permita headers e adotar política compatível com Firebase. |
| **P2 — médio** | Configuração Firebase é repetida em aproximadamente 23 scripts. | Drift, manutenção difícil e maior probabilidade de publicar configurações divergentes. | Centralizar bootstrap em um módulo comum e revisar restrições da API key. |
| **P2 — médio** | Estado inicial mostra “Carregando...” e pode exibir contadores vazios antes da consulta. | Percepção de perda de dados e UX instável em conexões lentas. | Usar skeleton, estado de erro explícito e só mostrar contadores após sucesso. |
| **P2 — médio** | Regras usam e-mail hardcoded como papel administrativo. | Troca de e-mail, aliases e governança frágil. | Usar custom claim `admin: true`, com atribuição somente em ambiente administrativo. |

## 2. Evidências de produção e qualidade

O domínio responde HTTPS com HTTP 200, é servido pelo GitHub Pages e expõe as páginas principais (`index.html`, `atletas.html`, `conta.html`, `comunidade.html`, `admin.html`, campeonatos e políticas). A homepage possui navegação, busca, feed, comunidade, conta e painel administrativo. Na primeira observação os blocos assíncronos mostraram “Carregando publicações...”, “Carregando stories...” e “Carregando apoiadores...”; esse estado deve ser tratado visualmente para não parecer uma falha. O código publicado é idêntico ao repositório nos seis arquivos críticos comparados por SHA-256.

A sintaxe dos arquivos JavaScript passou por `node --check` sem falhas. A configuração Firebase contém uma API key no frontend. Isso **não é, por si só, um segredo**: aplicações web Firebase normalmente precisam expor essa configuração. A proteção deve vir de Authentication, regras, App Check, restrições de API e controle de orçamento; não se deve tentar “esconder” a chave no HTML.

O frontend emprega escape HTML em diversos pontos, especialmente via `textContent` e funções `esc`. Isso reduz o risco de XSS em nomes, legendas e cidades. Entretanto, `innerHTML` continua sendo usado em muitos renderizadores e a função `foto()` aceita URLs `http://` e `https://` sem allowlist de origem. O uso de escape não substitui validação específica de URL e contexto; a OWASP recomenda codificação apropriada ao contexto e sinks seguros para cada variável [3].

## 3. Firestore: riscos e correções

### 3.1 Moderação social pode ser contornada — P0

Em `firestore.rules:302-311`, a criação de `publicacoes` exige que o próprio cliente envie `aprovado == true` e `status == 'publicado'`. O fluxo do cliente confirma esse desenho em `perfil-social.js:195-199`, que grava a publicação como aprovada e publicada imediatamente. Isso contradiz a existência de comentários e fila de moderação.

A correção mais segura é: o cliente cria somente um documento pendente; uma Cloud Function ou painel administrativo, com claim de administrador, promove o conteúdo. Exemplo conceitual:

```rules
match /publicacoes/{id} {
  allow read: if resource.data.aprovado == true || isAdmin();

  allow create: if request.auth != null
    && request.resource.data.ownerUid == request.auth.uid
    && request.resource.data.keys().hasOnly([
      'ownerUid','nome','legenda','imagemUrl','imagemPath','imagemMime',
      'imagemTamanho','tipo','criadoEm','aprovado','status'
    ])
    && request.resource.data.aprovado == false
    && request.resource.data.status == 'pendente'
    && request.resource.data.criadoEm == request.time;

  allow update: if isAdmin()
    || (request.auth != null
      && resource.data.ownerUid == request.auth.uid
      && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
        'legenda'
      ])
      && request.resource.data.aprovado == resource.data.aprovado
      && request.resource.data.status == resource.data.status);

  allow delete: if isAdmin()
    || (request.auth != null && resource.data.ownerUid == request.auth.uid);
}
```

Se a aprovação precisar ser instantânea, remova a fila de moderação explicitamente e implemente controles antispam, denúncia, bloqueio e auditoria; não mantenha campos de moderação que o autor pode definir.

### 3.2 Mass assignment em documentos sociais — P0

Em `publicacoes`, `stories` e `videos`, o proprietário pode atualizar com a única exigência de conservar `ownerUid`. Como não existe `hasOnly` no update, o cliente pode tentar alterar status, aprovação, data, caminhos de mídia, autor exibido e outros metadados. Em `usuarios` e `perfis`, a lista de campos permitidos também é ausente ou incompleta.

A solução é adotar contratos de dados por coleção. Campos como `ownerUid`, `criadoEm`, `aprovado`, `status`, `moderadoPor`, `moderadoEm`, `imagemPath` e `videoPath` devem ser imutáveis para o proprietário. Para cada atualização, use `affectedKeys().hasOnly([...])`; para cada criação, use `keys().hasAll([...])` e `keys().hasOnly([...])`, validando tipo, tamanho, enumeração e timestamp.

### 3.3 Leitura pública excessiva — P0

As regras atuais permitem leitura pública de `perfis`, `atletas`, `apoiadores` e `equipes`. O cliente público lê `atletas` e `perfis` integralmente em `public.js:15-18`, e equipes inteiras em `public.js:12`. A leitura pública de um documento Firestore entrega todos os campos permitidos no documento, mesmo que a interface não os mostre. Portanto, contato, e-mail, nascimento ou observações que sejam gravados no mesmo documento público podem ser extraídos por qualquer cliente.

A solução recomendada é separar explicitamente:

| Documento | Deve conter | Permissão |
|---|---|---|
| `atletas_publicos/{id}` | Nome, cidade/UF, modalidade, posição, categoria, time, foto pública e bio aprovada. | Leitura pública; escrita apenas por backend/admin. |
| `atletas_privados/{uid}` | Contato, nascimento, e-mail, consentimentos e dados de cobrança. | Dono e admin, conforme necessidade. |
| `perfis/{uid}` | Apenas campos sociais públicos. | Leitura pública apenas se o perfil estiver publicado. |
| `moderacao/*` | Fila, decisões, auditoria e motivo. | Admin/backend. |

Para contas de menores ou atletas que não desejem exposição, o padrão deve ser privado e a publicação deve depender de consentimento documentado. A política de privacidade precisa refletir o novo modelo, retenção, finalidade, exclusão e canal de solicitação.

### 3.4 Gravações públicas sem proteção contra abuso — P1

`campeonatos_pendentes`, `atletas_pendentes`, `equipes_pendentes` e `apoiadores_pendentes` aceitam criação anônima ou autenticada conforme a coleção. As regras validam tamanho e enumeração, mas não impõem frequência, quota, captcha, verificação de e-mail, idempotência ou reputação do remetente. Regras do Firestore não são um mecanismo completo de rate limiting.

A solução é colocar a submissão atrás de uma função HTTPS ou backend. O backend deve validar o payload novamente, aplicar App Check e CAPTCHA, impor limite por IP/UID/dispositivo, registrar tentativas, normalizar campos e gravar um identificador de idempotência. Para submissões anônimas, o ideal é armazenar somente uma referência de contato mínima até a aprovação.

### 3.5 Identidade administrativa — P1/P2

`isAdmin()` compara `request.auth.token.email` com um e-mail hardcoded. Embora a regra não confie apenas no JavaScript do cliente, esse modelo é frágil para rotação de responsável, múltiplos administradores e governança. Use custom claims, por exemplo `request.auth.token.admin == true`, atribuído apenas por Admin SDK em função protegida. Mantenha o painel cliente como UX, nunca como autorização.

Também recomendo incluir `rules_version = '2';` explicitamente no início de `firestore.rules`, usar o Firebase Rules Simulator e manter testes automatizados. A documentação do Firebase confirma que regras avaliam cada requisição dos SDKs web/mobile, que o simulador testa usuários autenticados e anônimos e que o deploy do CLI pode substituir o ruleset existente [1].

## 4. Cloud Storage: riscos e correções

`storage.rules` permite leitura pública de todos os objetos em `usuarios/{uid}/...` e escrita autenticada pelo UID do caminho, aceitando imagem ou vídeo até 50 MB. O cliente reduz imagens para 600 KB e limita o arquivo selecionado a 45 MB, mas isso é apenas UX: qualquer cliente pode chamar diretamente o SDK/API e ignorar o JavaScript.

Os controles devem ser reforçados nas regras e no backend. Valide tamanho e `contentType`, mas trate o MIME informado como metadado não confiável; faça inspeção/reprocessamento do arquivo em uma função, gere uma nova versão servida publicamente e descarte o original. Use caminhos não previsíveis, metadata com `ownerUid`, status de moderação, quota por usuário e uma rotina de limpeza para objetos sem documento Firestore correspondente. A documentação oficial confirma que Storage Rules podem verificar autenticação, caminho, `contentType`, tamanho e metadata [2].

Exemplo de direção para uma área pública controlada:

```rules
match /b/{bucket}/o {
  match /usuarios/{uid}/publicacoes/{objectId} {
    allow write: if request.auth != null
      && request.auth.uid == uid
      && request.resource.size < 10 * 1024 * 1024
      && request.resource.contentType.matches('(image/(jpeg|png|webp)|video/mp4)')
      && objectId.matches('[A-Za-z0-9_-]{20,80}\\.(jpg|jpeg|png|webp|mp4)');

    allow read: if true; // somente se a publicação correspondente estiver aprovada
    allow delete: if isAdmin() || (request.auth != null && request.auth.uid == uid);
  }
}
```

Para impedir leitura antes da aprovação, prefira caminhos separados `privado/` e `publicado/`, ou gere URLs assinadas no backend. A regra acima é um ponto de partida; o vínculo com aprovação deve ser implementado de forma consistente e testada, não apenas copiado.

## 5. Desempenho, confiabilidade e custo

O cliente público faz `getDocs(collection(...))` sem `limit` em várias coleções. Isso traz todos os documentos para o navegador, aumenta custo de leitura, memória, tempo de renderização e exposição de dados. Substitua por consultas paginadas com `limit(24)` e cursor `startAfter`, índices adequados e carregamento incremental. Para contadores, use documentos agregados ou Cloud Functions; não conte subcoleções inteiras em cada abertura de perfil.

Imagens legadas ainda podem estar em `data:image/...;base64`, o que aumenta muito o tamanho dos documentos e das respostas. Conclua a migração para Storage, aplique compressão no backend, use `loading="lazy"`, thumbnails e formatos modernos. Mantenha uma rotina que localize documentos acima do tamanho operacional definido e migre ou rejeite novos base64.

O site responde com `Cache-Control: max-age=600`, o que ajuda a reduzir carga, mas o cache de páginas HTML pode atrasar correções. Use versionamento de assets, `Cache-Control` longo para arquivos imutáveis com hash e invalidação controlada para HTML/configuração.

## 6. Cabeçalhos, navegador e supply chain

A resposta observada contém `server: GitHub.com`, `access-control-allow-origin: *` e não mostrou CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy` ou `Permissions-Policy`. A OWASP recomenda, entre outros controles, `X-Content-Type-Options: nosniff`, política de referrer explícita e CSP/frame-ancestors contra clickjacking [4].

GitHub Pages não oferece a flexibilidade de headers de um servidor tradicional. Coloque o domínio atrás de Cloudflare, Firebase Hosting ou outro CDN que permita headers, e comece com uma CSP em modo `Report-Only`. A política deverá contemplar `https://www.gstatic.com`, `https://*.firebaseio.com`, `https://*.googleapis.com`, o domínio de Storage e o provedor de analytics efetivamente usado. Remova `unsafe-inline` gradualmente, externalize scripts inline e evite `eval`.

A configuração Firebase aparece repetida em muitos scripts. Centralize-a em `firebase-client.js`, carregue um único bootstrap por página e fixe versões de dependências. Como não há manifesto npm no projeto, a gestão de dependências remotas via URLs `gstatic` deve ser documentada e monitorada. Mantenha a API key restrita no Google Cloud por APIs e, quando possível, por origens HTTP autorizadas.

## 7. Plano de correção recomendado

| Prazo | Entrega | Critério de aceite |
|---|---|---|
| **Hoje** | Alterar criação de publicações para `pendente`; impedir update de campos de moderação; confirmar ruleset remoto. | Usuário comum não consegue aprovar, publicar, alterar status ou modificar owner/metadados. |
| **24–48 h** | Separar PII dos documentos públicos; revisar `perfis`, `atletas` e `equipes`; habilitar testes do Rules Simulator. | Consulta pública não retorna contato, e-mail, nascimento ou campos privados. |
| **Até 7 dias** | Rate limit/CAPTCHA/App Check, quotas de Storage, limpeza de órfãos e migração de base64. | Testes de abuso são bloqueados e nenhum upload fica sem política de retenção. |
| **Até 7 dias** | Paginação, `limit`, cursores, agregados e thumbnails. | Home e listagens carregam página inicial em uma única janela de tamanho fixo. |
| **Até 14 dias** | Backend/Cloud Functions para aprovação, denúncias, claims administrativos e auditoria. | Toda mudança de moderação gera ator, timestamp e motivo. |
| **Até 14 dias** | CDN/hosting com headers e CSP em Report-Only, depois enforcement. | Observatory/headers scanner sem falhas críticas e sem quebra do Firebase. |

## 8. Testes de aceitação antes do próximo deploy

1. Um visitante anônimo deve conseguir consultar apenas os campos públicos e não deve conseguir criar, editar ou excluir conteúdo publicado.
2. Um usuário autenticado deve conseguir criar uma submissão pendente, mas qualquer tentativa de definir `aprovado: true`, `status: publicado`, `ownerUid` de terceiro ou `criadoEm` arbitrário deve ser recusada.
3. O proprietário deve poder editar somente legenda e campos explicitamente permitidos; não deve conseguir mudar aprovação, status, data, autor, caminho ou tamanho da mídia.
4. Um usuário não administrador deve ser impedido de ler coleções de moderação, dados privados, reivindicações de terceiros e documentos de cobrança.
5. Uploads acima do limite, com MIME não permitido, caminho de outro UID ou quantidade acima da quota devem falhar tanto pela regra quanto pelo backend.
6. O painel administrativo deve funcionar com custom claim, exigir reautenticação para ações sensíveis e gravar trilha de auditoria.
7. As listagens devem permanecer limitadas e paginadas com milhares de registros simulados, sem consultas de coleção inteira no cliente.
8. Os testes de XSS devem cobrir nome, legenda, cidade, equipe, URL de apoiador, URL de foto e campos de campeonato em HTML, atributo, URL e CSS. A OWASP ressalta que cada contexto exige codificação e validação apropriadas e que CSP não deve ser o único controle [3].

## Conclusão

O projeto tem uma base funcional razoável: HTTPS, autenticação Firebase, regras versionadas, separação parcial de dados privados, escape HTML em boa parte das renderizações e deploy rastreável. Entretanto, a combinação de **publicação social pré-aprovada, updates amplos, leitura pública de documentos completos, uploads sem quota e consultas sem paginação** representa risco real de abuso, vazamento de dados e crescimento inesperado de custo. A correção deve começar pelas regras e pelo modelo de dados, seguida por um backend de moderação e controles de abuso. Não recomendo apenas “ajustar o frontend”: o atacante pode chamar diretamente Firestore e Storage.

## Referências

[1]: https://firebase.google.com/docs/firestore/security/get-started "Firebase — Get started with Cloud Firestore Security Rules"

[2]: https://firebase.google.com/docs/storage/security/rules-conditions "Firebase — Use conditions in Cloud Storage Security Rules"

[3]: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html "OWASP — Cross Site Scripting Prevention Cheat Sheet"

[4]: https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html "OWASP — HTTP Headers Cheat Sheet"
