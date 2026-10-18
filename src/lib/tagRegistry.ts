export type TagRegistry = {
  slugToTag: Map<string, string>;
  tagToSlug: Map<string, string>;
  tagCounts: Map<string, number>;
};

export function slugifyTag(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'tag';
}

export function buildTagRegistry(assuntos: { tags: string[] }[]): TagRegistry {
  const slugToTag = new Map<string, string>();
  const tagToSlug = new Map<string, string>();
  const tagCounts = new Map<string, number>();

  for (const e of assuntos) {
    for (const t of e.tags || []) {
      if (!t || t === 'N/A') continue;
      tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
    }
  }

  const sortedTags = [...tagCounts.keys()].sort((a, b) =>
    a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
  );

  for (const tag of sortedTags) {
    const base = slugifyTag(tag);
    let slug = base;
    let n = 2;
    while (slugToTag.has(slug) && slugToTag.get(slug) !== tag) {
      slug = `${base}-${n++}`;
    }
    if (!slugToTag.has(slug)) {
      slugToTag.set(slug, tag);
      tagToSlug.set(tag, slug);
    }
  }

  return { slugToTag, tagToSlug, tagCounts };
}
