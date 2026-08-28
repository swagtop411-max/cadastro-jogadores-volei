import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { collection, doc, getDocs, getFirestore, updateDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getDownloadURL, getStorage, ref, uploadBytes } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBMsuR0320Nz3asVRJ5axXFV5KJ5Ftz9COQ",
  authDomain: "jogadores-de-volei.firebaseapp.com",
  projectId: "jogadores-de-volei",
  storageBucket: "jogadores-de-volei.firebasestorage.app",
  messagingSenderId: "48728914064",
  appId: "1:48728914064:web:1dd7aeb705319886f74015",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const $ = (id) => document.getElementById(id);
const state = { total: 0, migrated: 0, skipped: 0, running: false };
const collections = [
  { name: "atletas", field: "foto" },
  { name: "equipes", field: "logo" },
  { name: "atletas_pendentes", field: "foto" },
  { name: "equipes_pendentes", field: "logo" },
];

function render() {
  $("total").textContent = state.total;
  $("migrated").textContent = state.migrated;
  $("skipped").textContent = state.skipped;
}

function isDataImage(value) {
  return typeof value === "string" && /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(value);
}

async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl);
  return response.blob();
}

async function migrateDocument(collectionName, imageField, snapshot) {
  for (const record of snapshot.docs) {
    state.total += 1;
    const data = record.data();
    const legacyImage = data[imageField];
    if (!isDataImage(legacyImage)) {
      state.skipped += 1;
      render();
      continue;
    }
    const uid = data.ownerUid || "legado";
    const path = `usuarios/${uid}/${collectionName}/${record.id}-${imageField}.jpg`;
    const imageRef = ref(storage, path);
    const blob = await dataUrlToBlob(legacyImage);
    await uploadBytes(imageRef, blob, { contentType: "image/jpeg", cacheControl: "public,max-age=31536000" });
    const url = await getDownloadURL(imageRef);
    await updateDoc(doc(db, collectionName, record.id), { [imageField]: url, imagemMigradaEm: new Date().toISOString(), imagemLegada: true });
    state.migrated += 1;
    render();
    $("status").textContent = `Migrando ${collectionName}/${record.id}…\n${state.migrated} imagem(ns) convertida(s).`;
  }
}

async function startMigration() {
  if (state.running) return;
  state.running = true;
  $("start").disabled = true;
  $("status").className = "status";
  $("status").textContent = "Lendo coleções…";
  try {
    for (const item of collections) {
      const snapshot = await getDocs(collection(db, item.name));
      await migrateDocument(item.name, item.field, snapshot);
    }
    $("status").className = "status success";
    $("status").textContent = `Migração concluída. ${state.migrated} imagem(ns) foram enviadas ao Storage; ${state.skipped} registro(s) já estavam sem base64.`;
  } catch (error) {
    console.error(error);
    $("status").className = "status danger";
    $("status").textContent = `A migração foi interrompida: ${error.message || "erro desconhecido"}. Os itens já concluídos permanecem atualizados; execute novamente para continuar.`;
  } finally {
    state.running = false;
    $("start").disabled = false;
  }
}

onAuthStateChanged(auth, (user) => {
  const isAdmin = user?.email === "swagtop411@gmail.com";
  $("start").disabled = !isAdmin;
  $("status").className = isAdmin ? "status" : "status danger";
  $("status").textContent = isAdmin ? "Acesso administrativo confirmado. A operação é idempotente." : "Entre com a conta administrativa para usar esta ferramenta.";
});

$("start").addEventListener("click", startMigration);
render();
