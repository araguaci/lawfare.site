import type { APIRoute } from 'astro';
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3-force';
import type { SimulationNodeDatum } from 'd3-force';
import data from '../../data/assuntos.json';
import { construirGrafo, type EventoEntrada } from '../../lib/grafo';

interface NoLayout extends SimulationNodeDatum {
  i: number;
  r: number;
}

/**
 * Static graph for /teia. The layout is computed here, at build time, so the
 * browser only nudges positions when filters change. d3-force seeds its own
 * random source, so the output is deterministic for the same data.
 */
function comLayout() {
  const g = construirGrafo(data.assuntos as EventoEntrada[]);
  const nos: NoLayout[] = g.nos.map((n, i) => ({ i, r: 4 + Math.sqrt(n.ev.length) * 1.6 }));
  const links = g.arestas.map((a) => ({ source: a[0], target: a[1], w: a[2].length }));

  forceSimulation(nos)
    .force('charge', forceManyBody().strength(-60))
    .force(
      'link',
      forceLink(links)
        .id((d) => (d as NoLayout).i)
        .distance(60)
        .strength((l) => Math.min(1, 0.15 + l.w / 20)),
    )
    .force('collide', forceCollide<NoLayout>().radius((d) => d.r + 3))
    // Pull loosely connected nodes in so the initial view is compact.
    .force('x', forceX(0).strength(0.06))
    .force('y', forceY(0).strength(0.06))
    .stop()
    .tick(400);

  return {
    ...g,
    nos: g.nos.map((n, i) => ({ ...n, x: Math.round(nos[i].x ?? 0), y: Math.round(nos[i].y ?? 0) })),
  };
}

export const GET: APIRoute = () => {
  return new Response(JSON.stringify(comLayout()), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
