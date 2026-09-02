import "./site-v5.js?v=20260901-5";
import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { collection, getDocs, getFirestore, limit, query } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const cfg = {
  apiKey: "AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",
  authDomain: "jogadores-de-volei.firebaseapp.com",
  projectId: "jogadores-de-volei",
  storageBucket: "jogadores-de-volei.firebasestorage.app",
  messagingSenderId: "48728914064",
  appId: "1:48728914064:web:1dd7aeb705319886f74015"
};
const app = getApps().length ? getApp() : initializeApp(cfg);
const db = getFirestore(app);
const $ = id => document.getElementById(id);
const esc = value => {
  const el = document.createElement("div");
  el.textContent = value == null ? "" : String(value);
  return el.innerHTML;
};
const norm = value => String(value ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");

function historyKey(item) {
  if (typeof item === "string") return `texto:${norm(item)}`;
  if (!item || typeof item !== "object") return "";
  return [item.campeonato || item.nome || item.evento, item.colocacao || item.resultado, item.ano || item.data].map(norm).join("|");
}
function dedupeHistory(history) {
  const seen = new Set();
  return (Array.isArray(history) ? history : []).filter(item => {
    const key = historyKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function points(value) {
  const s = norm(value);
  if (/^(1|1º|1o|1°|primeiro|campeao|campeão)(\s|$)/.test(s)) return 100;
  if (/^(2|2º|2o|2°|segundo)(\s|$)/.test(s)) return 80;
  if (/^(3|3º|3o|3°|terceiro)(\s|$)/.test(s)) return 65;
  if (/^(4|4º|4o|4°|quarto)(\s|$)/.test(s)) return 55;
  if (/^(5|6|7|8)(º|o|°)?(\s|$)/.test(s)) return 40;
  if (/^(9|10|11|12|13|14|15|16|17|18|19|20)(º|o|°)?(\s|$)/.test(s)) return 25;
  return s ? 10 : 0;
}

let athletes = [];
let filters = { year: "", category: "", modality: "" };
let loadPromise = null;
const RANK_CACHE_KEY="bd_ranking_v11",RANK_CACHE_MS=5*60*1000;
let lastFocused = null;
let savedOverflow = "";

function athleteKey(a) {
  const uid = String(a.ownerUid || a.uid || "").trim();
  if (uid) return `uid:${uid}`;
  const legacy = String(a.legadoAtletaId || a.id || "").trim();
  if (legacy) return `legacy:${legacy}`;
  return `identity:${norm(a.nome)}|${norm(a.cidade)}|${String(a.nascimento || "").trim()}`;
}

function unifiedAthletes() {
  const map = new Map();
  for (const athlete of athletes) {
    const key = athleteKey(athlete);
    const old = map.get(key);
    const currentHistory = dedupeHistory(athlete.historicoCampeonatos);
    if (!old) {
      map.set(key, { ...athlete, historicoCampeonatos: currentHistory });
      continue;
    }
    map.set(key, {
      ...old,
      ...athlete,
      nome: old.nome || athlete.nome,
      cidade: old.cidade || athlete.cidade,
      categoria: old.categoria || athlete.categoria,
      modalidades: [...new Set([...(old.modalidades || []), ...(athlete.modalidades || [])].filter(Boolean))],
      historicoCampeonatos: dedupeHistory([...(old.historicoCampeonatos || []), ...currentHistory])
    });
  }
  return [...map.values()];
}

function rankingRows() {
  const out = [];
  for (const athlete of unifiedAthletes()) {
    if (filters.category && norm(athlete.categoria) !== norm(filters.category)) continue;
    if (filters.modality && !(athlete.modalidades || []).some(m => norm(m) === norm(filters.modality))) continue;

    let total = 0;
    let appearances = 0;
    for (const history of dedupeHistory(athlete.historicoCampeonatos)) {
      if (typeof history !== "object" || !history) continue;
      const year = String(history.ano || (history.data ? String(history.data).slice(0, 4) : ""));
      if (filters.year && year !== filters.year) continue;
      const score = points(history.colocacao || history.resultado);
      if (score) {
        total += score;
        appearances += 1;
      }
    }
    if (total) out.push({ ...athlete, pontos: total, participacoes: appearances });
  }
  return out.sort((a, b) => b.pontos - a.pontos || b.participacoes - a.participacoes || String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
}

function profileHref(athlete) {
  const uid = String(athlete.uid || athlete.ownerUid || "").trim();
  return uid ? `perfil-social.html?uid=${encodeURIComponent(uid)}` : "#";
}

function render() {
  const box = $("rankingLista");
  if (!box) return;
  const rows = rankingRows();
  if (!rows.length) {
    box.innerHTML = '<div class="ranking-vazio"><strong>Sem pontuação ainda.</strong><span>Ajuste os filtros ou registre resultados no histórico dos atletas.</span></div>';
    return;
  }

  const top = rows.slice(0, 3);
  const rest = rows.slice(3);
  const podium = top.map((a, i) => `
    <a class="ranking-podio p${i + 1}" href="${profileHref(a)}">
      <div class="podio-lugar">${i + 1}º</div>
      <div class="podio-nome">${esc(a.nome || "Atleta")}</div>
      <small>${a.participacoes} campeonato${a.participacoes === 1 ? "" : "s"}</small>
      <strong>${a.pontos}<em> PTS</em></strong>
    </a>`).join("");
  const list = rest.map((a, i) => `
    <a class="ranking-item" href="${profileHref(a)}">
      <div class="ranking-posicao">${i + 4}º</div>
      <div class="ranking-atleta"><strong>${esc(a.nome || "Atleta")}</strong><small>${esc(a.cidade || "Cidade não informada")} · ${a.participacoes} campeonato${a.participacoes === 1 ? "" : "s"}</small></div>
      <div class="ranking-pontos">${a.pontos}<small>PONTOS</small></div>
    </a>`).join("");

  box.innerHTML = `<div class="ranking-top3">${podium}</div><div class="ranking-restante">${list}</div>`;
}

function createDrawer() {
  let drawer = $("rankingDrawer");
  if (drawer) return drawer;
  drawer = document.createElement("div");
  drawer.id = "rankingDrawer";
  drawer.className = "ranking-drawer";
  drawer.setAttribute("aria-hidden", "true");
  drawer.innerHTML = `
    <button class="ranking-overlay" type="button" data-fechar-ranking aria-label="Fechar ranking"></button>
    <aside class="ranking-panel" role="dialog" aria-modal="true" aria-labelledby="rankingTitulo" tabindex="-1">
      <div class="ranking-panel-head">
        <div><span>DESEMPENHO NO CIRCUITO</span><h2 id="rankingTitulo">RANKING DOS ATLETAS</h2></div>
        <button id="btnFecharRanking" class="ranking-close" type="button" aria-label="Fechar ranking">×</button>
      </div>
      <div id="rankingFiltros" class="ranking-filtros"></div>
      <p class="ranking-intro">Pontuação calculada automaticamente com base nos resultados cadastrados no histórico de campeonatos.</p>
      <div id="rankingLista" class="ranking-lista"><p class="ranking-loading">Carregando ranking...</p></div>
      <details class="ranking-regras"><summary>Como os pontos são calculados?</summary><ul><li><strong>1º:</strong> 100 pontos</li><li><strong>2º:</strong> 80</li><li><strong>3º:</strong> 65</li><li><strong>4º:</strong> 55</li><li><strong>5º ao 8º:</strong> 40</li><li><strong>9º ao 20º:</strong> 25</li><li><strong>Outras participações registradas:</strong> 10</li></ul></details>
    </aside>`;
  document.body.appendChild(drawer);

  $("btnFecharRanking")?.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    closeRanking();
  });
  drawer.querySelector("[data-fechar-ranking]")?.addEventListener("click", closeRanking);
  return drawer;
}

function buildFilters() {
  const years = [...new Set(athletes.flatMap(a => (a.historicoCampeonatos || []).map(h => typeof h === "object" && h ? String(h.ano || (h.data ? String(h.data).slice(0, 4) : "")) : "").filter(Boolean)))].sort().reverse();
  const categories = [...new Set(athletes.map(a => a.categoria).filter(Boolean))].sort();
  const modalities = [...new Set(athletes.flatMap(a => a.modalidades || []).filter(Boolean))].sort();
  const filtersBox = $("rankingFiltros");
  if (!filtersBox) return;
  filtersBox.innerHTML = `
    <label><span>PERÍODO</span><select id="rankingPeriodo"><option value="geral">Ranking geral</option><option value="ano">Por ano</option></select></label>
    <label><span>ANO</span><select id="rankingAno"><option value="">Todos</option>${years.map(v => `<option>${esc(v)}</option>`).join("")}</select></label>
    <label><span>CATEGORIA</span><select id="rankingCategoria"><option value="">Todas</option>${categories.map(v => `<option>${esc(v)}</option>`).join("")}</select></label>
    <label><span>MODALIDADE</span><select id="rankingModalidade"><option value="">Todas</option>${modalities.map(v => `<option>${esc(v)}</option>`).join("")}</select></label>`;

  const update = () => {
    filters.year = $("rankingPeriodo")?.value === "ano" ? $("rankingAno")?.value || "" : "";
    filters.category = $("rankingCategoria")?.value || "";
    filters.modality = $("rankingModalidade")?.value || "";
    $("rankingAno")?.toggleAttribute("disabled", $("rankingPeriodo")?.value !== "ano");
    render();
  };
  ["rankingPeriodo", "rankingAno", "rankingCategoria", "rankingModalidade"].forEach(id => $(id)?.addEventListener("change", update));
  update();
}

async function loadRanking() {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      let cached=null;try{cached=JSON.parse(sessionStorage.getItem(RANK_CACHE_KEY)||"null")}catch{}
      if(cached?.at&&Date.now()-cached.at<RANK_CACHE_MS&&Array.isArray(cached.athletes)){athletes=cached.athletes;buildFilters();render();return}
      const [athletesSnap, profilesSnap] = await Promise.all([
        getDocs(query(collection(db, "atletas"),limit(1000))),
        getDocs(query(collection(db, "perfis"),limit(1000)))
      ]);
      const profiles = profilesSnap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));
      const byUid = new Map(profiles.map(p => [String(p.uid || p.id), p]));
      const byLegacy = new Map(profiles.filter(p => p.legadoAtletaId).map(p => [String(p.legadoAtletaId), p]));

      athletes = athletesSnap.docs.map(d => {
        const a = { id: d.id, ...(d.data() || {}) };
        const p = byLegacy.get(String(a.id)) || byUid.get(String(a.ownerUid || ""));
        return {
          ...a,
          uid: a.ownerUid || p?.uid || "",
          nome: a.nome || p?.nome || "Atleta",
          cidade: a.cidade || p?.cidade || "",
          categoria: a.categoria || p?.categoria || "",
          modalidades: Array.isArray(a.modalidades) && a.modalidades.length ? a.modalidades : (Array.isArray(p?.modalidades) && p.modalidades.length ? p.modalidades : (a.modalidade ? [a.modalidade] : (p?.modalidade ? [p.modalidade] : []))),
          historicoCampeonatos: dedupeHistory([...(a.historicoCampeonatos || []), ...(p?.historicoCampeonatos || [])])
        };
      });

      const existingIds = new Set(athletes.map(a => String(a.id)));
      const existingOwners = new Set(athletes.flatMap(a => [a.ownerUid, a.uid, a.id].filter(Boolean).map(String)));
      for (const p of profiles) {
        const history = Array.isArray(p.historicoCampeonatos) ? p.historicoCampeonatos : [];
        const legacy = String(p.legadoAtletaId || "");
        const uid = String(p.uid || p.id || "");
        if (!history.length || (legacy && existingIds.has(legacy)) || (uid && existingOwners.has(uid))) continue;
        athletes.push({
          id: uid,
          uid,
          ownerUid: p.uid || uid,
          nome: p.nome || "Atleta",
          cidade: p.cidade || "",
          categoria: p.categoria || "",
          modalidades: Array.isArray(p.modalidades) ? p.modalidades : (p.modalidade ? [p.modalidade] : []),
          historicoCampeonatos: dedupeHistory(history)
        });
      }
      try{sessionStorage.setItem(RANK_CACHE_KEY,JSON.stringify({at:Date.now(),athletes}))}catch{}
      buildFilters();
      render();
    } catch (error) {
      console.error("Ranking:", error);
      const box = $("rankingLista");
      if (box) box.innerHTML = '<div class="ranking-vazio"><strong>Ranking indisponível.</strong><span>Feche esta janela e tente novamente em alguns instantes.</span></div>';
    }
  })();
  return loadPromise;
}

function cleanRankingUrl() {
  try {
    const url = new URL(location.href);
    let changed = false;
    if (url.searchParams.get("abrir") === "ranking") {
      url.searchParams.delete("abrir");
      changed = true;
    }
    if (url.hash === "#ranking") {
      url.hash = "";
      changed = true;
    }
    if (changed) history.replaceState(history.state, "", url.pathname + url.search + url.hash);
  } catch {}
}

export function closeRanking() {
  const drawer = $("rankingDrawer");
  if (!drawer) return;
  drawer.classList.remove("aberto");
  drawer.setAttribute("aria-hidden", "true");
  document.documentElement.classList.remove("ranking-open");
  document.body.classList.remove("ranking-open");
  document.body.style.overflow = savedOverflow;
  cleanRankingUrl();
  const focus = lastFocused;
  lastFocused = null;
  setTimeout(() => focus?.focus?.(), 0);
}

export function openRanking(trigger = document.activeElement) {
  const drawer = createDrawer();
  if (drawer.classList.contains("aberto")) return;
  lastFocused = trigger instanceof HTMLElement ? trigger : null;
  savedOverflow = document.body.style.overflow || "";
  drawer.classList.add("aberto");
  drawer.setAttribute("aria-hidden", "false");
  document.documentElement.classList.add("ranking-open");
  document.body.classList.add("ranking-open");
  document.body.style.overflow = "hidden";
  const box = $("rankingLista");
  if (box && !athletes.length) box.innerHTML = '<p class="ranking-loading">Carregando ranking...</p>';
  drawer.querySelector(".ranking-panel")?.focus({ preventScroll: true });
  void loadRanking().then(() => {
    if (drawer.classList.contains("aberto")) render();
  });
}

window.abrirRanking = openRanking;
window.fecharRanking = closeRanking;

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && $("rankingDrawer")?.classList.contains("aberto")) {
    event.preventDefault();
    closeRanking();
  }
});

document.addEventListener("click", event => {
  const close = event.target.closest?.("#btnFecharRanking,[data-fechar-ranking]");
  if (close) {
    event.preventDefault();
    event.stopImmediatePropagation();
    closeRanking();
    return;
  }

  const el = event.target.closest?.("a[href],button");
  if (!el) return;
  const href = el.getAttribute("href") || "";
  const id = el.id || "";
  const isRankingTrigger = id === "btnAbrirRanking" || id === "menuRanking" || /ranking[.]html(?:[?#]|$)/i.test(href) || /index[.]html[?][^#]*abrir=ranking(?:[&#]|$)/i.test(href) || href === "#ranking";
  if (!isRankingTrigger) return;
  event.preventDefault();
  event.stopPropagation();
  document.getElementById("siteMenuDrawer")?.classList.remove("open");
  openRanking(el);
}, true);

window.addEventListener("popstate", () => {
  const requested = new URLSearchParams(location.search).get("abrir") === "ranking" || location.hash === "#ranking";
  if (requested) openRanking();
  else closeRanking();
});

function openRequestedRanking() {
  if (new URLSearchParams(location.search).get("abrir") === "ranking" || location.hash === "#ranking") openRanking();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", openRequestedRanking, { once: true });
else openRequestedRanking();
