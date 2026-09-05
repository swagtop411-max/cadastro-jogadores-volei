import test from "node:test";
import assert from "node:assert/strict";
import { REGRAS_SORTEIO, sortearTimes } from "../src/domain/organizer.mjs";

const rng = () => 0.25;

test("aceita quarteto válido abaixo do alvo 9", () => {
  const atletas = [
    { nome: "M1", genero: "M", nivel: 2 },
    { nome: "M2", genero: "M", nivel: 2 },
    { nome: "F1", genero: "F", nivel: 2 },
    { nome: "F2", genero: "F", nivel: 2 },
  ];

  const resultado = sortearTimes(atletas, { rng, maxTentativas: 10 });
  assert.equal(resultado.ok, true);
  assert.deepEqual(resultado.pontos, [8]);
  assert.equal(resultado.equilibrio, 100);
});

test("prioriza times de 9 pontos quando a composição permite", () => {
  const atletas = [
    { nome: "M1", genero: "M", nivel: 3 },
    { nome: "M2", genero: "M", nivel: 2 },
    { nome: "M3", genero: "M", nivel: 3 },
    { nome: "M4", genero: "M", nivel: 2 },
    { nome: "F1", genero: "F", nivel: 2 },
    { nome: "F2", genero: "F", nivel: 2 },
    { nome: "F3", genero: "F", nivel: 2 },
    { nome: "F4", genero: "F", nivel: 2 },
  ];

  const resultado = sortearTimes(atletas, { rng, maxTentativas: 50 });
  assert.equal(resultado.ok, true);
  assert.equal(resultado.times.length, 2);
  assert.deepEqual(resultado.pontos, [9, 9]);
  assert.equal(resultado.equilibrio, 100);
});

test("nunca coloca mais de um Avançado no mesmo time", () => {
  const atletas = [
    { nome: "M1", genero: "M", nivel: 3 },
    { nome: "M2", genero: "M", nivel: 3 },
    { nome: "F1", genero: "F", nivel: 2 },
    { nome: "F2", genero: "F", nivel: 2 },
  ];

  const resultado = sortearTimes(atletas, { rng, maxTentativas: 10 });
  assert.equal(resultado.ok, false);
  assert.equal(resultado.times.length, 0);
});

test("mantém composição 2 homens + 2 mulheres e teto de pontos", () => {
  const atletas = [
    { nome: "M1", genero: "M", nivel: 3 },
    { nome: "M2", genero: "M", nivel: 2 },
    { nome: "F1", genero: "F", nivel: 2 },
    { nome: "F2", genero: "F", nivel: 2 },
  ];

  const resultado = sortearTimes(atletas, { rng, maxTentativas: 10 });
  assert.equal(resultado.ok, true);
  for (const time of resultado.times) {
    assert.equal(time.jogadores.filter(a => a.genero === "M").length, 2);
    assert.equal(time.jogadores.filter(a => a.genero === "F").length, 2);
    assert.ok(time.pontos <= REGRAS_SORTEIO.maximo);
    assert.ok(time.jogadores.filter(a => a.nivel === 3).length <= REGRAS_SORTEIO.maxAvancados);
  }
});

test("retorna erro claro quando faltam atletas para um quarteto", () => {
  const resultado = sortearTimes([
    { nome: "M1", genero: "M", nivel: 1 },
    { nome: "M2", genero: "M", nivel: 1 },
    { nome: "F1", genero: "F", nivel: 1 },
  ], { rng });

  assert.equal(resultado.ok, false);
  assert.match(resultado.erro, /2 homens e 2 mulheres/i);
});

test("rejeita nível inválido em vez de promover silenciosamente para Avançado", () => {
  assert.throws(() => sortearTimes([
    { nome: "M1", genero: "M", nivel: "X" },
    { nome: "M2", genero: "M", nivel: 1 },
    { nome: "F1", genero: "F", nivel: 1 },
    { nome: "F2", genero: "F", nivel: 1 },
  ], { rng }), /Nível inválido/);
});
