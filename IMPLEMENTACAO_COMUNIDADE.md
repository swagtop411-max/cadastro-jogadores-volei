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


## Publicação das regras

O editor autenticado do Firestore abriu corretamente na rota moderna. As regras atuais estão visíveis e o botão de publicação será usado somente depois de substituir o conteúdo pela versão do repositório, preservando as regras existentes e adicionando `publicacoes` e `comentarios_publicacoes`.


## Editor de regras confirmado

O console autenticado exibiu o editor CodeMirror como um elemento editável (`role="textbox"`, `contenteditable="true"`). A versão sincronizada do arquivo local contém as regras atuais do projeto e os blocos novos da comunidade. A próxima ação será substituir o conteúdo no editor e usar o botão de publicação.


## Incidente durante a publicação

A tentativa de colar o arquivo completo no CodeMirror expirou. A visualização posterior indicou que o editor pode ter recebido conteúdo parcial ou duplicado, com a contagem de linhas muito maior que a versão local. A publicação foi interrompida; nenhuma regra deve ser publicada até o conteúdo do editor ser conferido e validado.


A tentativa de posicionar o cursor por atalho de teclado não confirmou a posição no CodeMirror; o editor continua exibindo o documento atual sem indicação de publicação. A estratégia será usar uma edição incremental controlada e validar o conteúdo antes de clicar em publicar.


A inserção incremental via `document.execCommand` retornou `false`, portanto nenhum bloco foi aplicado por esse método. O conteúdo não foi publicado. A próxima tentativa usa o clipboard e os atalhos normais do editor, seguida de validação visual.


A tentativa de copiar as regras do GitHub via fetch/clipboard também expirou no contexto do console. O histórico não mostra confirmação de cópia ou publicação; o botão de publicar ainda não foi acionado. Nenhuma alteração de segurança foi confirmada em produção.


O arquivo remoto foi baixado com sucesso e contém os blocos da comunidade, mas o navegador bloqueou `navigator.clipboard.writeText` por falta de foco do documento. A publicação continua não realizada; a solução seguinte será focar o editor, copiar o texto pelo atalho e colar no CodeMirror.


Fonte externa consultada: [Console de regras do Firestore](https://console.firebase.google.com/project/jogadores-de-volei/firestore/databases/-default-/security/rules). O editor autenticado mostrou o projeto `jogadores-de-volei` e as regras vigentes; nenhuma publicação foi confirmada após os timeouts de colagem.


Após focar o editor, a tentativa de clipboard permaneceu pendente e não confirmou cópia. Não será acionado publicar enquanto o conteúdo editado não puder ser validado.


A inserção incremental foi concluída pelo estado nativo do CodeMirror. O editor confirmou os blocos `publicacoes` e `comentarios_publicacoes`, com documento de 23.155 caracteres. A regra ainda está em modo de edição e não foi publicada; falta validar o lint do Firebase e acionar o botão de publicação se não houver erro.


O editor agora mostra o bloco `COMUNIDADE SOCIAL` inserido e as linhas `match /publicacoes` aparecem na página. A busca por “Publicar” não encontrou o botão de envio, então ainda não foi acionada nenhuma publicação.


A navegação pela aba Regras recarregou o editor e voltou a exibir a versão histórica/atual do Firebase. Como a edição ainda não tinha sido publicada, a inserção anterior pode ter sido descartada; será necessário conferir o estado nativo novamente antes de qualquer publicação.


A inspeção do DOM mostrou que a tela atual contém histórico de versões, editor e “Comparar com as regras mais recentes”, mas nenhum botão acessível de “Publicar/Implantar”. O documento editado contém `publicacoes` e `comentarios_publicacoes`; a publicação ainda não foi acionada.


Na versão mais recente do Firebase, o comentário marcador `// FIM` não existe; por isso a inserção retornou sem alterar o documento. O editor continua sem publicação. O fechamento real foi identificado como `\n  }\n}`, permitindo inserir os blocos com precisão na próxima tentativa.


O botão `Publicar` foi acionado com autorização. Em seguida, ele desapareceu e ficou apenas `Descartar`, indicando que o Firebase iniciou o processamento da atualização. A confirmação final será verificada no histórico e no estado do editor.


## Auditoria de atualizações atuais — achados intermediários

- O remoto `origin/main` está 14 commits à frente do checkout local; o checkout local foi atualizado apenas nas referências, sem incorporar esses commits, para não iniciar implementação.
- Os arquivos da comunidade (`comunidade.html`, `comunidade.css`, `comunidade.js`, `comunidade-admin.js`, `comunidade-admin.css`) e `firestore.rules` já existem no remoto e têm o mesmo hash local/remoto.
- A `index.html` local contém o link Comunidade, mas a `index.html` remota atual não contém esse link; a home publicada pode não oferecer entrada para a comunidade.
- `comunidade.js` usa `initializeApp(firebaseConfig)` sem importar `initializeApp` de `firebase-app.js`, provável erro fatal de execução.
- `comunidade-admin.js` usa `getApps()`, `getApp()` e `initializeApp()` sem importá-los, provável erro fatal no painel de moderação.
- O editor autenticado do Firestore mostra a versão de regras da comunidade publicada no histórico “Hoje • 11:30 PM”, sem alterações não publicadas.
- As imagens são armazenadas como base64 dentro dos documentos Firestore; o Firebase Storage é configurado no objeto, mas não é usado no fluxo atual.


## Storage

O painel do Firebase Storage abriu na aba Regras, mas o editor permaneceu carregando e não exibiu regras acessíveis. O código atual da comunidade não usa Storage: comprime a foto e grava o base64 diretamente em `publicacoes.imagem`. Portanto, o upload não depende das regras do Storage neste momento, mas o desenho atual tem custo e limite de documento Firestore e deve ser revisado antes de escalar.


## Verificação no domínio publicado

A URL `https://cadastrodeatletas.com.br/comunidade.html` está acessível. O cabeçalho mostra os links Comunidade, Atletas e Painel ADM; o formulário de publicação, seletor de foto, contador de caracteres, feed e termos de uso carregam visualmente. A consulta ao console do navegador não retornou erros. O feed ainda deve ser observado após o carregamento dinâmico e o envio vazio deve ser testado sem dados reais.


No domínio online, após aguardar a consulta ao Firestore, o feed exibiu corretamente “Nenhuma publicação aprovada no momento”. O envio vazio foi bloqueado pelo navegador no campo obrigatório, sem criar documento. Isso confirma que a leitura pública das regras publicadas está funcionando; ainda falta validar o painel administrativo online.


## Painel administrativo online

O painel `admin.html` está acessível e apresenta o login administrativo, links para campeonatos e site, sem erros no console do navegador. A aba de moderação da comunidade não pode ser validada visualmente sem autenticar, e nenhum dado ou credencial foi enviado durante a auditoria.


## Firebase Authentication — estado atual

A área de provedores do projeto mostra somente **E-mail/senha** como ativado. O console recomenda login com Google, mas nenhum novo provedor foi ativado. A implementação de login de visitantes pode começar com e-mail e senha sem configuração adicional; Google Login exigiria ativar e configurar o provedor antes do código.

O código atual do site usa autenticação para o painel administrativo, mas não há vínculo de conta com atleta, equipe, publicação ou comentário. Portanto, edição própria e curtidas ainda não têm identidade persistente.
