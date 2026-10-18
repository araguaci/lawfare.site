#!/usr/bin/env node
/**
 * Preenche "descricao" vazia em assuntos.json a partir de public/_posts (fonte_arquivo).
 * Gera até 160 caracteres: prioriza description do frontmatter, senão texto sintético com fonte/data/tópicos.
 *
 * Uso: node scripts/fill-empty-descricoes.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import matter from 'gray-matter';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const dataPath = join(root, 'src/data/assuntos.json');

function normalizeFontePath(fonte) {
  if (!fonte || typeof fonte !== 'string') return null;
  return fonte.replace(/\\/g, '/').trim();
}

function stripMdInline(s) {
  return s
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extrai campos típicos dos posts Jekyll deste repositório */
function extractFromMarkdownBody(content) {
  const fonteM =
    content.match(/\*\*Fonte\*\*:\s*([^\n\r]+)/i) ||
    content.match(/\*\*fonte\*\*:\s*([^\n\r]+)/i);
  const dataPubM =
    content.match(/\*\*Data de Publicação\*\*:\s*([^\n\r]+)/i) ||
    content.match(/\*\*Data\*\*:\s*([^\n\r]+)/i);

  let fonte = fonteM ? stripMdInline(fonteM[1]) : '';
  const dataPub = dataPubM ? stripMdInline(dataPubM[1]) : '';

  const topics = [];
  const topicBlock = content.match(
    /\*\*Tópicos\*\*:\s*\n([\s\S]*?)(?=\n##|\n\n##|$)/i
  );
  if (topicBlock) {
    const lines = topicBlock[1].match(/^\s*-\s*(.+)$/gm);
    for (const line of lines || []) {
      const t = line.replace(/^\s*-\s*/, '').trim();
      if (t && !t.startsWith('[')) topics.push(stripMdInline(t));
    }
  }

  return { fonte, dataPub, topics };
}

function firstParagraphPlain(content) {
  const afterFm = content.replace(/^---[\s\S]*?---\s*/, '');
  const lines = afterFm.split(/\n/);
  const buf = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#') || t.startsWith('##')) {
      if (buf.length) break;
      continue;
    }
    if (t.startsWith('-') || t.startsWith('>')) {
      if (buf.length) break;
      buf.push(stripMdInline(t.replace(/^[-*]\s+/, '')));
      break;
    }
    buf.push(stripMdInline(t));
    if (buf.join(' ').length > 80) break;
  }
  return buf.join(' ').trim();
}

function buildDescription({ titulo, data, content, fm }) {
  const descFm = fm.description ?? fm.summary;
  if (typeof descFm === 'string' && descFm.trim()) {
    return truncate160(stripMdInline(descFm));
  }

  const { fonte, dataPub, topics } = extractFromMarkdownBody(content);
  const tit = shortTitle(titulo || fm.title || '', 95);

  const partes = [];
  if (tit) partes.push(tit.endsWith('.') || tit.endsWith('…') ? tit : `${tit}.`);

  if (fonte || dataPub) {
    const meta = [];
    if (dataPub) meta.push(`publicação ${dataPub}`);
    if (fonte) meta.push(`veículo ${fonte}`);
    if (meta.length) partes.push(meta.join(', ') + '.');
  }

  if (topics.length) {
    partes.push(`Temas: ${topics.slice(0, 4).join(', ')}.`);
  }

  let out = partes.join(' ').replace(/\s+/g, ' ').trim();
  if (out.length < 40) {
    const para = firstParagraphPlain(content);
    if (para && para.length > 20) {
      out = `${tit ? tit + ' ' : ''}${para}`.replace(/\s+/g, ' ').trim();
    }
  }

  if (!out || out.length < 15) {
    out = tit || 'Evento documentado na cronologia.';
  }

  return truncate160(out);
}

function truncate160(s) {
  const t = s.trim().replace(/\s+/g, ' ');
  if (t.length <= 160) return t;
  const cut = t.slice(0, 157);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 90 ? cut.slice(0, lastSpace) : cut) + '…';
}

/** Evita cortar no meio de uma palavra (ex.: "porte de a" em vez de "armas") */
function shortTitle(s, max = 95) {
  const stripped = stripMdInline(s || '');
  if (stripped.length <= max) return stripped;
  const cut = stripped.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  return (sp > max * 0.45 ? cut.slice(0, sp) : cut) + '…';
}

const raw = JSON.parse(readFileSync(dataPath, 'utf8'));
const { assuntos, ...rest } = raw;

let filled = 0;
let skipped = 0;
const log = [];

for (const evt of assuntos) {
  const d = evt.descricao;
  if (d != null && String(d).trim() !== '') {
    skipped++;
    continue;
  }

  const rel = normalizeFontePath(evt.fonte_arquivo);
  if (!rel || !rel.startsWith('_posts/')) {
    evt.descricao = truncate160(
      stripMdInline(evt.titulo || 'Evento na cronologia Lawfare Timeline.')
    );
    filled++;
    log.push({ id: evt.id, source: 'titulo-only', preview: evt.descricao });
    continue;
  }

  const abs = join(root, 'public', rel);
  try {
    const fileRaw = readFileSync(abs, 'utf8');
    const { data: fm, content } = matter(fileRaw);
    evt.descricao = buildDescription({
      titulo: evt.titulo,
      data: evt.data_evento,
      content,
      fm,
    });
    filled++;
    log.push({ id: evt.id, source: abs, preview: evt.descricao });
  } catch (e) {
    evt.descricao = truncate160(
      stripMdInline(evt.titulo || 'Evento documentado na cronologia.')
    );
    filled++;
    log.push({ id: evt.id, source: 'fallback-missing-file', err: e.message, preview: evt.descricao });
  }
}

writeFileSync(dataPath, JSON.stringify({ ...rest, assuntos }, null, 2) + '\n', 'utf8');

console.log(`Preenchidas ${filled} descrições vazias; ${skipped} já tinham texto.`);
console.log('Amostra:');
log.slice(0, 8).forEach((x) => {
  console.log(`  id=${x.id}: ${x.preview}`);
});
