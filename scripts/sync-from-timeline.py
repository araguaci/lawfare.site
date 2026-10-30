#!/usr/bin/env python3
"""Reconcilia o Astro com o lawfare-timeline usando o timeline como dono dos ids.

Para cada id do timeline:
  - mesma ficha no site (mesmo fonte_arquivo ou título+data): mantém a versão do
    site, que carrega as limpezas locais;
  - ficha diferente no mesmo id: a do timeline entra e a do site vai para o id que
    ela tem no timeline (a troca fica registrada em src/data/id-changes.json);
  - id ausente no site: entra a ficha do timeline.
Fichas que só existem no site são mantidas e listadas como órfãs.
Nas fichas mantidas, descricao (">", vazia) e fontes sem link http estragadas no
site são trocadas pelas do timeline quando lá estiverem boas.

Uso:
  python scripts/sync-from-timeline.py --dry-run
  python scripts/sync-from-timeline.py
  LAWFARE_TIMELINE=D:/outro/caminho python scripts/sync-from-timeline.py
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import unicodedata
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

ASTRO = Path(__file__).resolve().parents[1]
TIMELINE = Path(os.environ.get("LAWFARE_TIMELINE") or ASTRO.parent / "lawfare-timeline")
ROOT_FULL = ASTRO / "lawfare-full.json"
ID_CHANGES = ASTRO / "src" / "data" / "id-changes.json"
# Recorte do acervo: textos de 1855/1900 (ids 1–12 do timeline) não são eventos.
DATA_MINIMA = "1979-01-01"

CANON = [
    "titulo",
    "data_evento",
    "data_iso",
    "categoria",
    "tags",
    "descricao",
    "relevancia",
    "impacto_diplomatico",
    "tipo_escandalo",
    "fontes",
    "pessoas_envolvidas",
    "instituicoes_envolvidas",
    "pais",
    "valor_envolvido",
    "prioridade",
    "fonte_arquivo",
    "id",
]
KEEP_EXTRA = [
    "fontes_verificadas",
    "connections",
    "lacuna_investigativa",
    "analise",
    "padroes_ativados",
    "padroes_sistemicos",
    "slug",
]

CAT_MAP = {
    "crime-organizado-transnacional": "operacoes",
    None: "estudos",
    "": "estudos",
}


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )


def as_list(value) -> list:
    if value is None:
        return []
    if isinstance(value, list):
        return [x for x in value if x not in (None, "")]
    if isinstance(value, str) and value.strip() and value != "N/A":
        return [value.strip()]
    return []


def year_of(entry: dict) -> int:
    raw = str(entry.get("data_evento") or "")
    try:
        y = int(raw[:4])
        return y if y >= 1 else 1
    except ValueError:
        return 1


def normalize(entry: dict) -> dict | None:
    titulo = (entry.get("titulo") or "").strip()
    if not titulo:
        return None
    data_evento = (entry.get("data_evento") or "").strip()
    if not data_evento:
        data_evento = (entry.get("data_registro") or "")[:10]
    if not data_evento or data_evento.startswith("0001"):
        return None

    categoria = entry.get("categoria")
    categoria = CAT_MAP.get(categoria, categoria) or "estudos"

    descricao = (entry.get("descricao") or "").strip()
    if not descricao:
        descricao = (
            entry.get("observacao_analitica")
            or entry.get("analise")
            or entry.get("evidencia_primaria")
            or ""
        )
        if isinstance(descricao, list):
            descricao = " ".join(str(x) for x in descricao)

    tags = as_list(entry.get("tags"))
    if not tags:
        tags = as_list(entry.get("padroes_ativados"))
    if categoria and categoria not in tags:
        tags = [categoria] + tags

    pessoas = as_list(entry.get("pessoas_envolvidas"))
    if not pessoas:
        atores = entry.get("atores") or []
        if isinstance(atores, list):
            for item in atores:
                if isinstance(item, dict):
                    nome = item.get("nome") or item.get("pessoa")
                    if nome:
                        pessoas.append(str(nome))
                elif item:
                    pessoas.append(str(item))

    fontes = as_list(entry.get("fontes"))
    if not fontes:
        ev = entry.get("evidencia_primaria")
        if isinstance(ev, str) and ev.startswith("http"):
            fontes = [ev]
        elif isinstance(ev, list):
            fontes = [str(x) for x in ev if str(x).startswith("http")]

    data_iso = entry.get("data_iso") or ""
    if not data_iso or data_iso.startswith("T"):
        data_iso = f"{data_evento}T12:00:00.000Z"

    out = {
        "titulo": titulo,
        "data_evento": data_evento,
        "data_iso": data_iso,
        "categoria": categoria,
        "tags": tags or [categoria],
        "descricao": descricao or titulo,
        "relevancia": entry.get("relevancia") or "media",
        "impacto_diplomatico": entry.get("impacto_diplomatico") or "N/A",
        "tipo_escandalo": entry.get("tipo_escandalo") or "N/A",
        "fontes": fontes or ["N/A"],
        "pessoas_envolvidas": pessoas,
        "instituicoes_envolvidas": as_list(entry.get("instituicoes_envolvidas")),
        "pais": entry.get("pais") or "Brasil",
        "valor_envolvido": entry.get("valor_envolvido") or "N/A",
        "prioridade": entry.get("prioridade") if isinstance(entry.get("prioridade"), int) else 2,
        "fonte_arquivo": entry.get("fonte_arquivo") or "N/A",
        "id": entry["id"],
    }
    for key in KEEP_EXTRA:
        if entry.get(key) not in (None, "", [], {}):
            out[key] = entry[key]
    return out


def copy_post(fonte: str) -> bool:
    if not fonte or fonte in ("N/A", ""):
        return False
    rel = fonte.replace("\\", "/").lstrip("/")
    src = TIMELINE / rel
    dst = ASTRO / "public" / rel
    if not src.is_file():
        return False
    if dst.is_file():
        return False
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    return True


def rebuild_year_files(assuntos: list[dict], meta: dict) -> dict:
    by_year: dict[int, list] = defaultdict(list)
    for item in assuntos:
        by_year[year_of(item)].append(item)

    data_dir = ASTRO / "data"
    years_index = []
    for year in sorted(by_year):
        chunk = by_year[year]
        name = f"lawfare-{year:04d}.json" if year != 1 else "lawfare-0001.json"
        dump(
            data_dir / name,
            {
                "total": len(chunk),
                "data_extração": meta["data_extração"],
                "periodo": meta["periodo"],
                "fonte_original": meta["fonte_original"],
                "nota": meta.get("nota", ""),
                "ano": year,
                "assuntos": chunk,
            },
        )
        years_index.append(
            {
                "ano": year,
                "total": len(chunk),
                "arquivo": name,
            }
        )
    return {
        "gerado_em": meta["data_extração"],
        "fonte_original": meta["fonte_original"],
        "total_eventos": len(assuntos),
        "total_verificado": len(assuntos),
        "anos": years_index,
    }


def fonte_key(entry: dict) -> str:
    raw = str(entry.get("fonte_arquivo") or "").replace("\\", "/").strip("/").lower()
    return "" if raw in ("", "n/a") else raw


def titulo_key(entry: dict) -> tuple[str, str]:
    titulo = unicodedata.normalize("NFKD", str(entry.get("titulo") or ""))
    titulo = titulo.encode("ascii", "ignore").decode().lower()
    return (str(entry.get("data_evento") or "")[:10], re.sub(r"[^a-z0-9]+", "", titulo)[:60])


def bad_descricao(value) -> bool:
    return not isinstance(value, str) or value.strip() in ("", ">", "|", ">-", "|-", ">+", "|+")


def has_http(fontes) -> bool:
    return isinstance(fontes, list) and any(str(f).startswith("http") for f in fontes)


def repair_from_timeline(local: dict, ficha: dict) -> list[str]:
    """Traz do timeline só descricao/fontes que o site tem estragadas."""
    fixed = []
    if bad_descricao(local.get("descricao")) and not bad_descricao(ficha.get("descricao")):
        local["descricao"] = ficha["descricao"]
        fixed.append("descricao")
    if not has_http(local.get("fontes")) and has_http(ficha.get("fontes")):
        local["fontes"] = ficha["fontes"]
        fixed.append("fontes")
    return fixed


def same_ficha(a: dict, b: dict) -> bool:
    if fonte_key(a) and fonte_key(a) == fonte_key(b):
        return True
    return titulo_key(a) == titulo_key(b)


def build_lookup(entries: list[dict]):
    by_fonte: dict[str, list[int]] = defaultdict(list)
    by_titulo: dict[tuple[str, str], list[int]] = defaultdict(list)
    for e in entries:
        if fonte_key(e):
            by_fonte[fonte_key(e)].append(e["id"])
        by_titulo[titulo_key(e)].append(e["id"])

    def find(entry: dict) -> int | None:
        """Id da mesma ficha no timeline, só quando o casamento é inequívoco."""
        hits = by_fonte.get(fonte_key(entry), []) if fonte_key(entry) else []
        if len(hits) != 1:
            hits = by_titulo.get(titulo_key(entry), [])
        return hits[0] if len(hits) == 1 else None

    return find


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="só mostra o relatório")
    args = parser.parse_args()

    src = load(TIMELINE / "_data" / "lawfare.json")
    dst_path = ASTRO / "src" / "data" / "assuntos.json"
    dst = load(dst_path)
    site = {e["id"]: e for e in dst["assuntos"] if isinstance(e.get("id"), int)}

    timeline: dict[int, dict] = {}
    skipped = []
    for raw in src["assuntos"]:
        eid = raw.get("id")
        if not isinstance(eid, int):
            continue
        norm = normalize(raw)
        if not norm or norm["data_evento"] < DATA_MINIMA:
            skipped.append(eid)
            continue
        timeline[eid] = norm
    find_in_timeline = build_lookup(list(timeline.values()))

    kept, added, replaced = [], [], []
    repaired: Counter = Counter()
    for eid, ficha in timeline.items():
        local = site.get(eid)
        if local is None:
            added.append(ficha)
        elif same_ficha(local, ficha):
            repaired.update(repair_from_timeline(local, ficha))
            kept.append(local)
        else:
            replaced.append(ficha)

    today = date.today().isoformat()
    id_changes = load(ID_CHANGES) if ID_CHANGES.is_file() else {}
    moved, orphans, lost = [], [], []
    for eid, local in site.items():
        if eid in timeline and same_ficha(local, timeline[eid]):
            continue
        novo_id = find_in_timeline(local)
        if novo_id is None:
            if eid in timeline:
                lost.append(local)
                print(f"  ERRO: #{eid} '{local['titulo'][:60]}' perde o id e não existe no timeline")
            else:
                orphans.append(local)
                print(f"  aviso: #{eid} '{local['titulo'][:60]}' sem par inequívoco no timeline")
            continue
        if novo_id != eid:
            moved.append((eid, novo_id, local["titulo"]))
            id_changes[str(eid)] = {
                "titulo_anterior": local["titulo"],
                "novo_id": novo_id,
                "alterado_em": today,
            }

    for old_id, new_id, titulo in sorted(moved):
        print(f"  #{old_id} -> #{new_id}  {titulo[:70]}")

    copied = 0
    for item in added + replaced:
        if not args.dry_run and copy_post(item.get("fonte_arquivo", "")):
            copied += 1

    merged = kept + added + replaced + orphans
    merged.sort(key=lambda e: (str(e.get("data_evento") or ""), e.get("id") or 0))
    max_id = max(site)

    print(f"astro_antes {len(site)} timeline_eventos {len(timeline)} ignorados_fora_do_recorte {len(skipped)}")
    print(
        f"mantidas {len(kept)} adicionadas {len(added)} substituidas {len(replaced)} "
        f"movidas {len(moved)} orfas_mantidas {[e['id'] for e in orphans]}"
    )
    print(f"reparadas_do_timeline {dict(repaired)}")
    print(f"astro_depois {len(merged)}")
    if lost:
        raise SystemExit(
            f"{len(lost)} fichas do site seriam apagadas: recupere-as no lawfare.json do timeline antes do sync"
        )
    if args.dry_run:
        print("simulação: nada gravado")
        return

    datas = [e.get("data_evento") for e in merged if e.get("data_evento")]
    meta = {
        "total": len(merged),
        "data_extração": date.today().isoformat(),
        "periodo": f"{min(datas)} a {max(datas)}" if datas else "",
        "fonte_original": str(TIMELINE / "_data" / "lawfare.json"),
        "nota": (
            f"Sync do lawfare-timeline (ids do timeline): +{len(added)} fichas, "
            f"{len(replaced)} ids reatribuídos, {len(moved)} fichas movidas "
            f"(max_id anterior {max_id})."
        ),
    }
    payload = {**meta, "assuntos": merged}
    dump(dst_path, payload)
    dump(ASTRO / "data" / "lawfare-full.json", payload)
    dump(ROOT_FULL, payload)
    dump(ASTRO / "data" / "index.json", rebuild_year_files(merged, meta))
    dump(ID_CHANGES, dict(sorted(id_changes.items(), key=lambda kv: int(kv[0]))))

    cats = Counter(e["categoria"] for e in added + replaced)
    print(f"markdown_copiados {copied}")
    print("categorias", dict(cats))


if __name__ == "__main__":
    main()
