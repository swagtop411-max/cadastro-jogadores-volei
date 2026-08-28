# Modelo de dados da rede social

## Conta de usuário

A identidade será baseada no Firebase Authentication por e-mail e senha. Cada conta terá um documento em `usuarios/{uid}` com `uid`, `nome`, `email`, `fotoUrl`, `criadoEm`, `atualizadoEm`, `status` e `papel`. O campo `papel` será `usuario` por padrão e `admin` apenas para a conta administrativa já existente.

## Vínculo com atleta e equipe

Novos cadastros criados por uma conta receberão `ownerUid` e `ownerEmail`. A edição pública será permitida somente quando `request.auth.uid == resource.data.ownerUid`. Registros antigos sem `ownerUid` não serão automaticamente reivindicados; o administrador deverá associá-los manualmente.

## Fotos

Novos uploads serão enviados ao Firebase Storage em `usuarios/{uid}/atletas/{atletaId}/...`, `usuarios/{uid}/equipes/{equipeId}/...` ou `usuarios/{uid}/publicacoes/{publicacaoId}/...`. O documento Firestore armazenará somente `fotoUrl`, `fotoPath`, `fotoMime` e `fotoTamanho`. Fotos base64 antigas continuarão sendo renderizadas durante a migração.

## Curtidas

As curtidas serão documentos idempotentes em `curtidas_perfis/{atletaId}/usuarios/{uid}` e `curtidas_publicacoes/{publicacaoId}/usuarios/{uid}`. A existência do documento representa a curtida; remover o documento desfaz a ação. Contadores exibidos serão derivados por consulta ou mantidos por transação futura, sem aceitar contadores enviados diretamente pelo cliente.

## Comunidade

Publicações permanecem em `publicacoes/{publicacaoId}` e comentários em `comentarios_publicacoes/{comentarioId}`, sempre com `ownerUid`, `aprovado`, `status`, `criadoEm` e dados de denúncia quando aplicável. Respostas usarão `parentCommentId` e continuarão pendentes até moderação.

## Moderação

Denúncias serão registradas em `denuncias/{denunciaId}` com `alvoTipo`, `alvoId`, `motivo`, `detalhes`, `reportadoPorUid`, `criadoEm` e `status`. Somente administradores poderão visualizar e alterar a fila. O usuário poderá denunciar uma vez por alvo por meio de uma chave derivada do UID e do alvo.
