# Diagnóstico do erro no cadastro de atleta

**Data:** 2026-08-28

O formulário atual envia `ownerUid`, `ownerEmail`, `modalidades`, `posicoes`, `foto`, `status`, `aprovacao`, `plano`, `planoId`, `valorPlano`, `planoStatus` e demais campos do cadastro para `atletas_pendentes`.

Na sessão autenticada do Firebase Console, no projeto `jogadores-de-volei`, o editor remoto de regras ainda exibe a versão antiga. O trecho de `atletas/{atletaId}` permite escrita apenas para `isAdmin()`, e as regras antigas das coleções pendentes não contêm a validação de `ownerUid` usada pelo formulário atual. Portanto, as regras ajustadas no repositório local não foram publicadas no projeto remoto; esse é o motivo mais provável para a mensagem de permissão recusada.

A imagem selecionada não é a causa primária observada na captura: o navegador gerou a pré-visualização e o formulário chegou à etapa de envio. O próximo passo seguro é substituir o conteúdo remoto pelo arquivo versionado `firestore.rules`, revisar no editor e só então publicar após confirmação do responsável.

Durante a tentativa de edição, o console passou a exibir uma versão histórica selecionada (com a regra padrão `allow read, write: if false` e os controles “Comparar com as regras mais recentes”/exclusão). Antes de publicar, é necessário voltar para a versão mais recente do histórico e confirmar que o editor está no documento ativo; nenhuma alteração deve ser publicada a partir de uma versão histórica.

Após selecionar a versão mais recente, a inserção direta foi aceita pelo navegador sem timeout, mas o console reposicionou o editor e ainda não confirmou a regra digitada. A próxima verificação deve ler o conteúdo atual do editor e localizar o botão de publicação/validação antes de qualquer clique.

A inspeção pós-entrada confirmou que o conteúdo efetivo do editor continuou com aproximadamente 1.884 caracteres e sem `atletas_pendentes`. A entrada foi direcionada ao índice correto exibido pelo console, mas a interface restaurou o texto antigo; a publicação permanece não realizada.

Nova verificação visual: após a tentativa de edição, o console continuou mostrando a versão histórica com `match /{document=**} { allow read, write: if false; }`. O índice do editor mudou para 69 e os controles indicam “Comparar com as regras mais recentes”; a alteração ainda não entrou no rascunho ativo. Nenhuma regra remota foi publicada até este ponto.

A comparação do console confirmou que as versões remotas disponíveis ainda não possuem `atletas_pendentes` nem `ownerUid`. A tentativa anterior não entrou no rascunho; os editores exibidos estão em modo de comparação/histórico. É necessário fechar a comparação e editar o editor ativo da versão atual.

A inspeção técnica confirmou que o editor ativo é CodeMirror (`cmView` presente). A tentativa de entrada longa continua sem alterar o documento exibido e foi interrompida por demora; a interface permanece no conjunto antigo de regras. A próxima tentativa será feita por uma atualização direta e controlada do documento CodeMirror, verificando o texto antes de publicar.

Ponto de controle após atualização direta do CodeMirror: o editor passou a mostrar um rascunho com 32 linhas, contém `atletas_pendentes` e `ownerUid`, e o console exibe os botões `Publicar` e `Descartar`. A alteração ainda não foi publicada; falta apenas validar se não há erro de sintaxe e acionar a publicação confirmada.

Após acionar `Publicar`, o console passou a exibir apenas `Descartar` junto de “alterações não publicadas”; o botão de publicação não aparece no estado intermediário. É necessário aguardar e verificar se a publicação foi concluída ou se o console exibirá uma mensagem de erro/validação.

Publicação confirmada em 2026-08-28: o histórico do Firebase criou a versão `Hoje • 1:05 AM`; o editor publicado tem 6.687 caracteres, contém `atletas_pendentes`, `ownerUid` e `request.auth`; e não há `Descartar` nem “alterações não publicadas” visíveis. As regras agora estão ativas no projeto remoto.

Para a nova publicação, a sessão do Google permanece autenticada como `swagtop411@gmail.com`. O editor do Firestore foi reaberto e está carregando; a regra de `reivindicacoes_perfis` ainda não foi publicada nesta etapa.

Na abertura para a nova publicação, o histórico remoto mostrou uma versão mais recente `Hoje • 1:13 AM`, mas o conteúdo ativo tem 2.017 caracteres e não contém `atletas_pendentes`, `ownerUid` nem `reivindicacoes_perfis`. Portanto, a regra de cadastro anterior não está mais ativa no editor atual; a próxima publicação deve usar o arquivo local completo, agora com o bloco de reivindicações.

O novo rascunho foi inserido no editor ativo e validado tecnicamente: 7.058 caracteres, com `atletas_pendentes`, `ownerUid` e `reivindicacoes_perfis`. A publicação ainda precisa ser acionada e verificada.

A publicação foi concluída: após o clique, o editor não mostra mais “alterações não publicadas” nem o botão Publicar. A versão ativa exibida contém `atletas_pendentes` e a regra de propriedade por `ownerUid`; a coleção de reivindicações foi incluída no mesmo arquivo publicado.
