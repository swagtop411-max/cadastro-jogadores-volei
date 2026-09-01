# Auditoria Social V5 — Banco de Dados de Atletas

Data: 01/09/2026

## Objetivo

Evoluir o Banco de Dados de Atletas para uma rede social esportiva inspirada nos principais padrões de uso do Instagram, sem copiar marca, identidade visual ou recursos proprietários, mantendo a arquitetura GitHub Pages + Firebase Authentication/Firestore + Cloudinary.

## Correções e entregas desta rodada

### Ranking
- Drawer reconstruído para não prender a navegação.
- Fechamento por X, clique no fundo e tecla Escape.
- Restauração do scroll da página ao fechar.
- Remoção de `?abrir=ranking`/`#ranking` da URL ao fechar.
- Foco devolvido ao elemento que abriu a janela.
- Conteúdo do ranking ganhou links para o perfil público.
- Layout do ranking modernizado e responsivo.

### Design System V5
- Paleta global grafite/verde escuro com dourado apenas como acento.
- Superfícies, bordas, sombras, raios e espaçamentos unificados.
- Botões, formulários, abas, cards, painéis, modais e cabeçalhos padronizados.
- Home social reconstruída com menu lateral, feed central e área de apoiadores.
- Páginas legais atualizadas para o mesmo visual e para a arquitetura atual.
- Responsividade e acessibilidade de foco reforçadas.
- Suporte a `prefers-reduced-motion`.

### Qualidade de mídia
- Mídia social continua usando o arquivo original enviado ao Cloudinary, sem transformação de compressão no JavaScript social.
- Novo runtime impede que imagens pequenas sejam ampliadas além da largura nativa em feed, Story, perfil, Explorar e Salvos.
- Story viewer preserva `object-fit: contain` e tamanho compatível com a resolução real.
- Imagens dinâmicas recebem `decoding=async` e `image-rendering:auto`.
- Limitação inevitável: nenhum frontend consegue recriar detalhes que já não existam no arquivo original.

### Stories
- Story ativo por 24 horas.
- Story expirado não é apagado automaticamente.
- Arquivo de Stories no perfil.
- Botão explícito `STORIES POSTADOS` no perfil público.
- Stories ficam separados do feed.
- Dono pode excluir Story.
- Nome e foto do autor no visualizador levam ao perfil público.
- Aro de Story ativo na foto de perfil.
- Barra de Stories na Home prioriza não vistos.

### Descoberta e consumo
- Nova página `explorar.html` com busca de atletas, cidades, equipes, modalidades e conteúdo.
- Grid combinado de fotos e vídeos publicados.
- Nova página `reels.html` com experiência vertical e scroll-snap.
- Autoplay do vídeo em foco.
- Curtida e compartilhamento em Reels.
- Perfil do autor acessível pelo Reel.
- Nova página privada `salvos.html` para publicações guardadas.

### Direct
- Chat privado entre dois perfis.
- Mensagens em tempo real.
- Badge de não lidas.
- Notificação de mensagem.
- Recibo visual `Visto` quando a conversa já registra leitura do outro participante.
- Interface `Desfazer envio` para mensagens próprias, usando a permissão de exclusão já existente nas regras.

## Recursos sociais já existentes antes desta rodada

### Feed
- Fotos e vídeos.
- Publicação imediata pelo próprio perfil.
- Curtir/descurtir.
- Comentários imediatos.
- Compartilhar.
- Salvar.
- Avatar/nome ligados ao perfil.
- Priorização básica de perfis seguidos e recência.

### Perfis
- Foto, capa, bio, cidade, modalidade, posição, categoria, equipe.
- Seguir/deixar de seguir.
- Seguidores/seguindo.
- Grid de fotos e vídeos.
- Editar/excluir publicação própria.
- Botão de mensagem.
- Histórico de campeonatos em modal próprio.

### Notificações
- Curtida.
- Comentário.
- Novo seguidor.
- Nova mensagem.
- Badge de não lidas em tempo real enquanto o site está aberto.

### Segurança
- Conversas privadas somente para participantes.
- Mensagem criada somente pelo remetente autenticado.
- Salvos privados.
- Visualização de Story vinculada ao próprio usuário.
- Publicação vinculada ao `ownerUid` autenticado.
- CI compila regras no Firebase Emulator.

## Lacunas para uma paridade ainda maior com o Instagram

### Prioridade alta — implementáveis com Firestore + frontend

1. **Carrossel de mídia por publicação**
   - Múltiplas fotos/vídeos em um único post.
   - Requer nova estrutura `midias[]` ou subcoleção e atualização das regras.

2. **Hashtags e menções clicáveis**
   - Indexação por hashtags.
   - Menção `@perfil` com notificação.
   - Página de resultados por hashtag.

3. **Arquivar/desarquivar posts**
   - Conteúdo some do perfil público sem ser apagado.
   - Área privada de arquivo.

4. **Rascunhos de posts/Reels**
   - Salvar criação incompleta por usuário.

5. **DMs mais completas**
   - Editar mensagem.
   - Responder uma mensagem específica.
   - Reações em mensagens.
   - Enviar foto/vídeo/áudio.
   - Marcar conversa como não lida.
   - Busca dentro da caixa de entrada.

6. **Solicitações de mensagem**
   - Separar mensagens de perfis não seguidos.
   - Aceitar/recusar solicitação antes da conversa principal.

7. **Contas privadas**
   - Solicitação de seguir.
   - Aprovação/rejeição pelo dono do perfil.
   - Conteúdo privado somente para seguidores aprovados.

8. **Bloquear, restringir e silenciar perfis**
   - Bloqueio de interação e Direct.
   - Restrição de comentários/mensagens.
   - Silenciar Stories/posts sem deixar de seguir.

9. **Melhores amigos / audiência de Story**
   - Lista privada de pessoas.
   - Story visível apenas à audiência escolhida.

10. **Destaques de Stories**
   - O arquivo já existe.
   - Falta permitir criar coleções fixas de Stories no topo do perfil, com capa e título.

11. **Contagem de visualizações de vídeo/Reel**
   - Registrar visualização com regra anti-spam/debounce.
   - Exibir total público.

### Prioridade média — exige evolução de produto e dados

12. **Colaborações entre perfis**
   - Post com dois autores e exibição nos dois perfis.

13. **Marcação de pessoas em mídia**
   - Coordenadas/menções sobre a foto e notificações.

14. **Localização em posts**
   - Campo de local + busca e filtro geográfico.

15. **Notas/status curto no Direct**
   - Conteúdo efêmero associado ao perfil.

16. **Reels avançados**
   - Remix.
   - Templates.
   - Controle de velocidade.
   - Edição temporal.
   - Texto/stickers sobre vídeo.
   - Áudio original e catálogo licenciado.

17. **Agendamento de conteúdo**
   - Para publicação realmente automática no horário, é recomendável backend/serverless seguro.

18. **Analytics profissional por perfil**
   - Alcance, impressões, retenção de vídeo, crescimento de seguidores, visitas ao perfil, cliques.

19. **Preferências de feed**
   - Interessado/não interessado.
   - Silenciar perfil.
   - Feed cronológico separado.
   - Favoritos.

20. **Pesquisa avançada**
   - Busca por hashtags, conteúdo, equipes, cidades e perfis com índice dedicado.
   - Firestore puro é limitado para pesquisa textual de grande escala.

### Exige infraestrutura externa/segura

21. **Push notifications com navegador fechado**
   - Service Worker + Web Push/FCM.
   - Disparo deve ocorrer em backend confiável, não no navegador do remetente.

22. **Presença real `ativo agora` confiável**
   - Heartbeat/presença com regras e mecanismo de expiração.
   - Pode usar Realtime Database ou backend apropriado para presença.

23. **Live**
   - WebRTC ou provedor de streaming.
   - Sinalização, TURN/STUN, moderação e escalabilidade.

24. **Chamadas de voz/vídeo**
   - WebRTC + infraestrutura de sinalização e presença.

25. **Recomendação em escala**
   - O feed atual usa regras simples.
   - Um sistema comparável a redes de grande escala precisa de telemetria, modelos/ranking, anti-abuso e backend de recomendação.

26. **Música licenciada**
   - Não pode ser copiada de bibliotecas de terceiros.
   - Exige catálogo próprio/licenciado ou fornecedor com direitos adequados.

27. **Moderação automatizada de mídia**
   - Classificação de abuso/spam/conteúdo inadequado antes ou depois da publicação.
   - Requer serviço de moderação e política operacional.

## Qualidade de imagens: pendências legadas

A mídia social nova já usa Cloudinary sem a antiga redução para aproximadamente 600 KB. Porém ainda existem formulários históricos do projeto que usam base64/canvas/JPEG para fotos de cadastro, cartazes ou logos. Eles devem ser migrados gradualmente para Cloudinary para que toda a plataforma, e não somente a rede social, mantenha qualidade original e menor peso no Firestore.

Prioridade de migração:
1. cadastro de atleta legado;
2. cadastro de equipe/logo;
3. cartazes de campeonatos;
4. apoiadores/logos;
5. utilitários de migração antigos.

## Estado final desta auditoria

A plataforma já possui o núcleo de uma rede social esportiva: conta, perfil, feed, mídia, Stories, arquivo de Stories, seguidores, curtidas, comentários, salvos, notificações, Direct, Explorar e Reels. As maiores diferenças restantes em relação ao Instagram são controles avançados de privacidade, criação multimídia sofisticada, Direct avançado, push, Live, música licenciada e recomendação em escala.
