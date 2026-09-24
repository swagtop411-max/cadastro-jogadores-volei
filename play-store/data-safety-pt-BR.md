# Segurança dos dados — preenchimento sugerido no Google Play Console

Este documento descreve o comportamento da versão Android/TWA preparada em setembro de 2026. A declaração enviada ao Google Play precisa refletir exatamente a versão publicada.

## Visão geral

- O app coleta dados do usuário: **SIM**.
- Os dados são criptografados em trânsito: **SIM**, por HTTPS/TLS.
- O usuário pode solicitar exclusão da conta e dos dados: **SIM**.
- Exclusão iniciada dentro do app: **SIM**, por Minha Conta → Excluir minha conta.
- Recurso público fora do app: **SIM**, em `https://cadastrodeatletas.com.br/exclusao-conta.html`.
- Analytics: condicionado ao consentimento aplicável no cliente.

## Tipos de dados usados pelo app

### Informações pessoais

**Nome**
- Coletado: SIM.
- Finalidades: gerenciamento da conta, funcionalidade do app, comunicação social e personalização do perfil.
- Obrigatório para criar conta: SIM.

**Endereço de e-mail**
- Coletado: SIM.
- Finalidades: autenticação, gerenciamento da conta, segurança, recuperação de acesso e comunicação relacionada à conta.
- Obrigatório para criar conta: SIM.

**Contato (telefone/WhatsApp ou outro contato informado)**
- Coletado: SIM.
- Obrigatório para concluir o cadastro: SIM.
- Finalidades: gerenciamento da conta e contato relacionado ao serviço.
- Não exige acesso à agenda do aparelho.
- Declarar número de telefone quando o usuário fornecer telefone/WhatsApp; e-mail também é coletado na autenticação.

**IDs do usuário**
- Coletado: SIM.
- Exemplos: UID do Firebase Authentication e identificadores internos de perfil.
- Finalidades: gerenciamento de conta, segurança, interações sociais e funcionalidade do app.

**Data de nascimento / outras informações pessoais**
- Coletado: SIM.
- Finalidade: confirmação de elegibilidade 18+ e gerenciamento do perfil privado.
- A data de nascimento não é publicada no perfil público por padrão.

### Localização aproximada informada pelo usuário

- O usuário pode informar cidade e estado no perfil.
- O app Android não solicita permissão de localização GPS.
- Se o formulário do Play enquadrar cidade/estado como localização aproximada coletada, declarar: SIM.
- Finalidades: funcionalidade do perfil e descoberta de atletas.

### Fotos e vídeos

**Fotos**
- Coletado: SIM. A foto de perfil é obrigatória para concluir o cadastro.
- Finalidades: perfil, publicações, Stories e funcionalidade social.
- Opcional: NÃO para a foto de perfil. Capa, publicações e Stories continuam opcionais.
- No formulário Data Safety, declarar a coleta de fotos como obrigatória, pois pelo menos um uso é necessário para acessar a rede.

**Vídeos**
- Coletado: SIM, quando o usuário escolhe publicar.
- Finalidades: publicações, Stories/Reels e funcionalidade social.
- Opcional: SIM.

### Mensagens

**Mensagens privadas / outras mensagens no app**
- Coletado: SIM.
- Finalidades: comunicação entre usuários, notificações e funcionalidade social.
- Opcional: SIM.

### Atividade no app

**Interações no app**
- Coletado: SIM.
- Exemplos: curtidas, comentários, seguidores, itens salvos, visualizações de Stories, denúncias e bloqueios.
- Finalidades: funcionalidade do app, segurança, moderação e experiência social.

**Conteúdo gerado pelo usuário**
- Coletado: SIM.
- Exemplos: biografia, publicações, comentários, Stories, vídeos e histórico esportivo informado pelo usuário.
- Finalidades: funcionalidade do app e recursos sociais.

**Analytics e eventos técnicos**
- Coletados somente quando aplicável ao consentimento/configuração publicada.
- Podem incluir páginas visitadas, cliques e identificadores técnicos/locais.
- Finalidades: análise de uso, estabilidade e melhoria do serviço.

## Dados que o app Android atual não solicita por permissão nativa

O manifesto Android atual solicita apenas acesso à Internet. Não há permissões nativas declaradas para contatos, SMS, telefone, localização GPS, calendário, microfone, câmera ou leitura ampla de arquivos do aparelho.

Uploads de mídia são iniciados pelo usuário através do seletor disponibilizado pelo navegador/TWA.

## Prestadores e infraestrutura

Dados podem ser processados pelos serviços usados para operar o app:
- Google Firebase Authentication e Cloud Firestore, para autenticação e dados estruturados;
- Cloudinary, para armazenamento/processamento de fotos e vídeos;
- Cloudflare Workers, como camada de API para operações seguras como autorização de upload de mídia;
- Google Analytics, somente quando estiver habilitado de acordo com o consentimento/configuração aplicável.

No formulário do Google Play, revisar a definição vigente de "compartilhamento". Processamento por prestadores de serviço em nome do desenvolvedor pode se enquadrar nas exceções do formulário, mas a resposta final deve considerar os termos e a configuração efetivamente usados no lançamento.

## Segurança

- HTTPS/TLS em trânsito.
- Firebase Authentication para contas.
- Firebase App Check configurado para o cliente Web/TWA.
- Firestore Security Rules para separação de dados e autorização.
- Storage Rules restritivas, quando Firebase Storage é utilizado.
- Upload de mídia autorizado por API segura, sem expor o segredo do Cloudinary ao cliente.
- Denúncia, bloqueio e moderação para conteúdo gerado por usuários.
- Aplicativo Android com `usesCleartextTraffic=false` e backup Android desativado.

## Exclusão de conta e dados

Dentro do app:
`Minha Conta → Excluir minha conta`.

Fora do app:
`https://cadastrodeatletas.com.br/exclusao-conta.html`

A página pública orienta o titular a entrar na própria conta para confirmar a identidade. Quando autenticado, o aplicativo executa a **exclusão automática** da conta e dos dados associados pelo backend seguro, incluindo o registro de autenticação, perfil, publicações, vídeos, Stories, mídias e demais dados vinculados que não precisem ser preservados por obrigação legal.

Se a exclusão automática não puder ser concluída, o aplicativo registra uma solicitação pendente no **painel administrativo**. A administração pode localizar a conta pelo e-mail ou UID e concluir a exclusão integral pelo console privado.
