#!/usr/bin/env node
/**
 * Remove de `pessoas_envolvidas` rótulos de planilha/coluna que não são nomes de pessoas.
 * Não apaga o campo; só filtra os valores da blocklist.
 *
 * Uso: node scripts/limpar-pessoas-envolvidas.mjs
 *      node scripts/limpar-pessoas-envolvidas.mjs --dry-run
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dir, '../src/data/assuntos.json');

/** Cabeçalhos de tabela / metadados que não devem aparecer como "pessoa" */
const BLOCKLIST = new Set([
  'Ano',
  'Data',
  'Descrição',
  'Tema',
  'Alvo',
  'Tipo',
  'Local',
  'Envolvidos',
  'Consequências',
  'Tópicos',
  'Fontes',
  // Variações vistas no arquivo (outras planilhas)
  'Autoridade',
  'Frase',
  'Gravidade',
  'Marcadores',
]);

const dryRun = process.argv.includes('--dry-run');

function normalizeKey(s) {
  return String(s).trim().normalize('NFC');
}

function isBlocked(name) {
  const n = normalizeKey(name);
  return BLOCKLIST.has(n);
}

const raw = JSON.parse(readFileSync(dataPath, 'utf8'));
const { assuntos } = raw;
if (!Array.isArray(assuntos)) {
  console.error('Campo "assuntos" inválido.');
  process.exit(1);
}

let registrosAlterados = 0;
let valoresRemovidos = 0;

for (const evt of assuntos) {
  const arr = evt.pessoas_envolvidas;
  if (!Array.isArray(arr) || arr.length === 0) continue;

  const filtrado = [];
  const seen = new Set();
  for (const item of arr) {
    if (isBlocked(item)) {
      valoresRemovidos++;
      continue;
    }
    const key = normalizeKey(item).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    filtrado.push(normalizeKey(item));
  }

  if (filtrado.length !== arr.length) {
    registrosAlterados++;
    evt.pessoas_envolvidas = filtrado;
  }
}

console.log(
  dryRun
    ? '[dry-run] '
    : '',
  `Registros alterados: ${registrosAlterados} | valores de coluna removidos: ${valoresRemovidos}`,
);

if (dryRun) {
  console.log('Execute sem --dry-run para gravar assuntos.json.');
  process.exit(0);
}

writeFileSync(dataPath, `${JSON.stringify(raw, null, 2)}\n`, 'utf8');
console.log('Gravado:', dataPath);
