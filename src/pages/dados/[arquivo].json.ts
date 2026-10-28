import type { APIRoute, GetStaticPaths } from 'astro';
import { datasetJson, yearsFromAssuntos } from '../../lib/publicData';

export const getStaticPaths = (() => {
  const years = yearsFromAssuntos().map((ano) => ({
    params: { arquivo: `lawfare-${ano.ano}` },
    props: { ano: String(ano.ano) },
  }));
  return [...years, { params: { arquivo: 'lawfare-full' }, props: { ano: 'full' } }];
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const ano = (props as { ano: string }).ano;
  return new Response(JSON.stringify(datasetJson(ano)), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
