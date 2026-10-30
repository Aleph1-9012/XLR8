import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
import { readFile, realpath } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { readCatalog } from './scripts/export';
import { searchFiles } from './scripts/search-files';
import { homeTitle, homeDescription, websiteData } from './src/site/metadata';

// Development serves every widget, drafts included. Builds copy published revisions only.
const content = fileURLToPath(new URL('../build/content', import.meta.url));
const production = fileURLToPath(new URL('../build/production', import.meta.url));
const mime: Record<string, string> = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.qml': 'text/plain', '.md': 'text/plain',
};

export default defineConfig(({ command }) => ({
  base: './',
  // The Other preset does not expose Vercel's public client configuration to Vite.
  define: {
    'import.meta.env.VITE_VERCEL_ENV': JSON.stringify(process.env.VERCEL_ENV ?? ''),
    'import.meta.env.VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG': JSON.stringify(process.env.VERCEL_OBSERVABILITY_CLIENT_CONFIG ?? ''),
  },
  publicDir: command === 'build' ? production : content,
  plugins: [svelte(), {
    name: 'generated-content',
    transformIndexHtml() {
      // Query-based routes share this HTML. Their canonical is set by the app
      // after the catalog loads, rather than declaring every route the homepage.
      return [
        { tag: 'title', attrs: { 'data-page-meta': '' }, children: homeTitle },
        { tag: 'meta', attrs: { 'data-page-meta': '', name: 'description', content: homeDescription } },
        { tag: 'meta', attrs: { 'data-page-meta': '', property: 'og:title', content: homeTitle } },
        { tag: 'meta', attrs: { 'data-page-meta': '', property: 'og:description', content: homeDescription } },
        { tag: 'meta', attrs: { property: 'og:site_name', content: 'Chaldea' } },
        { tag: 'meta', attrs: { property: 'og:type', content: 'website' } },
        { tag: 'script', attrs: { type: 'application/ld+json' }, children: JSON.stringify(websiteData).replaceAll('<', '\\u003c') },
      ].map(tag => ({ ...tag, injectTo: 'head' as const }));
    },
    async generateBundle() {
      const { catalog } = await readCatalog(production);

      for (const [fileName, source] of Object.entries(searchFiles(catalog.widgets))) {
        this.emitFile({ type: 'asset', fileName, source });
      }

      for (const name of ['LICENSE', 'NOTICE']) {
        this.emitFile({ type: 'asset', fileName: `${name}.txt`, source: await readFile(new URL(`../${name}`, import.meta.url), 'utf8') });
      }

      for (const font of ['faculty-glyphic', 'jetbrains-mono']) {
        this.emitFile({ type: 'asset', fileName: `licenses/${font}.txt`, source: await readFile(new URL(`./node_modules/@fontsource/${font}/LICENSE`, import.meta.url), 'utf8') });
      }
    },
    configureServer(server) {
      // Rust swaps the directory atomically. Vite's watched public-file list can
      // lose track of the new tree, so development requests resolve it on disk.
      server.middlewares.use(async (request, response, next) => {
        const url = request.url?.split('?')[0] ?? '';
        if (url !== '/catalog.json' && !url.startsWith('/revisions/')) return next();
        try {
          const path = await realpath(resolve(content, `.${decodeURIComponent(url)}`));
          if (!path.startsWith(`${content}${sep}`)) { response.writeHead(403); response.end(); return; }
          const bytes = await readFile(path);
          response.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
          response.end(request.method === 'HEAD' ? undefined : bytes);
        } catch { response.writeHead(404); response.end('Content not found. Run make content and reload.'); }
      });
    },
  }],
  build: { outDir: '../dist', emptyOutDir: true, target: 'es2022', license: { fileName: 'THIRD_PARTY_LICENSES.txt' } },
  server: { port: 5175, strictPort: true, fs: { allow: ['..'] } },
  preview: { port: 4173, strictPort: true },
}));
