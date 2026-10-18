# 📋 Lawfare Timeline — Próximos Passos & To-Dos

Backlog estruturado de melhorias, novos recursos e plano de evolução técnica e editorial para a **Lawfare Timeline Brasil**.

---

## 📌 Status Atual do Projeto
* [x] **Astro 4 SSG**: Geração estática de mais de 3.800 páginas HTML ultra-rápidas.
* [x] **Multi-Tema**: 4 temas curados (*Obsidian Dark*, *Editorial Light*, *Midnight Navy*, *Cyber Terminal*) com persistência e carregamento anti-FOUC.
* [x] **Busca Pagefind Extended**: Busca offline em tempo real com filtros por relevância e categoria e atalho de teclado global (`/` ou `Ctrl+K`).
* [x] **Landing Page Premium**: Bento Grid com métricas dinâmicas ao vivo, cards de categorias e tags.
* [x] **Toolbar de Compartilhamento no Evento**: Cópia instantânea de link com feedback no clipboard e compartilhamento direto no X.

---

## 🗺️ Roadmap de Evolução

### 1. Visualização de Dados & Navegação Interativa
- [ ] **Grafo de Conexões de Atores (Network Graph)**
  - *Objetivo:* Visualizar graficamente a teia de relações entre figuras públicas, instituições, delações e inquéritos judiciais.
  - *Tecnologia sugerida:* D3.js force-directed graph ou Cytoscape.js embutido em página dedicada `/grafos`.
  - *Entregável:* Filtro por ator (ex: "Gilmar Mendes", "Sergio Moro", "Alexandre de Moraes") exibindo nós interconectados.

- [ ] **Visualizador Scrollytelling Horizontal por Décadas**
  - *Objetivo:* Modo de exploração contínuo que divide os 45 anos em épocas históricas:
    - `1979–1990`: Abertura e redemocratização
    - `1990–2002`: Era Collor e FHC
    - `2003–2013`: Governos Lula/Dilma pré-Lava Jato
    - `2014–2018`: Lava Jato e Impeachment
    - `2019–2022`: Inquéritos das Fake News e Governo Bolsonaro
    - `2023–2026`: Eventos pós-eleição, Vaza Toga e decisões contemporâneas
  - *Tecnologia:* Linha do tempo horizontal navegável por mousewheel / drag.

- [ ] **Filtro Avançado com Seletor de Intervalo de Datas (Date Range Slider)**
  - *Objetivo:* Permitir ao usuário limitar a timeline a períodos específicos sem depender apenas da paginação de 50 itens.
  - *Tecnologia:* Slider de intervalo em Vanilla JS sem bibliotecas pesadas.

- [ ] **Comparador de Trajetórias (Side-by-Side Comparison)**
  - *Objetivo:* Comparar dois réus, duas operações ou dois ministros lado a lado na mesma linha do tempo temporal.

---

### 2. Compartilhamento, Social & Distribuição
- [ ] **Geração Dinâmica de OG Images (Sharecards Automáticos)**
  - *Objetivo:* Cada um dos 1.400+ eventos ter sua própria imagem de pré-visualização no WhatsApp, Telegram e X.
  - *Tecnologia:* `@astrojs/satori` ou geração estática de cartões SVG/PNG com data, categoria, título e selo Lawfare Timeline.
  - *Formato ideal:* Proporção 1200x630px com contraste alto respeitando o tema ativo.

- [ ] **Exportação de Dossiê em PDF & Markdown**
  - *Objetivo:* Permitir que jornalistas, advogados e pesquisadores baixem um dossiê consolidado:
    - "Baixar todos os eventos da categoria STF em PDF"
    - "Baixar todos os eventos com a tag 'Operação Satiagraha' em Markdown"
  - *Tecnologia:* Script de renderização para impressão com `@media print` já estilizada ou exportador via client-side.

- [ ] **Feeds RSS Segmentados por Categoria**
  - *Objetivo:* Além do feed global `/rss.xml`, permitir que leitores assinem feeds específicos:
    - `/categoria/stf/rss.xml`
    - `/categoria/operacoes/rss.xml`
    - `/categoria/vazatoga/rss.xml`

- [ ] **Template de Threads Automáticas para o X (Twitter)**
  - *Objetivo:* Gerador de thread a partir de qualquer evento com marcador de fonte e citação direta.

---

### 3. Curadoria, Higienização & Enriquecimento de Dados
- [ ] **Padronização e Agrupamento de Nomes de Pessoas Envolvidas**
  - *Problema:* Algumas entradas usam variações do mesmo nome (ex: "Alexandre de Moraes" vs "Ministro Alexandre de Moraes").
  - *Ação:* Criar script de unificação de aliases no diretório `scripts/normalizar-atores.mjs`.

- [ ] **Validador Contínuo de Links de Fontes Primárias**
  - *Objetivo:* Script que verifica requisições HTTP para todos os links em `evento.fontes`:
    - Identificar links quebrados (404/410).
    - Salvar automaticamente snapshots na Wayback Machine (archive.org).
    - Substituir ou adicionar links de espelho (*Wayback fallback*).

- [ ] **Campo de Local Geográfico e Mapa de Operações**
  - *Objetivo:* Extrair cidade/estado de cada evento e apresentar mapa do Brasil com *heat map* de operações judiciais.

---

### 4. Performance, PWA & DevOps
- [ ] **PWA Completo com Suporte Offline**
  - *Objetivo:* Transformar o projeto em um aplicativo instalável para desktop e celular.
  - *Tecnologia:* Manifesto `manifest.json`, favicons dedicados, Service Worker para cache estático e busca utilizável 100% desconectado da internet.

- [ ] **Pipeline CI/CD no GitHub Actions**
  - *Workflow:*
    1. `npm run audit`: bloqueia PRs com dados corrompidos ou IDs faltantes.
    2. `npm run build`: gera os assets estáticos e Pagefind.
    3. Deploy automatizado para Vercel ou Cloudflare Pages com visualização prévia em branch.

- [ ] **Otimização Contínua de Lighthouse (Target: 100/100 em todas as métricas)**
  - Pré-carregamento otimizado de fontes.
  - Minificação de assets CSS em pipeline de release.

---

## 💡 Como Contribuir ou Executar Tarefas do Backlog

Para trabalhar em qualquer uma das tarefas acima:
1. Verifique os scripts em [`scripts/`](file:///d:/ai-projects/lawfare-br/lawfare-astro/scripts) antes de alterar a base [`data/assuntos.json`](file:///d:/ai-projects/lawfare-br/lawfare-astro/data/assuntos.json).
2. Sempre execute `npm run audit` e `npm run build:only` para garantir que novas alterações não quebrem a integridade estrutural.
3. Marque a caixa de seleção correspondente neste arquivo ao concluir uma tarefa.
