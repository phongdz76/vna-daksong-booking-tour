import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import Tour from '../models/Tour.js';
import { buildTourContent, sameTourContent } from '../utils/tourContent.js';
const samples = JSON.parse(await readFile(new URL('../../frontend/src/data/sampleTours.json', import.meta.url), 'utf8'));
const destinations = [...new Set(samples.flatMap(item => item.destinationSlugs))].map(slug => ({ slug, _id: new mongoose.Types.ObjectId(), status: 'published' }));
const old = sample => ({ slug: sample.slug, name: sample.originalName, meetingPoint: 'Điểm đón đã cấu hình', includes: ['Dịch vụ đã cấu hình'], childPolicy: 'Chính sách riêng', cancellationPolicy: 'Điều kiện riêng', status: 'published', durationHours: 8 });

test('four existing tours are edited and two source tours are added with unique identities', () => {
  assert.equal(samples.filter(item => item.mode === 'update').length, 4);
  assert.equal(samples.filter(item => item.mode === 'create').length, 2);
  assert.equal(new Set(samples.map(item => item.slug)).size, 6);
  assert.equal(new Set(samples.map(item => item.previewId)).size, 6);
});
test('existing prices, policies, duration, photos and departure links are excluded from editorial changes', () => {
  for (const sample of samples.filter(item => item.mode === 'update')) {
    const changes = buildTourContent(sample, destinations, old(sample));
    for (const protectedField of ['slug', 'durationHours', 'images', 'meetingPoint', 'includes', 'excludes', 'childPolicy', 'cancellationPolicy', 'status', 'priceFrom', 'soldCount', 'bookingRevision']) assert.equal(protectedField in changes, false, protectedField);
  }
});
test('all linked stops belong to existing destinations and the same tour', () => {
  for (const sample of samples) {
    const changes = buildTourContent(sample, destinations, sample.mode === 'update' ? old(sample) : null);
    for (const stop of changes.itinerary.filter(item => item.destinationId)) assert.ok(changes.destinationIds.includes(stop.destinationId));
  }
});
test('missing, archived or unlisted destinations stop migration before any writes', () => {
  const sample = samples[0];
  assert.throws(() => buildTourContent(sample, [], old(sample)), /Thiếu điểm đến/);
  assert.throws(() => buildTourContent(sample, destinations.map(item => ({ ...item, status: 'archived' })), old(sample)), /Thiếu điểm đến/);
  assert.throws(() => buildTourContent({ ...sample, itinerary: [{ title: 'Sai', description: 'Sai', destinationSlug: 'unknown' }] }, destinations, old(sample)), /Điểm dừng không thuộc tour/);
});
test('unexpected existing tour identity is rejected and repeated normalized content is unchanged', () => {
  const sample = samples[0];
  assert.throws(() => buildTourContent(sample, destinations, { ...old(sample), name: 'Tour khác' }), /không khớp/);
  const changes = buildTourContent(sample, destinations, old(sample));
  assert.ok(sameTourContent({ ...old(sample), ...changes }, changes));
  assert.equal(sameTourContent({ ...old(sample), ...changes, description: 'Vừa sửa' }, changes), false);
});
test('new tours have no imported old price or fabricated departure, and all six validate with provenance', async () => {
  for (const sample of samples) {
    const changes = buildTourContent(sample, destinations, sample.mode === 'update' ? old(sample) : null);
    const model = new Tour(sample.mode === 'update' ? { ...sample, ...changes } : changes);
    await model.validate();
    assert.ok(changes.sources.length > 0);
    assert.ok(changes.description.length > 1000);
    if (sample.mode === 'create') {
      assert.equal(sample.priceFrom, null);
      assert.ok(Number.isSafeInteger(changes.referencePrice) && changes.referencePrice > 0);
      assert.match(changes.referencePriceNote, /2023/);
      for (const field of ['priceFrom', 'previewId', 'previewChildPrice', 'destinationSlugs', 'mode']) assert.equal(field in changes, false);
      assert.doesNotMatch(changes.description, /2\.120\.000|1\.490\.000|5K|F1|Thẻ xanh/);
    }
  }
});
