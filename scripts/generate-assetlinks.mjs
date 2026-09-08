import fs from "node:fs";
import path from "node:path";

const fingerprint = String(process.env.ANDROID_SHA256_CERT_FINGERPRINT || "").trim().toUpperCase();
const packageName = String(process.env.ANDROID_PACKAGE_NAME || "br.com.cadastrodeatletas.app").trim();

if (!/^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(fingerprint)) {
  console.error("Defina ANDROID_SHA256_CERT_FINGERPRINT com a impressão SHA-256 no formato AA:BB:... do certificado de assinatura do Google Play.");
  process.exit(1);
}

const payload = [{
  relation: ["delegate_permission/common.handle_all_urls"],
  target: {
    namespace: "android_app",
    package_name: packageName,
    sha256_cert_fingerprints: [fingerprint],
  },
}];

const destination = path.resolve(".well-known", "assetlinks.json");
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Gerado: ${destination}`);
