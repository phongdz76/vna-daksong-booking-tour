// Validate raw HTTP values before Mongoose can cast strings, booleans or arrays.
export class InputError extends Error {
  constructor(field, message) {
    super(`${field}: ${message}`);
    this.field = field;
    this.status = 400;
    this.expose = true;
    this.code = 'VALIDATION_ERROR';
  }
}
const fail = (field, message) => { throw new InputError(field, message); };
export const isPhone = value => typeof value === 'string' && /^(?:0|\+84)[35789]\d{8}$/.test(value.trim());
export const isEmail = value => {
  if (typeof value !== 'string' || value.trim().length > 254) return false;
  const parts = value.trim().split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  return local.length >= 1 && local.length <= 64 && !local.startsWith('.') && !local.endsWith('.') && !local.includes('..') &&
    /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local) && domain.includes('.') && domain.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));
};
export const isHttpUrl = value => {
  if (typeof value !== 'string' || value.length > 2000 || /\s/.test(value)) return false;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password; }
  catch { return false; }
};
export const isDateString = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(value)) return false;
  const day = value.slice(0, 10);
  if (value.length > 10 && (Number(value.slice(11, 13)) > 23 || Number(value.slice(14, 16)) > 59 || (value[16] === ':' && Number(value.slice(17, 19)) > 59))) return false;
  const calendar = new Date(day + 'T00:00:00Z');
  return Number.isFinite(calendar.getTime()) && calendar.toISOString().slice(0, 10) === day && Number.isFinite(Date.parse(value));
};
export const text = (max, nonempty = false) => (value, field) => {
  if (typeof value !== 'string' || value.length > max || (nonempty && !value.trim()) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) fail(field, `phải là văn bản${nonempty ? ' không được để trống' : ''}, tối đa ${max} ký tự.`);
};
export const number = (min, max, integer = true) => (value, field) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || (integer && !Number.isSafeInteger(value)) || value < min || value > max) fail(field, `phải là ${integer ? 'số nguyên' : 'số'} từ ${min} đến ${max}.`);
};
export const choice = options => (value, field) => { if (!options.includes(value)) fail(field, 'giá trị không hợp lệ.'); };
const id = (value, field) => { if (typeof value !== 'string' || !/^[a-f0-9]{24}$/i.test(value)) fail(field, 'ID không hợp lệ.'); };
const date = (value, field) => { if (!isDateString(value)) fail(field, 'ngày giờ không hợp lệ.'); };
const url = (value, field) => { if (!isHttpUrl(value)) fail(field, 'cần liên kết http:// hoặc https:// hợp lệ, không chứa tài khoản/mật khẩu.'); };
const boolean = (value, field) => { if (typeof value !== 'boolean') fail(field, 'phải là true hoặc false.'); };
const nullable = check => (value, field) => { if (value !== null) check(value, field); };
const array = (check, max = 100, unique = false) => (value, field) => {
  if (!Array.isArray(value) || value.length > max) fail(field, `phải là danh sách tối đa ${max} mục.`);
  value.forEach((item, index) => check(item, `${field}[${index}]`));
  if (unique && new Set(value).size !== value.length) fail(field, 'không được có mục trùng lặp.');
};
export function validateObject(value, fields, required = [], prefix = 'dữ liệu') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(prefix, 'phải là một đối tượng JSON.');
  for (const key of Object.keys(value)) if (!Object.hasOwn(fields, key)) fail(`${prefix}.${key}`, 'trường không được hỗ trợ.');
  for (const key of required) if (!Object.hasOwn(value, key)) fail(`${prefix}.${key}`, 'là bắt buộc.');
  for (const [key, item] of Object.entries(value)) fields[key](item, `${prefix}.${key}`);
}
const object = (fields, required) => (value, field) => validateObject(value, fields, required, field);
const money = number(0, 1_000_000_000);
const slug = (value, field) => { text(180, true)(value, field); if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) fail(field, 'chỉ dùng chữ thường, số và dấu gạch nối.'); };
const couponCode = (value, field) => { text(50)(value, field); if (value && !/^[a-z0-9_-]+$/i.test(value.trim())) fail(field, 'chỉ dùng chữ, số, dấu gạch nối hoặc gạch dưới.'); };
const image = object({ url, alt: text(300), credit: text(300) }, ['url']);
const source = object({ title: text(300, true), url, checkedAt: date }, ['title', 'url', 'checkedAt']);
const itinerary = object({ title: text(200, true), description: text(3000, true), destinationId: nullable(id) }, ['title', 'description']);
const shared = { slug, summary: text(1000, true), images: array(image), sources: array(source), status: choice(['draft', 'published', 'archived']) };
const categories = ['nature', 'culture', 'food', 'history'];
export const bodySchemas = {
  destination: { ...shared, name: text(200, true), description: text(30000, true), category: choice(categories), address: text(500), visitNotes: text(3000) },
  article: { ...shared, title: text(200, true), content: text(50000, true), category: choice(['culture', 'food', 'travel_tips', 'story']), destinationIds: array(id, 100, true) },
  tour: { ...shared, name: text(200, true), description: text(30000, true), durationHours: number(1, 720, false), themes: array(choice(categories), 4, true), destinationIds: array(id, 100, true), itinerary: array(itinerary), meetingPoint: text(1000, true), includes: array(text(500, true)), excludes: array(text(500, true)), childPolicy: text(3000), cancellationPolicy: text(3000, true) },
  departure: { tourId: id, departureAt: date, bookingDeadline: date, adultPrice: money, childPrice: nullable(money), maxGuestsPerBooking: number(1, 100), status: choice(['open', 'closed']) },
  coupon: { code: couponCode, description: text(1000), discountType: choice(['percentage', 'fixed']), discountValue: number(0, 1_000_000_000, false), maxDiscount: nullable(money), minOrderValue: money, validFrom: date, validUntil: date, usageLimit: nullable(number(0, 1_000_000_000)), isActive: boolean },
  quote: { departureId: id, adults: number(1, 100), children: number(0, 100), couponCode },
  booking: { quoteToken: text(4096, true), contact: object({ name: text(200, true), phone: (value, field) => { if (!isPhone(value)) fail(field, 'nhập số di động Việt Nam hợp lệ, bắt đầu bằng 0 hoặc +84.'); }, email: (value, field) => { if (!isEmail(value)) fail(field, 'email không hợp lệ.'); } }, ['name', 'phone', 'email']), note: text(2000), couponCode, paymentMethod: choice(['cash_on_arrival', 'qr_transfer', 'zalopay']) },
  bookingStatus: { status: choice(['pending_confirmation', 'confirmed', 'cancelled', 'rejected', 'completed']), reason: text(1000) },
  cancel: { reason: text(1000, true) },
  review: { bookingId: id, rating: number(1, 5), comment: text(2000, true) },
  payment: { bookingId: id },
  zalo: { accessToken: (value, field) => { text(4096, true)(value, field); if (/[\r\n]/.test(value)) fail(field, 'token không hợp lệ.'); }, includeProfile: boolean },
  empty: {},
};
const requiredFields = {
  destination: ['name', 'slug', 'summary', 'description', 'category'], article: ['title', 'slug', 'summary', 'content', 'category'],
  tour: ['name', 'slug', 'summary', 'description', 'durationHours', 'meetingPoint', 'cancellationPolicy'],
  departure: ['tourId', 'departureAt', 'bookingDeadline', 'adultPrice'], coupon: ['discountType', 'discountValue', 'validUntil'],
  quote: ['departureId', 'adults'], booking: ['quoteToken', 'contact'], bookingStatus: ['status'], review: ['bookingId', 'rating', 'comment'], payment: ['bookingId'], zalo: ['accessToken'],
};
export function validateBodyData(kind, data, update = false) {
  const fields = { ...bodySchemas[kind] };
  if (update && kind === 'departure') delete fields.tourId;
  if (update && kind === 'coupon') delete fields.code;
  if (update && kind === 'review') delete fields.bookingId;
  validateObject(data, fields, update ? [] : requiredFields[kind] || []);
  if (update && !Object.keys(data).length) fail('dữ liệu', 'cần ít nhất một trường để cập nhật.');
  if (kind === 'coupon' && data.discountType === 'percentage' && data.discountValue > 100) fail('discountValue', 'phần trăm không vượt quá 100%.');
  if (kind === 'coupon' && data.discountType === 'fixed' && data.discountValue !== undefined) money(data.discountValue, 'discountValue');
  if (kind === 'bookingStatus' && ['cancelled', 'rejected'].includes(data.status) && !data.reason?.trim()) fail('reason', 'cần lý do khi hủy hoặc từ chối đơn.');
  const [start, end] = kind === 'departure' ? [data.bookingDeadline, data.departureAt] : kind === 'coupon' ? [data.validFrom, data.validUntil] : [];
  if (start && end && (kind === 'departure' ? Date.parse(start) >= Date.parse(end) : Date.parse(start) > Date.parse(end))) fail('ngày giờ', 'thứ tự thời gian không hợp lệ.');
}

export function validateQueryData(query, resource) {
  const filters = {
    tours: ['q', 'status', 'destinationId', 'theme', 'maxDurationHours', 'dateFrom', 'dateTo', 'minPrice', 'maxPrice', 'sort'],
    destinations: ['q', 'status', 'category'], articles: ['q', 'status', 'category', 'destinationId'],
    departures: ['tourId', 'status'], bookings: ['status', 'departureId', 'code'], coupons: ['isActive', 'sort'], notifications: ['type'],
  };
  const allowed = ['page', 'limit', ...(filters[resource] || [])];
  // Every query value must be a single string: no arrays, repeated parameters or objects.
  for (const [key, value] of Object.entries(query)) {
    if (resource && !allowed.includes(key)) fail(key, 'bộ lọc không được hỗ trợ.');
    text(key === 'q' ? 200 : 100)(value, key);
    if (['page', 'limit', 'minPrice', 'maxPrice'].includes(key)) {
      if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) fail(key, 'cần số nguyên hợp lệ.');
      const min = ['page', 'limit'].includes(key) ? 1 : 0;
      const max = key === 'limit' ? 100 : key === 'page' ? 10000 : 1_000_000_000;
      number(min, max)(Number(value), key);
    }
    if (['tourId', 'destinationId', 'departureId'].includes(key)) id(value, key);
    if (['dateFrom', 'dateTo'].includes(key)) date(value, key);
    if (key === 'maxDurationHours') {
      if (!/^\d+(?:\.\d+)?$/.test(value)) fail(key, 'thời lượng không hợp lệ.');
      number(1, 720, false)(Number(value), key);
    }
    if (key === 'isActive' && !['true', 'false'].includes(value)) fail(key, 'cần true hoặc false.');
    if (key === 'theme') choice(categories)(value, key);
    if (key === 'category') choice(resource === 'articles' ? ['culture', 'food', 'travel_tips', 'story'] : categories)(value, key);
    if (key === 'status') choice(resource === 'departures' ? ['open', 'closed'] : resource === 'bookings' ? ['pending_confirmation', 'confirmed', 'cancelled', 'rejected', 'completed'] : ['draft', 'published', 'archived'])(value, key);
    if (key === 'sort') choice(resource === 'coupons' ? ['newest', 'oldest'] : ['newest', 'duration', 'price_asc', 'price_desc', 'most_bought'])(value, key);
    if (key === 'type') choice(['all', 'article', 'trip', 'payment'])(value, key);
    if (key === 'code') couponCode(value, key);
  }
  if (query.minPrice !== undefined && query.maxPrice !== undefined && Number(query.minPrice) > Number(query.maxPrice)) fail('giá', 'giá tối thiểu không được lớn hơn giá tối đa.');
  if (query.dateFrom && query.dateTo && Date.parse(query.dateFrom) > Date.parse(query.dateTo)) fail('ngày', 'ngày bắt đầu không được sau ngày kết thúc.');
}
