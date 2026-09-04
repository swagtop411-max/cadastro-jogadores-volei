# Recuperação V12 — 04/09/2026

Correções aplicadas após regressões observadas em produção:

- ADM pode criar e atualizar handles durante a higienização.
- ADM pode ler publicações, Stories e vídeos pendentes para moderação.
- Higienização separa visibilidade/dados sensíveis dos handles e repara visibilidade automaticamente.
- Feed legado volta após reparo de `visibilidade`.
- Lista de atletas tolera falha em uma das fontes (`atletas` ou `perfis`) e limita carga automática.
- Monetização tolera falhas parciais e lê valores/status financeiros das subcoleções privadas.
- Meu Perfil consulta apenas reivindicações do próprio usuário.
- App Check é carregado explicitamente antes dos principais módulos Firebase.
- Query strings JS e cache foram unificados na versão 20260904-2.

## Nova conta sem perfil

Criar uma conta em Authentication/`usuarios` não publica um atleta incompleto. A pessoa precisa concluir `meu-perfil.html`; ao salvar, `/perfis/{uid}` é criado e passa a aparecer automaticamente na lista pública, sem aprovação administrativa.

## Etapa externa

Depois do CI verde, publicar o `firestore.rules` atualizado no Firebase Console. App Check deve permanecer apenas em monitoramento até a taxa de requisições verificadas estabilizar.
