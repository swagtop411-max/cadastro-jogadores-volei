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
- [ ] preparar App Check Play Integrity/App Attest;
- [ ] definir fluxo de exclusão de conta e dados;
- [ ] criar backend de push e ações privilegiadas.

## Próxima sequência de código

1. regras Firestore V15;
2. testes de regras;
3. módulo de roles/claims;
4. configuração React Native Firebase;
5. Auth real no app;
6. teste Web ↔ App com mesmo UID;
7. perfil e diretório paginado.
