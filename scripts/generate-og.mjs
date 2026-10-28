import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { cleanExcerpt, formatKicker, shareCardSvg } from './shareCardSvg.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fontFiles = [
  path.join(root, 'assets/fonts/PlusJakartaSans-Bold.ttf'),
  path.join(root, 'assets/fonts/PlusJakartaSans-Regular.ttf'),
  path.join(root, 'assets/fonts/JetBrainsMono-Medium.ttf'),
];

const categoryColors = {
  lawfare: '#ff4444',
  stf: '#818cf8',
  tse: '#818cf8',
  justica: '#818cf8',
  governo: '#f59e0b',
  escandalos: '#ff8800',
  impunidade: '#ff4444',
  indecoro: '#ff6b6b',
  operacoes: '#22d3a8',
  'crise-diplomatica': '#e879f9',
  bancos: '#34d399',
  dossie: '#fb923c',
  'dragao-onca': '#38bdf8',
  estudos: '#60a5fa',
  extravagancia: '#facc15',
  penduricalhos: '#a78bfa',
  decano: '#f472b6',
  vazatoga: '#ef4444',
  geral: '#8a8880',
};

const categoryLabels = {
  lawfare: 'Lawfare',
  stf: 'STF',
  tse: 'TSE',
  justica: 'Justiça',
  governo: 'Governo',
  escandalos: 'Escândalos',
  impunidade: 'Impunidade',
  indecoro: 'Indecoro',
  operacoes: 'Operações',
  'crise-diplomatica': 'Crise Diplomática',
  bancos: 'Bancos',
  dossie: 'Dossiê',
  'dragao-onca': 'O Dragão e a Onça',
  estudos: 'Estudos',
  extravagancia: 'Extravagância',
  penduricalhos: 'Penduricalhos',
  decano: 'Decano',
  vazatoga: 'Vaza Toga',
  geral: 'Geral',
};

function renderPng(card) {
  const svg = shareCardSvg(card);
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
    font: {
      fontFiles,
      loadSystemFonts: false,
      defaultFontFamily: 'Plus Jakarta Sans',
    },
  });
  return resvg.render().asPng();
}

function siteCard(periodo) {
  return {
    title: 'Lawfare Timeline Brasil',
    excerpt: `Cronologia documental de eventos públicos, com ficha, data e fonte. ${periodo}.`,
    kicker: 'ARQUIVO PÚBLICO',
    category: 'Pesquisa',
    categoryColor: '#10b981',
    idLabel: '',
  };
}

export async function generateOgImages(outDir, options = {}) {
  const data = JSON.parse(readFileSync(path.join(root, 'src/data/assuntos.json'), 'utf8'));
  const limit = options.limit ?? data.assuntos.length;
  const ogDir = path.join(outDir, 'og');
  await mkdir(ogDir, { recursive: true });

  const sitePng = renderPng(siteCard(data.periodo));
  await writeFile(path.join(outDir, 'og-default.png'), sitePng);

  const slice = data.assuntos.slice(0, limit);
  let written = 0;
  for (const evento of slice) {
    const png = renderPng({
      title: evento.titulo,
      excerpt: cleanExcerpt(evento.descricao),
      kicker: formatKicker(evento.data_iso || evento.data_evento),
      category: categoryLabels[evento.categoria] || evento.categoria || 'Arquivo',
      categoryColor: categoryColors[evento.categoria] || '#10b981',
      idLabel: `#${evento.id}`,
    });
    await writeFile(path.join(ogDir, `${evento.id}.png`), png);
    written += 1;
    if (written % 200 === 0) {
      console.log(`[og] ${written}/${slice.length}`);
    }
  }

  console.log(`[og] ${written} cartões em ${ogDir}`);
  return written;
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const sample = process.argv.includes('--sample');
  const limitFlag = process.argv.find((arg) => arg.startsWith('--limit='));
  const dirArg = process.argv.slice(2).find((arg) => arg !== '--sample' && !arg.startsWith('--limit='));
  const outDir = dirArg ? path.resolve(dirArg) : path.join(root, sample ? 'og-preview' : 'dist');
  const limit = sample ? 3 : limitFlag ? Number(limitFlag.split('=')[1]) : undefined;
  await generateOgImages(outDir, { limit });
  if (sample) {
    const { copyFile } = await import('node:fs/promises');
    await copyFile(path.join(outDir, 'og-default.png'), path.join(root, 'public/og-default.png'));
    console.log('[og] public/og-default.png atualizado');
  }
}
