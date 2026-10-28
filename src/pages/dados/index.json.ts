import type { APIRoute } from 'astro';
import { catalogoJson } from '../../lib/publicData';

export const GET: APIRoute = () => {
  return new Response(JSON.stringify(catalogoJson()), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
