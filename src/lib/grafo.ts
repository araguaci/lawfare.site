/**
 * Builds the co-occurrence graph ("teia") from the event records.
 *
 * A node is a public figure, a court case, a police operation or an
 * institution. Two nodes are linked when both are named in the same event
 * record; the link weight is the number of such records. Nothing here infers
 * guilt, causality or any relation beyond "appear together in the archive".
 *
 * The module has no imports so scripts can load it with Node's type stripping
 * (see scripts/grafo-relatorio.mjs).
 */

export type TipoNo = 'pessoa' | 'processo' | 'operacao' | 'instituicao';

export interface EventoEntrada {
  id: number;
  titulo?: string;
  data_evento?: string;
  categoria?: string;
  descricao?: string;
  tags?: string[];
  pessoas_envolvidas?: string[];
  instituicoes_envolvidas?: string[];
}

/** Compact event row: [id, YYYY-MM-DD, title, category]. */
export type EventoGrafo = [number, string, string, string];

export interface NoGrafo {
  id: string;
  rotulo: string;
  tipo: TipoNo;
  /** Indexes into `eventos`, sorted by date. */
  ev: number[];
}

/** [source node index, target node index, event indexes]. */
export type ArestaGrafo = [number, number, number[]];

export interface Grafo {
  gerado_em: string;
  aviso: string;
  criterios: Record<TipoNo, { minimo_eventos: number; fontes: string }>;
  periodo: [string, string];
  eventos: EventoGrafo[];
  nos: NoGrafo[];
  arestas: ArestaGrafo[];
}

export const MINIMO_EVENTOS: Record<TipoNo, number> = {
  pessoa: 3,
  processo: 2,
  operacao: 2,
  instituicao: 4,
};

/** Accent- and case-insensitive key. */
export function chave(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function slug(s: string): string {
  return chave(s).replace(/ /g, '-');
}

/* ------------------------------------------------------------------ */
/* People                                                              */
/* ------------------------------------------------------------------ */

/**
 * Labels that leaked into `pessoas_envolvidas` from bold list items
 * ("**Fonte:** ..."). Matched by key, so accents and case do not matter.
 */
const PESSOA_EXCLUIR = new Set(
  [
    'Governo', 'Violações', 'Data de Publicação', 'Fonte', 'URL', 'Descrição Completa', 'Decisão',
    'Juiz', 'Beneficiado', 'Departamento', 'Categorias', 'Categoria', 'Corpo', 'Estado', 'Ministro',
    'Contexto Político', 'Contexto', 'Resumo', 'Setor', 'Localidade', 'Dados Financeiros', 'Atores',
    'Vítimas Principais', 'Vítimas', 'Desdobramentos', 'Status Atual', 'Status', 'ID timeline',
    'Tipo de registro', 'Verificado', 'Crise Diplomática', 'Efeito', 'Questão de Soberania',
    'Período', 'Violação de Direitos', 'Valor', 'Valores', 'Valor Mensal', 'Críticas Políticas',
    'Pressão Política', 'Censura Digital', 'Censura Massiva', 'Operações relacionadas',
    'Operações Paralelas', 'Custo', 'Bloqueio de Contas', 'Medida Extrema', 'Investimento Significativo',
    'Método', 'Métodos Suspeitos', 'Aeronave', 'Questões de Gestão', 'Sanções Anteriores',
    'Sanções Financeiras', 'Sanções Aplicadas', 'Lei Magnitsky', 'Distribuição Temporal',
    'Estrutura Organizada', 'Progressistas', 'Conservadores', 'Neutros', 'Crime', 'Devido Processo',
    'Revelações da Vaza Toga', 'Crise Institucional', 'Processo Judicial', 'Acusações Graves',
    'Perseguição Sistemática', 'Momento', 'Fundamento', 'Despachantes Aduaneiros', 'Lava Jato',
    'Comando Vermelho', 'Governo Federal', 'X Brasil', 'Empabra', 'Fleurs Global', 'ICE/DHS',
    'Banco Master', 'Rioprevidência', 'Anatel', 'Defensoria Pública da União', 'Ministério da Previdência',
    'Departamento de Estado dos EUA', 'Departamento do Tesouro dos EUA', 'Receita Federal',
    'Polícia Civil do Rio de Janeiro', 'Tema', 'Alvo', 'Tipo', 'Local', 'Envolvidos', 'Consequências',
    'Tópicos', 'Fontes', 'Autoridade', 'Frase', 'Gravidade', 'Marcadores', 'Data', 'Ano', 'Descrição',
    'N/A', 'Liberdade de Expressão', 'Big Techs', 'Governo dos EUA', 'Organização Criminosa',
    'Abuso de Poder', 'Segurança Nacional', 'Ministério Público', 'Liquidação Extrajudicial',
  ].map(chave),
);

/** First words that never open a person's name (topic headings, bodies). */
const PESSOA_PRIMEIRA_PALAVRA_EXCLUIR = new Set(
  [
    'Liberdade', 'Governo', 'Organização', 'Abuso', 'Segurança', 'Ministério', 'Banco', 'Liquidação',
    'Crise', 'Censura', 'Violação', 'Violações', 'Sanções', 'Pressão', 'Contexto', 'Dados', 'Questão',
    'Questões', 'Departamento', 'Polícia', 'Tribunal', 'Operação', 'Operações', 'Partido', 'Câmara',
    'Senado', 'Procuradoria', 'Conselho', 'Comando', 'Revelações', 'Perseguição', 'Acusações',
    'Processo', 'Estrutura', 'Distribuição', 'Lei', 'Medida', 'Investimento', 'Bloqueio', 'Status',
    'Prefeitura', 'Secretaria', 'Agência', 'Instituto', 'Fundação', 'Associação', 'Empresa',
  ].map(chave),
);

/** Values in `pessoas_envolvidas` that are institutions, routed to that type. */
const PESSOA_E_INSTITUICAO = new Set(['stf', 'cnj', 'pgr', 'policia federal', 'tse', 'stj']);

/**
 * Canonical name -> variants (names or tags). Only aliases checked by hand;
 * a tag also counts when it equals the slug of a canonical name.
 */
const PESSOA_ALIAS: Record<string, string[]> = {
  'Luiz Inácio Lula da Silva': ['Lula', 'lula'],
  'Gilmar Mendes': ['Gilmar Ferreira Mendes'],
  'Alexandre de Moraes': ['Moraes'],
  'Dias Toffoli': ['toffoli', 'José Antonio Dias Toffoli'],
  'Ricardo Lewandowski': ['lewandowski'],
  'Daniel Vorcaro': ['vorcaro'],
  'Marco Aurélio Mello': ['marco-aurelio'],
  'Márcio Pochmann': ['pochmann'],
  'Donald Trump': ['trump'],
  'Edson Fachin': ['fachin'],
  'Romeu Zema': ['zema'],
  'Luís Roberto Barroso': ['Barroso', 'barroso'],
  'Sergio Moro': ['Sérgio Moro'],
  'Luís Felipe Salomão': [],
  'Kássio Nunes Marques': ['Nunes Marques'],
};

/** Name particles allowed in lower case inside a person's name. */
const PARTICULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'van', 'von', 'del', 'di']);

function limparNomePessoa(bruto: string): string | null {
  const original = bruto.normalize('NFC').trim();
  // Bold list labels end with a colon ("ID timeline:").
  if (/:\s*$/.test(original)) return null;
  let nome = original
    .split(/\s+[—–]\s+|\s*\(|\s*;|\s*\//)[0]
    .replace(/[)'"“”]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!nome || /\d|R\$/.test(nome)) return null;
  const partes = nome.split(' ');
  // Every word must start upper case, except name particles.
  if (!partes.every((p) => PARTICULAS.has(p) || /^\p{Lu}/u.test(p))) return null;
  if (PESSOA_PRIMEIRA_PALAVRA_EXCLUIR.has(chave(partes[0]))) return null;
  return nome;
}

/* ------------------------------------------------------------------ */
/* Institutions                                                        */
/* ------------------------------------------------------------------ */

const INSTITUICAO_ALIAS: Record<string, string[]> = {
  STF: ['Supremo Tribunal Federal', 'STF — Supremo Tribunal Federal', 'stf'],
  TSE: ['Tribunal Superior Eleitoral', 'tse'],
  STJ: ['Superior Tribunal de Justiça'],
  'Polícia Federal': ['PF', 'policia-federal', 'polícia-federal'],
  PGR: ['Procuradoria-Geral da República', 'pgr'],
  CNJ: ['Conselho Nacional de Justiça', 'cnj'],
  'Senado Federal': ['Senado'],
  'Câmara dos Deputados': ['Câmara'],
  'Banco Central': ['Banco Central do Brasil', 'banco-central'],
  'Ministério Público Federal': ['MPF'],
  COAF: ['Coaf'],
  'Ministério da Justiça e Segurança Pública': ['Ministério da Justiça'],
  'Receita Federal': ['receita-federal'],
  'Banco Master': ['banco-master'],
  CRRC: ['CRRC Corporation'],
  'Biomm S.A.': ['biomm'],
  'Reag DTVM': ['REAG'],
};

const INSTITUICAO_EXCLUIR = new Set(['civil', 'trustee'].map(chave));

/* ------------------------------------------------------------------ */
/* Court cases and police operations                                   */
/* ------------------------------------------------------------------ */

const CLASSE_PROCESSO: Record<string, string> = {
  adpf: 'ADPF', adi: 'ADI', ado: 'ADO', adc: 'ADC', hc: 'HC', rhc: 'RHC', re: 'RE', are: 'ARE',
  inq: 'Inq', inquerito: 'Inq', pet: 'Pet', peticao: 'Pet', ap: 'AP', 'acao penal': 'AP',
  rcl: 'Rcl', ms: 'MS',
};

// "ADPF 1141", "Inq 4.781", "Inquérito nº 4781", "Ação Penal 2668". Same line only.
const RE_PROCESSO =
  /\b(ADPF|ADI|ADO|ADC|RHC|HC|ARE|RE|Inq|INQ|Inquérito|Pet|PET|Petição|AP|Ação Penal|Rcl|RCL|MS)[ \t]*(?:n[º°o.]*[ \t]*)?(\d{1,3}(?:\.\d{3})+|\d{2,7})\b/g;
/** Well-established nicknames of specific STF inquiries, matched in the text. */
const PROCESSO_APELIDO: [RegExp, string][] = [
  [/inqu[ée]rito\s+(?:das|sobre)\s+fake\s+news/i, 'Inq 4781'],
  [/inqu[ée]rito\s+das\s+mil[íi]cias\s+digitais/i, 'Inq 4874'],
];

const RE_TAG_PROCESSO = /^(adpf|adi|ado|adc|rhc|hc|are|re|inq|pet|ap|rcl|ms)-?(\d{2,7})$/;

/** "MS 2024" is far more often a year than a case number; skip bare years. */
function pareceAno(numero: string): boolean {
  return /^(19[5-9]\d|20[0-4]\d)$/.test(numero);
}

// "Operação Compliance Zero", "Operação Faroeste". Same line only.
const RE_OPERACAO =
  /\bOperação[ \t]+((?:\p{Lu}[\p{L}-]*)(?:[ \t]+(?:(?:d[aoe]s?)[ \t]+)?(?:\p{Lu}[\p{L}-]*|[IVX]+))*)/gu;
const OPERACAO_EXCLUIR = new Set(['policial', 'conjunta', 'pf', 'stj', 'de'].map(chave));

/** Operation names come out of free text; trim trailing words that are not part of the name. */
const OPERACAO_SUFIXO = new Set(['Investigação', 'Fraudes', 'Desvios', 'Corrupção', 'Em', 'Operação', 'Esquema', 'Caso']);

function nomeOperacao(bruto: string): string | null {
  const partes = bruto.split(/[ \t]+/);
  while (partes.length && (OPERACAO_SUFIXO.has(partes[partes.length - 1]) || PARTICULAS.has(partes[partes.length - 1]))) {
    partes.pop();
  }
  // "Castelo De Areia" -> "Castelo de Areia"
  const nome = partes.map((p, i) => (i > 0 && PARTICULAS.has(p.toLowerCase()) ? p.toLowerCase() : p)).join(' ');
  if (!nome || OPERACAO_EXCLUIR.has(chave(nome))) return null;
  return nome;
}

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

interface Candidato {
  tipo: TipoNo;
  /** Display variants with their frequency; the most frequent wins. */
  rotulos: Map<string, number>;
  eventos: Set<number>;
}

class Registro {
  readonly itens = new Map<string, Candidato>();

  add(tipo: TipoNo, k: string, rotulo: string, evIdx: number, peso = 1) {
    const id = `${tipo}:${k}`;
    let c = this.itens.get(id);
    if (!c) {
      c = { tipo, rotulos: new Map(), eventos: new Set() };
      this.itens.set(id, c);
    }
    c.rotulos.set(rotulo, (c.rotulos.get(rotulo) ?? 0) + peso);
    c.eventos.add(evIdx);
  }
}

function mapaAlias(alias: Record<string, string[]>): Map<string, string> {
  const m = new Map<string, string>();
  for (const [canon, variantes] of Object.entries(alias)) {
    m.set(chave(canon), canon);
    for (const v of variantes) m.set(chave(v), canon);
  }
  return m;
}

const AVISO =
  'Uma ligação indica apenas que os dois nomes aparecem no mesmo registro do arquivo. ' +
  'Não indica culpa, vínculo causal, parceria ou relação pessoal.';

export function construirGrafo(assuntos: EventoEntrada[]): Grafo {
  const ordenados = assuntos
    .filter((e) => typeof e.id === 'number' && /^\d{4}-\d{2}-\d{2}$/.test(e.data_evento ?? ''))
    .sort((a, b) => (a.data_evento! < b.data_evento! ? -1 : a.data_evento! > b.data_evento! ? 1 : a.id - b.id));

  const eventos: EventoGrafo[] = ordenados.map((e) => [
    e.id,
    e.data_evento!,
    (e.titulo ?? '').trim(),
    e.categoria ?? '',
  ]);

  const aliasPessoa = mapaAlias(PESSOA_ALIAS);
  const aliasInst = mapaAlias(INSTITUICAO_ALIAS);
  const reg = new Registro();

  // Pass 1: people and institutions from the explicit fields.
  ordenados.forEach((e, i) => {
    for (const bruto of e.pessoas_envolvidas ?? []) {
      const nome = limparNomePessoa(bruto);
      if (!nome) continue;
      const k = chave(nome);
      if (PESSOA_EXCLUIR.has(k)) continue;
      if (PESSOA_E_INSTITUICAO.has(k)) {
        const canon = aliasInst.get(k) ?? nome;
        reg.add('instituicao', chave(canon), canon, i);
        continue;
      }
      const canon = aliasPessoa.get(k);
      if (canon) reg.add('pessoa', chave(canon), canon, i, 100);
      else if (nome.includes(' ')) reg.add('pessoa', k, nome, i);
    }
    for (const bruto of e.instituicoes_envolvidas ?? []) {
      const nome = bruto.normalize('NFC').replace(/\s+/g, ' ').trim();
      const k = chave(nome);
      if (!k || INSTITUICAO_EXCLUIR.has(k)) continue;
      const canon = aliasInst.get(k);
      if (canon) reg.add('instituicao', chave(canon), canon, i, 100);
      else reg.add('instituicao', k, nome, i);
    }
  });

  // Pass 2: case numbers and operation names in title and description.
  ordenados.forEach((e, i) => {
    const texto = `${e.titulo ?? ''}\n${e.descricao ?? ''}`;
    for (const m of texto.matchAll(RE_PROCESSO)) {
      const classe = CLASSE_PROCESSO[chave(m[1])];
      if (!classe || pareceAno(m[2])) continue;
      const numero = String(Number(m[2].replace(/\./g, '')));
      const rotulo = `${classe} ${numero}`;
      reg.add('processo', chave(rotulo), rotulo, i);
    }
    for (const [re, rotulo] of PROCESSO_APELIDO) {
      if (re.test(texto)) reg.add('processo', chave(rotulo), rotulo, i);
    }
    for (const m of texto.matchAll(RE_OPERACAO)) {
      const nome = nomeOperacao(m[1]);
      if (nome) reg.add('operacao', chave(nome), `Operação ${nome}`, i);
    }
  });

  // Pass 3: tags. A tag names a node only when it matches a known node
  // (or alias) exactly; no fuzzy matching.
  const porSlug = new Map<string, string>();
  for (const [id, c] of reg.itens) {
    const k = id.slice(id.indexOf(':') + 1);
    if (c.tipo === 'operacao') {
      porSlug.set(`operacao-${k.replace(/ /g, '-')}`, id);
      porSlug.set(k.replace(/ /g, '-'), id);
    } else if (c.tipo === 'pessoa') {
      porSlug.set(k.replace(/ /g, '-'), id);
    }
  }
  for (const [v, canon] of aliasPessoa) porSlug.set(v.replace(/ /g, '-'), `pessoa:${chave(canon)}`);
  // Lower-case institution variants are tag forms ("stf", "policia-federal").
  for (const v of Object.values(INSTITUICAO_ALIAS).flat()) {
    if (v === v.toLowerCase()) porSlug.set(slug(v), `instituicao:${chave(aliasInst.get(chave(v))!)}`);
  }

  ordenados.forEach((e, i) => {
    for (const t of e.tags ?? []) {
      const s = slug(t);
      const mp = RE_TAG_PROCESSO.exec(s);
      if (mp && !pareceAno(mp[2])) {
        const rotulo = `${CLASSE_PROCESSO[mp[1]]} ${Number(mp[2])}`;
        reg.add('processo', chave(rotulo), rotulo, i);
        continue;
      }
      const id = porSlug.get(s);
      if (!id) continue;
      const c = reg.itens.get(id);
      if (c) c.eventos.add(i);
      else if (id.startsWith('pessoa:')) {
        const canon = aliasPessoa.get(id.slice(7))!;
        reg.add('pessoa', id.slice(7), canon, i);
      }
    }
  });

  // Keep nodes above the per-type threshold.
  const nos: NoGrafo[] = [];
  for (const [id, c] of reg.itens) {
    if (c.eventos.size < MINIMO_EVENTOS[c.tipo]) continue;
    const rotulo = [...c.rotulos].sort((a, b) => b[1] - a[1])[0][0];
    nos.push({ id, rotulo, tipo: c.tipo, ev: [...c.eventos].sort((a, b) => a - b) });
  }
  nos.sort((a, b) => b.ev.length - a.ev.length || a.rotulo.localeCompare(b.rotulo, 'pt-BR'));

  // Co-occurrence edges.
  const porEvento: number[][] = eventos.map(() => []);
  nos.forEach((n, ni) => n.ev.forEach((ei) => porEvento[ei].push(ni)));
  const pares = new Map<string, number[]>();
  porEvento.forEach((lista, ei) => {
    for (let x = 0; x < lista.length; x++) {
      for (let y = x + 1; y < lista.length; y++) {
        const a = Math.min(lista[x], lista[y]);
        const b = Math.max(lista[x], lista[y]);
        const k = `${a},${b}`;
        const arr = pares.get(k);
        if (arr) arr.push(ei);
        else pares.set(k, [ei]);
      }
    }
  });
  const arestas: ArestaGrafo[] = [...pares].map(([k, ev]) => {
    const [a, b] = k.split(',').map(Number);
    return [a, b, ev];
  });

  // Drop events no node points to, then reindex.
  const usados = new Set<number>();
  for (const n of nos) for (const ei of n.ev) usados.add(ei);
  const novoIdx = new Map<number, number>();
  const eventosUsados: EventoGrafo[] = [];
  eventos.forEach((ev, i) => {
    if (!usados.has(i)) return;
    novoIdx.set(i, eventosUsados.length);
    eventosUsados.push(ev);
  });
  for (const n of nos) n.ev = n.ev.map((i) => novoIdx.get(i)!);
  for (const a of arestas) a[2] = a[2].map((i) => novoIdx.get(i)!);

  return {
    gerado_em: new Date().toISOString().slice(0, 10),
    aviso: AVISO,
    criterios: {
      pessoa: { minimo_eventos: MINIMO_EVENTOS.pessoa, fontes: 'pessoas_envolvidas (normalizado) e tags com o nome exato' },
      processo: { minimo_eventos: MINIMO_EVENTOS.processo, fontes: 'classe e número citados no título ou na descrição, e tags como adpf-1141' },
      operacao: { minimo_eventos: MINIMO_EVENTOS.operacao, fontes: '"Operação <Nome>" no título ou na descrição, e tags com o nome exato' },
      instituicao: { minimo_eventos: MINIMO_EVENTOS.instituicao, fontes: 'instituicoes_envolvidas (normalizado) e tags com o nome exato' },
    },
    periodo: [eventosUsados[0]?.[1] ?? '', eventosUsados.at(-1)?.[1] ?? ''],
    eventos: eventosUsados,
    nos,
    arestas,
  };
}
