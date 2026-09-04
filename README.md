# Banco de Dados de Atletas

Rede esportiva de vôlei para atletas, equipes, campeonatos, conteúdo social, oportunidades e organizadores.

## Produção Web

Domínio: `cadastrodeatletas.com.br`

Repositório canônico: este repositório.

Arquitetura atual:

- GitHub Pages para frontend Web.
- Firebase Authentication.
- Cloud Firestore.
- Firebase App Check Web com reCAPTCHA Enterprise.
- Cloudinary para mídia principal.
- GitHub Actions para auditoria, compilação de regras e deploy.

## Estado atual

A base Web está em V13 de identidade/perfis. Contas novas podem possuir perfil social básico `completo:false` e completar o perfil esportivo posteriormente sem trocar de UID.

O App Check ainda deve permanecer em monitoramento até o tráfego legítimo verificado estabilizar antes de Enforcement.

## Continuidade Mobile

O app deve ser uma nova camada cliente do mesmo produto e do mesmo backend, não um banco separado.

Direção técnica de retomada:

- React Native.
- Expo.
- TypeScript.
- Expo Router.
- Firebase Auth + Firestore.
- App Check Android/iOS.
- Cloudinary com upload assinado antes de produção pública.

Documentos de handoff:

- [`AUDITORIA_WEB_PARA_APP_V14_2026-09-04.md`](./AUDITORIA_WEB_PARA_APP_V14_2026-09-04.md)
- [`APP_MOBILE_HANDOFF_V1_2026-09-04.md`](./APP_MOBILE_HANDOFF_V1_2026-09-04.md)
- [`MOBILE_DATA_CONTRACT_V1.md`](./MOBILE_DATA_CONTRACT_V1.md)

## Repositórios auxiliares

### `swagtop411-max/Sorteio-de-times`

Protótipo de organizador/sorteio. O algoritmo puro de `js/sorteio.js` é candidato a módulo compartilhado do futuro app. A autenticação e o Firebase separados desse protótipo não devem ser levados para produção mobile.

### `swagtop411-max/mix-play-web`

Protótipo legado de partidas/quadras. Deve ser tratado como referência de fluxo, não como backend ou camada de segurança do app.

## Regra de arquitetura

A fonte canônica para identidade moderna é:

- `usuarios/{uid}` para conta/privado.
- `perfis/{uid}` para identidade pública.

A coleção `atletas/{id}` permanece como legado/compatibilidade e deve ser aposentada progressivamente.

## CI

O workflow `.github/workflows/static.yml` valida JavaScript, executa auditorias, valida JSON, verifica regras críticas e compila Firestore/Storage no Firebase Emulator antes do deploy no GitHub Pages.
