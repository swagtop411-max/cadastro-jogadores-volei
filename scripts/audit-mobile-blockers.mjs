import fs from "node:fs";

const strict = process.argv.includes("--strict");
const blockers = [];
const passes = [];

function read(path) {
  return fs.existsSync(path) ? fs.readFileSync(path, "utf8") : "";
}

function count(text, needle) {
  return text.split(needle).length - 1;
}

function expect(label, condition, detail = "") {
  if (condition) passes.push(label);
  else blockers.push({ label, detail });
}

const firestore = read("firestore.rules");
const storage = read("storage.rules");
const apoio = read("apoio.js");
const cloudinary = read("cloudinary-upload.js");
const commerce = read("admin-commerce-v11.js");

expect(
  "Firestore possui um único match /perfis/{uid}",
  count(firestore, "match /perfis/{uid} {") === 1,
  `encontrados: ${count(firestore, "match /perfis/{uid} {")}`,
);

expect(
  "Admin Firestore depende apenas de role/claim autoritativa",
  !/request\.auth\.token\.email\s*==/.test(firestore),
  "fallback de autorização por e-mail ainda presente",
);

expect(
  "Admin Storage depende apenas de role/claim autoritativa",
  !/request\.auth\.token\.email\s*==/.test(storage),
  "fallback de autorização por e-mail ainda presente",
);

expect(
  "Apoiadores não armazenam mídia base64 gerada no browser",
  !/toDataURL\s*\(/.test(apoio),
  "apoio.js ainda converte imagem para data URL/base64",
);

expect(
  "Upload Cloudinary usa assinatura/backend",
  !/form\.append\(["']upload_preset["']/.test(cloudinary),
  "frontend ainda envia upload_preset unsigned diretamente ao Cloudinary",
);

expect(
  "Entitlement não é ativado pelo navegador administrativo",
  !/pagamentoConfirmado\s*:\s*true/.test(commerce),
  "admin-commerce ainda grava estado financeiro final pelo cliente",
);

console.log(`MOBILE FOUNDATION: ${passes.length} controle(s) aprovado(s), ${blockers.length} bloqueador(es) aberto(s).`);
for (const pass of passes) console.log(`OK  ${pass}`);
for (const blocker of blockers) console.log(`P0  ${blocker.label}${blocker.detail ? ` — ${blocker.detail}` : ""}`);

if (strict && blockers.length) {
  console.error("\nAuditoria mobile strict falhou. Resolva os P0 antes de habilitar enforcement.");
  process.exit(1);
}
