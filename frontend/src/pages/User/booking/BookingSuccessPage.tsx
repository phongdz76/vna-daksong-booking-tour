import { API_PATHS } from "../../../utils/api";
import { useParams } from "react-router-dom";
import { useMemo } from "react";
import Header from "../../../components/layout/Header";
import AppLink from "../../../components/common/AppLink";
import Icon from "../../../components/common/Icon";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../../components/common/States";
import { useAuth } from "../../../context/AuthContext";
import { usePreview } from "../../../context/PreviewContext";
import useApi from "../../../hooks/useApi";
import useBookingPaymentSync from "../../../hooks/useBookingPaymentSync";
import {
  bookingLabels,
  dateTime,
  money,
  paymentLabels,
} from "../../../utils/format";
import type { Booking } from "../../../types/api";

export default function BookingSuccessPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { isPreview, previewBooking } = usePreview();
  const previewData = useMemo(
    () =>
      previewBooking && previewBooking._id === id
        ? { data: previewBooking }
        : undefined,
    [id, previewBooking],
  );
  const result = useApi<{ data: Booking }>(
    user ? API_PATHS.BOOKINGS.GET_BY_ID(id!) : null,
    previewData,
  );
  const booking = result.data?.data;
  const paymentSync = useBookingPaymentSync(
    booking ? [booking] : undefined,
    result.refresh,
  );
  return (
    <div className="page">
      <Header title="Yêu cầu của bạn" back fallback="/my-bookings" />
      {authLoading || result.loading ? (
        <LoadingState />
      ) : !isPreview && !user ? (
        <EmptyState
          title="Đăng nhập để xem kết quả"
          description="Kiểm tra trạng thái thanh toán và chuyến đi của bạn."
        >
          <AppLink
            className="button button-primary"
            to={
              "/login?returnTo=" + encodeURIComponent("/booking/success/" + id)
            }
          >
            Đăng nhập
          </AppLink>
        </EmptyState>
      ) : result.error ? (
        <ErrorState message={result.error} retry={result.retry} />
      ) : (
        booking && (
          <div className="success-body">
            <span className="success-icon">
              <Icon name="check" size={37} />
            </span>
            <span className="eyebrow">
              {isPreview ? "BẢN XEM MẪU" : "ĐÃ GHI NHẬN"}
            </span>
            <h1>
              {isPreview
                ? "Đã mô phỏng gửi yêu cầu!"
                : booking.paymentStatus === "paid"
                  ? "Thanh toán thành công!"
                  : "Đã nhận yêu cầu của bạn!"}
            </h1>
            <p className="success-description">
              {isPreview
                ? "Đây là đơn minh họa. Không có yêu cầu nào được gửi tới VNA."
                : booking.paymentStatus === "paid"
                  ? "Hệ thống đã ghi nhận thanh toán. Trạng thái xác nhận chuyến được hiển thị riêng bên dưới."
                  : "Bạn có thể theo dõi trạng thái trong Đơn hàng. VNA sẽ kiểm tra chuyến và liên hệ với bạn."}
            </p>
            <section className="card success-card">
              <div className="booking-code">
                <span>Mã yêu cầu</span>
                <strong>{booking.code}</strong>
              </div>
              <h2>{booking.snapshot.tourName}</h2>
              <p className="meta">
                <Icon name="calendar" size={18} />
                {dateTime(booking.snapshot.departureAt)}
              </p>
              <p className="meta">
                <Icon name="people" size={18} />
                {booking.adults} người lớn
                {booking.children > 0 ? `, ${booking.children} trẻ em` : ""}
              </p>
              <div className="booking-card-footer">
                <span className={`status-badge ${booking.status}`}>
                  {bookingLabels[booking.status]}
                </span>
                <strong>{money(booking.snapshot.total)}</strong>
              </div>
              <p
                className={
                  "helper booking-payment-label " + booking.paymentStatus
                }
                aria-live="polite"
              >
                {paymentLabels[booking.paymentStatus]}
              </p>
              {booking.paymentMethod === "zalopay" &&
                booking.paymentStatus === "unpaid" &&
                ["pending_confirmation", "confirmed"].includes(
                  booking.status,
                ) && (
                  <div style={{ marginTop: "20px" }}>
                    <button
                      className="button button-primary button-wide"
                      onClick={async () => {
                        try {
                          const { api } = await import("../../../utils/api");
                          const res = await api.post<{ order_url: string }>(
                            "/payments/zalopay/create",
                            { bookingId: booking._id },
                          );
                          if (res.data.order_url)
                            window.location.href = res.data.order_url;
                        } catch (e) {
                          alert(
                            "Không thể khởi tạo thanh toán ZaloPay. Vui lòng thử lại sau.",
                          );
                        }
                      }}
                    >
                      Thanh toán qua ZaloPay
                    </button>
                  </div>
                )}
            </section>
            {(paymentSync.error || result.refreshError) && (
              <p className="form-error" role="alert">
                {paymentSync.error || result.refreshError}
              </p>
            )}
            {!isPreview &&
              booking.paymentMethod === "zalopay" &&
              booking.paymentStatus === "unpaid" && (
                <button
                  type="button"
                  className="text-link"
                  disabled={paymentSync.checking}
                  onClick={() => void paymentSync.checkNow()}
                >
                  {paymentSync.checking
                    ? "Đang kiểm tra ZaloPay…"
                    : "Kiểm tra lại thanh toán"}
                </button>
              )}
            <div className="notice">
              <Icon name="info" />
              <p>
                Xác nhận chuyến và thanh toán là hai trạng thái riêng. VNA xác
                nhận lịch tổ chức chuyến; kết quả thanh toán được cập nhật từ hệ
                thống thanh toán.
              </p>
            </div>
            <AppLink
              className="button button-primary button-wide"
              to={`/my-bookings/${booking._id}`}
            >
              Xem chi tiết yêu cầu <Icon name="arrow" size={18} />
            </AppLink>
            <AppLink className="button button-outline button-wide" to="/">
              Về trang chủ
            </AppLink>
          </div>
        )
      )}
    </div>
  );
}
