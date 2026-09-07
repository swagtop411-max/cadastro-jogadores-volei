# Assets de branding mobile

Os assets nativos usados pelo Expo devem ser arquivos íntegros e validados antes da build EAS.

- `app-icon.png`: ícone principal do aplicativo e imagem central da splash nativa.
- `app-splash.jpg`: referência visual/promocional mantida no projeto, não usada pelo prebuild Android.

O Adaptive Icon Android foi removido temporariamente porque o arquivo de foreground estava inválido e provocava falha de CRC durante `expo prebuild`. O Android passa a usar o ícone principal sem a camada adaptativa, evitando o recorte que aparecia no launcher e eliminando a dependência do PNG corrompido.

O workflow executa `npx expo prebuild --no-install --platform android` para detectar corrupção ou incompatibilidade dos assets antes de uma nova build EAS.
