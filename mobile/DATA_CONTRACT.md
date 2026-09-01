# Contrato de dados Mobile V1

Este documento protege a compatibilidade entre `cadastrodeatletas.com.br` e o aplicativo Android/iOS.

## Regra principal

O aplicativo **não possui um banco paralelo**. Site e app usam o mesmo Firebase Authentication, Firestore e Cloudinary.

## Coleções V1

### `perfis/{uid}`
Documento público do atleta.

Campos consumidos pelo app:
- `uid`
- `nome`
- `cidade`
- `uf`
- `modalidade`
- `posicao`
- `categoria`
- `time`
- `bio`
- `fotoUrl`
- `capaUrl`
- `instagram`
- `historicoCampeonatos`

Nunca adicionar e-mail, nascimento, telefone, dados de pagamento ou credenciais ao perfil público.

### `publicacoes/{postId}`
Fonte única das fotos do Feed do site, Comunidade, perfil e app.

Campos V1:
- `ownerUid`
- `ownerEmail` apenas para compatibilidade atual das regras; não deve ser renderizado publicamente
- `nome`
- `texto`
- `imagem`
- `imagemUrl`
- `imagemPath`
- `imagemMime`
- `imagemTamanho`
- `legenda`
- `tipo`
- `midias`
- `hashtags`
- `mencoes`
- `armazenamento`
- `aprovado`
- `status`
- `criadoEm`

### `stories/{storyId}`
Mesmo arquivo de Stories do site. A fase seguinte do mobile consumirá e publicará nesta coleção.

### `conversas/{conversationId}`
Mesmas conversas do Direct web.

Subcoleção:
- `mensagens/{messageId}`

### `seguidores/{perfilUid}/usuarios/{followerUid}`
### `seguindo/{perfilUid}/usuarios/{followedUid}`
Relações sociais compartilhadas.

### `campeonatos`
Agenda pública compartilhada entre site e app.

### `equipes`
Equipes públicas compartilhadas.

## Mídia

Uploads novos do app usam os mesmos presets unsigned do Cloudinary já usados no site:
- imagens: `cadastro_atletas_images`
- vídeos: `cadastro_atletas_videos`

Nenhum API Secret do Cloudinary pode existir no aplicativo ou no site.

## Compatibilidade

Antes de renomear, remover ou tornar obrigatório qualquer campo acima:
1. atualizar este contrato;
2. tornar leitores compatíveis com a versão anterior;
3. publicar site e app compatíveis;
4. somente depois migrar dados antigos.

Essa sequência evita que uma atualização do app quebre o site ou vice-versa.
