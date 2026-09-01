# Rede Social V4 — 01/09/2026

## Objetivo
Transformar o Banco de Dados de Atletas em uma rede social esportiva inspirada nos padrões de interação do Instagram, preservando identidade própria e usando a arquitetura atual: GitHub Pages + Firebase Authentication/Firestore + Cloudinary.

## Implementado

### Feed
- Publicação de fotos diretamente pelo perfil e pela Comunidade.
- Publicação de vídeos no mesmo feed.
- Publicação imediata pelo dono do perfil, sem fila de aprovação.
- Feed principal recebe as publicações públicas.
- Contas seguidas recebem prioridade na ordenação do feed.
- Curtidas e descurtidas.
- Duplo clique/toque compatível com navegador para curtir a mídia.
- Comentários publicados imediatamente.
- Compartilhamento via Web Share API ou cópia de link.
- Salvar/remover publicação em coleção privada do usuário.
- Avatar e nome do autor ligados ao perfil.
- Reprodução automática e silenciosa de vídeos quando a mídia está majoritariamente visível.

### Qualidade de mídia
- Firebase Storage deixou de ser necessário para novas mídias sociais.
- Upload direto ao Cloudinary.
- Fotos compatíveis são enviadas como arquivo original, sem o antigo redimensionamento para 600 KB e sem conversão JPEG no navegador.
- O feed usa a URL original retornada pelo Cloudinary, com object-fit: contain para evitar cortes desnecessários.
- Limite de aplicação para fotos sociais: 25 MB.
- Limite de aplicação para vídeos sociais: 45 MB.
- Não existe API Secret do Cloudinary no frontend.

### Stories
- Stories publicados diretamente pelo perfil.
- Expiração em 24 horas registrada em expiraEm.
- Stories expirados são filtrados da interface.
- Aro na foto do perfil quando existem stories ativos.
- Barra de stories acima do feed.
- Agrupamento por perfil.
- Stories ainda não vistos aparecem antes dos vistos.
- Cor do aro muda depois que o usuário visualiza.
- Registro de visualização por usuário em story_views.
- Visualizador em tela cheia.
- Fotos avançam automaticamente.
- Vídeos respeitam duração limitada pelo visualizador.

### Perfis
- Seguir/deixar de seguir.
- Contagem de seguidores e seguindo.
- Botão de mensagem em perfis de outros usuários.
- Grid de fotos e vídeos.
- Visualização ampliada de conteúdo.
- Dono pode editar legenda de sua própria publicação.
- Dono pode excluir sua própria publicação.
- Story pode ser aberto pela foto de perfil.

### Mensagens privadas
- Conversas privadas entre dois perfis.
- Mensagens em tempo real via onSnapshot.
- Caixa de entrada global.
- Badge de mensagens não lidas.
- Última mensagem e horário na caixa de entrada.
- Marcação da conversa como lida ao abrir.
- O remetente pode excluir mensagens nas regras do Firestore.

### Notificações
- Central de notificações no cabeçalho.
- Badge de notificações não lidas.
- Eventos: curtida, comentário, novo seguidor e nova mensagem.
- Atualização em tempo real enquanto o site está aberto.
- Marcação de notificação como lida.

### Administração
- Conteúdo publicado diretamente pelo perfil continua visível no gerenciamento da comunidade.
- Administrador pode editar conteúdo.
- Administrador pode excluir conteúdo.
- Conteúdo legado ainda pendente pode ser publicado pelo administrador.

### Segurança Firestore
- Regras específicas para conversas e mensagens.
- Somente participantes podem ler conversas/mensagens.
- Somente o remetente autenticado pode criar uma mensagem em seu nome.
- Regras de notificações impedem criação em nome de outro ator.
- Salvos são privados do usuário.
- Visualizações de story são registradas pelo próprio visualizador.
- Publicações continuam vinculadas ao ownerUid autenticado.
- CI compila Firestore e Storage rules no Firebase Emulator antes do deploy.

## Recursos que exigem uma etapa adicional de infraestrutura

### Push com o navegador/site totalmente fechado
O badge em tempo real funciona enquanto a aplicação está aberta e o estado de não lida permanece salvo para a próxima visita. Push nativo fora do site exige FCM/Web Push + service worker + uma origem segura para disparar notificações. Não é seguro disparar push de outro usuário diretamente do frontend.

### Chamadas de voz/vídeo e live
Exigem WebRTC, sinalização, infraestrutura de presença e TURN/STUN. Não foram misturadas ao frontend estático nesta versão para evitar uma implementação frágil.

### Música licenciada
Não deve ser copiada de bibliotecas de terceiros. Requer catálogo/licenciamento próprio ou provedor com direitos adequados.

### Recomendação avançada por IA
O feed V4 prioriza perfis seguidos e recência. Um ranking semelhante a redes de grande escala exige telemetria, backend de recomendação e controles contra abuso.

## Próximos módulos naturais
- Carrossel com múltiplas fotos/vídeos por publicação.
- Tela exclusiva de vídeos verticais/Reels.
- Pasta visual de publicações salvas.
- Editar/desfazer envio de mensagens e recibos de leitura detalhados.
- Solicitações de mensagem e bloqueio de perfis.
- Melhores amigos para stories.
- Hashtags, menções e Explorar.
- Arquivar publicações.
- Push Web/FCM quando houver backend seguro.
