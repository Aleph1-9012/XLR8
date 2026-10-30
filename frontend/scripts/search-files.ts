import type { Summary } from '../src/catalog/contracts';
import { libraryUrl } from '../src/site/links';
import { siteUrl } from '../src/site/metadata';

export function searchFiles(widgets: readonly Summary[]) {
  const urls = [siteUrl, new URL(libraryUrl(), siteUrl).href];

  for (const widget of widgets) {
    if (widget.status === 'published') {
      urls.push(new URL(`?${new URLSearchParams({ widget: widget.id })}`, siteUrl).href);
    }
  }

  return {
    'robots.txt': `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}sitemap.xml\n`,
    'sitemap.xml': `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${url.replaceAll('&', '&amp;')}</loc></url>`).join('\n')}\n</urlset>\n`,
  };
}
