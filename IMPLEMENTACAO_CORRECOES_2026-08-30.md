# Implementação das correções — 30/08/2026

## Alterações aplicadas localmente

As regras do Firestore agora declaram `rules_version = '2'`. A criação de publicações autenticadas exige schema explícito, `aprovado == false`, `status == 'pendente'` e timestamp do servidor. O proprietário só pode alterar a legenda de uma publicação e não pode alterar aprovação, status, autoria ou metadados. Stories passaram a validar janela de expiração e updates restritos à legenda. Vídeos também tiveram seus updates restritos à legenda e timestamp de criação validado.

O cliente social foi alinhado ao novo fluxo: fotos do feed são enviadas para moderação, e a mensagem de sucesso não afirma publicação imediata. O cliente também aceita somente JPG, PNG, WEBP, MP4 e WEBM e limita a seleção a 24 MB, abaixo do limite de 25 MB da regra do Storage.

O Storage passou a aceitar apenas novos objetos, com limite de 25 MB e tipos MIME definidos. A listagem pública de atletas, perfis, equipes e apoiadores recebeu limites operacionais, e o ranking foi limitado a 200 documentos por coleção. As imagens públicas agora aceitam data URLs base64 válidas ou origens HTTPS de APIs de Storage conhecidas.

Foi criado o workflow `.github/workflows/quality.yml`, que verifica a sintaxe de todos os JavaScript e pré-condições mínimas das regras em push e pull request.

## Validação executada

Todos os arquivos JavaScript passaram em `node --check`, `git diff --check` não encontrou erro de whitespace e o emulador local do Firestore iniciou com o arquivo de regras sem acusar erro de parsing. A validação de deploy remoto não foi executada porque a sessão CLI não está autenticada; nenhuma alteração foi publicada no Firebase ou no GitHub.

## Pendências que exigem migração ou infraestrutura

A separação completa entre documentos públicos e privados ainda exige migrar os documentos existentes e alterar as consultas do frontend. Rate limit, CAPTCHA/App Check, quotas por usuário, limpeza de objetos órfãos, URLs assinadas, custom claims administrativos e cabeçalhos HTTP precisam de configuração no Firebase/Cloud Functions e/ou no provedor de hosting. Essas medidas não devem ser simuladas apenas no frontend.

## Procedimento seguro de publicação

Primeiro, revisar este diff em pull request e executar testes do Rules Simulator para visitante anônimo, usuário comum, proprietário e administrador. Depois, publicar as regras do Firestore e Storage em uma janela controlada, verificar o cadastro, login, publicação pendente, aprovação administrativa, upload e exclusão. Por fim, publicar o branch no GitHub Pages e monitorar o console do navegador, erros do Firebase, leituras e custos.
