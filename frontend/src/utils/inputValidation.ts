export const validPhone = (value: string) => /^(?:0|\+84)[35789]\d{8}$/.test(value.trim());
export const validEmail = (value: string) => value.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
export const validText = (value: string, max: number, required = false) => value.length <= max && (!required || Boolean(value.trim())) && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value);
export const validHttpUrl = (value: string) => {
  if (value.length > 2000 || /\s/.test(value)) return false;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password; }
  catch { return false; }
};
export const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(value)) return false;
  const calendar = new Date(value.slice(0, 10) + 'T00:00:00Z');
  return Number.isFinite(calendar.getTime()) && calendar.toISOString().slice(0, 10) === value.slice(0, 10) && Number.isFinite(Date.parse(value));
};
export const validIntegerInput = (value: string, min: number, max: number) => /^\d+$/.test(value.trim()) && Number.isSafeInteger(Number(value)) && Number(value) >= min && Number(value) <= max;
export function contactError(contact: { name: string; phone: string; email: string }, note: string) {
  if (!validText(contact.name, 200, true)) return 'Họ và tên không được để trống, tối đa 200 ký tự.';
  if (!validPhone(contact.phone)) return 'Nhập số di động Việt Nam hợp lệ, bắt đầu bằng 0 hoặc +84.';
  if (!validEmail(contact.email)) return 'Email liên hệ không hợp lệ.';
  if (!validText(note, 2000)) return 'Ghi chú tối đa 2.000 ký tự, không chứa ký tự điều khiển.';
  return '';
}
