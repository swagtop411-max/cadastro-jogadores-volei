# Banco de Atletas — Roadmap Social

Objetivo: evoluir o app para uma rede social esportiva completa, inspirada na fluidez do Instagram, mas com recursos próprios para atletas, equipes e campeonatos.

## Entrega atual

- [x] Feed mobile
- [x] Explorar atletas
- [x] Publicação com câmera/galeria
- [x] Upload de mídia pelo Cloudinary
- [x] Campeonatos
- [x] Perfil esportivo e editor nativo
- [x] Compartilhamento de publicação
- [x] Visualizador de foto em tela cheia
- [x] Zoom por pinça até 5x
- [x] Arraste da imagem ampliada
- [x] Toque duplo para ampliar/resetar
- [x] Pré-carregamento da mídia original para visualização de alta qualidade

## Social V1 — prioridade máxima

- [ ] Seguir / deixar de seguir atletas
- [ ] Contadores de seguidores e seguindo
- [ ] Lista de seguidores e seguindo
- [ ] Curtir / descurtir publicação
- [ ] Contagem e lista de curtidas
- [ ] Comentários em publicações
- [ ] Respostas a comentários
- [ ] Excluir o próprio comentário
- [ ] Salvar / remover dos salvos
- [ ] Tela individual da publicação
- [ ] Grade de publicações no perfil
- [ ] Editar e excluir a própria publicação
- [ ] Compartilhar perfil do atleta

## Social V2 — comunicação e retenção

- [ ] Direct entre usuários
- [ ] Lista de conversas
- [ ] Envio de foto no Direct
- [ ] Indicador de não lidas
- [ ] Push notifications
- [ ] Central de notificações
- [ ] Notificações de curtida, comentário, seguidor, mensagem e convite
- [ ] Bloquear / desbloquear usuário
- [ ] Denunciar perfil, publicação e comentário

## Conteúdo vertical

- [ ] Stories de 24 horas
- [ ] Visualizador sequencial de Stories
- [ ] Story por câmera/galeria
- [ ] Reações e respostas a Stories
- [ ] Reels / vídeos verticais
- [ ] Player full-screen vertical
- [ ] Curtidas e comentários em Reels
- [ ] Feed infinito de Reels
- [ ] Carrossel com várias fotos/vídeos por publicação

## Descoberta e recomendações

- [ ] Sugestões de atletas
- [ ] Amigos/seguidores em comum
- [ ] Descoberta por cidade
- [ ] Descoberta por modalidade
- [ ] Descoberta por categoria
- [ ] Descoberta por equipe
- [ ] Hashtags
- [ ] @menções
- [ ] Marcação de atletas em fotos
- [ ] Feed personalizado por afinidade esportiva
- [ ] Busca unificada de atletas, equipes, campeonatos e conteúdo

## Perfil esportivo avançado

- [ ] Estatísticas públicas do perfil
- [ ] Publicações / histórico / marcações em abas
- [ ] Conteúdo fixado no perfil
- [ ] Cartão esportivo compartilhável
- [ ] Deep link público do perfil
- [ ] Perfil de equipe/time
- [ ] Histórico competitivo ampliado
- [ ] Ranking e reputação esportiva

## Campeonatos 2.0

- [ ] Página detalhada do campeonato
- [ ] Participantes e equipes
- [ ] Inscrição dentro do app
- [ ] Chaves / grupos / tabela
- [ ] Resultados ao vivo
- [ ] Classificação final
- [ ] Galeria oficial do campeonato
- [ ] Posts vinculados ao campeonato
- [ ] Convite para atleta/equipe
- [ ] Integração automática com histórico do perfil

## Segurança e qualidade obrigatórias

- [ ] Regras Firestore específicas para seguir, curtidas, comentários e salvos
- [ ] Testes allow/deny no emulador
- [ ] Moderação e denúncia
- [ ] Rate limit de ações sociais sensíveis
- [ ] Custom Claims como única fonte de autorização administrativa
- [ ] Exclusão de conta dentro do app
- [ ] Privacidade e controles de visibilidade
- [ ] Telemetria de erros e crash reporting

## Ordem de implementação recomendada

1. Visualizador de mídia
2. Tela individual de publicação
3. Curtidas
4. Comentários
5. Seguir / seguidores / seguindo
6. Grade do perfil e salvos
7. Notificações
8. Direct
9. Stories
10. Reels
11. Recomendações
12. Times e campeonatos 2.0

O roadmap deve evoluir sem sacrificar compatibilidade com o site existente e mantendo o mesmo UID Firebase entre Web e Mobile.
