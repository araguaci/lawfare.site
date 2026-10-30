# ⚡ Lawfare Timeline Brasil

## 🛡️ Sentinel Status
- **Status:** 🟢 Produção
- **Tier:** A
- **Health:** 98% / **ROI Potencial:** Inteligência Cívica / Dossiês / OSINT / Jornalismo Investigativo
- **Stack:** Astro 7, TypeScript, Vanilla CSS Tokens (Multi-Theme), Pagefind Extended, d3-force, Static SSG
- **Requisitos:** Node ≥ 22.22, pnpm 10 (versão fixada em `packageManager`)

---

## 🎯 Visão Geral

Cronologia documental e auditada de eventos públicos ligados a abusos de poder, instrumentalização do judiciário, operações, escândalos e decisões institucionais controversas no Brasil desde 1979. O projeto compila **1.905 fichas datadas** distribuídas em **18 categorias temáticas** e centenas de tags, permitindo estudo comparativo, jornalismo de dados e pesquisa histórica independente com links diretos para fontes primárias, autos processuais e matérias de imprensa.

---

## 🎨 Design System & Multi-Tema

O projeto adota uma arquitetura CSS moderna em tokens nativos (*Zero Tailwind*), com suporte a **4 temas curados** selecionáveis pelo componente flutuante no cabeçalho:

| Tema | Identidade Visual | Paleta & Destaques |
| :--- | :--- | :--- |
| **Obsidian Dark** *(Padrão)* | Cyber / Slate editorial moderno | Fundo `#080c14`, acentos em esmeralda mint (`#10b981`) e ciano |
| **Editorial Light** | Papel jornal / Arquivo histórico | Fundo marfim `#f8f9fa`, texto `#0f172a`, acentos rubi (`#e11d48`) e teal |
| **Midnight Navy** | Inteligência cívica / OSINT | Azul marinho profundo `#060b17`, acentos azul elétrico (`#38bdf8`) e ciano |
| **Cyber Terminal** | Hacker dossier / OLED | Fundo `#000000` absoluto, texto de alto contraste e verde fósforo (`#22c55e`) |

### Características de UX/UI
* **Anti-FOUC Instantâneo**: Script síncrono injetado no `<head>` do layout base garante que o tema armazenado no `localStorage` seja aplicado antes do primeiro paint, sem piscadas de tela.
* **Tipografia Curada**:
  * **Plus Jakarta Sans**: Títulos, cabeçalhos, branding e métricas de impacto.
  * **Inter**: Leitura fluida para resumos, fichas e conteúdo documental extenso.
  * **JetBrains Mono**: Datas, identificadores (`#1836`), tags técnicas e atalhos.
* **Bento Grid no Hero**: Métricas dinâmicas em tempo real (1.900+ eventos, 18 categorias, 45 anos documentados e 100% de fontes públicas).
* **Card Interativo de Eventos**: Pílulas nominais com ícone de autoridade (`👤`), badge pulsante de alta relevância (`● ALTA`), e sombra colorida reativa à categoria no hover.
* **Barra de Ação Rápida no Evento**: Botão de **Copiar Link** (com feedback visual no clipboard), atalho para **Compartilhar no X** e navegação contextual.

---

## 🔍 Busca Instantânea Full-Text (Pagefind)

* **Indexação Estática**: Mais de 1.900 páginas e 25.000 termos indexados localmente via Pagefind Extended v1.4.
* **Atalho Global de Teclado**: Pressione `/` ou `Ctrl+K` / `⌘K` em qualquer lugar do site para rolar e focar automaticamente na barra de busca.
* **Filtros Multifacetados**: Filtragem embutida por **Categoria** e nível de **Relevância** diretamente no input de pesquisa.
* **Tematização Automática**: As variáveis visuais do Pagefind UI adaptam-se dinamicamente conforme o tema selecionado.

---

## 🕸️ Teia de Coocorrência (`/teia`)

Grafo interativo (d3-force) de **pessoas, processos judiciais, operações e instituições** citados nas mesmas fichas.

* **Gerado no build**: `src/lib/grafo.ts` monta nós, arestas e layout a partir de `src/data/assuntos.json` e publica `/teia/grafo.json`; o navegador só filtra.
* **Normalização**: descarta rótulos de planilha, cargos e códigos em `pessoas_envolvidas`, unifica siglas de instituições e extrai processos (ADPF, Inq, AP…) e operações do texto e das tags. Há um mínimo de fichas por tipo de nó.
* **Interação**: busca, filtros por tipo, período e peso, e clique no nó listando as fichas com link para `/evento/[id]`.
* **Leitura correta**: uma ligação significa apenas que os dois nomes aparecem na mesma ficha — não indica culpa nem vínculo causal, e a página avisa isso.
* **Revisão de qualidade**: `node scripts/grafo-relatorio.mjs [--todos]` lista os nós e ajuda a calibrar limiares e listas de exclusão.

---

## 🔄 Origem dos Dados (lawfare-timeline)

As fichas vêm do repositório Jekyll [`lawfare-timeline`](https://github.com/araguaci/lawfare-timeline), que é o **dono dos ids**. A importação é feita por `scripts/sync-from-timeline.py`; o processo completo, as regras de ids e os erros que ele evita estão em [`scripts/sync-from-timeline.md`](scripts/sync-from-timeline.md).

```bash
python scripts/sync-from-timeline.py --dry-run   # relatório, nada gravado
python scripts/sync-from-timeline.py             # grava
```

* Fichas que mudaram de id ficam em `src/data/id-changes.json`; a página do id antigo avisa e aponta para o novo.
* Não edite ids à mão em `src/data/assuntos.json`: corrija no timeline e rode o sync.

---

## 🏗️ Estrutura do Repositório

```text
lawfare.site/
├── .github/workflows/
│   ├── validate.yml             # CI: pnpm install, auditoria do JSON e build
│   └── nightly.yml              # Atualização automática do Astro
├── data/
│   ├── index.json               # Índice dos arquivos por ano
│   ├── lawfare-AAAA.json        # Fichas por ano (gerados pelo sync)
│   └── lawfare-full.json        # Cópia completa (gerada pelo sync)
├── public/
│   ├── _posts/                  # Markdown original de cada ficha (copiado do timeline)
│   ├── pagefind/                # Índices estáticos gerados após o build
│   └── styles/global.css        # Design tokens e folhas de estilo multi-tema
├── scripts/
│   ├── audit-json.mjs           # Validação dos dados; bloqueia o build em caso de erro
│   ├── sync-from-timeline.py    # Importação do lawfare-timeline (ver .md ao lado)
│   ├── sync-from-timeline.md    # Documentação do processo de importação
│   ├── generate-og.mjs          # Imagens Open Graph por evento (resvg)
│   ├── grafo-relatorio.mjs      # Relatório de qualidade dos nós da teia
│   ├── fill-empty-descricoes.mjs# Preenche descrições vazias a partir do MD
│   └── limpar-pessoas-envolvidas.mjs # Higienização de nomes
├── src/
│   ├── components/              # EventoCard, FilterBar, Paginacao, ThemeSwitcher, Timeline…
│   ├── data/
│   │   ├── assuntos.json        # Base lida pelas páginas (1.905 eventos)
│   │   └── id-changes.json      # Ids que mudaram no sync → novo id
│   ├── layouts/Base.astro       # Shell HTML5, SEO, anti-FOUC, header e footer
│   ├── lib/
│   │   └── grafo.ts             # Construção do grafo de coocorrência
│   ├── pages/
│   │   ├── categoria/[cat]/     # Listagens por categoria
│   │   ├── dados/               # JSON público por arquivo
│   │   ├── evento/[id].astro    # Detalhe do evento (com aviso de id alterado)
│   │   ├── pagina/[page].astro  # Paginação geral da linha do tempo
│   │   ├── tag/[slug]/ · tags/  # Listagens e catálogo de tags
│   │   ├── teia/                # Grafo interativo + grafo.json
│   │   ├── index.astro          # Landing page com Bento Grid
│   │   ├── rss.xml.ts           # Feed RSS
│   │   └── sobre.astro          # Metodologia
│   └── types/evento.ts          # Tipagens e helpers
├── astro.config.mjs             # Configuração do Astro (inclui geração de OG)
└── package.json                 # Dependências e scripts
```

---

## 🛠️ Comandos de Desenvolvimento

### Instalação
```bash
pnpm install
```

### Modo de Desenvolvimento
```bash
pnpm run dev
# Servidor local disponível em http://localhost:4321
```

### Build de Produção
```bash
# Executa auditoria dos dados, build do Astro e indexação do Pagefind
pnpm run build

# Build rápido (Astro + Pagefind, sem re-auditoria)
pnpm run build:fast

# Build estático isolado do Astro
pnpm run build:only

# Pular as imagens Open Graph (mais rápido)
LAWFARE_SKIP_OG=1 pnpm run build
```

### Pré-visualização do Build
```bash
pnpm run preview
```

### Auditoria e Qualidade de Dados
```bash
# Audita integridade, duplicatas e campos obrigatórios do JSON
pnpm run audit

# Preenche descrições vazias a partir dos arquivos Markdown locais
pnpm run fill-desc
```

---

## 🚀 Próximos Passos & To-Dos

Consulte o arquivo [`TODOS.md`](TODOS.md) para o roadmap detalhado de evolução do projeto.

### 📌 Resumo das Prioridades

- [x] **Grafos de Conexões de Atores**: página `/teia` com grafo de coocorrência (d3-force).
- [ ] **Linha do Tempo Visual Interativa (Scrollytelling)**: Modo alternativo horizontal por anos e décadas com marcos de alta relevância.
- [x] **Geração de OG Images (Sharecards)**: cartões por evento gerados no build por `scripts/generate-og.mjs` (resvg).
- [ ] **Filtro Avançado por Intervalo de Datas**: Seletor de período temporal (ex: "2014-2018", "Lava Jato", "Inquérito das Fake News").
- [ ] **Exportação de Dossiês em PDF / Markdown**: Botão para download de dossiês consolidados por categoria ou pessoa envolvida.
- [ ] **Modo de Apresentação / Slides**: Apresentação dinâmica de eventos para estudo e aulas.
- [x] **Deploy Contínuo**: Vercel publica cada push; GitHub Actions (`validate.yml`) roda auditoria e build em PRs.

---

*Lawfare Timeline Brasil — Documentação pública, jornalismo de dados e auditoria cívica.*
