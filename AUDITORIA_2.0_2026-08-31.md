# AUDITORIA 2.0 — 31/08/2026

## Status
Auditoria técnica aprofundada do branch main, com foco em rede social, Firebase/Firestore, segurança, privacidade, performance e painel administrativo.

## Correções aplicadas nesta rodada

### Painel administrativo
O carregamento de atletas fazia uma leitura privada adicional para CADA atleta apenas para mostrar o contato na listagem. Isso criava um padrão N+1 de leituras e expunha dados privados desnecessariamente durante a abertura do painel.

Alteração:
- a listagem agora carrega apenas os documentos públicos de atletas;
- o contato privado é buscado somente quando o administrador abre a edição daquele atleta.

Impacto esperado:
- menos leituras do Firestore;
- abertura do painel mais rápida;
- menor exposição de dados privados no cliente.

### Rede social
Mantidas as correções da auditoria 1.0:
- contrato de publicação alinhado às Firestore Rules;
- fallback de Data URL no Firestore removido;
- limites iniciais de consultas adicionados.

## Achados críticos

### P0 — Credencial administrativa
O login administrativo depende do Firebase Authentication e da regra de e-mail administrador. A senha fornecida pelo proprietário NÃO foi inserida no código nem no repositório.

Por segurança, não registrar senhas em arquivos, commits, issues ou documentação.

### P1 — Dados públicos misturados com dados sensíveis
As coleções atletas e equipes possuem leitura pública. Firestore realiza leitura de documentos inteiros, não de campos selecionados. Portanto, qualquer campo sensível que permaneça dentro desses documentos públicos também pode ser lido por um cliente que consulte o Firestore diretamente.

A arquitetura correta é separar definitivamente documento público e documento privado.

### P1 — Spam em coleções pendentes
Existem fluxos de criação público/sem autenticação em coleções de pendências. As regras validam formato e tamanho, mas não fornecem rate limiting real. Isso deixa espaço para automação de spam e consumo de quota.

Recomendação de produção:
- Firebase App Check;
- proteção anti-bot/CAPTCHA quando aplicável;
- Cloud Functions para ingestão/moderação;
- limites por IP/usuário fora das Security Rules.

### P1 — Leitura pública sem paginação completa
Os limites atuais melhoraram o primeiro carregamento, mas limit() não substitui paginação por cursor. Em crescimento, o usuário deve carregar páginas usando cursor.

### P2 — Contadores sociais
A Home e o feed fazem múltiplas leituras individuais para contar curtidas e comentários por publicação. Isso escala mal.

Arquitetura recomendada:
- likeCount e commentCount materializados no documento da publicação;
- incremento/decremento atômico;
- Cloud Functions ou transações para manter consistência.

### P2 — Storage
Arquivos de usuários são públicos para leitura. Isso pode ser adequado para fotos públicas, mas precisa ser separado de qualquer mídia privada. Uploads órfãos também precisam de rotina de limpeza.

### P2 — Front-end legado
Há vários arquivos JS/CSS históricos e camadas de estabilização adicionadas diretamente no public.js. Antes de crescer a rede social, recomenda-se consolidar módulos e remover código de compatibilidade que não é mais necessário.

## Teste administrativo
O site ao vivo não pôde ser automatizado nesta sessão porque o mecanismo disponível não fornece um navegador interativo para preencher login e executar cliques dentro da conta. O domínio também não pôde ser obtido pelo fetch web nesta sessão.

Por isso, nenhum teste foi inventado como se tivesse sido executado no painel. A auditoria desta rodada usa o código real do repositório e as regras reais do Firebase presentes no branch main.

## Próxima etapa recomendada
1. Criar coleções públicas atletas_publicos e equipes_publicas.
2. Migrar os dados públicos.
3. Retirar leitura pública das coleções que carregam dados sensíveis.
4. Atualizar public.js para consumir apenas documentos públicos.
5. Implementar paginação real.
6. Implementar contadores materializados.
7. Ativar App Check.
8. Criar limpeza automática de Storage.
9. Testar fluxos com Firebase Emulator Suite.
10. Fazer teste final de regressão em cadastro, login, perfil, comunidade, seguidores, curtidas, comentários, equipes, campeonatos e administração.

## Resultado da auditoria 2.0
A plataforma já possui uma base de segurança razoável para autenticação, moderação e ownership, mas ainda NÃO deve ser considerada 100% pronta para escala de rede social. O maior ponto arquitetural a corrigir antes do crescimento é a separação entre documentos públicos e privados.
