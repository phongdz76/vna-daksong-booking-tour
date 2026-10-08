import type { Theme } from "../types/api";

export const themeLabels: Record<Theme, string> = {
  nature: "Thiên nhiên",
  culture: "Văn hóa",
  food: "Ẩm thực",
  history: "Lịch sử",
};
export function money(value: number | null | undefined) {
  if (value === null || value === undefined) return "Chưa có giá";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}
export function duration(hours: number) {
  if (hours < 24) return `${hours} giờ`;
  if (hours % 24 === 0) return `${hours / 24} ngày`;
  return `${Math.floor(hours / 24)} ngày ${hours % 24} giờ`;
}
export function dateTime(value: string, withTime = true) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? ({ hour: "2-digit", minute: "2-digit" } as const) : {}),
  }).format(new Date(value));
}
export const bookingLabels: Record<string, string> = {
  pending_confirmation: "Chờ VNA xác nhận",
  confirmed: "Đã xác nhận",
  completed: "Đã hoàn thành",
  cancelled: "Đã hủy",
  rejected: "Không thể đáp ứng",
};
export const paymentLabels: Record<string, string> = {
  unpaid: "Chưa thanh toán",
  paid: "Đã thanh toán",
  refund_pending: "Đang hoàn tiền",
  refunded: "Đã hoàn tiền",
};
