const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

export function formatKicker(iso) {
  if (!iso) return 'ARQUIVO PÚBLICO';
  const day = iso.slice(8, 10);
  const month = Number(iso.slice(5, 7));
  const year = iso.slice(0, 4);
  if (!day || !year || !month) return 'ARQUIVO PÚBLICO';
  return `${day} ${MONTHS[month - 1] || ''} ${year}`.trim();
}

export function cleanExcerpt(value) {
  if (!value || value === 'N/A' || value === '>') return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

export function escapeXml(value) {
  return String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function wrapText(text, maxChars) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const lines = [];
  let line = '';
  for (const word of clean.split(' ')) {
    const piece = word.length > maxChars ? `${word.slice(0, maxChars - 1)}…` : word;
    const next = line ? `${line} ${piece}` : piece;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = piece;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function safeColor(color) {
  return /^#[0-9a-fA-F]{6}$/.test(color || '') ? color : '#10b981';
}

export function shareCardSvg(card) {
  const titleLinesAll = wrapText(card.title, 36);
  const titleLines = titleLinesAll.slice(0, 4);
  if (titleLinesAll.length > 4 && titleLines[3]) {
    titleLines[3] = `${titleLines[3].slice(0, 33).trimEnd()}…`;
  }
  const excerptLines = wrapText(cleanExcerpt(card.excerpt), 72).slice(0, 2);
  const titleSize = titleLines.length > 3 ? 40 : 46;
  const titleDy = titleSize + 12;
  const titleStart = 206;
  const color = safeColor(card.categoryColor);
  const category = card.category || 'Arquivo';
  const pillWidth = Math.min(520, Math.max(96, category.length * 10.2 + 36));

  const titles = titleLines
    .map(
      (line, index) =>
        `<text x="72" y="${titleStart + index * titleDy}" font-family="Plus Jakarta Sans" font-size="${titleSize}" font-weight="700" fill="#f1f5f9">${escapeXml(line)}</text>`,
    )
    .join('');

  const excerptStart = titleStart + titleLines.length * titleDy + 18;
  const excerpts = excerptLines
    .map(
      (line, index) =>
        `<text x="72" y="${excerptStart + index * 32}" font-family="Plus Jakarta Sans" font-size="22" font-weight="500" fill="#94a3b8">${escapeXml(line)}</text>`,
    )
    .join('');

  const idLabel = card.idLabel
    ? `<text x="1128" y="142" text-anchor="end" font-family="JetBrains Mono" font-size="16" fill="#64748b">${escapeXml(card.idLabel)}</text>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#080c14"/>
  <rect width="1200" height="8" fill="#f43f5e"/>
  <rect width="8" height="630" fill="#f43f5e"/>
  <text x="72" y="92" font-family="JetBrains Mono" font-size="18" fill="#10b981" letter-spacing="1.5">LAWFARE TIMELINE</text>
  <text x="1128" y="92" text-anchor="end" font-family="JetBrains Mono" font-size="18" fill="#94a3b8">${escapeXml(card.kicker || '')}</text>
  <rect x="72" y="118" width="${pillWidth}" height="36" rx="18" fill="#121a2b" stroke="${color}" stroke-opacity="0.55"/>
  <text x="90" y="142" font-family="Plus Jakarta Sans" font-size="16" font-weight="700" fill="${color}">${escapeXml(category)}</text>
  ${idLabel}
  ${titles}
  ${excerpts}
  <line x1="72" y1="548" x2="1128" y2="548" stroke="#1e293b"/>
  <text x="72" y="588" font-family="JetBrains Mono" font-size="18" fill="#e2e8f0">lawfare.site</text>
  <text x="1128" y="588" text-anchor="end" font-family="Plus Jakarta Sans" font-size="16" fill="#64748b">arquivo público · confira a fonte na ficha</text>
</svg>`;
}
