import type { APIRoute } from 'astro';

// Dynamic robots: choose sitemap host from build-time SITE (astro --site) or prod fallback.
export const GET: APIRoute = ({ site }) => {
  const base = (site ?? 'https://www.alexandermcintosh.com').toString().replace(/\/$/, '');
  const body = [
    'User-agent: *',
    'Allow: /',
    `Sitemap: ${base}/sitemap-index.xml`
  ].join('\n') + '\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
