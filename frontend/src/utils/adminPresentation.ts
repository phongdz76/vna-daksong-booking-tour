import type { Coupon, Departure } from "../types/admin";

export const bookingLabels = {
  pending_confirmation: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  completed: "Đã hoàn thành",
  cancelled: "Đã hủy",
  rejected: "Đã từ chối",
};
export const paymentLabels = {
  unpaid: "Chưa thanh toán",
  paid: "Đã thanh toán",
  refund_pending: "Chờ hoàn tiền",
  refunded: "Đã hoàn tiền",
};
export const transactionLabels = {
  pending: "Đang chờ thanh toán",
  success: "Thanh toán thành công",
  failed: "Thanh toán không thành công",
  refund_pending: "Chờ hoàn tiền",
  refunded: "Đã hoàn tiền",
};
export const refundLabels = {
  none: "Chưa gửi yêu cầu hoàn tiền",
  pending: "Đã gửi yêu cầu hoàn tiền, chờ xác minh kết quả",
  failed: "Yêu cầu hoàn tiền không thành công",
  success: "Hoàn tiền thành công",
};
export const contentLabels = {
  draft: "Bản nháp",
  published: "Đã xuất bản",
  archived: "Đã lưu trữ",
};
export const themeLabels = {
  nature: "Thiên nhiên",
  culture: "Văn hóa",
  food: "Ẩm thực",
  history: "Lịch sử",
};
export const articleLabels = {
  culture: "Văn hóa",
  food: "Ẩm thực",
  travel_tips: "Kinh nghiệm du lịch",
  story: "Câu chuyện",
};
export const methodLabels = {
  cash_on_arrival: "Thanh toán khi tham gia",
  qr_transfer: "Chuyển khoản",
  zalopay: "ZaloPay",
};
export const historyLabels = {
  ...bookingLabels,
  payment_received: "Đã ghi nhận thanh toán",
  refund_pending: "Chờ hoàn tiền",
  refunded: "Đã hoàn tiền",
};
export const label = (map: Record<string, string>, value?: string) =>
  value ? map[value] || "Chưa xác định" : "Chưa xác định";
export function tone(value: string): string {
  if (
    [
      "confirmed",
      "completed",
      "paid",
      "payment_received",
      "published",
      "open",
      "success",
      "refunded",
      "valid",
    ].includes(value)
  )
    return "green";
  if (
    ["pending_confirmation", "pending", "refund_pending", "future"].includes(
      value,
    )
  )
    return "amber";
  if (["rejected", "failed", "expired", "exhausted"].includes(value))
    return "red";
  return "gray";
}
export const money = (value?: number | null) =>
  value == null
    ? "Chưa có giá"
    : new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
      }).format(value);
export function date(value?: string, time = false) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(time ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
  }).format(new Date(value));
}
export function localDateTime(value?: string) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return "";
  return new Date(new Date(value).getTime() + 7 * 3600000)
    .toISOString()
    .slice(0, 16);
}
export function isoDateTime(value: string) {
  return new Date(`${value}:00+07:00`).toISOString();
}
export function departureState(d: Departure) {
  if (d.status === "closed") return { text: "Đã đóng nhận đặt", tone: "gray" };
  if (new Date(d.departureAt).getTime() <= Date.now())
    return { text: "Đã qua giờ khởi hành", tone: "gray" };
  if (new Date(d.bookingDeadline).getTime() <= Date.now())
    return { text: "Đã hết hạn nhận đặt", tone: "amber" };
  return { text: "Mở nhận đặt", tone: "green" };
}
export function couponState(c: Coupon) {
  if (!c.isActive) return { text: "Đã tắt", tone: "gray" };
  if (new Date(c.validUntil).getTime() < Date.now())
    return { text: "Hết hạn", tone: "red" };
  if (c.usageLimit !== null && c.usedCount >= c.usageLimit)
    return { text: "Hết lượt dùng", tone: "red" };
  if (new Date(c.validFrom).getTime() > Date.now())
    return { text: "Chưa đến ngày áp dụng", tone: "amber" };
  return { text: "Còn hiệu lực", tone: "green" };
}
export const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 180)
    .replace(/-$/, "");
