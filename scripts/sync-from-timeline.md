# sync-from-timeline — importar o acervo do lawfare-timeline

Este documento descreve como os eventos do **lawfare-timeline** (Jekyll) chegam ao **lawfare.site** (Astro). O programa que faz a importação é o [`sync-from-timeline.py`](sync-from-timeline.py).

## Fluxo

```
lawfare-timeline/_posts/*.md
        │  extrair_posts_para_json.py  (via scripts de merge)
        │  usa lawfare_post_parser.py
        ▼
lawfare-timeline/_data/lawfare.json      ← dono dos ids
        │  reparar_descricao_fontes.py --apply   (só se houver dados antigos)
        ▼
lawfare.site/scripts/sync-from-timeline.py
        ▼
src/data/assuntos.json + data/*.json + lawfare-full.json + src/data/id-changes.json
        │  pnpm run build  (audit-json.mjs antes do astro build)
        ▼
dist/
```

## Passo a passo

1. **No timeline:** inclua os posts novos em `_data/lawfare.json` com o script de merge que você usa. Esses scripts carregam `parse_front_matter` de `extrair_posts_para_json.py`, que por sua vez usa o parser compartilhado `scripts/lawfare_post_parser.py`.
2. **No timeline, só se houver dados antigos:** repare descrições e fontes estragadas.
   ```bash
   python scripts/reparar_descricao_fontes.py
   ```
   O comando acima apenas simula e mostra contagens. Para gravar, rode de novo com `--apply`.
3. **No site, simulação:**
   ```bash
   python scripts/sync-from-timeline.py --dry-run
   ```
   Leia o relatório. Os campos `mantidas`, `adicionadas`, `substituidas` e `movidas` contam fichas, `orfas_mantidas` lista ids e `reparadas_do_timeline` traz contagens por campo. Linhas `ERRO` aparecem antes do relatório e linhas `#antigo -> #novo` aparecem logo depois delas.
4. **No site, gravação:**
   ```bash
   python scripts/sync-from-timeline.py
   ```
5. **No site, verificação:**
   ```bash
   pnpm run audit
   ```
   Depois, rode `pnpm run build`. Para pular as imagens OG, defina `LAWFARE_SKIP_OG=1`.
6. Revise o diff e faça o commit.

O caminho do timeline é, por padrão, a pasta irmã `../lawfare-timeline`. Para usar outro lugar, defina `LAWFARE_TIMELINE=D:/outro/caminho`.

## Regras do sync

O timeline é o dono dos ids. Para cada id do timeline:

| Situação no site | O que acontece |
|---|---|
| Mesmo evento (mesmo `fonte_arquivo`, ou mesmo título + data normalizados) | O sync mantém a versão do site, com as limpezas locais. |
| Id ausente | O sync adiciona a ficha do timeline e copia o `.md` para `public/_posts`. |
| Outro evento no mesmo id | A ficha do timeline ocupa o id. A ficha do site vai para o id que tem no timeline, e a troca fica registrada em `src/data/id-changes.json`. |

A página `/evento/[id]` lê o `id-changes.json` e mostra o aviso "Este endereço exibia antes…" com um link para o novo id.

Outros casos:

- **Recorte do acervo:** eventos com data anterior a `1979-01-01` ficam de fora (ids 1–12 do timeline, textos de 1855 e 1900). Entradas com data `0001` também ficam de fora, porque são páginas de tag.
- **Órfãs:** fichas que só existem no site são mantidas e aparecem como aviso.
- **Proteção contra perda de fichas:** se uma ficha do site perderia seu id e não tem par no timeline, o sync para com erro e não grava nada. Nesse caso, recupere a ficha no `lawfare.json` do timeline e rode de novo. Foi assim que o evento do Barroso, hoje #2008, foi recuperado.
- **Reparo de campos:** nas fichas mantidas, `descricao` e `fontes` vêm do timeline apenas quando a versão do site está estragada e a do timeline está boa. Estragada quer dizer descrição `>`, `|`, `>-`, `|-` ou vazia, ou fontes sem nenhum link http. Os demais campos do site não são tocados.

### Arquivos gravados

- `src/data/assuntos.json` — lido pelas páginas
- `data/lawfare-full.json`, `lawfare-full.json` (raiz), `data/index.json`, `data/lawfare-AAAA.json`
- `src/data/id-changes.json`
- `public/_posts/*.md` — só das fichas adicionadas ou substituídas

## Erros que o processo evita

| Erro antigo | Causa | Proteção atual |
|---|---|---|
| `descricao` igual a `>` | O extrator lia o YAML linha a linha e não entendia `description: >`. | `lawfare_post_parser.py` lê o front matter com PyYAML. Se ainda escapar algum caso, `audit-json.mjs` bloqueia o build. |
| `fontes: ["N/A"]` | O extrator só lia a seção `## Referências`. | O parser lê qualquer seção de Fontes ou Referências. Na falta delas, usa os links do corpo. Links de busca (Perplexity, Google, busca da Wikipedia) não contam como fonte. |
| O mesmo id usado para eventos diferentes nos dois repositórios | Scripts de merge calculavam `max_id+1` sobre JSONs diferentes. | O sync usa os ids do timeline e registra cada mudança de id. |
| Fichas apagadas silenciosamente | Ids reatribuídos no site sem par no timeline. | O sync para com erro antes de gravar. |

## Regras de processo

- Ids novos são distribuídos **somente** sobre `lawfare-timeline/_data/lawfare.json`. O `lawfare-full.json` de abril/2026 do timeline está obsoleto e não deve ser usado para gerar ids.
- Não edite à mão os ids em `src/data/assuntos.json`. Corrija no timeline e rode o sync.
- Correções de conteúdo feitas no timeline, fora `descricao` e `fontes` estragadas, **não** chegam a fichas que o site já tem. Para levá-las, edite o site também.

## Pendências conhecidas (out/2026)

- Pares duplicados nos dois repositórios: #1827/#1970, #1828/#1971 e #1849/#1856. Há ainda 56 grupos de títulos quase iguais.
- 257 eventos do site continuam sem fonte http. São posts que só têm links de busca ou que não têm arquivo `.md`.
