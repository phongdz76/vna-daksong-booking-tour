import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transformWithEsbuild } from 'vite';

const source = await readFile(new URL('../src/utils/adminDeparturePricing.ts', import.meta.url), 'utf8');
const { code } = await transformWithEsbuild(source, 'adminDeparturePricing.ts', { loader: 'ts', format: 'esm' });
const { suggestedDeparturePrices } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const now = Date.parse('2026-10-19T00:00:00Z');
const tour = { _id: 'tour-a', referencePrice: 900000 };
const departure = (extra = {}) => ({
  _id: 'departure-a', tourId: tour._id, adultPrice: 650000, childPrice: 350000,
  status: 'open', departureAt: '2026-11-01T00:00:00Z', bookingDeadline: '2026-10-31T00:00:00Z',
  ...extra,
});

test('copies the child fare belonging to the lowest advertised adult fare, without mixing departures', () => {
  const cheapest = departure({ _id: 'cheapest' });
  const rows = [departure({ adultPrice: 750000, childPrice: 100000 }), cheapest];
  const before = JSON.stringify(rows);
  assert.deepEqual(suggestedDeparturePrices(tour, rows, now), { adultPrice: 650000, childPrice: 350000, source: cheapest });
  assert.equal(JSON.stringify(rows), before);
});

test('ignores closed, departed, expired, invalid-date and other-tour departures', () => {
  const rows = [
    departure({ status: 'closed', adultPrice: 1 }),
    departure({ departureAt: '2026-10-18T00:00:00Z', adultPrice: 2 }),
    departure({ bookingDeadline: '2026-10-19T00:00:00Z', adultPrice: 3 }),
    departure({ departureAt: 'invalid', adultPrice: 4 }),
    departure({ tourId: 'tour-b', adultPrice: 5 }),
  ];
  assert.deepEqual(suggestedDeparturePrices(tour, rows, now), { adultPrice: 900000, childPrice: null, source: undefined });
});

test('prefers the earliest departure when adult fares match', () => {
  const earliest = departure();
  const result = suggestedDeparturePrices(tour, [departure({ departureAt: '2026-11-02T00:00:00Z', childPrice: 200000 }), earliest], now);
  assert.equal(result.source, earliest);
  assert.equal(result.childPrice, 350000);
});

test('keeps zero fares and distinguishes a missing child fare from free admission', () => {
  const free = suggestedDeparturePrices(tour, [departure({ adultPrice: 0, childPrice: 0 })], now);
  assert.equal(free.adultPrice, 0);
  assert.equal(free.childPrice, 0);
  assert.equal(suggestedDeparturePrices(tour, [departure({ childPrice: null })], now).childPrice, null);
});

test('does not infer a child fare from policy text or reuse another tour price', () => {
  assert.deepEqual(suggestedDeparturePrices({ ...tour, childPolicy: 'Trẻ em: 70% giá người lớn' }, [], now), {
    adultPrice: 900000, childPrice: null, source: undefined,
  });
  assert.equal(suggestedDeparturePrices({ _id: 'new-tour' }, [departure()], now).adultPrice, null);
  assert.equal(suggestedDeparturePrices(undefined, [departure()], now).adultPrice, null);
});
