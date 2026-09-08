import fs from "node:fs";

const path = "firestore.rules";
const marker = "// MOBILE_V30_POLICY_CONSENT";
const source = fs.readFileSync(path, "utf8");
if (source.includes(marker)) {
  console.log("V30 policy consent rules already present.");
  process.exit(0);
}

const closing = "\n  }\n}\n";
const index = source.lastIndexOf(closing);
if (index < 0) throw new Error("Could not locate Firestore rules closing braces.");

const block = `

    ${marker}
    match /consentimentos/{uid} {
      allow read: if isAdmin() || isOwner(uid);
      allow create, update: if isOwner(uid)
        && request.resource.data.uid == uid
        && request.resource.data.termsVersion is string
        && request.resource.data.termsVersion.size() >= 8
        && request.resource.data.termsVersion.size() <= 40
        && request.resource.data.privacyVersion is string
        && request.resource.data.privacyVersion.size() >= 8
        && request.resource.data.privacyVersion.size() <= 40
        && request.resource.data.platform == 'app'
        && request.resource.data.acceptedAt is timestamp
        && request.resource.data.updatedAt is timestamp
        && request.resource.data.keys().hasOnly([
          'uid','termsVersion','privacyVersion','platform','acceptedAt','updatedAt'
        ]);
      allow delete: if isAdmin();
    }
`;

fs.writeFileSync(path, `${source.slice(0, index)}${block}${closing}`, "utf8");
console.log("V30 consent rules appended.");
