#!/usr/bin/env node
/**
 * scripts/remover-tags-falsas.mjs
 * Remove os 63 registros com data 0001-01-01 (tags e prompts do Jekyll importados por engano)
 * de src/data/assuntos.json e lawfare-full.json, atualizando o total e o período real.
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const assuntosPath = resolve('src/data/assuntos.json');
const fullPath = resolve('lawfare-full.json');

const raw = JSON.parse(readFileSync(assuntosPath, 'utf8'));
const removidos = [];
const mantidos = [];

for (const a of raw.assuntos) {
  if (a.data_evento && a.data_evento.startsWith('0001')) {
    removidos.push(a);
  } else {
    mantidos.push(a);
  }
}

console.log(`Encontrados ${removidos.length} registros com data 0001-01-01.`);

// Remove arquivos markdown correspondentes em public/_posts
let arquivosDeletados = 0;
for (const item of removidos) {
  if (item.fonte_arquivo) {
    const p = join(resolve('public'), item.fonte_arquivo);
    if (existsSync(p)) {
      unlinkSync(p);
      arquivosDeletados++;
    }
  }
}
console.log(`Removidos ${arquivosDeletados} arquivos de public/_posts.`);

const datas = mantidos.map((a) => a.data_evento).filter(Boolean).sort();
const minData = datas[0];
const maxData = datas[datas.length - 1];
const novoPeriodo = `${minData} a ${maxData}`;

raw.total = mantidos.length;
raw.periodo = novoPeriodo;
raw.assuntos = mantidos;

const jsonStr = JSON.stringify(raw, null, 2) + '\n';
writeFileSync(assuntosPath, jsonStr, 'utf8');
writeFileSync(fullPath, jsonStr, 'utf8');

console.log(`✓ Base atualizada com sucesso!`);
console.log(`  - Total de eventos: ${raw.total}`);
console.log(`  - Período auditado: ${raw.periodo}`);
