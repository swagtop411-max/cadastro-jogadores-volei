# Declarações de conteúdo — Google Play Console

## Público-alvo e conteúdo

- Faixa etária selecionada: **Maiores de 18 anos**, somente esta faixa.
- Restringir acesso de menores identificados pelo Google: **SIM**.
- App direcionado a crianças: **NÃO**.
- App direcionado a adolescentes: **NÃO**.

O cadastro solicita data de nascimento e confirmação de maioridade e impede novos cadastros quando a idade informada é inferior a 18 anos.

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
- aceitação dos Termos de Uso e da Política de Privacidade;
- definição de conteúdo e comportamento proibidos;
- denúncia de conteúdo e usuários dentro do app;
- bloqueio de usuários;
- central administrativa de moderação;
- possibilidade de remoção de conteúdo e suspensão/exclusão de contas.

## Classificação indicativa / IARC

Responder conforme o conteúdo efetivamente presente na versão enviada:
- usuários podem interagir entre si: SIM;
- usuários podem compartilhar conteúdo: SIM;
- mensagens privadas: SIM;
- conteúdo sexual explícito permitido pela plataforma: NÃO;
- nudez permitida: NÃO;
- violência gráfica como finalidade do app: NÃO;
- jogos de azar: NÃO;
- compras aleatórias / loot boxes: NÃO;
- foco principal: esporte e rede social esportiva.

A classificação final é emitida pela IARC/Google Play.

## Anúncios

O projeto exibe espaços de apoiadores/parceiros. Se esses espaços representarem publicidade, promoção paga ou conteúdo patrocinado na versão publicada, declarar **"Contém anúncios: SIM"**. Não há SDK nativo de anúncios Android declarado no manifesto atual.

## Acesso ao app para revisão

O conteúdo funcional do site/app exige autenticação. As páginas legais e de exclusão de conta permanecem públicas.

No Play Console:
- declarar que o app possui conteúdo restrito por login;
- fornecer uma **conta de revisão dedicada, comum e sem privilégios administrativos** no campo seguro "Acesso ao app";
- informar que o app é exclusivo para maiores de 18 anos;
- não publicar credenciais de teste no GitHub ou na ficha pública da loja.

## Exclusão de conta

- Criação de conta dentro do app: SIM.
- Exclusão pode ser iniciada dentro do app: SIM.
- Recurso externo público para iniciar a exclusão: SIM.
- URL: `https://cadastrodeatletas.com.br/exclusao-conta.html`
- O fluxo atual é uma solicitação de exclusão com verificação de titularidade, não uma promessa de exclusão instantânea automática.

## Política de Privacidade

URL pública:
`https://cadastrodeatletas.com.br/politica-privacidade.html`

A política cobre dados tratados, finalidades, infraestrutura, mensagens privadas, retenção e exclusão, direitos LGPD e restrição 18+.

## Pagamentos

A versão Android distribuída pelo Google Play funciona em modo gratuito para recursos digitais:
- planos digitais pagos externos ficam ocultos/desativados no modo Play Store;
- o app não direciona o usuário a pagamento externo para liberar funcionalidade digital;
- inscrições e serviços físicos relacionados a eventos esportivos devem ser avaliados separadamente conforme sua natureza real.

Se recursos digitais pagos forem habilitados futuramente dentro do app, o fluxo deverá ser revisado e, quando exigido, integrado ao Google Play Billing antes da publicação.
