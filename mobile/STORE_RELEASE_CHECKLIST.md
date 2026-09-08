# Checklist de publicação — Banco de Atletas 1.0.0

## Código / app
- [x] App nativo Expo/React Native separado do site
- [x] Package Android `br.com.cadastrodeatletas.app`
- [x] Versão de loja `1.0.0`
- [x] Target/compile SDK 36
- [x] Build AAB configurado no perfil production do EAS
- [x] Cadastro/login/recuperação de senha
- [x] Termos e Política no cadastro
- [x] Gate de novo aceite para usuários existentes
- [x] Central Conta e Privacidade
- [x] Exclusão de conta dentro do app
- [x] Página externa de exclusão
- [x] Denúncia e bloqueio
- [x] Backend de exclusão completa preparado
- [x] Backend de push preparado
- [x] Regras de consentimento privadas no Firestore
- [x] CI nativo com TypeScript, Expo Doctor, prebuild e emulador de regras

## Firebase / Cloudinary / backend — exige credenciais da conta de produção
- [ ] Publicar `firestore.rules` e `storage.rules` V30 no projeto Firebase real
- [ ] Ativar Cloud Functions/Blaze se ainda não estiver ativo
- [ ] Definir secret `CLOUDINARY_API_KEY`
- [ ] Definir secret `CLOUDINARY_API_SECRET`
- [ ] Implantar `deleteAccount` e `sendActivityPush`
- [ ] Confirmar App Check em produção para Android
- [ ] Confirmar `google-services.json` de `br.com.cadastrodeatletas.app` no EAS environment production
- [ ] Testar exclusão ponta a ponta com conta descartável
- [ ] Testar push com app aberto, segundo plano e encerrado

## Build / EAS — exige autenticação Expo/EAS
- [ ] Executar `eas build --platform android --profile production`
- [ ] Confirmar que o resultado é `.aab`
- [ ] Instalar versão equivalente em teste interno/fechado
- [ ] Verificar permissões exibidas no Android
- [ ] Verificar crash na inicialização sem rede e com rede lenta
- [ ] Verificar App Bundle Explorer / compatibilidade nativa

## Play Console — exige acesso à conta de desenvolvedor
- [ ] Criar/selecionar app com package correto
- [ ] Preencher ficha da loja usando `PLAY_STORE_LISTING_PTBR.md`
- [ ] Inserir Política de Privacidade
- [ ] Inserir URL de exclusão de conta
- [ ] Preencher Segurança dos dados usando `PLAY_CONSOLE_DATA_SAFETY.md`
- [ ] Preencher questionário de classificação indicativa
- [ ] Declarar público-alvo real; produto atual não é direcionado a menores de 13 anos
- [ ] Declarar presença de UGC e interação entre usuários quando perguntado
- [ ] Declarar acesso ao app para revisão, incluindo conta de teste se a revisão exigir login
- [ ] Adicionar ícone, feature graphic e screenshots reais do build
- [ ] Configurar Play App Signing
- [ ] Enviar AAB para Teste interno ou Teste fechado
- [ ] Se a conta pessoal foi criada após 13/11/2023: manter 12 testadores por 14 dias consecutivos
- [ ] Responder feedback e corrigir falhas antes de solicitar produção
- [ ] Solicitar acesso à produção quando os critérios forem atendidos

## Release gate
Não liberar para Produção enquanto qualquer item de credencial/backend, exclusão de conta, regras Firebase ou política da Play estiver pendente.
