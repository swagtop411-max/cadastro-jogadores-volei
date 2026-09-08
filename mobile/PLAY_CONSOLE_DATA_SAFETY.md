# Google Play — Segurança dos dados (preenchimento preparado)

> Documento operacional para preencher a Play Console. Revisar novamente no build final se novos SDKs ou dados forem adicionados.

## Visão geral
- Criação de conta dentro do app: **Sim**
- Exclusão de conta dentro do app: **Sim** (`Conta → Excluir conta e dados`)
- Exclusão por recurso Web: **Sim**
- URL: `https://cadastrodeatletas.com.br/excluir-conta.html`
- Política de Privacidade: `https://cadastrodeatletas.com.br/politica-privacidade.html`
- Dados vendidos: **Não**
- Uso de dados para publicidade comportamental: **Não implementado no app nativo atual**
- Criptografia em trânsito: **Sim**, usando HTTPS/TLS nos serviços Firebase, Cloudinary e Expo Push.

## Categorias de dados coletados

### Informações pessoais
- Nome
- E-mail
- ID de usuário/UID
- Data de nascimento, quando informada
- Cidade/UF
- Biografia e dados esportivos fornecidos pelo usuário

Finalidades: funcionalidade do app, gerenciamento de conta, personalização da experiência, segurança e prevenção de fraude.

### Fotos e vídeos
- Foto de perfil
- Imagens e vídeos publicados
- Stories e Reels
- Imagens de equipe

Finalidades: conteúdo gerado pelo usuário e funcionalidade social.

### Mensagens e comunicações dentro do app
- Direct entre usuários

Finalidades: funcionalidade do app e comunicação entre usuários.

### Atividade no app
- Publicações
- Curtidas
- Comentários
- Seguidores/seguindo
- Itens salvos
- Visualizações de Stories
- Convites de equipe
- Denúncias e bloqueios

Finalidades: funcionalidade social, segurança, prevenção de abuso e moderação.

### Identificadores do dispositivo / tokens técnicos
- Expo Push Token
- Plataforma do dispositivo (Android/iOS)

Finalidades: entrega de notificações e funcionalidade do app.

### Localização aproximada informada pelo usuário
- Cidade e estado informados manualmente no perfil.

O app nativo não solicita GPS apenas para obter a cidade do perfil. Se uma futura versão usar localização do aparelho, atualizar esta declaração antes da publicação.

### Informações financeiras
O app não coleta número de cartão, dados bancários ou credenciais de pagamento. Quando houver seleção de plano, podem existir nome do plano, valor e status administrativo. Confirmar na Play Console se o fluxo final de produção exige declarar histórico de compras/assinaturas.

## Compartilhamento com prestadores
Dados podem ser processados por prestadores de infraestrutura necessários ao funcionamento:
- Google Firebase / Google Cloud
- Cloudinary
- Expo Push

No formulário da Play, aplicar a exceção de **prestador de serviços** somente se o uso real e os contratos/políticas aplicáveis atenderem à definição do Google Play. Não declarar venda de dados.

## Dados obrigatórios x opcionais
- Nome, e-mail e credenciais: necessários para criar conta.
- Dados esportivos: necessários para completar o perfil, conforme o campo.
- Fotos, vídeos, mensagens e interações: opcionais e gerados pelo usuário.
- Push: permissão do sistema e token dependem da autorização do usuário/dispositivo.

## Segurança e exclusão
- Regras Firestore separam dados públicos e privados.
- Operações administrativas usam backend Firebase Functions.
- Exclusão de conta exige reautenticação recente.
- Backend remove identidade do Firebase Authentication, documentos relacionados e mídias identificadas do usuário.
- O recurso Web permite solicitar exclusão sem reinstalar o app.

## Atenção antes do envio
Se forem adicionados Crashlytics, Analytics, anúncios, mapas, localização do aparelho, pagamentos dentro do app ou outro SDK após esta versão, revisar toda a seção Segurança dos dados antes de enviar o AAB.
