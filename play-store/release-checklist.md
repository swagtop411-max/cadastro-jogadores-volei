# Checklist final de publicação — Cadastro de Atletas V55

Atualizado em 16/09/2026 após auditoria da versão atual do site, TWA Android, autenticação, UGC, mensagens, exclusão de conta e documentação da Google Play.

## Código e Android

- [x] Package ID `br.com.cadastrodeatletas.app`.
- [x] `compileSdk 36`.
- [x] `targetSdk 36`.
- [x] `minSdk 23`.
- [x] TWA com Android Browser Helper.
- [x] Início em `https://cadastrodeatletas.com.br/?app=1`.
- [x] HTTPS obrigatório e `usesCleartextTraffic=false`.
- [x] Backup Android desativado.
- [x] App Link com `android:autoVerify=true`.
- [x] Manifesto Android solicita somente permissão `INTERNET`.
- [x] Workflow compila APK de teste e AAB release sem assinatura.
- [x] Workflow de release assinado preparado para secrets da chave de upload.
- [x] Auditoria V55 também recompila Android em cada alteração relevante de release.

## Acesso e público 18+

- [x] Conteúdo funcional protegido por autenticação.
- [x] Visitante sem login é redirecionado para cadastro/login.
- [x] Páginas legais e página de exclusão permanecem públicas.
- [x] Cadastro solicita data de nascimento.
- [x] Cadastro bloqueia menor de 18 anos.
- [x] Confirmação explícita de maioridade.
- [x] Termos e Privacidade indicam plataforma 18+.
- [ ] Play Console: selecionar somente público 18+ e preencher as perguntas de público-alvo conforme a tela vigente.

## UGC, mensagens e moderação

- [x] Termos de Uso claros para conteúdo gerado pelo usuário.
- [x] Denúncia de conteúdo/usuário no app.
- [x] Bloqueio de usuário no app.
- [x] Regras sociais consideram bloqueios.
- [x] Central administrativa de moderação.
- [x] Trilha de auditoria de moderação.
- [x] Mensagens persistentes em conversas.
- [x] Aviso visual de novas mensagens/notificações.
- [x] Exclusão de mensagem para o próprio usuário.
- [x] Exclusão de mensagem própria para todos.
- [x] Limpeza do histórico local para o usuário.
- [x] Atividades de mensagem abrem a conversa, não apenas o perfil.

## Conta e privacidade

- [x] Criação de conta dentro do app.
- [x] Caminho dentro do app para iniciar exclusão.
- [x] Página pública externa de exclusão: `https://cadastrodeatletas.com.br/exclusao-conta.html`.
- [x] Página pública funciona sem Firebase Cloud Functions pagas.
- [x] Solicitação de exclusão pode ser iniciada sem login e segue para canal oficial com verificação de titularidade.
- [x] Política de Privacidade pública.
- [x] Termos de Uso públicos.
- [x] Política de Cookies pública.
- [x] Roteiro de Data Safety atualizado para o fluxo real.

## Segurança técnica

- [x] Firebase Authentication.
- [x] Firestore Rules e Storage Rules versionadas e compiladas no CI principal.
- [x] Firebase App Check inicializado no cliente.
- [x] Enforcement do App Check no Cloud Firestore confirmado durante a preparação.
- [x] Cloudinary não recebe segredo no navegador.
- [x] Assinatura de upload é solicitada ao Cloudflare Worker.
- [x] API de mídia recebe Firebase ID token e App Check token.
- [x] `cloudinary-upload.js` não depende de Firebase Functions.
- [x] Aceite legal atual não depende de Firebase Functions.
- [x] Keystore e `keystore.properties` ignorados pelo Git.
- [ ] Cloudinary: confirmar manualmente que presets unsigned antigos desnecessários estão desativados.

## Pagamentos

- [x] Modo Play Store detectado por `?app=1`/origem Android.
- [x] Planos digitais pagos externos ficam ocultos e desativados no modo Play.
- [x] Plano gratuito é mantido no app distribuído pela Play enquanto Google Play Billing não estiver integrado.
- [ ] Se recursos digitais pagos forem habilitados no futuro, revisar política e integrar Google Play Billing quando aplicável antes de publicar a mudança.

## Materiais e declarações preparados

- [x] `play-store/store-listing-pt-BR.md`.
- [x] `play-store/data-safety-pt-BR.md`.
- [x] `play-store/content-declarations-pt-BR.md`.
- [x] Ícone PWA 512 × 512 referenciado no manifest.
- [x] Política de Privacidade e URL de exclusão definidas.
- [ ] Criar/selecionar gráfico de destaque 1024 × 500 para a ficha da loja.
- [ ] Separar pelo menos 2 capturas de tela de celular; recomendado 4 a 8.

## Assinatura e Digital Asset Links

- [ ] Confirmar os secrets da chave de upload no GitHub Actions:
  - `ANDROID_KEYSTORE_BASE64`
  - `ANDROID_KEYSTORE_PASSWORD`
  - `ANDROID_KEY_ALIAS`
  - `ANDROID_KEY_PASSWORD`
- [ ] Criar o app no Google Play Console e ativar Play App Signing.
- [ ] Copiar o SHA-256 do certificado **App Signing** fornecido pelo Google Play.
- [ ] Gerar e publicar `/.well-known/assetlinks.json` com esse SHA-256.
- [ ] Confirmar TWA validada em tela cheia, sem barra do navegador.

> O `assetlinks.json` final não deve ser criado com SHA inventado ou com o certificado de upload quando o Google Play estiver assinando o app. O fingerprint correto é o do certificado de **App Signing** apresentado no Play Console.

## Play Console

- [ ] Criar o registro do app, se ainda não existir.
- [ ] Preencher ficha da loja.
- [ ] Informar Política de Privacidade.
- [ ] Informar URL pública de exclusão da conta.
- [ ] Preencher Segurança dos dados usando o roteiro V55.
- [ ] Preencher questionário IARC.
- [ ] Declarar UGC/interações sociais conforme a tela vigente.
- [ ] Declarar anúncios conforme o uso real dos espaços de apoiadores.
- [ ] Preencher "Acesso ao app" e fornecer conta de revisão dedicada, comum e sem privilégios administrativos.
- [ ] Selecionar público-alvo 18+.

## Testes finais antes de produção

- [ ] Instalar o AAB pelo Teste interno do Google Play.
- [ ] Confirmar login obrigatório na instalação da Play.
- [ ] Criar conta 18+ e confirmar bloqueio de menor de 18.
- [ ] Aceitar Termos/Privacidade.
- [ ] Completar e editar perfil.
- [ ] Publicar foto, vídeo e Story.
- [ ] Abrir mídia ampliada.
- [ ] Curtir, comentar, seguir e deixar de seguir.
- [ ] Enviar e receber mensagem entre duas contas.
- [ ] Confirmar alerta de mensagem/notificação e histórico da conversa.
- [ ] Denunciar conteúdo e bloquear usuário.
- [ ] Resolver denúncia no ADM.
- [ ] Iniciar solicitação de exclusão dentro do app e pela URL pública.
- [ ] Confirmar que planos digitais externos não aparecem no modo Play.
- [ ] Testar aparelho pequeno e aparelho grande.

## Status V55

**Pronto no repositório para a etapa Play Console:** SIM, condicionado ao CI V55 concluir sem falhas.

**Pronto para envio final à produção sem nenhuma ação externa:** NÃO. Restam itens que somente o Google Play/conta do desenvolvedor pode fornecer ou confirmar: assinatura da Play, SHA-256 de App Signing, Digital Asset Links final, formulários do Play Console, credenciais de revisão e teste interno instalado pela Play.
