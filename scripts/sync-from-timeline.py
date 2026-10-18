#!/usr/bin/env python3
"""Copia para o Astro só as fichas novas do lawfare-timeline (id > max local)."""
from __future__ import annotations

import json
import shutil
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

TIMELINE = Path(r"D:\ai-projects\lawfare-timeline")
ASTRO = Path(r"D:\ai-projects\lawfare-br\lawfare-astro")
ROOT_FULL = Path(r"D:\ai-projects\lawfare-br\lawfare-full.json")

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


def main() -> None:
    src = load(TIMELINE / "_data" / "lawfare.json")
    dst_path = ASTRO / "src" / "data" / "assuntos.json"
    dst = load(dst_path)
    existing_ids = {e["id"] for e in dst["assuntos"] if isinstance(e.get("id"), int)}
    max_id = max(existing_ids)

    added = []
    skipped = []
    for raw in src["assuntos"]:
        eid = raw.get("id")
        if not isinstance(eid, int) or eid <= max_id or eid in existing_ids:
            continue
        norm = normalize(raw)
        if not norm:
            skipped.append(eid)
            continue
        added.append(norm)

    copied = 0
    for item in added:
        if copy_post(item.get("fonte_arquivo", "")):
            copied += 1

    merged = dst["assuntos"] + added
    merged.sort(key=lambda e: (str(e.get("data_evento") or ""), e.get("id") or 0))

    datas = [e.get("data_evento") for e in merged if e.get("data_evento")]
    meta = {
        "total": len(merged),
        "data_extração": date.today().isoformat(),
        "periodo": f"{min(datas)} a {max(datas)}" if datas else "",
        "fonte_original": str(TIMELINE / "_data" / "lawfare.json"),
        "nota": (
            f"Sync incremental do lawfare-timeline: +{len(added)} fichas "
            f"(id > {max_id}). IDs existentes não foram sobrescritos."
        ),
    }
    payload = {**meta, "assuntos": merged}
    dump(dst_path, payload)
    dump(ASTRO / "data" / "lawfare-full.json", payload)
    dump(ROOT_FULL, payload)
    dump(ASTRO / "data" / "index.json", rebuild_year_files(merged, meta))

    cats = Counter(e["categoria"] for e in added)
    print(f"astro_antes {len(dst['assuntos'])} max_id {max_id}")
    print(f"adicionadas {len(added)} puladas {skipped}")
    print(f"astro_depois {len(merged)} max_id {max(e['id'] for e in merged)}")
    print(f"markdown_copiados {copied}")
    print("categorias", dict(cats))


if __name__ == "__main__":
    main()
