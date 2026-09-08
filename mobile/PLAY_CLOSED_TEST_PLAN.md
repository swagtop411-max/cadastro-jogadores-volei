# Plano de teste fechado — Google Play

Este plano é obrigatório para contas pessoais de desenvolvedor criadas após 13/11/2023 antes do acesso à produção.

## Meta mínima
- 12 testadores inscritos
- participação contínua por pelo menos 14 dias consecutivos
- manter o teste ativo durante todo o período

## Perfil ideal dos testadores
Priorizar pessoas que realmente representem o público do app:
- atletas de vôlei de praia e quadra;
- jogadores iniciantes, intermediários e avançados;
- responsáveis por equipes;
- organizadores de campeonatos.

## Roteiro obrigatório de teste
Cada testador deve tentar, conforme aplicável:
1. instalar pelo link oficial do teste fechado;
2. criar conta e verificar e-mail;
3. aceitar Termos/Privacidade;
4. completar/editar perfil esportivo;
5. publicar foto;
6. publicar carrossel;
7. publicar vídeo/Reel;
8. criar e assistir Story;
9. seguir outro atleta;
10. curtir, comentar e salvar publicação;
11. usar Explorar;
12. abrir ranking e campeonatos;
13. enviar e receber Direct;
14. criar ou visualizar equipe;
15. enviar/aceitar convite de equipe quando aplicável;
16. testar denúncia e bloqueio;
17. testar notificações;
18. acessar Conta e Privacidade;
19. confirmar que o fluxo de exclusão de conta é encontrado facilmente, sem concluir a exclusão salvo em conta de teste dedicada.

## Feedback que deve ser coletado
- aparelho e versão do Android;
- tela/ação em que ocorreu o problema;
- se houve travamento;
- se a ação demorou demais;
- prints ou gravação quando possível;
- percepção de clareza do cadastro, feed, publicação, perfil e navegação.

## Contas específicas para QA
Manter pelo menos duas contas de teste dedicadas para validar:
- mensagens entre usuários;
- seguir/deixar de seguir;
- bloqueio;
- convites de equipe;
- notificações;
- exclusão completa de uma conta sem afetar o perfil de produção de um atleta real.

## Critério interno de aprovação para produção
- nenhum crash reproduzível P0/P1;
- cadastro, login e recuperação de senha funcionando;
- upload de foto/vídeo funcionando;
- regras Firebase de produção publicadas;
- exclusão de conta testada ponta a ponta;
- Termos e Política acessíveis;
- denúncia e bloqueio funcionando;
- push testado com app em segundo plano/fechado;
- AAB analisado no Play Console sem erro bloqueante;
- feedback dos testadores revisado.
