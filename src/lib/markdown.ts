import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';

// Build a single processor instance for efficiency
// Minimal safe schema: allow common text/formatting elements
const safeSchema = {
  tagNames: [
    'p', 'strong', 'em', 'b', 'i', 'a', 'ul', 'ol', 'li', 'code', 'pre', 'span', 'br'
  ],
  attributes: {
    a: ['href', 'target', 'rel'],
    code: ['className'],
  },
};

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  // Allow raw HTML in the source to be parsed, then sanitize it strictly
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSanitize, safeSchema)
  .use(rehypeStringify);

/**
 * Convert Markdown to sanitized HTML string.
 */
export function mdToHtml(input?: string): string {
  if (!input) return '';
  const file = processor.processSync(input);
  return String(file);
}

/**
 * Convert Markdown intended for inline usage (e.g., list items) to HTML and strip a single wrapping <p> tag.
 */
export function mdToInlineHtml(input?: string): string {
  const html = mdToHtml(input);
  // Strip a single wrapping <p>...</p> if present
  const m = html.match(/^\s*<p>([\s\S]*)<\/p>\s*$/i);
  return m ? m[1] : html;
}
