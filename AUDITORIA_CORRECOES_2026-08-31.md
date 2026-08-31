# Auditoria e correções — 2026-08-31

## Escopo
Auditoria do repositório principal e da arquitetura publicada do Banco de Dados de Atletas. O domínio cadastrodeatletas.com.br não pôde ser inspecionado diretamente nesta sessão por bloqueio do mecanismo de acesso web, então a análise de código foi feita sobre o branch main.

## Correções aplicadas

### 1. Publicação social
- Corrigido o payload de criação de `publicacoes` em `comunidade.js`.
- O documento agora envia os campos exigidos pelas regras: `imagemUrl`, `imagemPath`, `imagemMime`, `imagemTamanho`, `legenda`, `tipo` e `armazenamento`.
- Mantido o fluxo seguro de moderação: novas publicações entram como `aprovado: false` e `status: pendente`.
- Removido o fallback que tentava colocar Data URL diretamente no Firestore. Isso podia gerar rejeição pelas regras e documentos muito grandes.

### 2. Consultas do feed
- Feed da comunidade limitado inicialmente a 30 publicações.
- Comentários iniciais limitados a 300.
- Home social limitada a 8 publicações/stories para reduzir leituras e tempo de carregamento.
- Listagens públicas reduzidas de 250 para 50 registros por consulta inicial.
- Equipes reduzidas de 100 para 50 na carga inicial.

### 3. Segurança já presente e validada
- `publicacoes`, `stories` e `videos` exigem criação autenticada pelo próprio `ownerUid`.
- Novas publicações sociais precisam nascer pendentes.
- Usuários não administradores não podem alterar `aprovado` ou `status`.
- Comentários entram pendentes.
- Curtidas usam o UID autenticado como chave.
- Denúncias são gravadas como pendentes e só administradores podem ler/moderar.

## Pontos que continuam no backlog
1. Paginação real com cursor `startAfter`, em vez de apenas limites iniciais.
2. Separação definitiva entre documentos públicos e dados pessoais de atletas/perfis.
3. Rate limiting/App Check/CAPTCHA para submissões públicas.
4. Quotas e rotina de limpeza de arquivos órfãos no Storage.
5. CDN/headers de segurança (CSP, HSTS, nosniff, Referrer-Policy).
6. Backend/Cloud Functions para aprovação, denúncias e auditoria administrativa.
7. Redução do número de consultas individuais para contadores de curtidas/comentários.

## Configuração
O `firebase.json` aponta corretamente para `firestore.rules` e `storage.rules`.

## Resultado
As correções desta rodada atacam principalmente o erro de publicação social, que estava incompatível com o contrato das regras do Firestore, e reduzem a carga inicial de leitura do site. As regras do Firebase não foram alteradas nesta rodada porque já refletem o fluxo pendente de moderação; qualquer mudança nelas precisa ser publicada no projeto Firebase para afetar produção.
