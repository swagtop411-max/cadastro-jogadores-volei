# Google Play — Acesso para revisão

O Banco de Atletas exige autenticação para acessar a experiência social completa. Por isso a seção **App access / Acesso ao app** da Play Console deve informar que partes do app são restritas por login e fornecer credenciais funcionais para a equipe de revisão quando solicitado.

## Conta de revisão
Criar no Firebase Authentication uma conta dedicada exclusivamente ao Google Play Review.

Não colocar a senha desta conta no GitHub.

A conta de revisão deve:
- estar ativa;
- possuir e-mail verificável/validado conforme o fluxo de produção;
- ter perfil mínimo criado;
- conseguir aceitar Termos e Política dentro do app;
- não exigir código enviado para um telefone pessoal do desenvolvedor;
- não depender de acesso físico, convite particular ou aprovação manual para entrar no app.

## Texto sugerido para a Play Console
`O aplicativo exige login por e-mail e senha para acessar a rede social. Fornecemos abaixo uma conta de teste permanente para a equipe de revisão. Após o login, o aplicativo pode solicitar a confirmação dos Termos de Uso e Política de Privacidade; basta marcar as opções e tocar em Aceitar e continuar. Não há autenticação em duas etapas nesta conta de revisão.`

## Roteiro de revisão
1. Login
2. Feed / Stories
3. Explorar
4. Perfil
5. Reels
6. Ranking
7. Equipes
8. Campeonatos
9. Direct / Atividades
10. Conta e Privacidade
11. Termos, Política de Privacidade e Segurança Infantil
12. Fluxo de exclusão de conta visível em Conta e Privacidade

## Atenção
A credencial informada à Play precisa continuar válida durante todo o processo de análise. Se a senha for alterada, atualizar imediatamente a seção App access antes de reenviar uma versão.
