import { existsSync } from 'node:fs';
import path from 'node:path';
import data from '../data/assuntos.json';
import { fontePathToPublicUrl } from './loadFonteMarkdown';
import { SITE_NAME, SITE_URL } from './site';

export interface AnoCatalogo {
  ano: number;
  total: number;
  arquivo: string;
  url: string;
}

const fonteCache = new Map<string, string | null>();

export function fonteUrlAbsoluta(fonte: string | undefined): string | null {
  if (!fonte) return null;
  const cached = fonteCache.get(fonte);
  if (cached !== undefined) return cached;

  const rel = fontePathToPublicUrl(fonte);
  if (!rel) {
    fonteCache.set(fonte, null);
    return null;
  }

  const abs = path.join(process.cwd(), 'public', rel);
  const url = existsSync(abs) ? `${SITE_URL}${rel}` : null;
  fonteCache.set(fonte, url);
  return url;
}

export function sanitizeEvento<T extends { fonte_arquivo?: string }>(evento: T) {
  const fonteUrl = fonteUrlAbsoluta(evento.fonte_arquivo);
  if (!fonteUrl) return evento;
  return { ...evento, fonte_url: fonteUrl };
}

function aviso() {
  return {
    projeto: SITE_NAME,
    site: SITE_URL,
    idioma: 'pt-BR',
    versao_schema: 1,
    extraido_em: data['data_extração'],
    periodo: data.periodo,
    aviso:
      'Índice documental de fontes públicas. Tags e relevância são chaves de busca, não sentença nem prova.',
    ficha: `${SITE_URL}/evento/{id}`,
    roteiro: `${SITE_URL}/roteiro`,
    investigadores: `${SITE_URL}/investigadores`,
  };
}

export function yearsFromAssuntos(): AnoCatalogo[] {
  const totals = new Map<string, number>();
  for (const evento of data.assuntos) {
    const ano = (evento.data_evento || '').slice(0, 4);
    if (!ano) continue;
    totals.set(ano, (totals.get(ano) || 0) + 1);
  }

  return [...totals.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ano, total]) => ({
      ano: Number(ano),
      total,
      arquivo: `lawfare-${ano}.json`,
      url: `${SITE_URL}/dados/lawfare-${ano}.json`,
    }));
}

export function catalogoJson() {
  const anos = yearsFromAssuntos();
  return {
    ...aviso(),
    total_fichas: data.total,
    arquivo_completo: `${SITE_URL}/dados/lawfare-full.json`,
    anos,
  };
}

export function datasetJson(ano: string) {
  const assuntos =
    ano === 'full'
      ? data.assuntos
      : data.assuntos.filter((evento) => (evento.data_evento || '').slice(0, 4) === ano);

  return {
    ...aviso(),
    ano: ano === 'full' ? null : Number(ano),
    total: assuntos.length,
    assuntos: assuntos.map((evento) => sanitizeEvento(evento)),
  };
}
