# Segurança dos dados — preenchimento sugerido no Google Play Console

Este documento descreve o comportamento atual do app Android/TWA e serve como roteiro para o formulário "Segurança dos dados". A declaração final precisa refletir exatamente a configuração publicada no Play Console.

## Visão geral

- O app coleta dados do usuário: SIM.
- Os dados são criptografados em trânsito: SIM, por HTTPS/TLS.
- O usuário pode solicitar exclusão da conta e dos dados: SIM.
- Exclusão dentro do app: SIM, pela área "Minha conta".
- Exclusão fora do app: SIM, em https://cadastrodeatletas.com.br/exclusao-conta.html
- Analytics: opcional e condicionado ao consentimento de cookies/analytics no cliente.

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

**IDs do usuário**
- Coletado: SIM.
- Exemplos: UID do Firebase Authentication e identificadores internos de perfil.
- Finalidades: gerenciamento de conta, segurança, interações sociais e funcionalidade do app.

**Data de nascimento / outras informações pessoais**
- Coletado: SIM.
- Finalidade: confirmação de elegibilidade 18+ e gerenciamento do perfil privado.
- A data de nascimento não é publicada no perfil público por padrão.

### Localização

**Localização aproximada informada pelo usuário**
- O usuário pode informar cidade e estado no perfil.
- Não há permissão Android para GPS no manifesto atual.
- Se o formulário considerar cidade/estado como localização aproximada coletada, declarar: SIM.
- Finalidades: funcionalidade do perfil e descoberta de atletas.

### Fotos e vídeos

**Fotos**
- Coletado: SIM, quando o usuário escolhe publicar ou atualizar avatar/capa.
- Finalidades: perfil, publicações, Stories, conteúdo social e funcionalidade do app.
- Opcional: SIM.

**Vídeos**
- Coletado: SIM, quando o usuário escolhe publicar.
- Finalidades: publicações, Stories/Reels e funcionalidade social.
- Opcional: SIM.

### Mensagens

**Outras mensagens no app / mensagens privadas**
- Coletado: SIM.
- Finalidades: comunicação entre usuários e funcionalidade social.
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

**Outras ações / analytics**
- Coletado quando o usuário aceita analytics.
- Exemplos: page view, cliques e eventos de navegação.
- Finalidades: analytics e melhoria do serviço.

### Identificadores de dispositivo ou outros IDs

- O analytics pode utilizar identificadores técnicos/locais, incluindo um identificador aleatório de visitante e dados técnicos do navegador.
- Declarar conforme a orientação atual dos SDKs/serviços usados na versão enviada, especialmente Google Analytics.

## Dados que não são coletados pelo app Android atual

Com base no manifesto Android atual, o app não solicita permissões nativas para:
- contatos;
- SMS;
- telefone;
- localização GPS precisa;
- calendário;
- microfone como permissão Android própria;
- câmera como permissão Android própria;
- arquivos gerais do dispositivo.

Uploads de mídia são iniciados pelo usuário através do seletor fornecido pelo navegador/TWA.

## Compartilhamento e prestadores de serviço

Dados podem ser processados por prestadores usados para operar o serviço:
- Google Firebase Authentication / Cloud Firestore;
- Cloudinary para fotos e vídeos;
- Google Analytics quando houver consentimento.

No formulário do Google Play, verificar a definição vigente de "compartilhamento". Transferências a prestadores que processam dados somente em nome do desenvolvedor podem se enquadrar na exceção de prestador de serviço. Não marcar "não compartilhado" se qualquer fornecedor utilizar dados para finalidade própria fora dessa exceção.

## Segurança

- HTTPS/TLS em trânsito.
- Firebase App Check configurado no cliente.
- Firestore Security Rules para separação de dados públicos/privados.
- Área de conta autenticada.
- Exclusão de conta e dados associada a função backend autenticada.
- Denúncia, bloqueio e moderação para conteúdo gerado por usuário.

## Exclusão

Dentro do app:
Minha conta → Excluir minha conta.

Fora do app:
https://cadastrodeatletas.com.br/exclusao-conta.html

A exclusão autenticada utiliza a função backend `deleteMyAccount`, que remove a conta Firebase Authentication, dados associados localizados no Firestore e mídias Cloudinary identificadas pelo sistema, respeitadas exceções legais de retenção declaradas na Política de Privacidade.
