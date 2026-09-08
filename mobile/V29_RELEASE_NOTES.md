# Mobile V29 — Rede Social Esportiva

Esta versão pertence exclusivamente ao app nativo em `mobile/`.

## Principais entregas

- Stories com expiração em 24 horas, visualizações e mídia por câmera/galeria.
- Feed social com Para Você, Seguindo, busca, carrosséis, hashtags, menções e mídia HD.
- Curtidas, comentários, salvos, compartilhamento e tela individual de publicação.
- Perfil social do atleta com seguir, seguidores/seguindo, mensagens e publicações.
- Direct em tempo real com texto, foto, vídeo e indicador de não lidas.
- Central de atividades em tempo real.
- Reels com player vertical nativo.
- Ranking esportivo.
- Equipes, cadastro de equipe, convites formais, aceitar/recusar, membros oficiais e saída da equipe.
- Bloqueio e denúncias usando as regras de moderação existentes.
- Registro seguro de Expo Push Tokens por dispositivo e roteamento de toque em notificações.
- App 0.2.0 / build 3.

## Validação

A versão funcional final foi validada no GitHub Actions com:

- sintaxe JavaScript;
- testes de domínio mobile;
- instalação limpa das dependências;
- TypeScript `tsc --noEmit`;
- Expo Android prebuild;
- validação JSON e guardas de credenciais;
- compilação das regras Firestore/Storage no emulador.

O workflow de validação não fez deploy do site.

## Push remoto

O cliente registra com segurança o Expo Push Token. O envio remoto das notificações continua sendo responsabilidade de um serviço backend confiável. Nenhum segredo de envio é incluído no aplicativo.
