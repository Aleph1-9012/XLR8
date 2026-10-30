import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { readCatalog } from './export';

const root = fileURLToPath(new URL('..', import.meta.url));
const temporary = await mkdtemp(join(tmpdir(), 'chaldea-home-'));

try {
  // Render the same homepage components at build time. No server is deployed.
  await build({
    configFile: false,
    root,
    base: './',
    publicDir: false,
    plugins: [svelte()],
    ssr: { noExternal: true },
    build: {
      ssr: 'src/site/render-home.ts',
      outDir: temporary,
      emptyOutDir: false,
      rollupOptions: { output: { entryFileNames: 'render-home.mjs' } },
    },
  });

  const renderer: typeof import('../src/site/render-home') = await import(pathToFileURL(join(temporary, 'render-home.mjs')).href);
  const { catalog } = await readCatalog(fileURLToPath(new URL('../../build/production', import.meta.url)));
  const home = renderer.renderHome(catalog);
  const initialCatalog = `<script id="initial-catalog" type="application/json">${JSON.stringify(catalog).replaceAll('<', '\\u003c')}</script>`;

  await build({
    root,
    plugins: [{
      name: 'static-homepage',
      transformIndexHtml: {
        order: 'post',
        handler: html => html.replace('<!--static-home-->', () => home + initialCatalog),
      },
    }],
  });
} finally {
  await rm(temporary, { recursive: true, force: true });
}
