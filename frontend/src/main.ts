import { mount } from 'svelte';
import App from './site/App.svelte';
import './site/site.css';
import './site/menu.css';
import './site/home-phone.css';
import { assertCatalog } from './catalog/contracts';
import type { Catalog } from './catalog/contracts';

// Keep old preview bookmarks usable in the single Svelte application.
const url = new URL(location.href);

if (url.searchParams.has('workbench')) {
  url.searchParams.delete('workbench');

  if (!url.searchParams.get('widget')) url.searchParams.set('page', 'library');

  history.replaceState(history.state, '', url);
}

const root = document.querySelector<HTMLElement>('#app')!;
const embedded = document.querySelector('#initial-catalog');
let initialCatalog: Catalog | undefined;

if (embedded) {
  const parsed: unknown = JSON.parse(embedded.textContent ?? '');
  assertCatalog(parsed);
  initialCatalog = parsed;

  // Keep the static page until its fonts settle, then start the interactive
  // homepage with the same catalog instead of clearing it for a second load.
  await Promise.allSettled([
    document.fonts.load('400 16px "Faculty Glyphic"'),
    document.fonts.load('400 16px "JetBrains Mono"'),
  ]);
}

root.replaceChildren();

for (const tag of document.head.querySelectorAll('[data-page-meta]')) tag.remove();

mount(App, { target: root, props: { initialCatalog } });
