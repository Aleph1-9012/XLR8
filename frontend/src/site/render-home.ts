import { render } from 'svelte/server';
import type { Catalog } from '../catalog/contracts';
import StaticHome from './StaticHome.svelte';

export function renderHome(catalog: Catalog): string {
  return render(StaticHome, { props: { widgets: catalog.widgets } }).body;
}
