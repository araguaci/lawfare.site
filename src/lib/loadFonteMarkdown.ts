import { readFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';

marked.use({ gfm: true, breaks: true });

/** Remove linhas de atributos estilo Kramdown, ex.: `{: .prompt-danger }` */
function stripKramdownIAL(body: string): string {
  return body.replace(/^\{:[^\n]*\}\s*$/gm, '');
}

/** Caminho público para o arquivo em `public/` (ex.: `/_posts/indecoro/foo.md`). */
export function fontePathToPublicUrl(fonte: string | undefined): string | null {
  if (!fonte || fonte === 'N/A') return null;
  const normalized = fonte.replace(/\\/g, '/').trim();
  if (!normalized.startsWith('_posts/')) return null;
  return `/${normalized}`;
}

export function resolveFonteFilePath(fonte: string | undefined): string | null {
  if (!fonte || fonte === 'N/A') return null;
  const normalized = fonte.replace(/\\/g, '/').trim();
  if (!normalized.startsWith('_posts/')) return null;
  return path.join(process.cwd(), 'public', normalized);
}

export type FonteMarkdownResult = {
  html: string;
  publicUrl: string;
};

export async function loadFonteMarkdown(
  fonte: string | undefined
): Promise<FonteMarkdownResult | null> {
  const filePath = resolveFonteFilePath(fonte);
  const publicUrl = fontePathToPublicUrl(fonte);
  if (!filePath || !publicUrl) return null;

  try {
    const raw = await readFile(filePath, 'utf-8');
    const { content } = matter(raw);
    const cleaned = stripKramdownIAL(content);
    const html = await marked.parse(cleaned);
    return { html, publicUrl };
  } catch {
    return null;
  }
}
