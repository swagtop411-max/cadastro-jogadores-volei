await import("./firebase-app-check-v11.js?v=20260909-46");

import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  deleteField,
  deleteDoc,
  Timestamp,
  limit
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { uploadCloudinary } from "./cloudinary-upload.js?v=20260909-46";

const cfg = {
  apiKey: "AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",
  authDomain: "jogadores-de-volei.firebaseapp.com",
  projectId: "jogadores-de-volei",
  storageBucket: "jogadores-de-volei.firebasestorage.app",
  messagingSenderId: "48728914064",
  appId: "1:48728914064:web:1dd7aeb705319886f74015"
};

const app = getApps().length ? getApp() : initializeApp(cfg);
const auth = getAuth(app);
const db = getFirestore(app);
const $ = id => document.getElementById(id);
let user = null;
let profile = null;

const status = (message, media = false) => {
  const el = $(media ? "mediaStatus" : "profileStatus");
  if (el) el.textContent = message;
};

function esc(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

function normalizeLocation(cidade, uf) {
  let city = String(cidade || "").trim().replace(/\s+/g, " ");
  let state = String(uf || "").trim().toUpperCase();
  const ufs = new Set([
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
    "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
    "RS", "RO", "RR", "SC", "SP", "SE", "TO"
  ]);

  let match = city.match(/^([A-Z]{2})\s*[-,]\s*(.+)$/i);
  if (match && ufs.has(match[1].toUpperCase())) {
    if (!state) state = match[1].toUpperCase();
    city = match[2].trim();
  } else {
    match = city.match(/^(.+?)\s*[-,]\s*([A-Z]{2})$/i);
    if (match && ufs.has(match[2].toUpperCase())) {
      if (!state) state = match[2].toUpperCase();
      city = match[1].trim();
    }
  }

  city = city.replace(/^([A-Z]{2})\s*[-,]\s*/i, "").trim();
  return { cidade: city, uf: state };
}

function validUf(value) {
  return [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
    "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
    "RS", "RO", "RR", "SC", "SP", "SE", "TO"
  ].includes(String(value || "").toUpperCase());
}

async function upload(file, folder) {
  if (!file) throw new Error("Selecione um arquivo.");

  const isVideo = String(file.type || "").startsWith("video/");
  const social = ["publicacoes", "videos", "stories"].includes(folder);
  let maxBytes = 10 * 1024 * 1024;

  if (folder === "capa") maxBytes = 8 * 1024 * 1024;
  if (folder === "publicacoes") maxBytes = 25 * 1024 * 1024;
  if (folder === "videos") maxBytes = 45 * 1024 * 1024;
  if (folder === "stories") maxBytes = isVideo ? 45 * 1024 * 1024 : 25 * 1024 * 1024;

  const up = await uploadCloudinary(file, {
    maxBytes,
    allowImage: folder !== "videos",
    allowVideo: folder === "videos" || folder === "stories",
    tags: social
      ? ["cadastro-de-atletas", "social", folder]
      : ["cadastro-de-atletas", "perfil", folder]
  });

  return {
    url: up.url,
    path: up.path || "",
    mime: up.mime || file.type || (isVideo ? "video/mp4" : "image/jpeg"),
    size: Number(up.size || file.size || 0)
  };
}

async function getSocialVisibility(uid) {
  try {
    const snap = await getDoc(doc(db, "config_perfis", uid));
    return snap.exists() && snap.data()?.privado === true ? "privado" : "publico";
  } catch {
    return "publico";
  }
}

function hashtags(body) {
  return [...new Set(
    (String(body || "").match(/#[\p{L}\p{N}_]+/gu) || [])
      .map(tag => tag.slice(1).toLowerCase())
  )].slice(0, 30);
}

function mentions(body) {
  return [...new Set(
    (String(body || "").match(/@[\p{L}\p{N}._-]+/gu) || [])
      .map(tag => tag.slice(1).toLowerCase())
  )].slice(0, 20);
}

function profileHandle(nome, uid) {
  const base = String(nome || "atleta")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28) || "atleta";
  return `${base}-${String(uid || "").slice(0, 6).toLowerCase()}`;
}

function pontosColocacao(value) {
  const text = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (/(^|\s)(1[ºo°]?|primeiro|campeao)/.test(text)) return 100;
  if (/(^|\s)(2[ºo°]?|segundo)/.test(text)) return 80;
  if (/(^|\s)(3[ºo°]?|terceiro)/.test(text)) return 65;
  if (/(^|\s)(4[ºo°]?|quarto)/.test(text)) return 55;
  if (/(^|\s)[5-8][ºo°]?/.test(text)) return 40;
  if (/(^|\s)(9|10|11|12|13|14|15|16)[ºo°]?/.test(text)) return 25;
  return 10;
}

function colocacoesOptions(selected = "") {
  const values = [
    "1º lugar", "2º lugar", "3º lugar", "4º lugar", "5º lugar",
    "6º lugar", "7º lugar", "8º lugar", "9º lugar", "10º lugar",
    "11º lugar", "12º lugar", "13º lugar", "14º lugar", "15º lugar",
    "16º lugar", "17º lugar", "18º lugar", "19º lugar", "20º lugar"
  ];
  return '<option value="">Selecione a colocação</option>' + values.map(value =>
    '<option value="' + value + '"' + (value === selected ? " selected" : "") + '>' + value + '</option>'
  ).join("");
}

function campeonatoRowHtml(item = {}) {
  const ano = String(item.ano || "");
  return '<div class="campeonato-row">' +
    '<input class="campeonato-nome" maxlength="120" placeholder="Nome do campeonato" value="' + esc(item.campeonato || "") + '">' +
    '<select class="campeonato-colocacao" aria-label="Colocação">' + colocacoesOptions(item.colocacao || "") + '</select>' +
    '<input class="campeonato-ano" type="number" min="1900" max="2100" placeholder="Ano" value="' + esc(ano) + '">' +
    '<div class="campeonato-pontos">' + pontosColocacao(item.colocacao) + ' PTS</div>' +
    '<button type="button" class="btn-remove-campeonato" aria-label="Remover campeonato">✕</button>' +
    '</div>';
}

function bindCampeonatoRow(row) {
  const select = row.querySelector(".campeonato-colocacao");
  const points = row.querySelector(".campeonato-pontos");
  const remove = row.querySelector(".btn-remove-campeonato");
  select.onchange = () => {
    points.textContent = pontosColocacao(select.value) + " PTS";
    updateHistoricoTotal();
  };
  remove.onclick = () => {
    row.remove();
    if (!$("campeonatosLista").children.length) {
      $("campeonatosLista").innerHTML = '<div class="campeonato-empty">Nenhum campeonato registrado ainda. Clique em <strong>ADICIONAR CAMPEONATO</strong> para começar.</div>';
    }
    updateHistoricoTotal();
  };
}

function updateHistoricoTotal() {
  const total = [...document.querySelectorAll("#campeonatosLista .campeonato-row")]
    .reduce((sum, row) => sum + pontosColocacao(row.querySelector(".campeonato-colocacao")?.value), 0);
  if ($("historicoPontosTotal")) $("historicoPontosTotal").textContent = total + " PTS";
}

function renderHistoricoCampeonatos() {
  const box = $("campeonatosLista");
  const totalBox = $("historicoPontosTotal");
  if (!box) return;
  const history = dedupeCampeonatos(profile?.historicoCampeonatos);
  box.innerHTML = history.length
    ? history.map(campeonatoRowHtml).join("")
    : '<div class="campeonato-empty">Nenhum campeonato registrado ainda. Clique em <strong>ADICIONAR CAMPEONATO</strong> para começar.</div>';
  if (totalBox) totalBox.textContent = history.reduce((sum, item) => sum + pontosColocacao(item.colocacao), 0) + " PTS";
  box.querySelectorAll(".campeonato-row").forEach(bindCampeonatoRow);
}

function addCampeonatoRow() {
  const box = $("campeonatosLista");
  if (!box) return;
  box.querySelector(".campeonato-empty")?.remove();
  const row = document.createElement("div");
  row.className = "campeonato-row";
  row.innerHTML = campeonatoRowHtml({});
  box.appendChild(row);
  bindCampeonatoRow(row);
  row.querySelector(".campeonato-nome")?.focus();
  updateHistoricoTotal();
}

function dedupeCampeonatos(history) {
  const seen = new Set();
  return (Array.isArray(history) ? history : []).filter(item => {
    const key = [item?.campeonato, item?.colocacao, item?.ano]
      .map(value => String(value ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " "))
      .join("|");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getHistoricoCampeonatosFromForm() {
  const rows = [...document.querySelectorAll("#campeonatosLista .campeonato-row")].map(row => ({
    campeonato: row.querySelector(".campeonato-nome")?.value.trim() || "",
    colocacao: row.querySelector(".campeonato-colocacao")?.value.trim() || "",
    ano: row.querySelector(".campeonato-ano")?.value.trim() || ""
  })).filter(item => item.campeonato || item.colocacao || item.ano);
  return dedupeCampeonatos(rows);
}

function fill() {
  const p = profile || {};
  const loc = normalizeLocation(p.cidade, p.uf);
  if ($("coverPreview")) $("coverPreview").style.backgroundImage = p.capaUrl ? `url("${p.capaUrl}")` : "";
  const publicLink = $("publicProfileLink");
  const myHeaderLink = $("myProfileHeaderLink");
  if (publicLink && user) publicLink.href = "perfil-social.html?uid=" + encodeURIComponent(user.uid);
  if (myHeaderLink && user) {
    const complete = Boolean(p.nome && p.cidade && p.uf);
    myHeaderLink.href = complete ? "perfil-social.html?uid=" + encodeURIComponent(user.uid) : "meu-perfil.html?editar=1";
  }
  $("name").value = p.nome || user.displayName || "";
  $("birth").value = p.nascimento || "";
  $("uf").value = loc.uf || "";
  $("city").value = loc.cidade || "";
  $("modalidade").value = p.modalidade || "";
  $("posicao").value = p.posicao || "";
  $("categoria").value = p.categoria || "Iniciante";
  $("time").value = p.time || "";
  $("contato").value = p.contato || "";
  $("bio").value = p.bio || "";
  renderHistoricoCampeonatos();
  const plan = p.planoId || "gratuito";
  document.querySelectorAll('input[name="profilePlano"]').forEach(input => {
    input.checked = input.value === plan;
    input.closest(".profile-plano")?.classList.toggle("selecionado", input.checked);
  });
  $("displayName").textContent = p.nome || user.displayName || "Seu perfil";
  $("profileSummary").textContent = [p.cidade, p.uf, p.modalidade, p.posicao].filter(Boolean).join(" • ") || "Complete seu perfil para aparecer na rede";
  if (p.fotoUrl) {
    $("avatar").src = p.fotoUrl;
  } else {
    $("avatar").src = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="#18221d"/><text x="150" y="180" text-anchor="middle" font-size="100">🏐</text></svg>');
  }
}

async function saveProfile() {
  const nome = $("name").value.trim();
  const rawCidade = $("city").value.trim();
  const selectedUf = $("uf").value;
  const loc = normalizeLocation(rawCidade, selectedUf);
  const cidade = loc.cidade;
  const uf = loc.uf;

  if (nome.length < 2 || cidade.length < 2 || !validUf(uf)) {
    status("Preencha nome, cidade e estado.");
    return;
  }

  const historicoCampeonatos = getHistoricoCampeonatosFromForm();
  if (historicoCampeonatos.some(item => !item.campeonato || !item.colocacao || !item.ano)) {
    status("Complete nome, colocação e ano de todos os campeonatos adicionados.");
    return;
  }

  try {
    $("saveProfile").disabled = true;
    status("Salvando seu perfil com segurança...");

    let fotoUrl = profile?.fotoUrl || "";
    let fotoPath = profile?.fotoPath || "";
    let capaUrl = profile?.capaUrl || "";
    let capaPath = profile?.capaPath || "";

    const cover = $("coverInput")?.files?.[0];
    if (cover) {
      const up = await upload(cover, "capa");
      capaUrl = up.url;
      capaPath = up.path;
      $("coverPreview").style.backgroundImage = `url("${capaUrl}")`;
    }

    const file = $("avatarInput")?.files?.[0];
    if (file) {
      const up = await upload(file, "perfil");
      fotoUrl = up.url;
      fotoPath = up.path;
      $("avatar").src = fotoUrl;
    }

    const nascimento = $("birth").value;
    const contato = $("contato").value.trim();
    const modalidade = $("modalidade").value.trim();
    const posicao = $("posicao").value.trim();
    const categoria = $("categoria").value;
    const time = $("time").value.trim();
    const bio = $("bio").value.trim();
    const handle = profileHandle(nome, user.uid);
    const instagramUrl = String(profile?.instagramUrl || "").slice(0, 300);

    const usuarioRef = doc(db, "usuarios", user.uid);
    const usuarioSnap = await getDoc(usuarioRef);
    const base = usuarioSnap.exists() ? usuarioSnap.data() : {};
    const usuarioPayload = {
      uid: user.uid,
      nome,
      email: user.email || base.email || "",
      papel: base.papel || "usuario",
      status: base.status || "ativo",
      atualizadoEm: serverTimestamp(),
      nascimento,
      cidade,
      uf,
      modalidade,
      posicao,
      categoria,
      time,
      contato,
      bio,
      historicoCampeonatos,
      fotoUrl,
      fotoPath,
      capaUrl,
      capaPath,
      instagramUrl
    };
    if (!usuarioSnap.exists()) usuarioPayload.criadoEm = serverTimestamp();
    await setDoc(usuarioRef, usuarioPayload, { merge: true });

    const antigoHandle = String(profile?.handle || "");
    const perfilPublico = {
      uid: user.uid,
      nome,
      cidade,
      uf,
      modalidade,
      posicao,
      categoria,
      time,
      bio,
      fotoUrl,
      fotoPath,
      capaUrl,
      capaPath,
      historicoCampeonatos,
      handle,
      instagramUrl,
      completo: true
    };

    const perfilRef = doc(db, "perfis", user.uid);
    const perfilSnap = await getDoc(perfilRef);
    if (perfilSnap.exists()) {
      await setDoc(perfilRef, {
        ...perfilPublico,
        plano: deleteField(),
        planoId: deleteField(),
        valorPlano: deleteField(),
        planoStatus: deleteField(),
        pagamentoConfirmado: deleteField(),
        status: deleteField(),
        nascimento: deleteField(),
        contato: deleteField(),
        email: deleteField()
      }, { merge: true });
    } else {
      await setDoc(perfilRef, perfilPublico);
    }

    await setDoc(doc(db, "handles", handle), {
      uid: user.uid,
      handle,
      atualizadoEm: Timestamp.now()
    }, { merge: true });

    if (antigoHandle && antigoHandle !== handle) {
      try {
        const old = await getDoc(doc(db, "handles", antigoHandle));
        if (old.exists() && old.data()?.uid === user.uid) await deleteDoc(old.ref);
      } catch {}
    }

    const legadoOwned = await getDocs(query(collection(db, "atletas"), where("ownerUid", "==", user.uid)));
    if (!legadoOwned.empty) {
      await setDoc(legadoOwned.docs[0].ref, {
        ownerUid: user.uid,
        nome,
        cidade,
        uf,
        modalidade,
        posicao,
        categoria,
        time,
        historicoCampeonatos,
        atualizadoEm: serverTimestamp()
      }, { merge: true });
    }

    const planInput = document.querySelector('input[name="profilePlano"]:checked');
    const planId = planInput?.value || "gratuito";
    const planMap = {
      gratuito: ["Gratuito", 0],
      bronze: ["Bronze", 9.9],
      prata: ["Prata", 19.9],
      ouro: ["Ouro", 34.9],
      premium: ["Premium", 49.9]
    };
    const [planName, planValue] = planMap[planId] || planMap.gratuito;
    const currentPlan = String(base.planoId || "gratuito");

    if (planId !== currentPlan) {
      const now = Timestamp.now();
      await setDoc(doc(db, "solicitacoes_planos", user.uid), {
        uid: user.uid,
        plano: planName,
        planoId: planId,
        valor: planValue,
        status: "pendente",
        criadoEm: now,
        atualizadoEm: now
      });
      status(`Perfil salvo. A alteração para o plano ${planName} ficou aguardando confirmação administrativa.`);
    } else {
      status("Perfil salvo com segurança. Seu histórico também foi atualizado no ranking.");
    }

    profile = { ...(profile || {}), ...perfilPublico, nascimento, contato };
    renderHistoricoCampeonatos();
    $("displayName").textContent = nome;
  } catch (error) {
    console.error(error);
    status("Não foi possível salvar. Verifique sua conexão e tente novamente.");
  } finally {
    $("saveProfile").disabled = false;
  }
}

async function loadClaimableProfiles() {
  const box = $("claimProfileCard");
  const list = $("claimProfileList");
  const st = $("claimProfileStatus");
  if (!box || !list || !user) return;

  try {
    const [claimsSnap, athletesSnap] = await Promise.all([
      getDocs(query(collection(db, "reivindicacoes_perfis"), where("solicitanteUid", "==", user.uid))),
      getDocs(query(collection(db, "atletas"), limit(300)))
    ]);

    const claims = claimsSnap.docs.map(item => ({ id: item.id, ...item.data() }));
    const approvedIds = new Set(
      claims
        .filter(item => String(item.status || "").toLowerCase() === "aprovada" && item.perfilId)
        .map(item => String(item.perfilId))
    );
    const pendingByMe = new Set(
      claims
        .filter(item => String(item.status || "").toLowerCase() === "pendente" && String(item.solicitanteUid || "") === String(user.uid))
        .map(item => String(item.perfilId || ""))
    );
    const hasApprovedMine = claims.some(item =>
      String(item.status || "").toLowerCase() === "aprovada" &&
      String(item.solicitanteUid || "") === String(user.uid)
    );
    const ownedSnap = await getDocs(query(collection(db, "atletas"), where("ownerUid", "==", user.uid)));
    const alreadyLinked = Boolean(profile?.legadoAtletaId) || hasApprovedMine || !ownedSnap.empty;

    if (alreadyLinked) {
      box.hidden = true;
      list.innerHTML = "";
      return;
    }

    const available = athletesSnap.docs
      .map(item => ({ id: item.id, ...item.data() }))
      .filter(item => {
        const id = String(item.id || "");
        return id &&
          String(item.ownerUid || "") !== String(user.uid) &&
          !approvedIds.has(id) &&
          !pendingByMe.has(id);
      })
      .sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));

    if (!available.length) {
      box.hidden = true;
      list.innerHTML = "";
      return;
    }

    box.hidden = false;
    list.className = "claim-list";
    list.innerHTML = available.slice(0, 100).map(item =>
      '<div class="claim-choice"><div><strong>' + esc(item.nome || "Atleta") +
      '</strong><small>' + esc([item.cidade, item.uf, item.categoria].filter(Boolean).join(" · ")) +
      '</small><small>UID do perfil: ' + esc(item.id) +
      (String(item.ownerUid || "").trim() ? '</small><small>Vínculo anterior detectado: a transferência dependerá da revisão do administrador.' : '') +
      '</small></div><button type="button" data-claim-profile="' + esc(item.id) + '">REIVINDICAR</button></div>'
    ).join("");

    list.querySelectorAll("[data-claim-profile]").forEach(button => {
      button.onclick = () => claimProfile(
        button.dataset.claimProfile,
        available.find(item => item.id === button.dataset.claimProfile)
      );
    });
  } catch (error) {
    console.error("Falha ao carregar perfis reivindicáveis:", error);
    box.hidden = true;
    if (st) st.textContent = "";
  }
}

async function claimProfile(perfilId, selectedProfile) {
  const st = $("claimProfileStatus");
  if (!selectedProfile || !user) return;
  const button = document.querySelector('[data-claim-profile="' + CSS.escape(perfilId) + '"]');
  if (button) button.disabled = true;

  try {
    const claimRef = doc(db, "reivindicacoes_perfis", perfilId + "_" + user.uid);
    const existing = await getDoc(claimRef);
    if (existing.exists()) {
      const old = existing.data() || {};
      if (String(old.status || "").toLowerCase() === "aprovada") {
        if (st) st.textContent = "Este perfil já está reivindicado e vinculado à sua conta.";
        if (button) button.remove();
        return;
      }
      if (String(old.status || "").toLowerCase() === "pendente") {
        if (st) st.textContent = "Este perfil já possui uma solicitação aguardando análise.";
        if (button) {
          button.textContent = "SOLICITAÇÃO ENVIADA";
          button.disabled = true;
        }
        return;
      }
    }

    await setDoc(claimRef, {
      perfilId,
      perfilNome: selectedProfile.nome || "Atleta",
      solicitanteUid: user.uid,
      solicitanteEmail: user.email || "",
      solicitanteNome: profile?.nome || user.displayName || "",
      status: "pendente",
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp()
    }, { merge: true });

    if (st) st.textContent = "Solicitação enviada para análise do administrador.";
    if (button) {
      button.textContent = "SOLICITAÇÃO ENVIADA";
      button.disabled = true;
    }
  } catch (error) {
    console.error(error);
    if (st) st.textContent = "Não foi possível reivindicar este perfil agora.";
    if (button) button.disabled = false;
  }
}

document.querySelectorAll('input[name="profilePlano"]').forEach(input => {
  input.addEventListener("change", () => {
    document.querySelectorAll(".profile-plano").forEach(label =>
      label.classList.toggle("selecionado", label.querySelector("input")?.checked)
    );
    if ($("profilePlanStatus")) {
      $("profilePlanStatus").textContent = input.value === "gratuito"
        ? "Plano gratuito ativo."
        : "Plano selecionado. O pagamento ficará aguardando confirmação administrativa.";
    }
  });
});

async function publishPhoto(file) {
  if (!file) return;
  if (!user || !profile?.nome) {
    status("Complete e salve seu perfil antes de publicar.", true);
    return;
  }

  status("Enviando foto em alta qualidade...", true);
  const up = await upload(file, "publicacoes");
  const legenda = String($("captionInput")?.value || "").trim().slice(0, 2200);
  const visibilidade = await getSocialVisibility(user.uid);

  await addDoc(collection(db, "publicacoes"), {
    ownerUid: user.uid,
    ownerEmail: user.email || "",
    nome: profile.nome,
    texto: legenda,
    imagem: up.url,
    imagemUrl: up.url,
    imagemPath: up.path,
    imagemMime: up.mime,
    imagemTamanho: up.size,
    legenda,
    tipo: "imagem",
    midias: [],
    hashtags: hashtags(legenda),
    mencoes: mentions(legenda),
    armazenamento: "cloudinary",
    visibilidade,
    aprovado: true,
    status: "publicado",
    criadoEm: Timestamp.now()
  });

  status("Foto publicada com sucesso!", true);
  if ($("captionInput")) $("captionInput").value = "";
}

async function publishVideo(file) {
  if (!file) return;
  if (!user || !profile?.nome) {
    status("Complete e salve seu perfil antes de publicar.", true);
    return;
  }

  status("Enviando vídeo em alta qualidade...", true);
  const up = await upload(file, "videos");
  const legenda = String($("captionInput")?.value || "").trim().slice(0, 2200);
  const visibilidade = await getSocialVisibility(user.uid);

  await addDoc(collection(db, "videos"), {
    ownerUid: user.uid,
    nome: profile.nome,
    videoUrl: up.url,
    videoPath: up.path,
    videoMime: up.mime,
    videoTamanho: up.size,
    legenda,
    hashtags: hashtags(legenda),
    mencoes: mentions(legenda),
    visibilidade,
    aprovado: true,
    status: "publicado",
    criadoEm: Timestamp.now()
  });

  status("Vídeo publicado com sucesso!", true);
  if ($("captionInput")) $("captionInput").value = "";
}

async function publishStory(file) {
  if (!file) return;
  if (!user || !profile?.nome) {
    status("Complete e salve seu perfil antes de publicar.", true);
    return;
  }

  status("Enviando story...", true);
  const up = await upload(file, "stories");
  const legenda = String($("captionInput")?.value || "").trim().slice(0, 2200);
  const visibilidade = await getSocialVisibility(user.uid);
  const type = String(up.mime || "").startsWith("video/") ? "video" : "image";
  const created = Timestamp.now();
  const expires = Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000));

  await addDoc(collection(db, "stories"), {
    ownerUid: user.uid,
    nome: profile.nome,
    mediaUrl: up.url,
    mediaPath: up.path,
    mediaType: type,
    legenda,
    tipo: type,
    visibilidade,
    criadoEm: created,
    expiraEm: expires,
    aprovado: true,
    status: "publicado"
  });

  status("Story publicado com sucesso!", true);
  if ($("captionInput")) $("captionInput").value = "";
}

function mediaFailure(error, fallback) {
  console.error(error);
  const code = String(error?.code || error?.message || "").toLowerCase();
  if (code.includes("permission-denied") || code.includes("insufficient permissions")) {
    return "Sua sessão foi reconhecida, mas a publicação foi recusada pelas regras. Atualize a página e entre novamente na conta.";
  }
  if (code.includes("size") || code.includes("too large")) {
    return "O arquivo ultrapassa o limite permitido.";
  }
  return fallback;
}

async function loadMedia() {
  if (!user) return;
  try {
    const [photosSnap, videosSnap, storiesSnap] = await Promise.all([
      getDocs(query(collection(db, "publicacoes"), where("ownerUid", "==", user.uid))),
      getDocs(query(collection(db, "videos"), where("ownerUid", "==", user.uid))),
      getDocs(query(collection(db, "stories"), where("ownerUid", "==", user.uid)))
    ]);

    const createdMs = data => data?.criadoEm?.toMillis?.() || 0;
    const items = [
      ...photosSnap.docs.map(item => ({
        t: "img",
        url: item.data().imagemUrl || item.data().imagem,
        created: createdMs(item.data())
      })),
      ...videosSnap.docs.map(item => ({
        t: "video",
        url: item.data().videoUrl,
        created: createdMs(item.data())
      }))
    ].filter(item => item.url).sort((a, b) => b.created - a.created);

    $("gallery").innerHTML = items.length
      ? items.map(item => item.t === "img"
        ? `<img src="${esc(item.url)}" loading="lazy" alt="Publicação do atleta">`
        : `<video src="${esc(item.url)}" controls preload="metadata"></video>`
      ).join("")
      : '<span class="empty">Suas publicações aparecerão aqui.</span>';

    const now = new Date();
    const stories = storiesSnap.docs
      .map(item => item.data())
      .filter(data => (data.expiraEm?.toDate?.() || new Date(0)) > now)
      .sort((a, b) => createdMs(b) - createdMs(a));

    $("stories").innerHTML = stories.length
      ? stories.map(data => {
        const url = esc(data.mediaUrl || "");
        const type = data.mediaType || data.tipo;
        return type === "video"
          ? `<video src="${url}" controls preload="metadata"></video>`
          : `<img src="${url}" loading="lazy" alt="Story do atleta">`;
      }).join("")
      : '<span class="empty">Seus stories ativos aparecerão aqui.</span>';
  } catch (error) {
    console.warn("media", error);
    if ($("gallery")) $("gallery").innerHTML = '<span class="empty">Publique seu primeiro conteúdo para começar.</span>';
  }
}

$("saveProfile").onclick = saveProfile;
$("btnAddCampeonato")?.addEventListener("click", addCampeonatoRow);
$("coverInput")?.addEventListener("change", () => {
  const file = $("coverInput").files[0];
  if (file) $("coverPreview").style.backgroundImage = `url("${URL.createObjectURL(file)}")`;
});
$("avatarInput").onchange = () => {
  const file = $("avatarInput").files[0];
  if (file) $("avatar").src = URL.createObjectURL(file);
};
$("photoInput").onchange = async () => {
  try {
    await publishPhoto($("photoInput").files[0]);
    $("photoInput").value = "";
    await loadMedia();
  } catch (error) {
    status(mediaFailure(error, "Não foi possível publicar a foto agora."), true);
  }
};
$("videoInput").onchange = async () => {
  try {
    await publishVideo($("videoInput").files[0]);
    $("videoInput").value = "";
    await loadMedia();
  } catch (error) {
    status(mediaFailure(error, "Não foi possível publicar o vídeo agora."), true);
  }
};
$("storyInput").onchange = async () => {
  try {
    await publishStory($("storyInput").files[0]);
    $("storyInput").value = "";
    await loadMedia();
  } catch (error) {
    status(mediaFailure(error, "Não foi possível publicar o story agora."), true);
  }
};

onAuthStateChanged(auth, async currentUser => {
  if (!currentUser) {
    location.href = "conta.html?tab=login&return=/meu-perfil.html";
    return;
  }

  user = currentUser;
  try {
    const [profileSnap, userSnap] = await Promise.all([
      getDoc(doc(db, "perfis", currentUser.uid)),
      getDoc(doc(db, "usuarios", currentUser.uid))
    ]);

    profile = profileSnap.exists() ? profileSnap.data() : null;
    const privateData = userSnap.exists() ? userSnap.data() : {};
    if (profile) {
      profile = {
        ...profile,
        nascimento: profile.nascimento || privateData.nascimento || "",
        contato: profile.contato || privateData.contato || "",
        email: profile.email || privateData.email || currentUser.email || ""
      };
    }

    const legacySnap = await getDocs(query(collection(db, "atletas"), where("ownerUid", "==", currentUser.uid)));
    if (!legacySnap.empty) {
      const legacy = { id: legacySnap.docs[0].id, ...legacySnap.docs[0].data() };
      const legacyLocFinal = normalizeLocation(profile?.cidade || legacy.cidade, profile?.uf || legacy.uf);
      const categoria = profile?.categoria || legacy.categoria || "Iniciante";
      const nome = profile?.nome || legacy.nome || "";
      const complete = Boolean(nome && legacyLocFinal.cidade && validUf(legacyLocFinal.uf) && ["Iniciante", "Intermediário", "Avançado"].includes(categoria));
      const safePublicProfile = {
        uid: currentUser.uid,
        nome,
        cidade: legacyLocFinal.cidade || "",
        uf: legacyLocFinal.uf || "",
        modalidade: profile?.modalidade || legacy.modalidade || "",
        posicao: profile?.posicao || legacy.posicao || "",
        categoria,
        time: profile?.time || legacy.time || "",
        bio: profile?.bio || legacy.observacoes || "",
        fotoUrl: profile?.fotoUrl || legacy.foto || "",
        fotoPath: profile?.fotoPath || "",
        capaUrl: profile?.capaUrl || "",
        capaPath: profile?.capaPath || "",
        historicoCampeonatos: Array.isArray(profile?.historicoCampeonatos)
          ? profile.historicoCampeonatos
          : (Array.isArray(legacy.historicoCampeonatos) ? legacy.historicoCampeonatos : []),
        handle: profile?.handle || profileHandle(nome, currentUser.uid),
        instagramUrl: profile?.instagramUrl || legacy.instagramUrl || "",
        completo: complete
      };

      const profileRef = doc(db, "perfis", currentUser.uid);
      if (profileSnap.exists()) {
        await setDoc(profileRef, {
          ...safePublicProfile,
          plano: deleteField(),
          planoId: deleteField(),
          valorPlano: deleteField(),
          planoStatus: deleteField(),
          pagamentoConfirmado: deleteField(),
          status: deleteField(),
          nascimento: deleteField(),
          contato: deleteField(),
          email: deleteField()
        }, { merge: true });
      } else {
        await setDoc(profileRef, safePublicProfile);
      }

      const updated = await getDoc(profileRef);
      profile = updated.exists()
        ? {
            ...updated.data(),
            nascimento: privateData.nascimento || legacy.nascimento || "",
            contato: privateData.contato || legacy.contato || "",
            email: privateData.email || currentUser.email || legacy.ownerEmail || ""
          }
        : {
            ...safePublicProfile,
            nascimento: privateData.nascimento || legacy.nascimento || "",
            contato: privateData.contato || legacy.contato || "",
            email: privateData.email || currentUser.email || legacy.ownerEmail || ""
          };
    }

    if (!profile) {
      profile = {
        uid: currentUser.uid,
        nome: currentUser.displayName || "",
        nascimento: privateData.nascimento || "",
        cidade: privateData.cidade || "",
        uf: privateData.uf || "",
        modalidade: privateData.modalidade || "",
        posicao: privateData.posicao || "",
        categoria: privateData.categoria || "Iniciante",
        time: privateData.time || "",
        contato: privateData.contato || "",
        bio: privateData.bio || "",
        historicoCampeonatos: Array.isArray(privateData.historicoCampeonatos) ? privateData.historicoCampeonatos : [],
        fotoUrl: privateData.fotoUrl || "",
        fotoPath: privateData.fotoPath || "",
        capaUrl: privateData.capaUrl || "",
        capaPath: privateData.capaPath || "",
        instagramUrl: privateData.instagramUrl || ""
      };
    }

    fill();
    await loadClaimableProfiles();
    await loadMedia();

    const params = new URLSearchParams(location.search);
    const complete = Boolean(profile?.nome && profile?.cidade && validUf(profile?.uf));
    if (complete && !params.has("editar")) {
      location.replace("perfil-social.html?uid=" + encodeURIComponent(user.uid));
    }
  } catch (error) {
    console.error("Falha ao carregar/sincronizar perfil:", error);
    fill();
    await loadClaimableProfiles();
    await loadMedia();
  }
});
