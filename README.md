# ⚡ Lawfare Timeline Brasil

## 🛡️ Sentinel Status
- **Status:** 🟢 Produção
- **Tier:** A
- **Health:** 98% / **ROI Potencial:** Inteligência Cívica / Dossiês / OSINT / Jornalismo Investigativo
- **Stack:** Astro 4, TypeScript, Vanilla CSS Tokens (Multi-Theme), Pagefind Extended, Static SSG

---

## 🎯 Visão Geral

Cronologia documental e auditada de eventos públicos ligados a abusos de poder, instrumentalização do judiciário, operações, escândalos e decisões institucionais controversas no Brasil desde 1979. O projeto compila mais de **1.400 fichas datadas** distribuídas em **18 categorias temáticas** e centenas de tags, permitindo estudo comparativo, jornalismo de dados e pesquisa histórica independente com links diretos para fontes primárias, autos processuais e matérias de imprensa.

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
* **Bento Grid no Hero**: Métricas dinâmicas em tempo real (1.400+ eventos, 18 categorias, 45 anos documentados e 100% de fontes públicas).
* **Card Interativo de Eventos**: Pílulas nominais com ícone de autoridade (`👤`), badge pulsante de alta relevância (`● ALTA`), e sombra colorida reativa à categoria no hover.
* **Barra de Ação Rápida no Evento**: Botão de **Copiar Link** (com feedback visual no clipboard), atalho para **Compartilhar no X** e navegação contextual.

---

## 🔍 Busca Instantânea Full-Text (Pagefind)

* **Indexação Estática**: Mais de 1.900 páginas e 25.000 termos indexados localmente via Pagefind Extended v1.4.
* **Atalho Global de Teclado**: Pressione `/` ou `Ctrl+K` / `⌘K` em qualquer lugar do site para rolar e focar automaticamente na barra de busca.
* **Filtros Multifacetados**: Filtragem embutida por **Categoria** e nível de **Relevância** diretamente no input de pesquisa.
* **Tematização Automática**: As variáveis visuais do Pagefind UI adaptam-se dinamicamente conforme o tema selecionado.

---

## 🏗️ Estrutura do Repositório

```text
lawfare-astro/
├── data/
│   └── assuntos.json            # Base canônica com 1.400+ eventos
├── public/
│   ├── _data/                   # Arquivos de metadados auxiliares
│   ├── _posts/                  # Documentos markdown e fontes primárias
│   ├── pagefind/                # Índices estáticos gerados após o build
│   └── styles/
│       └── global.css           # Design tokens e folhas de estilo multi-tema
├── scripts/
│   ├── audit-json.mjs           # Auditoria e validação de consistência dos dados
│   ├── fill-empty-descricoes.mjs# Preenchimento automático de resumos a partir do MD
│   ├── limpar-pessoas-envolvidas.mjs # Higienização de metadados em arrays nominais
│   └── sync-from-timeline.py    # Sincronização e ingestão da fonte original
├── src/
│   ├── components/
│   │   ├── EventoCard.astro     # Card de evento individual com hover e relevância
│   │   ├── FilterBar.astro      # Barra de navegação por categorias temáticas
│   │   ├── Paginacao.astro      # Navegação paginada (50 eventos por página)
│   │   ├── TagFilterBar.astro   # Chips interativos de filtragem por tags
│   │   ├── ThemeSwitcher.astro  # Menu suspenso de seleção de temas visuais
│   │   └── Timeline.astro       # Componente de visualização cronológica vertical
│   ├── layouts/
│   │   └── Base.astro           # Shell HTML5, SEO, anti-FOUC, header e footer
│   ├── pages/
│   │   ├── categoria/[cat]/     # Listagens filtradas por categoria
│   │   ├── evento/[id].astro    # Detalhe do evento e leitor de fonte Markdown
│   │   ├── pagina/[page].astro  # Paginação geral da linha do tempo
│   │   ├── tag/[slug]/          # Listagens de eventos por tag
│   │   ├── tags/index.astro     # Catálogo alfabético e frequencial de tags
│   │   ├── index.astro          # Landing page principal com Bento Grid
│   │   ├── rss.xml.ts           # Feed RSS estruturado para leitores e agregadores
│   │   └── sobre.astro          # Metodologia e manifesto do projeto
│   └── types/
│       └── evento.ts            # Tipagens TypeScript inferidas e helpers de cor/rotulação
├── astro.config.mjs             # Configuração estática do Astro 4
├── package.json                 # Dependências e scripts de automação
└── pagefind.config.yml          # Regras de indexação do Pagefind
```

---

## 🛠️ Comandos de Desenvolvimento

### Instalação
```bash
npm install
```

### Modo de Desenvolvimento
```bash
npm run dev
# Servidor local disponível em http://localhost:4321
```

### Build de Produção
```bash
# Executa auditoria dos dados, build do Astro e indexação do Pagefind
npm run build

# Build rápido (Astro + Pagefind, sem re-auditoria)
npm run build:fast

# Build estático isolado do Astro
npm run build:only
```

### Pré-visualização do Build
```bash
npm run preview
```

### Auditoria e Qualidade de Dados
```bash
# Audita integridade, duplicatas e campos obrigatórios do JSON
npm run audit

# Preenche descrições vazias a partir dos arquivos Markdown locais
npm run fill-desc
```

---

## 🚀 Próximos Passos & To-Dos

Consulte o arquivo [`TODOS.md`](TODOS.md) para o roadmap detalhado de evolução do projeto.

### 📌 Resumo das Prioridades

- [ ] **Grafos de Conexões de Atores**: Visualização em teia interativa (ex: D3.js / Cytoscape) conectando figuras públicas, decisões judiciais e operações.
- [ ] **Linha do Tempo Visual Interativa (Scrollytelling)**: Modo alternativo horizontal por anos e décadas com marcos de alta relevância.
- [ ] **Geração Dinâmica de OG Images (Sharecards)**: Cartões gerados automaticamente via `@astrojs/satori` para compartilhamento rico no X e WhatsApp.
- [ ] **Filtro Avançado por Intervalo de Datas**: Seletor de período temporal (ex: "2014-2018", "Lava Jato", "Inquérito das Fake News").
- [ ] **Exportação de Dossiês em PDF / Markdown**: Botão para download de dossiês consolidados por categoria ou pessoa envolvida.
- [ ] **Modo de Apresentação / Slides**: Apresentação dinâmica de eventos para estudo e aulas.
- [ ] **Deploy Contínuo Automatizado**: GitHub Actions com deploy para Vercel / Cloudflare Pages a cada push na branch principal.

---

*Lawfare Timeline Brasil — Documentação pública, jornalismo de dados e auditoria cívica.*
