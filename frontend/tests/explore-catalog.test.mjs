import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transformWithEsbuild } from 'vite';

const source = await readFile(new URL('../src/utils/exploreCatalog.ts', import.meta.url), 'utf8');
const { code } = await transformWithEsbuild(source, 'exploreCatalog.ts', { loader: 'ts', format: 'esm' });
const { uniqueDestinations, catalogPage } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const place = (id, slug, extra = {}) => ({ _id: id, slug, name: 'Place', category: 'nature', images: [], ...extra });

test('verified import pairs merge while retaining the record with coordinates and its detail ID', () => {
  const pairs = [
    ['thac-luu-ly', 'vna-map-thac-luu-ly'],
    ['doi-dien-gio-dak-song', 'vna-map-dien-gio-dak-song'],
    ['thien-vien-truc-lam-dao-nguyen', 'vna-map-thien-vien-truc-lam-dao-nguyen'],
    ['vna-portal-587659dc-bcaf-495a-a427-97df4f538252', 'vna-map-di-tich-doi-dao-trung'],
  ];
  const items = pairs.flatMap(([old, current], index) => [
    place(`old-${index}`, old),
    place(`map-${index}`, current, { coordinates: { latitude: 12, longitude: 107 } }),
  ]).concat([place('other-1', 'nam-nung'), place('other-2', 'quang-truong')]);
  const before = JSON.stringify(items);
  assert.deepEqual(uniqueDestinations(items).map(item => item._id), ['map-0', 'map-1', 'map-2', 'map-3', 'other-1', 'other-2']);
  assert.equal(JSON.stringify(items), before);
});

test('similar names and unknown slugs never merge unrelated destinations', () => {
  const items = [place('a', 'unknown'), place('b', 'unknown'), place('c', undefined)];
  assert.deepEqual(uniqueDestinations(items), items);
});

test('pagination includes the last destination after deduplication and clamps out-of-range pages', () => {
  const items = Array.from({ length: 9 }, (_, index) => place(String(index), `place-${index}`));
  assert.deepEqual(catalogPage(items, 1).data.map(item => item._id), ['0', '1', '2', '3', '4', '5', '6', '7']);
  assert.deepEqual(catalogPage(items, 99), { data: [items[8]], page: 2, pages: 2, total: 9 });
  assert.equal(catalogPage(items, -1).page, 1);
});

test('empty category has no phantom page or destination', () => {
  assert.deepEqual(catalogPage([], 2), { data: [], page: 1, pages: 0, total: 0 });
});
