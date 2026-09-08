# Firebase de produção — V30 Store Ready

Projeto canônico: `jogadores-de-volei`

## 1. Pré-requisitos
- Plano do projeto compatível com Cloud Functions/Secret Manager.
- App Android Firebase registrado como `br.com.cadastrodeatletas.app`.
- `google-services.json` correto disponível apenas como secret/file do EAS ou ambiente local seguro.
- Cloudinary API key e API secret da conta que contém as mídias do Banco de Atletas.

## 2. Secrets das Functions
Nunca colocar os valores no GitHub ou no aplicativo.

Na raiz do repositório, autenticado no Firebase CLI:

```bash
firebase use jogadores-de-volei
firebase functions:secrets:set CLOUDINARY_API_KEY
firebase functions:secrets:set CLOUDINARY_API_SECRET
```

O terminal solicitará o valor de cada secret de forma interativa.

## 3. Publicar regras e Functions
Depois de revisar o projeto ativo:

```bash
firebase deploy --project jogadores-de-volei --only firestore:rules,storage,functions
```

Functions esperadas:
- `deleteAccount` — callable autenticada, reautenticação recente, App Check e exclusão de dados/mídias.
- `sendActivityPush` — trigger de novas atividades e envio por Expo Push.

## 4. App Check / Play Integrity
O código de produção Android usa `playIntegrity`.

Antes de ativar enforcement:
1. gerar/obter o certificado de assinatura usado pelo build da Play;
2. obter o SHA-256 do certificado relevante;
3. cadastrar o SHA-256 no app Android do Firebase;
4. vincular/configurar Play Integrity para o app;
5. registrar o app Android em **Firebase Console → App Check** com Play Integrity;
6. publicar primeiro em track de teste da Play;
7. verificar em App Check que requisições válidas estão chegando;
8. somente depois ativar enforcement em Firestore/Storage/Functions conforme a estratégia de produção.

Não ativar enforcement às cegas antes do primeiro build reconhecido pela Play, para não bloquear testadores.

## 5. EAS Production
No ambiente EAS `production`, cadastrar `GOOGLE_SERVICES_JSON` como variável do tipo arquivo/secret apontando para o `google-services.json` do app Android correto.

Não commitar o arquivo. O `mobile/.gitignore` já bloqueia `google-services.json`.

## 6. Teste obrigatório de exclusão
Usar uma conta descartável criada exclusivamente para QA:
1. publicar foto, vídeo e Story;
2. curtir/comentar/seguir outra conta;
3. enviar Direct com texto e mídia;
4. entrar ou receber convite de equipe;
5. abrir **Perfil → Conta e Privacidade → Excluir conta e dados**;
6. informar senha e digitar `EXCLUIR`;
7. verificar que o Auth user não existe mais;
8. verificar remoção do perfil e conteúdo;
9. verificar remoção da mídia Cloudinary daquela conta;
10. confirmar que mensagens pertencentes ao outro participante não foram apagadas indevidamente e que a participação do usuário excluído foi anonimizada.

## 7. Teste obrigatório de push
Com duas contas de QA e aparelho real:
- seguir;
- curtir;
- comentar;
- mencionar;
- enviar Direct;
- enviar convite de equipe.

Testar recebimento:
- app aberto;
- app em segundo plano;
- app encerrado;
- toque na notificação abrindo a rota correspondente.

## Release gate
Não enviar para produção pública antes de regras/Functions estarem implantadas e os testes de exclusão e push terem sido executados no Firebase real.
