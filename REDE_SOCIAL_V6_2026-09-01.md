# Rede Social V6 — 01/09/2026

## Objetivo

Executar o bloco prioritário da auditoria social: carrossel, hashtags/menções, privacidade/bloqueio, Direct multimídia e Destaques de Stories, preservando a arquitetura GitHub Pages + Firebase Authentication/Firestore + Cloudinary.

## Carrossel

- Novo compositor disponível no perfil e na Comunidade.
- De 2 a 10 mídias por publicação.
- Suporte a JPG, PNG, WEBP, MP4, WEBM e MOV.
- Fotos até 25 MB e vídeos até 45 MB.
- Upload direto ao Cloudinary sem API Secret no frontend.
- Carrossel pode misturar fotos e vídeos.
- A implementação atual exige pelo menos uma foto para manter uma capa compatível com as telas legadas do feed.
- Feed recebe setas, contador e indicadores de posição.
- Perfil identifica publicações em carrossel e abre a sequência no modal de conteúdo.

## Hashtags e menções

- `#hashtags` em legendas ficam clicáveis.
- Nova página `hashtags.html` pesquisa conteúdos pelo assunto.
- A busca considera tanto o campo indexado `hashtags[]` quanto hashtags presentes em conteúdo legado.
- `@menções` válidas ficam clicáveis e apontam para o perfil público.
- O identificador atual é gerado com slug do nome + fragmento do UID para reduzir colisões.
- Carrosséis persistem `hashtags[]` e `mencoes[]` no Firestore.
- Menção em carrossel pode gerar notificação do tipo `mention`.
- Conteúdo legado e publicações simples continuam sendo interpretados pelo texto da legenda mesmo quando ainda não possuem arrays persistidos.

## Privacidade

- Novo documento `config_perfis/{uid}` controla `privado`.
- Dono do perfil possui botão de Privacidade.
- Perfil privado mostra cadeado e impede a exibição de feed/Stories/Destaques para visitantes não aprovados dentro da interface.
- Botão Seguir vira `SOLICITAR PARA SEGUIR`.
- Solicitações ficam em `solicitacoes_seguir/{targetUid}/usuarios/{requesterUid}`.
- Dono recebe painel para aceitar ou recusar solicitações.
- Aceite cria as relações normais em `seguidores` e `seguindo`.
- Barra de Stories da Home é reconstruída pela V6 para não incluir perfis privados sem autorização.
- Página de hashtags também respeita privacidade e bloqueios na apresentação dos resultados.

### Limitação importante de privacidade

O Cloudinary atual entrega mídias por URLs públicas. Portanto, o perfil privado da V6 controla a experiência e as interações dentro do site, mas não transforma uma URL pública previamente conhecida em um arquivo criptograficamente privado. Privacidade forte de mídia exigirá uma camada posterior de entrega autenticada/assinada em backend ou armazenamento privado compatível.

## Bloqueio

- Novo caminho `bloqueios/{ownerUid}/usuarios/{blockedUid}`.
- Usuário pode bloquear e desbloquear outro perfil.
- Ao bloquear, o cliente tenta remover relações de follow e solicitações em ambas as direções.
- Novos follows, curtidas, salvos, comentários, notificações e novas mensagens são impedidos pelas regras quando existe bloqueio.
- Cards bloqueados são filtrados das superfícies sociais onde o owner é identificável.

## Direct multimídia

- Botão de anexo dentro do Direct.
- Envio de foto ou vídeo pelo Cloudinary.
- Mensagem multimídia salva em `conversas/{id}/mensagens` com `mediaUrl`, `mediaPath`, `mediaMime` e `mediaSize`.
- Conversa é garantida antes da criação do anexo.
- Preview da conversa mostra `Foto` ou `Vídeo`.
- Anexo gera notificação de nova mensagem.
- Renderização no chat mantém o recurso de desfazer envio da camada Direct V5.
- Bloqueio impede novas mensagens multimídia pelas regras.

## Destaques de Stories

- Nova seção visual no topo do perfil.
- Dono pode criar Destaques usando Stories já existentes no arquivo.
- Título de até 30 caracteres.
- Até 20 Stories por Destaque.
- Capa baseada no primeiro Story selecionado.
- Destaque abre no visualizador de Stories existente.
- Dono pode excluir um Destaque sem excluir os Stories originais.
- Dados ficam em `destaques/{uid}/itens/{highlightId}`.

## Regras Firestore V6

As regras foram ampliadas para:

- `publicacoes.tipo = carrossel` e `midias[]`.
- `hashtags[]` e `mencoes[]` em posts/vídeos.
- `config_perfis`.
- `bloqueios`.
- `solicitacoes_seguir`.
- `destaques`.
- mensagens `text`, `image` e `video`.
- notificação `mention`.
- prevenção de novas interações sociais entre perfis bloqueados.
- aprovação de follow privado pelo próprio dono do perfil.

## Arquivos principais

- `social-v6.js`
- `hashtags.html`
- `hashtags.js`
- `site-v5.js`
- `comunidade-cloudinary.js`
- `firestore.rules`

## Próximos refinamentos naturais

1. Username escolhido pelo usuário com registro de unicidade, em vez de handle derivado.
2. Autocomplete de `@menções` e hashtags no compositor.
3. Editar ordem/capa/título de Destaques existentes.
4. Solicitações de mensagem separadas para perfis não seguidos.
5. Responder e reagir a mensagens específicas.
6. Áudio no Direct.
7. Entrega de mídia privada com URLs assinadas/backend seguro.
8. Carrosséis compostos somente por vídeos, após remover a dependência de capa de imagem do modelo legado.
