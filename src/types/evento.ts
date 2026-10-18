// Tipos inferidos diretamente do JSON — zero manutenção manual
import type dataRaw from '../data/assuntos.json';

export type Evento = (typeof dataRaw)['assuntos'][number];

// Enums extraídos via auditoria do JSON real (18 categorias)
export type Categoria =
  | 'bancos'
  | 'crise-diplomatica'
  | 'decano'
  | 'dossie'
  | 'dragao-onca'
  | 'escandalos'
  | 'estudos'
  | 'extravagancia'
  | 'geral'
  | 'governo'
  | 'impunidade'
  | 'indecoro'
  | 'justica'
  | 'lawfare'
  | 'operacoes'
  | 'penduricalhos'
  | 'stf'
  | 'tse'
  | 'vazatoga';

export type Relevancia = 'alta' | 'media' | 'baixa';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function slugFromEvento(e: Evento): string {
  return String(e.id);
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return iso?.slice(0, 10) ?? '';
  }
}

export function formatDateShort(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'UTC',
    });
  } catch {
    return iso?.slice(0, 10) ?? '';
  }
}

export function relevanciaColor(r: string): string {
  const map: Record<string, string> = {
    alta: '#ff4444',
    media: '#f59e0b',
    baixa: '#8a8880',
  };
  return map[r] ?? '#8a8880';
}

export function categoriaColor(cat: string): string {
  const map: Record<string, string> = {
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
  return map[cat] ?? '#8a8880';
}

export function categoriaLabel(cat: string): string {
  const map: Record<string, string> = {
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
  return map[cat] ?? cat;
}

export function getExcerpt(descricao: string, maxLen = 160): string {
  if (!descricao || descricao === 'N/A') return '';
  return descricao.length > maxLen
    ? descricao.slice(0, maxLen).trimEnd() + '…'
    : descricao;
}
