import fs from "node:fs";

const path = new URL("../firestore.rules", import.meta.url);
let source = fs.readFileSync(path, "utf8");
const marker = "MOBILE_V29_PUSH_AND_TEAM_INVITES";

if (source.includes(marker)) {
  console.log("Mobile V29 rules already applied.");
  process.exit(0);
}

const oldTypes = "request.resource.data.type in ['like','comment','follow','message','mention']";
const newTypes = "request.resource.data.type in ['like','comment','follow','message','mention','team_invite']";
if (!source.includes(oldTypes)) {
  throw new Error("Notification type guard was not found; refusing to patch firestore.rules.");
}
source = source.replace(oldTypes, newTypes);

const insertionPoint = source.lastIndexOf("\n  }\n}");
if (insertionPoint < 0) {
  throw new Error("Could not find Firestore rules closing block; refusing to patch.");
}

const block = `

    // ${marker}
    // Tokens são privados por usuário. O app apenas registra/atualiza o próprio dispositivo;
    // o envio de push continua responsabilidade de um backend confiável.
    match /push_tokens/{uid}/devices/{deviceId} {
      allow read, delete: if isAdmin() || isOwner(uid);
      allow create, update: if isOwner(uid)
        && request.resource.data.uid == uid
        && request.resource.data.expoPushToken is string
        && request.resource.data.expoPushToken.size() >= 20
        && request.resource.data.expoPushToken.size() <= 300
        && request.resource.data.platform in ['android','ios']
        && request.resource.data.channel is string
        && request.resource.data.channel.size() <= 40
        && request.resource.data.updatedAt is timestamp
        && request.resource.data.keys().hasOnly(['uid','expoPushToken','platform','channel','updatedAt']);
    }

    // Convites formais de equipe. Somente o responsável pela equipe cria; somente o atleta
    // convidado responde. Os campos estruturais não podem ser trocados durante a resposta.
    match /equipe_convites/{inviteId} {
      allow read: if isAdmin() || (
        signedIn() && (
          resource.data.convidadoPorUid == request.auth.uid ||
          resource.data.atletaUid == request.auth.uid
        )
      );
      allow create: if signedIn()
        && request.resource.data.convidadoPorUid == request.auth.uid
        && request.resource.data.atletaUid != request.auth.uid
        && !isBlocked(request.auth.uid, request.resource.data.atletaUid)
        && exists(/databases/$(database)/documents/equipes/$(request.resource.data.equipeId))
        && get(/databases/$(database)/documents/equipes/$(request.resource.data.equipeId)).data.ownerUid == request.auth.uid
        && exists(/databases/$(database)/documents/perfis/$(request.resource.data.atletaUid))
        && request.resource.data.equipeId is string
        && request.resource.data.equipeId.size() >= 1
        && request.resource.data.equipeNome is string
        && request.resource.data.equipeNome.size() >= 2
        && request.resource.data.equipeNome.size() <= 100
        && request.resource.data.atletaUid is string
        && request.resource.data.atletaUid.size() >= 1
        && request.resource.data.atletaNome is string
        && request.resource.data.atletaNome.size() >= 2
        && request.resource.data.atletaNome.size() <= 100
        && request.resource.data.status == 'pendente'
        && request.resource.data.criadoEm is timestamp
        && request.resource.data.keys().hasOnly([
          'equipeId','equipeNome','convidadoPorUid','atletaUid','atletaNome','status','criadoEm'
        ]);
      allow update: if isAdmin() || (
        signedIn()
        && resource.data.status == 'pendente'
        && request.resource.data.equipeId == resource.data.equipeId
        && request.resource.data.equipeNome == resource.data.equipeNome
        && request.resource.data.convidadoPorUid == resource.data.convidadoPorUid
        && request.resource.data.atletaUid == resource.data.atletaUid
        && request.resource.data.atletaNome == resource.data.atletaNome
        && request.resource.data.criadoEm == resource.data.criadoEm
        && request.resource.data.respondidoEm is timestamp
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status','respondidoEm'])
        && (
          (
            resource.data.atletaUid == request.auth.uid
            && request.resource.data.status in ['aceito','recusado']
          ) || (
            resource.data.convidadoPorUid == request.auth.uid
            && request.resource.data.status == 'cancelado'
          )
        )
      );
      allow delete: if isAdmin();
    }

    // Membros oficiais ficam separados da lista legada de nomes em equipes.atletas.
    // Ao aceitar um convite, o batch deve atualizar o convite e criar este documento junto.
    match /equipes/{equipeId}/membros/{memberUid} {
      allow read: if true;
      allow create: if signedIn()
        && request.resource.data.uid == memberUid
        && request.resource.data.equipeId == equipeId
        && request.resource.data.papel in ['capitao','atleta']
        && request.resource.data.nome is string
        && request.resource.data.nome.size() >= 2
        && request.resource.data.nome.size() <= 100
        && request.resource.data.fotoUrl is string
        && request.resource.data.fotoUrl.size() <= 2000
        && request.resource.data.conviteId is string
        && request.resource.data.conviteId.size() <= 200
        && request.resource.data.criadoEm is timestamp
        && request.resource.data.keys().hasOnly([
          'uid','equipeId','conviteId','papel','nome','fotoUrl','criadoEm'
        ])
        && exists(/databases/$(database)/documents/equipes/$(equipeId))
        && (
          get(/databases/$(database)/documents/equipes/$(equipeId)).data.ownerUid == request.auth.uid
          || (
            memberUid == request.auth.uid
            && request.resource.data.papel == 'atleta'
            && request.resource.data.conviteId.size() >= 1
            && existsAfter(/databases/$(database)/documents/equipe_convites/$(request.resource.data.conviteId))
            && getAfter(/databases/$(database)/documents/equipe_convites/$(request.resource.data.conviteId)).data.equipeId == equipeId
            && getAfter(/databases/$(database)/documents/equipe_convites/$(request.resource.data.conviteId)).data.atletaUid == memberUid
            && getAfter(/databases/$(database)/documents/equipe_convites/$(request.resource.data.conviteId)).data.status == 'aceito'
          )
        );
      allow update: if isAdmin() || (
        signedIn()
        && exists(/databases/$(database)/documents/equipes/$(equipeId))
        && get(/databases/$(database)/documents/equipes/$(equipeId)).data.ownerUid == request.auth.uid
        && request.resource.data.uid == resource.data.uid
        && request.resource.data.equipeId == resource.data.equipeId
        && request.resource.data.conviteId == resource.data.conviteId
        && request.resource.data.criadoEm == resource.data.criadoEm
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['papel','nome','fotoUrl'])
        && request.resource.data.papel in ['capitao','atleta']
        && request.resource.data.nome is string
        && request.resource.data.nome.size() >= 2
        && request.resource.data.nome.size() <= 100
        && request.resource.data.fotoUrl is string
        && request.resource.data.fotoUrl.size() <= 2000
      );
      allow delete: if isAdmin() || isOwner(memberUid) || (
        signedIn()
        && exists(/databases/$(database)/documents/equipes/$(equipeId))
        && get(/databases/$(database)/documents/equipes/$(equipeId)).data.ownerUid == request.auth.uid
      );
    }
`;

source = source.slice(0, insertionPoint) + block + source.slice(insertionPoint);
fs.writeFileSync(path, source, "utf8");
console.log("Applied Mobile V29 Firestore rules patch.");
