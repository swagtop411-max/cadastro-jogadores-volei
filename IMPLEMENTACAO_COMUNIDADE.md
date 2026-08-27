# Comunidade social do Banco de Dados de Atletas

## Escopo implementado

Foi criada a página `comunidade.html`, acessível pelo cabeçalho da home. A página oferece feed de publicações aprovadas, publicação de texto com foto opcional, comentários em publicações existentes, compartilhamento e estados de carregamento, vazio e erro. As imagens são reduzidas no navegador para respeitar o limite de 700.000 caracteres usado nas regras atuais.

Toda publicação e todo comentário entra como `aprovado: false` e `status: 'pendente'`. A publicação pública somente acontece após moderação.

## Moderação administrativa

Foi criada a aba `Comunidade` no `admin.html`, com `comunidade-admin.js` e `comunidade-admin.css`. O administrador pode listar pendências, aprovar conteúdo ou recusar e excluir conteúdo. A aba só consegue operar para a conta autorizada pelas regras atuais.

## Regras do Firestore

Foram adicionados ao `firestore.rules` os caminhos:

- `publicacoes`
- `comentarios_publicacoes`

As regras permitem leitura somente de conteúdo aprovado, criação pública apenas com campos, tipos, limites e status esperados, e atualização/exclusão somente pelo administrador.

## Testes realizados

A página foi aberta em servidor local e renderizou corretamente no desktop. O formulário, contador, seleção de arquivo, botões de publicação, atualização e links de navegação apareceram sem erro de sintaxe. O envio vazio foi bloqueado pela validação nativa do navegador sem criar documento.

O console acusou `Missing or insufficient permissions` ao tentar ler o feed, porque as novas regras ainda estão somente no arquivo do repositório e ainda não foram publicadas no Firebase. Esse comportamento é esperado até a ativação das regras; nenhuma escrita de teste foi enviada ao banco.

## Ativação necessária

Antes de liberar a página ao público, publicar o arquivo `firestore.rules` no projeto `jogadores-de-volei` e depois testar uma publicação pendente e um comentário pendente usando dados controlados. Não publicar regras sem revisar o impacto nas coleções existentes.


## Verificação do painel

O `admin.html` foi aberto em servidor local e a tela de login renderizou normalmente. O console não registrou erros ao carregar o script de moderação antes da autenticação. A aba Comunidade será exibida após o login administrativo, junto com as ações de aprovar e recusar.

## Pendência de produção

O código está pronto no repositório local, mas a coleção nova ainda não possui as regras publicadas no Firebase. Sem publicar `firestore.rules`, o feed público exibirá o estado de erro de conexão e os envios não serão aceitos. A publicação das regras deve ser feita somente após revisão e confirmação do responsável pelo projeto.


## Navegação verificada

O link `✦ COMUNIDADE` aparece no cabeçalho da home e o clique navega corretamente para `comunidade.html` em servidor local. A página social mantém os links de retorno para atletas e painel administrativo.
