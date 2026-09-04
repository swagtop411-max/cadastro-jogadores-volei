export const REGRAS_SORTEIO = Object.freeze({
  homensPorTime: 2,
  mulheresPorTime: 2,
  totalPorTime: 4,
  alvo: 9,
  maximo: 10,
  maxAvancados: 1,
  equilibrioMinimo: 90,
});

export function normalizarNivel(valor) {
  const v = String(valor ?? "").trim().toLowerCase();
  if (v === "iniciante" || v === "1") return 1;
  if (v === "intermediário" || v === "intermediario" || v === "2") return 2;
  if (v === "avançado" || v === "avancado" || v === "3") return 3;
  throw new TypeError(`Nível inválido: ${valor}`);
}

export function nomeNivel(nivel) {
  return ["", "Iniciante", "Intermediário", "Avançado"][normalizarNivel(nivel)];
}

function embaralhar(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pontuacao(time) {
  return time.reduce((soma, atleta) => soma + normalizarNivel(atleta.nivel), 0);
}

function avancados(time) {
  return time.filter(atleta => normalizarNivel(atleta.nivel) === 3).length;
}

function generoNormalizado(valor) {
  const genero = String(valor ?? "").trim().toUpperCase();
  return genero === "M" || genero === "F" ? genero : "";
}

function valido(time) {
  return time.length === REGRAS_SORTEIO.totalPorTime
    && time.filter(atleta => atleta.genero === "M").length === REGRAS_SORTEIO.homensPorTime
    && time.filter(atleta => atleta.genero === "F").length === REGRAS_SORTEIO.mulheresPorTime
    && pontuacao(time) <= REGRAS_SORTEIO.maximo
    && avancados(time) <= REGRAS_SORTEIO.maxAvancados;
}

function criarCandidatos(homens, mulheres, rng) {
  const candidatos = [];
  for (let a = 0; a < homens.length; a += 1) {
    for (let b = a + 1; b < homens.length; b += 1) {
      for (let c = 0; c < mulheres.length; c += 1) {
        for (let d = c + 1; d < mulheres.length; d += 1) {
          const time = [homens[a], homens[b], mulheres[c], mulheres[d]];
          if (!valido(time)) continue;
          candidatos.push({ time, pontos: pontuacao(time) });
        }
      }
    }
  }
  return embaralhar(candidatos, rng);
}

function escolherMelhor(candidatos, usados, alvo, rng) {
  let melhor = null;
  let melhorScore = Infinity;
  for (const candidato of candidatos) {
    if (candidato.time.some(atleta => usados.has(atleta.__id))) continue;
    const distanciaDoAlvo = Math.abs(candidato.pontos - alvo);
    const score = distanciaDoAlvo * 100 + rng();
    if (score < melhorScore) {
      melhorScore = score;
      melhor = candidato;
    }
  }
  return melhor;
}

function construir(qtd, candidatos, rng) {
  if (!candidatos.length) return null;
  const usados = new Set();
  const resultado = [];

  for (let i = 0; i < qtd; i += 1) {
    const melhor = escolherMelhor(candidatos, usados, REGRAS_SORTEIO.alvo, rng);
    if (!melhor) return null;
    resultado.push(melhor.time);
    melhor.time.forEach(atleta => usados.add(atleta.__id));
  }

  const pontos = resultado.map(pontuacao);
  const max = Math.max(...pontos);
  const min = Math.min(...pontos);
  const equilibrio = max ? (min / max) * 100 : 100;
  if (equilibrio < REGRAS_SORTEIO.equilibrioMinimo) return null;
  return { resultado, usados, pontos, equilibrio };
}

function prepararAtletas(atletas) {
  if (!Array.isArray(atletas)) throw new TypeError("A lista de atletas deve ser um array.");
  return atletas.map((atleta, indice) => {
    const nome = String(atleta?.nome ?? "").trim();
    const genero = generoNormalizado(atleta?.genero);
    if (!nome) throw new TypeError(`Atleta ${indice + 1} sem nome.`);
    if (!genero) throw new TypeError(`Gênero inválido para ${nome}. Use M ou F.`);
    return {
      ...atleta,
      nome,
      genero,
      nivel: normalizarNivel(atleta?.nivel),
      __id: atleta?.__id ?? atleta?.uid ?? indice,
    };
  });
}

export function sortearTimes(atletas, { rng = Math.random, maxTentativas = 2500 } = {}) {
  if (typeof rng !== "function") throw new TypeError("rng deve ser uma função.");
  const base = prepararAtletas(atletas);
  const homens = base.filter(atleta => atleta.genero === "M");
  const mulheres = base.filter(atleta => atleta.genero === "F");
  const qtd = Math.floor(Math.min(homens.length / 2, mulheres.length / 2));

  if (qtd < 1) {
    return {
      ok: false,
      erro: "É necessário ter pelo menos 2 homens e 2 mulheres.",
      times: [],
      fila: base.map(({ __id, ...atleta }) => atleta),
      equilibrio: 0,
    };
  }

  const candidatos = criarCandidatos(homens, mulheres, rng);
  if (!candidatos.length) {
    return {
      ok: false,
      erro: "Não existe quarteto válido com a composição atual. Verifique níveis e quantidade de atletas Avançados.",
      times: [],
      fila: base.map(({ __id, ...atleta }) => atleta),
      equilibrio: 0,
    };
  }

  let melhor = null;
  const tentativas = Math.max(1, Number(maxTentativas) || 1);
  for (let tentativa = 0; tentativa < tentativas; tentativa += 1) {
    const candidatosTentativa = embaralhar(candidatos, rng);
    const resultado = construir(qtd, candidatosTentativa, rng);
    if (!resultado) continue;

    const distanciaTotal = resultado.pontos.reduce(
      (soma, pontos) => soma + Math.abs(REGRAS_SORTEIO.alvo - pontos),
      0,
    );

    if (
      !melhor
      || distanciaTotal < melhor.distanciaTotal
      || (distanciaTotal === melhor.distanciaTotal && resultado.equilibrio > melhor.equilibrio)
    ) {
      melhor = { ...resultado, distanciaTotal };
      if (distanciaTotal === 0 && resultado.equilibrio === 100) break;
    }
  }

  if (!melhor) {
    return {
      ok: false,
      erro: "Não foi possível montar todos os times mantendo pelo menos 90% de equilíbrio.",
      times: [],
      fila: base.map(({ __id, ...atleta }) => atleta),
      equilibrio: 0,
    };
  }

  const times = melhor.resultado.map((jogadores, indice) => ({
    numero: indice + 1,
    jogadores: jogadores.map(({ __id, ...atleta }) => atleta),
    pontos: pontuacao(jogadores),
  }));

  const fila = base
    .filter(atleta => !melhor.usados.has(atleta.__id))
    .map(({ __id, ...atleta }) => atleta);

  return {
    ok: true,
    times,
    fila,
    equilibrio: Math.round(melhor.equilibrio * 10) / 10,
    pontos: times.map(time => time.pontos),
  };
}
