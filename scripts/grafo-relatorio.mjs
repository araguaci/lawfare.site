#!/usr/bin/env node
/**
 * Prints a quality report of the co-occurrence graph built from
 * src/data/assuntos.json, to review thresholds and blocklists in src/lib/grafo.ts.
 *
 * Uso: node scripts/grafo-relatorio.mjs [--todos]
 * Requer Node 22.18+ (carrega o .ts por type stripping).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { construirGrafo } from '../src/lib/grafo.ts';

const dataPath = fileURLToPath(new URL('../src/data/assuntos.json', import.meta.url));
const { assuntos } = JSON.parse(readFileSync(dataPath, 'utf8'));
const g = construirGrafo(assuntos);
const todos = process.argv.includes('--todos');

const porTipo = {};
for (const n of g.nos) (porTipo[n.tipo] ??= []).push(n);

console.log(`Eventos ligados: ${g.eventos.length} de ${assuntos.length}`);
console.log(`Nós: ${g.nos.length} · Arestas: ${g.arestas.length}`);
const pesos = g.arestas.map((a) => a[2].length);
for (const p of [1, 2, 3, 5]) console.log(`  arestas com peso >= ${p}: ${pesos.filter((w) => w >= p).length}`);
console.log(`Tamanho do JSON: ${(JSON.stringify(g).length / 1024).toFixed(0)} KB`);

for (const [tipo, lista] of Object.entries(porTipo)) {
  console.log(`\n== ${tipo} (${lista.length}, mínimo ${g.criterios[tipo].minimo_eventos})`);
  const mostrar = todos ? lista : lista.slice(0, 60);
  console.log(mostrar.map((n) => `${n.rotulo}:${n.ev.length}`).join(' | '));
}
