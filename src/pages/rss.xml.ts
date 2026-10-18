import type { APIRoute } from 'astro';
import data from '../data/assuntos.json';

// RSS feed manual — sem dependência de @astrojs/rss
export const GET: APIRoute = ({ site }) => {
  const siteUrl = site?.toString().replace(/\/$/, '') ?? 'https://lawfare-timeline.vercel.app';

  const recent = [...data.assuntos]
    .sort((a, b) => b.data_evento.localeCompare(a.data_evento))
    .slice(0, 100);

  const items = recent.map(evt => {
    const desc = evt.descricao && evt.descricao !== 'N/A' ? evt.descricao : evt.titulo;
    const date = new Date(evt.data_iso || evt.data_evento).toUTCString();
    return `
    <item>
      <title><![CDATA[${evt.titulo}]]></title>
      <link>${siteUrl}/evento/${evt.id}/</link>
      <guid>${siteUrl}/evento/${evt.id}/</guid>
      <pubDate>${date}</pubDate>
      <description><![CDATA[${desc}]]></description>
      <category>${evt.categoria}</category>
    </item>`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Lawfare Timeline</title>
    <link>${siteUrl}</link>
    <description>Cronologia documentada de abusos de poder no Brasil — 1400+ eventos</description>
    <language>pt-BR</language>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
