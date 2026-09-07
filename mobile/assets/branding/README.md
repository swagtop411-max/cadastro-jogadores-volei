# Assets de branding mobile

Os assets nativos usados pelo Expo devem ser arquivos íntegros e validados antes da build EAS.

- `app-icon.png`: ícone principal do aplicativo e imagem central da splash nativa.
- `app-icon-foreground.png`: foreground do Adaptive Icon Android, com margem segura para evitar cortes no launcher.
- `app-splash.jpg`: referência visual/promocional mantida no projeto, não usada pelo prebuild Android.

Não existe mais restauração automática de PNG por Base64 no `app.config.js`. Os arquivos finais são versionados diretamente para impedir que um fallback antigo sobrescreva um asset válido durante o prebuild.

O workflow executa `npx expo prebuild --no-install --platform android` para detectar corrupção ou incompatibilidade dos assets antes de uma nova build EAS.
