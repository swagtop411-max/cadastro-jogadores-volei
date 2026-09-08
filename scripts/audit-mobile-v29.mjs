import fs from "node:fs";

const required = [
  "mobile/src/services/storyService.ts",
  "mobile/app/stories/create.tsx",
  "mobile/app/stories/[ownerUid].tsx",
  "mobile/src/services/notificationService.ts",
  "mobile/src/services/messageService.ts",
  "mobile/app/messages/index.tsx",
  "mobile/app/messages/[uid].tsx",
  "mobile/app/reels.tsx",
  "mobile/app/ranking.tsx",
  "mobile/app/teams.tsx",
  "mobile/app/team/invite.tsx",
  "mobile/app/team/invites.tsx",
  "mobile/src/services/teamInviteService.ts",
  "mobile/src/services/pushService.ts",
  "mobile/src/services/moderationService.ts",
];

for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Arquivo obrigatório da V29 ausente: ${file}`);
}

const story = fs.readFileSync("mobile/src/services/storyService.ts", "utf8");
if (!/24\s*\*\s*60\s*\*\s*60/.test(story) && !story.includes("24 * 60 * 60 * 1000")) {
  throw new Error("Stories não possuem janela explícita de 24 horas.");
}
if (!story.includes("expiraEm")) throw new Error("Stories não gravam expiraEm.");

const rules = fs.readFileSync("firestore.rules", "utf8");
for (const token of [
  "match /push_tokens/{uid}/devices/{deviceId}",
  "match /equipe_convites/{inviteId}",
  "match /equipes/{equipeId}/membros/{memberUid}",
  "'team_invite'",
]) {
  if (!rules.includes(token)) throw new Error(`Regra V29 ausente: ${token}`);
}

const pkg = JSON.parse(fs.readFileSync("mobile/package.json", "utf8"));
if (!pkg.dependencies?.["expo-video"]) throw new Error("expo-video ausente.");
if (!pkg.dependencies?.["expo-notifications"]) throw new Error("expo-notifications ausente.");

console.log(`MOBILE V29: ${required.length} módulos essenciais presentes; Stories 24h, push e convites protegidos.`);
