import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transformWithEsbuild } from 'vite';
const source = await readFile(new URL('../src/utils/tourLocations.ts', import.meta.url), 'utf8');
const { code } = await transformWithEsbuild(source, 'tourLocations.ts', { loader: 'ts', format: 'esm' });
const { buildRouteLinks, getRoutePoints, hasCoordinates, getPlaceGroup, placeMapUrl } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const place = (id, extra = {}) => ({ _id: String(id), name: 'Điểm demo ' + id, address: 'Địa chỉ demo',
  coordinates: { latitude: 12 + id / 100, longitude: 107 + id / 100 }, ...extra });

test('meeting point leads the route once; selected order is retained and input is unchanged', () => {
  const places = [place(2), place(3), place(1)];
  const before = JSON.stringify(places);
  assert.deepEqual(getRoutePoints(places, places[2]).map(item => item._id), ['1', '2', '3']);
  assert.equal(JSON.stringify(places), before);
});
test('unknown and invalid coordinates are excluded without inventing pins', () => {
  for (const coordinates of [null, undefined, { latitude: 91, longitude: 107 }, { latitude: 12, longitude: Infinity }]) {
    assert.equal(hasCoordinates(place(1, { coordinates })), false);
  }
  assert.deepEqual(getRoutePoints([place(1), place(2, { coordinates: null })]).map(item => item._id), ['1']);
  assert.equal(hasCoordinates(place(1, { coordinates: { latitude: 0, longitude: 0 } })), true);
});
test('Google Maps directions use coordinates and exactly the saved visiting order', () => {
  const places = [place(2), place(1), place(3)];
  const [link] = buildRouteLinks(places);
  const url = new URL(link.url);
  assert.equal(url.searchParams.get('origin'), '12.02,107.02');
  assert.equal(url.searchParams.get('waypoints'), '12.01,107.01');
  assert.equal(url.searchParams.get('destination'), '12.03,107.03');
  assert.equal(url.searchParams.get('api'), '1');
});
test('long tours split into connected mobile-compatible legs without dropping destinations', () => {
  const places = Array.from({ length: 14 }, (_, index) => place(index + 1));
  const links = buildRouteLinks(places);
  const coordinates = [];
  for (const [index, link] of links.entries()) {
    const query = new URL(link.url).searchParams;
    const stops = (query.get('waypoints') || '').split('|').filter(Boolean);
    assert.ok(stops.length <= 3);
    if (!index) coordinates.push(query.get('origin'));
    else assert.equal(query.get('origin'), coordinates.at(-1));
    coordinates.push(...stops, query.get('destination'));
  }
  assert.deepEqual(coordinates, places.map(item => `${item.coordinates.latitude},${item.coordinates.longitude}`));
});
test('single/empty routes have no fake driving directions; search links encode exact positions', () => {
  assert.deepEqual(buildRouteLinks([]), []);
  assert.deepEqual(buildRouteLinks([place(1)]), []);
  assert.equal(new URL(placeMapUrl(place(1))).searchParams.get('query'), '12.01,107.01');
});
test('existing destination categories are grouped for display without adding stored metadata', () => {
  const old = place(1, { category: 'history', coordinates: undefined });
  const before = JSON.stringify(old);
  assert.equal(getPlaceGroup(old), 'culture');
  assert.equal(getPlaceGroup(place(2, { category: 'food' })), 'rest');
  assert.equal(getPlaceGroup(place(3, { placeGroup: 'pickup' })), 'pickup');
  assert.equal(JSON.stringify(old), before);
});
