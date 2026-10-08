import type { Booking } from "../types/api";

export const bookingStatusText: Record<
  Booking["status"],
  { title: string; badge: string; description: string; icon: string }
> = {
  pending_confirmation: {
    title: "Chờ xác nhận chuyến",
    badge: "Đang xử lý",
    description:
      "VNA đang kiểm tra lịch và khả năng tổ chức chuyến đi của bạn.",
    icon: "clock",
  },
  confirmed: {
    title: "Chuyến đi đã xác nhận",
    badge: "Đã xác nhận",
    description:
      "VNA đã xác nhận nhận đơn và tổ chức chuyến đi theo lịch bên dưới.",
    icon: "check",
  },
  completed: {
    title: "Chuyến đi đã hoàn thành",
    badge: "Hoàn thành",
    description: "Cảm ơn bạn đã đồng hành cùng VNA Đắk Song.",
    icon: "check",
  },
  cancelled: {
    title: "Đơn đặt tour đã hủy",
    badge: "Đã hủy",
    description:
      "Đơn này không còn hiệu lực. Tình trạng tiền được hiển thị riêng bên dưới.",
    icon: "close",
  },
  rejected: {
    title: "VNA chưa thể nhận đơn",
    badge: "Không thể đáp ứng",
    description:
      "VNA không thể tổ chức chuyến theo yêu cầu này. Xem lý do trong lịch sử đơn.",
    icon: "info",
  },
};
export const paymentStatusText: Record<
  Booking["paymentStatus"],
  { title: string; description: string; icon: string }
> = {
  unpaid: {
    title: "Chưa thanh toán",
    description: "Chưa có thanh toán được ghi nhận cho đơn này.",
    icon: "wallet",
  },
  paid: {
    title: "Thanh toán thành công",
    description: "Hệ thống đã ghi nhận thanh toán cho đơn này.",
    icon: "shield",
  },
  refund_pending: {
    title: "Đang chờ hoàn tiền",
    description:
      "Khoản tiền cần được xử lý hoàn. Hệ thống chưa xác nhận đã hoàn tiền.",
    icon: "history",
  },
  refunded: {
    title: "Đã hoàn tiền",
    description: "Hệ thống đã ghi nhận hoàn tiền cho đơn này.",
    icon: "check",
  },
};
export function bookingHistoryLabel(status: string) {
  const labels: Record<string, string> = {
    pending_confirmation: "Đã gửi yêu cầu đặt tour",
    confirmed: "VNA đã xác nhận chuyến",
    completed: "Chuyến đi đã hoàn thành",
    cancelled: "Đã hủy đơn",
    rejected: "VNA không thể nhận đơn",
    payment_received: "Đã ghi nhận thanh toán",
    refund_pending: "Cần xử lý hoàn tiền",
    refunded: "Đã hoàn tiền",
  };
  return labels[status] || "Cập nhật đơn";
}
