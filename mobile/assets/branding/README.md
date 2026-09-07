# Assets de branding mobile

Os PNGs usados pelo Expo precisam ser arquivos PNG válidos com CRC íntegro.

- `app-icon.png`: ícone base/legado.
- `app-icon-foreground.png`: foreground do Adaptive Icon Android, com margem segura.
- `splash-logo.png`: logo central da splash nativa.

O workflow executa `npx expo prebuild --no-install --platform android` para detectar corrupção ou incompatibilidade destes assets antes de uma nova build EAS.
