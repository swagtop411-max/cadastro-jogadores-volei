# Fase 0 — Status

Data: 04/09/2026

## Concluído nesta primeira execução

- [x] branch isolada `mobile-v1-foundation`;
- [x] PR draft sem deploy para produção;
- [x] domínio do sorteador separado e corrigido;
- [x] testes automáticos do sorteador;
- [x] contratos de dados V1 materializados em TypeScript;
- [x] decisão Expo SDK 57 + Development Builds + React Native Firebase;
- [x] workspace Expo Router iniciado;
- [x] cinco abas principais criadas;
- [x] rotas de autenticação criadas;
- [x] TypeScript estrito configurado;
- [x] CI de PR com testes de domínio e typecheck;
- [x] proteção para impedir deploy do Pages em PR;
- [x] React Native Firebase App/Auth/Firestore/App Check instalado;
- [x] Android registrado no Firebase com package `br.com.cadastrodeatletas.app`;
- [x] `google-services.json` validado sem commitá-lo no repositório;
- [x] EAS preparado para receber Firebase config como secret file;
- [x] login mobile conectado ao Firebase Auth;
- [x] cadastro mobile conectado ao Firebase Auth;
- [x] recuperação de senha conectada ao Firebase Auth;
- [x] logout e restauração de sessão implementados;
- [x] criação/reparo de `usuarios/{uid}` integrada;
- [x] criação/reparo de `perfis/{uid}` integrada;
- [x] Meu Perfil lendo o Firestore pelo mesmo UID do site;
- [x] App Check inicializado no código com debug/Play Integrity/App Attest fallback;
- [x] CI verde após integração Firebase nativa;
- [x] `mix-play-web` saneado em branch própria, removendo gate de senha client-side;
- [x] `Sorteio-de-times` com motor corrigido/testado em branch própria.

## Bloqueadores ainda abertos

### P0

- [ ] consolidar os dois blocos `match /perfis/{uid}` nas Firestore Rules;
- [ ] trocar autorização administrativa por custom claims/role autoritativa, removendo fallback por e-mail;
- [ ] remover a senha administrativa client-side da interface legada `Sorteio-de-times/index.html`;
- [ ] criar backend para upload Cloudinary assinado;
- [ ] tornar billing/entitlements server-owned.

### P1

- [ ] migrar imagens base64 de apoiadores para mídia externa;
- [ ] criar testes Firestore allow/deny por cenário;
- [ ] criar paginação/campos de busca mobile-friendly;
- [~] App Check mobile: código pronto; falta registrar debug token e configurar providers/enforcement no Firebase Console;
- [ ] registrar app iOS no Firebase e fornecer `GoogleService-Info.plist`;
- [ ] definir fluxo de exclusão de conta e dados;
- [ ] criar backend de push e ações privilegiadas.

## Próxima sequência de execução

1. confirmar Authentication > E-mail/Senha no Firebase Console;
2. conectar o projeto ao Expo/EAS;
3. cadastrar `GOOGLE_SERVICES_JSON` como file secret no EAS development;
4. gerar primeiro Development Build Android;
5. registrar App Check debug token do aparelho;
6. testar cadastro/login/recuperação/perfil/logout no celular;
7. confirmar Web ↔ App com mesmo UID;
8. consolidar Firestore Rules e adicionar testes allow/deny;
9. configurar iOS quando o Android estiver validado.
