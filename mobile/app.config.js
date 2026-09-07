import fs from "node:fs";

function restorePngFromBase64(sourceRelativePath, targetRelativePath) {
  const sourceUrl = new URL(sourceRelativePath, import.meta.url);
  const targetUrl = new URL(targetRelativePath, import.meta.url);

  if (!fs.existsSync(sourceUrl)) return;

  const encoded = fs.readFileSync(sourceUrl, "utf8").replace(/\s+/g, "");
  const bytes = Buffer.from(encoded, "base64");

  if (bytes.length < 8 || bytes.subarray(1, 4).toString("ascii") !== "PNG") {
    throw new Error(`Asset de branding inválido: ${sourceRelativePath}`);
  }

  fs.writeFileSync(targetUrl, bytes);
}

// GitHub/EAS chegou a receber versões PNG com CRC inválido. Mantemos uma fonte
// base64 textual íntegra e restauramos os dois assets antes de qualquer config
// plugin do Expo/Jimp tentar processá-los.
restorePngFromBase64(
  "./assets/branding/app-icon-foreground.b64",
  "./assets/branding/app-icon-foreground.png",
);
restorePngFromBase64(
  "./assets/branding/splash-logo.b64",
  "./assets/branding/splash-logo.png",
);

export default ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ??
      config.android?.googleServicesFile ??
      "./google-services.json",
  },
  ios: {
    ...config.ios,
    googleServicesFile:
      process.env.GOOGLE_SERVICE_INFO_PLIST ??
      config.ios?.googleServicesFile,
  },
});
