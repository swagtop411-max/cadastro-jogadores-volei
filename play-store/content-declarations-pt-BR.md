# Declarações de conteúdo — Google Play Console

## Público-alvo e conteúdo

- Faixa etária selecionada: **Maiores de 18 anos**, somente esta faixa.
- Restringir acesso de menores identificados pelo Google: **SIM**.
- App direcionado a crianças: **NÃO**.
- App direcionado a adolescentes: **NÃO**.

O cadastro dentro do serviço também exige data de nascimento e bloqueia novas contas quando a idade informada é inferior a 18 anos.

## Conteúdo gerado pelo usuário (UGC)

O app possui UGC: **SIM**.

Recursos existentes:
- perfis de usuários;
- fotos e vídeos;
- publicações;
- Stories e Reels;
- comentários;
- mensagens diretas;
- curtidas e seguidores.

Salvaguardas existentes:
- aceitação dos Termos de Uso no cadastro;
- definição de conteúdo e comportamento proibidos;
- denúncia de conteúdo e usuários;
- bloqueio de usuários;
- central administrativa de moderação;
- possibilidade de remoção de conteúdo e suspensão/exclusão de contas.

## Classificação indicativa / IARC

Responder o questionário conforme o conteúdo efetivamente presente no app. Pontos que precisam ser declarados com precisão:
- usuários podem interagir entre si: SIM;
- usuários podem compartilhar conteúdo: SIM;
- mensagens privadas: SIM;
- conteúdo sexual explícito permitido pela plataforma: NÃO;
- nudez permitida: NÃO;
- violência gráfica como finalidade do app: NÃO;
- jogos de azar: NÃO;
- compras aleatórias / loot boxes: NÃO;
- foco principal: esporte e rede social esportiva.

A classificação final é emitida pela IARC/Google Play e não deve ser inventada no código ou na ficha da loja.

## Anúncios

O projeto exibe espaços de apoiadores/parceiros. Se qualquer um desses espaços representar publicidade, promoção paga ou conteúdo patrocinado, preencher **"Contém anúncios: SIM"**. Esta é a opção conservadora recomendada para a primeira publicação.

Não há SDK de anúncios Android declarado no manifesto atual.

## Acesso ao app para revisão

O app permite navegar por áreas públicas sem conta, mas recursos sociais completos dependem de autenticação.

Ao preencher "Acesso ao app" no Play Console:
- explicar que o revisor pode criar uma conta diretamente pela tela "Minha conta";
- informar que o cadastro é exclusivo para maiores de 18 anos;
- se o Google solicitar credenciais prontas de teste, criar uma conta de revisão dedicada sem privilégios administrativos e fornecer apenas no campo seguro do Play Console.

Nunca publicar credenciais de teste em arquivos públicos do GitHub.

## Exclusão de conta

- Criação de conta dentro do app: SIM.
- Exclusão iniciada dentro do app: SIM.
- Recurso externo público para exclusão: SIM.
- URL: https://cadastrodeatletas.com.br/exclusao-conta.html

## Política de Privacidade

URL pública:
https://cadastrodeatletas.com.br/politica-privacidade.html

A política informa:
- dados tratados;
- finalidade;
- infraestrutura Firebase/Cloudinary;
- mensagens privadas;
- retenção e exclusão;
- direitos LGPD;
- restrição 18+;
- contato para privacidade.

## Pagamentos

A versão Android distribuída pelo Google Play funciona em modo de consumo/gratuito para os planos digitais:
- planos digitais pagos externos são ocultados/desativados no modo Play Store;
- o app não conduz o usuário a pagamento externo para liberar funcionalidade digital;
- inscrições ou serviços físicos relacionados a eventos esportivos devem ser analisados separadamente, pois não são equivalentes a recursos digitais do app.

Se no futuro forem vendidos recursos digitais diretamente no app, integrar o Google Play Billing antes de habilitar a compra.
