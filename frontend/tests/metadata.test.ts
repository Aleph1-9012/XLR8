import { expect, test } from 'bun:test';
import type { Summary } from '../src/catalog/contracts';
import { homeTitle, pageMetadata, siteUrl } from '../src/site/metadata';

const widget: Summary = {
  id: 'player-matrix',
  title: 'Player / Matrix',
  summary: 'Media controls with an animated matrix display.',
  category: 'Player',
  tags: ['media'],
  status: 'published',
  revision: 'revision',
  bundleUrl: 'revisions/player-matrix/revision/bundle.json',
  thumbnailUrl: 'revisions/player-matrix/revision/thumbnail.webp',
  settingsCount: 1,
};

test('home and library metadata keep filtered views on stable canonical URLs', () => {
  const route = { library: false, widget: '', family: '', query: '', sort: 'name' };
  expect(pageMetadata(route, [widget])).toMatchObject({ title: homeTitle, url: siteUrl });

  const library = pageMetadata({ ...route, library: true }, [widget]);
  const filteredRoute = { ...route, library: true, family: 'Player', query: 'matrix & red', sort: 'family' };
  const filtered = pageMetadata(filteredRoute, [widget]);
  expect(filtered).toEqual(library);
  expect(library.url).toBe(`${siteUrl}?page=library`);
});

test('widget metadata follows the selected widget even when library filters remain in the URL', () => {
  const route = { library: true, widget: widget.id, family: 'Glyphs' };
  const metadata = pageMetadata(route, [widget]);
  expect(metadata.title).toBe('Matrix | Player widget for Quickshell | Chaldea');
  expect(metadata.description).toContain(widget.summary);
  expect(metadata.url).toBe(`${siteUrl}?widget=player-matrix`);
  expect(metadata.robots).toBe('index, follow');
});

test('unknown widget IDs remain one encoded query value and cannot become indexable pages', () => {
  const id = 'missing & page=library#fragment';
  const metadata = pageMetadata({ library: false, widget: id }, [widget]);
  const url = new URL(metadata.url);
  expect([...url.searchParams.entries()]).toEqual([['widget', id]]);
  expect(url.hash).toBe('');
  expect(metadata.robots).toBe('noindex, follow');
  expect(metadata.title).toBe('Widget unavailable | Chaldea');
});

test('draft widget previews are not indexed or advertised as QML downloads', () => {
  const metadata = pageMetadata({ library: false, widget: widget.id }, [{ ...widget, status: 'draft' }]);
  expect(metadata.robots).toBe('noindex, follow');
  expect(metadata.description).not.toContain('Download');
});
