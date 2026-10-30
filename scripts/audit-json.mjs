#!/usr/bin/env node
/**
 * scripts/audit-json.mjs
 * Valida assuntos.json antes do build.
 * Uso: node scripts/audit-json.mjs
 *      npm run audit
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dir, '../src/data/assuntos.json');

let raw;
try {
  raw = JSON.parse(readFileSync(dataPath, 'utf8'));
} catch (e) {
  console.error('❌ Falha ao ler assuntos.json:', e.message);
  process.exit(1);
}

const assuntos = raw.assuntos;
if (!Array.isArray(assuntos)) {
  console.error('❌ Campo "assuntos" não é um array.');
  process.exit(1);
}

const errors = [];
const warnings = [];
const ids = new Set();

const VALID_RELEVANCIA = new Set(['alta', 'media', 'baixa']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const BLOCK_MARKERS = new Set(['>', '|', '>-', '|-', '>+', '|+']);

assuntos.forEach((evt, i) => {
  const ctx = `[index ${i}${evt.id != null ? `, id=${evt.id}` : ''}]`;

  // ID
  if (evt.id == null) {
    errors.push(`${ctx} Campo "id" ausente`);
  } else if (typeof evt.id !== 'number' || !Number.isInteger(evt.id) || evt.id <= 0) {
    errors.push(`${ctx} "id" deve ser inteiro positivo — valor: ${evt.id}`);
  } else if (ids.has(evt.id)) {
    errors.push(`${ctx} ID duplicado: ${evt.id}`);
  } else {
    ids.add(evt.id);
  }

  // titulo
  if (!evt.titulo || typeof evt.titulo !== 'string' || evt.titulo.trim().length === 0) {
    errors.push(`${ctx} "titulo" vazio ou ausente`);
  }

  // data_evento
  if (!evt.data_evento || !DATE_RE.test(evt.data_evento)) {
    warnings.push(`${ctx} "data_evento" fora do padrão YYYY-MM-DD — valor: "${evt.data_evento}"`);
  }

  // descricao: YAML block scalar markers leaked from the old timeline extractor
  if (typeof evt.descricao === 'string' && BLOCK_MARKERS.has(evt.descricao.trim())) {
    errors.push(`${ctx} "descricao" é o marcador YAML "${evt.descricao.trim()}" — rode o sync do timeline`);
  }

  // categoria
  if (!evt.categoria || typeof evt.categoria !== 'string') {
    warnings.push(`${ctx} "categoria" ausente ou inválida`);
  }

  // relevancia
  if (evt.relevancia && !VALID_RELEVANCIA.has(String(evt.relevancia).toLowerCase())) {
    warnings.push(`${ctx} "relevancia" valor inesperado: "${evt.relevancia}"`);
  }

  // tags
  if (!Array.isArray(evt.tags)) {
    warnings.push(`${ctx} "tags" não é array`);
  }

  // fontes
  if (!Array.isArray(evt.fontes)) {
    warnings.push(`${ctx} "fontes" não é array`);
  }
});

// Resumo
const allIds = [...ids];
const maxId = allIds.length ? Math.max(...allIds) : 0;

if (errors.length > 0) {
  console.error(`\n❌ ${errors.length} ERRO(S) encontrado(s):\n`);
  errors.forEach(e => console.error('  ✗', e));
  if (warnings.length) {
    console.warn(`\n⚠️  ${warnings.length} aviso(s) adicionais (não bloqueiam o build)`);
  }
  process.exit(1);
}

if (warnings.length) {
  console.warn(`\n⚠️  ${warnings.length} aviso(s):`);
  warnings.slice(0, 10).forEach(w => console.warn('  !', w));
  if (warnings.length > 10) console.warn(`  ... e mais ${warnings.length - 10} avisos`);
}

console.log(`\n✓ ${assuntos.length} entradas válidas`);
console.log(`✓ IDs: 1 → ${maxId} | Próximo: ${maxId + 1}`);
console.log(`✓ Categorias únicas: ${[...new Set(assuntos.map(e => e.categoria).filter(Boolean))].sort().join(', ')}`);
console.log(`✓ Período: ${assuntos.map(e => e.data_evento).filter(Boolean).sort()[0]} → ${assuntos.map(e => e.data_evento).filter(Boolean).sort().at(-1)}`);
console.log('');
