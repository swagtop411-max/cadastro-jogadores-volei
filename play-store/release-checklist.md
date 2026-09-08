# Checklist final de publicação — Cadastro de Atletas

## Código e Android

- [x] Package ID: `br.com.cadastrodeatletas.app`
- [x] `compileSdk 36`
- [x] `targetSdk 36`
- [x] Android Browser Helper / TWA
- [x] HTTPS obrigatório (`usesCleartextTraffic=false`)
- [x] App Link solicitado com `android:autoVerify=true`
- [x] APK de teste compilável
- [x] AAB de release compilável
- [x] Pipeline de AAB assinado preparado para receber secrets de assinatura
- [x] Modo Google Play sem compra externa de recursos digitais

## Público 18+

- [x] Cadastro solicita data de nascimento
- [x] Validação impede novo cadastro com menos de 18 anos
- [x] Checkbox explícito de maioridade
- [x] Termos de Uso atualizados para 18+
- [x] Política de Privacidade atualizada para 18+
- [ ] No Play Console: selecionar somente "Maiores de 18 anos"
- [ ] No Play Console: ativar "Restringir acesso de menores"

## UGC e segurança social

- [x] Termos de Uso antes do cadastro
- [x] Conteúdo proibido documentado
- [x] Denúncia de conteúdo/usuário
- [x] Bloqueio de usuário
- [x] Denúncias persistidas no Firestore
- [x] Central de moderação ADM
- [x] Possibilidade administrativa de remoção/moderação

## Conta e privacidade

- [x] Criação de conta no app
- [x] Exclusão de conta dentro do app
- [x] Página pública de exclusão fora do app
- [x] Backend `deleteMyAccount`
- [x] Política de Privacidade pública
- [x] Termos de Uso públicos
- [x] Política de Cookies
- [x] Analytics condicionado a consentimento

## Dados / Play Console

- [x] Roteiro de Segurança dos dados preparado em `play-store/data-safety-pt-BR.md`
- [x] Declarações de conteúdo preparadas em `play-store/content-declarations-pt-BR.md`
- [x] Texto da ficha da loja preparado em `play-store/store-listing-pt-BR.md`
- [ ] Preencher formulário de Segurança dos dados no Play Console
- [ ] Preencher questionário IARC no Play Console
- [ ] Declarar anúncios conforme uso real dos espaços de apoiadores
- [ ] Inserir URL da Política de Privacidade no Play Console
- [ ] Inserir URL pública de exclusão de conta no Play Console

## Assinatura e Digital Asset Links

- [ ] Criar/configurar chave privada de upload Android e guardar backup seguro
- [ ] Adicionar secrets de assinatura ao GitHub Actions:
  - `ANDROID_KEYSTORE_BASE64`
  - `ANDROID_KEYSTORE_PASSWORD`
  - `ANDROID_KEY_ALIAS`
  - `ANDROID_KEY_PASSWORD`
- [ ] Criar o app no Google Play Console e ativar Play App Signing
- [ ] Copiar o SHA-256 do certificado de **App Signing** do Google Play
- [ ] Substituir o placeholder de `android-twa/assetlinks.template.json`
- [ ] Publicar a versão final em `/.well-known/assetlinks.json`
- [ ] Confirmar TWA em tela cheia sem barra do navegador

## Firebase / Cloudinary

- [x] Functions em Node.js 22 preparadas
- [x] Upload Cloudinary assinado preparado no backend
- [x] Exclusão completa de conta preparada no backend
- [ ] Configurar secrets Firebase:
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
- [ ] Fazer deploy das Cloud Functions de produção
- [ ] Testar upload de foto/vídeo com função assinada
- [ ] Testar exclusão real de uma conta de teste

## Testes antes da produção

- [ ] Instalar AAB pelo teste interno do Google Play
- [ ] Criar conta 18+
- [ ] Confirmar bloqueio de cadastro menor de 18
- [ ] Completar perfil
- [ ] Publicar foto
- [ ] Publicar vídeo
- [ ] Abrir imagem ampliada
- [ ] Curtir e comentar
- [ ] Seguir e deixar de seguir
- [ ] Enviar mensagem
- [ ] Denunciar conteúdo
- [ ] Bloquear usuário
- [ ] Confirmar que planos pagos externos não aparecem no modo Play
- [ ] Excluir conta de teste e verificar remoção
- [ ] Validar política e links legais
- [ ] Testar aparelhos Android pequenos e grandes

## Materiais gráficos da loja

- [ ] Ícone 512 × 512 PNG
- [ ] Gráfico de destaque 1024 × 500
- [ ] Pelo menos 2 capturas de tela de celular válidas
- [ ] Preferencialmente 4 a 8 capturas mostrando perfil, feed, ranking, campeonatos e comunidade

## Publicação

Quando todos os itens externos acima estiverem concluídos:
1. gerar AAB assinado;
2. enviar primeiro para Teste interno;
3. validar instalação e Digital Asset Links;
4. promover para Teste fechado/Produção conforme a elegibilidade da conta de desenvolvedor;
5. enviar para análise do Google Play.
