import test from 'node:test';
import assert from 'node:assert/strict';
import { InputError, bodySchemas, validateBodyData, validateQueryData, isPhone, isEmail, isHttpUrl, isDateString } from '../utils/inputValidation.js';
import { matchesImageSignature } from '../middlewares/uploadMiddleware.js';
import Booking from '../models/Booking.js';
import Coupon from '../models/Coupon.js';
import Departure from '../models/Departure.js';
const id = '507f1f77bcf86cd799439011';
const shared = { slug: 'tour-test', summary: 'Mô tả', status: 'draft', images: [], sources: [] };
const samples = {
  destination: { ...shared, name: 'Điểm đến', description: 'Mô tả', category: 'nature' },
  article: { ...shared, title: 'Bài viết', content: 'Nội dung', category: 'travel_tips', destinationIds: [] },
  tour: { ...shared, name: 'Tour', description: 'Nội dung', durationHours: 8, themes: ['nature'], destinationIds: [id], itinerary: [{ title: 'Điểm dừng', description: 'Nội dung', destinationId: id }], meetingPoint: 'Điểm đón', includes: [], excludes: [], childPolicy: '', cancellationPolicy: 'Liên hệ VNA' },
  departure: { tourId: id, departureAt: '2026-10-24T07:30:00+07:00', bookingDeadline: '2026-10-23T07:30:00+07:00', adultPrice: 2120000, childPrice: 1484000, maxGuestsPerBooking: 20, status: 'open' },
  coupon: { code: 'VNA-TEST', description: '', discountType: 'percentage', discountValue: 10, maxDiscount: null, minOrderValue: 0, validFrom: '2026-10-10', validUntil: '2026-10-31', usageLimit: null, isActive: true },
  quote: { departureId: id, adults: 1, children: 1, couponCode: '' },
  booking: { quoteToken: 'token', contact: { name: 'Khách', phone: '0900000001', email: 'test@example.com' }, note: '', couponCode: '', paymentMethod: 'cash_on_arrival' },
  bookingStatus: { status: 'confirmed', reason: '' }, cancel: { reason: 'Thay đổi kế hoạch' },
  review: { bookingId: id, rating: 5, comment: 'Trải nghiệm tốt' }, payment: { bookingId: id }, zalo: { accessToken: 'token', includeProfile: true }, empty: {},
};
for (const [kind, fields] of Object.entries(bodySchemas)) {
  test(`${kind}: valid input accepted; raw shapes, unknown fields and every field with invalid type rejected`, () => {
    assert.doesNotThrow(() => validateBodyData(kind, samples[kind]));
    for (const shape of [null, true, 'text', []]) assert.throws(() => validateBodyData(kind, shape), InputError);
    assert.throws(() => validateBodyData(kind, { ...samples[kind], unexpected: 'value' }), InputError);
    for (const field of Object.keys(fields)) assert.throws(() => validateBodyData(kind, { ...samples[kind], [field]: {} }), InputError, field);
  });
}
test('Vietnamese mobile phones and email formats reject malformed values and control characters', () => {
  for (const value of ['0900000001', '+84900000001', '0351234567']) assert.equal(isPhone(value), true);
  for (const value of ['0901', '0000000000', '0|12345678', 'abc', 901234567, '+840901234567', '09012345678']) assert.equal(isPhone(value), false);
  for (const value of ['abc', 'a@b', 'a@@b.com', 'a @b.com', '.a@b.com', 'a..b@c.com', 'a@b..com', 'a@-b.com', 'a'.repeat(65) + '@b.com']) assert.equal(isEmail(value), false);
  assert.equal(isEmail('name+tag@example.com'), true);
});
test('calendar dates, URL schemes and credentials are checked rather than just prefix matching', () => {
  for (const value of ['2026-02-30', '2026-13-01', '2026-01-01T24:00', 'tomorrow', 0, null]) assert.equal(isDateString(value), false);
  assert.equal(isDateString('2024-02-29T07:30:00+07:00'), true);
  for (const value of ['https://', 'javascript:alert(1)', 'https://user:pass@example.com', 'https://exa mple.com']) assert.equal(isHttpUrl(value), false);
  assert.equal(isHttpUrl('https://example.com/image.jpg'), true);
});
test('booking contact and optional notes cannot bypass validation using direct API payloads', () => {
  for (const contact of [{ ...samples.booking.contact, phone: 'abc' }, { ...samples.booking.contact, name: '  ' }, { ...samples.booking.contact, email: 'bad' }, { ...samples.booking.contact, role: 'admin' }]) assert.throws(() => validateBodyData('booking', { ...samples.booking, contact }), InputError);
  for (const note of [true, null, 'a'.repeat(2001), '\u0000']) assert.throws(() => validateBodyData('booking', { ...samples.booking, note }), InputError);
});
test('money, guest limits, coupon percentages and temporal order reject bad ranges and coercion', () => {
  for (const price of ['100', true, -1, 1.5, Infinity, 1000000001]) assert.throws(() => validateBodyData('departure', { ...samples.departure, adultPrice: price }), InputError);
  for (const count of [0, -1, 1.5, 101, '2']) assert.throws(() => validateBodyData('quote', { ...samples.quote, adults: count }), InputError);
  assert.throws(() => validateBodyData('departure', { ...samples.departure, bookingDeadline: samples.departure.departureAt }), InputError);
  assert.throws(() => validateBodyData('coupon', { ...samples.coupon, discountValue: 101 }), InputError);
  assert.throws(() => validateBodyData('coupon', { ...samples.coupon, discountType: 'fixed', discountValue: 1.5 }), InputError);
});
test('nested content, immutable IDs and empty update payloads reject silent data loss', () => {
  for (const item of [null, { title: ' ', description: 'Text' }, { title: 'Text', description: ' ' }, { title: 'Text', description: 'Text', unknown: 1 }]) assert.throws(() => validateBodyData('tour', { ...samples.tour, itinerary: [item] }), InputError);
  assert.throws(() => validateBodyData('tour', { ...samples.tour, destinationIds: [id, id] }), InputError);
  assert.throws(() => validateBodyData('tour', { images: 'broken' }, true), InputError);
  assert.throws(() => validateBodyData('departure', { tourId: id }, true), InputError);
  assert.throws(() => validateBodyData('coupon', { code: 'NEW-CODE' }, true), InputError);
  assert.throws(() => validateBodyData('tour', {}, true), InputError);
});
test('query filters reject repeated keys, malformed numbers and unsupported values', () => {
  for (const query of [{ page: '0' }, { limit: '1000' }, { page: ['1', '2'] }, { q: {} }, { page: '1junk' }, { minPrice: '-1' }, { minPrice: '5', maxPrice: '1' }, { sort: 'bad' }, { secret: 'x' }, { dateFrom: '2026-10-31', dateTo: '2026-10-10' }]) assert.throws(() => validateQueryData(query, 'tours'), InputError);
  assert.doesNotThrow(() => validateQueryData({ page: '1', limit: '100', q: 'Tour', theme: 'nature' }, 'tours'));
});
test('database models enforce phone, money and departure capacity when scripts bypass HTTP', async () => {
  const booking = new Booking({ contact: { name: 'Name', phone: 'abc' } });
  await assert.rejects(booking.validate(), error => Boolean(error.errors['contact.phone']));
  const coupon = new Coupon({ ...samples.coupon, discountType: 'fixed', discountValue: 1.5 });
  await assert.rejects(coupon.validate(), /discountValue/);
  const departure = new Departure({ ...samples.departure, maxGuestsPerBooking: 60, maxCapacity: 50 });
  await assert.rejects(departure.validate(), /maxGuestsPerBooking/);
});
test('upload checks file bytes instead of trusting a claimed MIME type', () => {
  assert.equal(matchesImageSignature({ mimetype: 'image/png', buffer: Buffer.from('this is not an image') }), false);
  const png = Buffer.from('89504e470d0a1a0a00000000', 'hex');
  assert.equal(matchesImageSignature({ mimetype: 'image/png', buffer: png }), true);
  assert.equal(matchesImageSignature({ mimetype: 'image/jpeg', buffer: png }), false);
});
