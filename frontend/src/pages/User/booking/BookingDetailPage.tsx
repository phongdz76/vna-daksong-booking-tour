import { useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../../../components/layout/Header";
import Icon from "../../../components/common/Icon";
import AppLink from "../../../components/common/AppLink";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../../components/common/States";
import BookingProgress from "../../../components/booking/BookingProgress";
import BookingTicketCode from "../../../components/booking/BookingTicketCode";
import { useAuth } from "../../../context/AuthContext";
import { usePreview } from "../../../context/PreviewContext";
import { previewBookingDetail } from "../../../data/previewBookingDetail";
import useApi from "../../../hooks/useApi";
import useBookingPaymentSync from "../../../hooks/useBookingPaymentSync";
import { api, API_PATHS, errorMessage } from "../../../utils/api";
import { dateTime, money, paymentLabels } from "../../../utils/format";
import {
  bookingHistoryLabel,
  bookingStatusText,
  paymentStatusText,
} from "../../../utils/booking";
import type { Booking } from "../../../types/api";

export default function BookingDetailPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { isPreview, previewBooking, setPreviewBooking } = usePreview();
  const previewData = useMemo(() => {
    if (previewBooking && previewBooking._id === id)
      return { data: previewBooking };
    if (id === previewBookingDetail._id) return { data: previewBookingDetail };
    return undefined;
  }, [previewBooking, id]);
  const result = useApi<{ data: Booking }>(
    user ? API_PATHS.BOOKINGS.GET_BY_ID(id!) : null,
    previewData,
  );
  const [showCancel, setShowCancel] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const sending = useRef(false);
  const booking = result.data?.data;
  const paymentSync = useBookingPaymentSync(
    booking ? [booking] : undefined,
    result.refresh,
  );
  const phone = String(import.meta.env.VITE_SUPPORT_PHONE || "").trim();
  const phoneNumber = phone.replace(/[ .()-]/g, "");
  const hasHotline = /^\+?\d{7,15}$/.test(phoneNumber);
  const oaId = String(import.meta.env.VITE_ZALO_OA_ID || "").trim();

  async function handleCancel(event: React.FormEvent) {
    event.preventDefault();
    if (!booking || sending.current || !reason.trim()) return;
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      if (isPreview)
        setPreviewBooking({
          ...booking,
          status: "cancelled",
          paymentStatus:
            booking.paymentStatus === "paid"
              ? "refund_pending"
              : booking.paymentStatus,
          history: [
            ...(booking.history || []),
            {
              status: "cancelled",
              reason: reason.trim(),
              at: new Date().toISOString(),
            },
          ],
        });
      else {
        await api.patch(API_PATHS.BOOKINGS.CANCEL(id!), {
          reason: reason.trim(),
        });
        result.retry();
      }
      setShowCancel(false);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  async function handlePayment() {
    if (!booking || sending.current || isPreview) return;
    sending.current = true;
    setPaying(true);
    setError("");
    try {
      const response = await api.post<{ order_url: string }>(
        "/payments/zalopay/create",
        { bookingId: booking._id },
      );
      if (!response.data.order_url) throw new Error("Missing payment URL");
      window.location.assign(response.data.order_url);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      sending.current = false;
      setPaying(false);
    }
  }

  const tourStatus = booking && bookingStatusText[booking.status];
  const paymentStatus = booking && paymentStatusText[booking.paymentStatus];
  const canCancel =
    booking && ["pending_confirmation", "confirmed"].includes(booking.status);
  const adultTotal =
    booking && typeof booking.snapshot.adultPrice === "number"
      ? booking.adults * booking.snapshot.adultPrice
      : null;
  const childTotal =
    booking && typeof booking.snapshot.childPrice === "number"
      ? booking.children * booking.snapshot.childPrice
      : null;

  return (
    <div className="page booking-detail-page">
      <Header title="Chi tiết đơn hàng" back fallback="/my-bookings" />
      {authLoading || result.loading ? (
        <LoadingState />
      ) : !isPreview && !user ? (
        <EmptyState
          title="Đăng nhập để xem đơn"
          description="Thông tin đặt tour và thanh toán chỉ hiển thị cho chủ đơn."
        >
          <AppLink
            className="button button-primary"
            to={"/login?returnTo=" + encodeURIComponent("/my-bookings/" + id)}
          >
            Đăng nhập <Icon name="arrow" size={18} />
          </AppLink>
        </EmptyState>
      ) : result.error ? (
        <ErrorState message={result.error} retry={result.retry} />
      ) : (
        booking &&
        tourStatus &&
        paymentStatus && (
          <div className="booking-detail-body">
            <section
              className={
                "booking-detail-status booking-status-card " + booking.status
              }
              aria-label="Trạng thái đặt tour và thanh toán"
            >
              <div className="booking-status-main">
                <span className="booking-status-icon">
                  <Icon name={tourStatus.icon} size={23} />
                </span>
                <div>
                  <span className="booking-status-label">
                    Trạng thái đặt tour
                  </span>
                  <h1>{tourStatus.title}</h1>
                </div>
                <span className={"booking-status-tag " + booking.status}>
                  {tourStatus.badge}
                </span>
              </div>
              <p className="booking-status-description">
                {tourStatus.description}
              </p>
              <div
                className={"booking-payment-state " + booking.paymentStatus}
                role="status"
              >
                <Icon name={paymentStatus.icon} size={20} />
                <div>
                  <span>Trạng thái thanh toán</span>
                  <strong>{paymentStatus.title}</strong>
                  <p>
                    {paymentStatus.description}
                    {booking.paymentStatus === "paid" &&
                    booking.status === "pending_confirmation"
                      ? " VNA đang xác nhận chuyến đi; bạn không cần thanh toán lại."
                      : ""}
                  </p>
                </div>
              </div>
            </section>
            <BookingProgress booking={booking} />
            <section
              className="booking-panel booking-ticket"
              aria-label="Thông tin đơn đặt tour"
            >
              <div className="booking-ticket-top">
                <div className="booking-ticket-heading">
                  <span>
                    <Icon name="ticket" size={19} />
                    {booking.status === "pending_confirmation"
                      ? "Phiếu đặt tour tạm thời"
                      : booking.status === "confirmed"
                        ? "Thông tin chuyến đã xác nhận"
                        : "Thông tin đơn đặt tour"}
                  </span>
                  <strong>{booking.code}</strong>
                </div>
                <span className="booking-ticket-eyebrow">VNA Đắk Song</span>
                <h2>{booking.snapshot.tourName}</h2>
                <BookingTicketCode code={booking.code} preview={isPreview} />
              </div>
              <div className="booking-ticket-perforation" aria-hidden="true">
                <i />
                <span />
                <i />
              </div>
              <dl className="booking-ticket-facts">
                <div>
                  <span className="booking-fact-icon">
                    <Icon name="calendar" size={19} />
                  </span>
                  <div>
                    <dt>Thời gian khởi hành</dt>
                    <dd className="booking-departure-date">
                      {dateTime(booking.snapshot.departureAt)}
                    </dd>
                  </div>
                </div>
                <div>
                  <span className="booking-fact-icon">
                    <Icon name="pin" size={19} />
                  </span>
                  <div>
                    <dt>Điểm đón khách</dt>
                    <dd>{booking.snapshot.meetingPoint}</dd>
                  </div>
                </div>
                <div>
                  <span className="booking-fact-icon">
                    <Icon name="people" size={19} />
                  </span>
                  <div>
                    <dt>Người liên hệ & đoàn khách</dt>
                    <dd>
                      <strong>{booking.contact.name}</strong> ·{" "}
                      {booking.contact.phone}
                      <span className="booking-guest-count">
                        {booking.adults} người lớn
                        {booking.children
                          ? ", " + booking.children + " trẻ em"
                          : ""}
                      </span>
                    </dd>
                  </div>
                </div>
              </dl>
              {booking.note && (
                <p className="booking-contact-note">
                  <strong>Ghi chú:</strong> {booking.note}
                </p>
              )}
            </section>
            <section
              className="booking-panel booking-cost"
              aria-label="Chi phí và thanh toán"
            >
              <div className="booking-cost-heading">
                <h2>
                  <Icon name="orders" size={20} />
                  Bảng kê chi phí
                </h2>
                <span
                  className={"booking-payment-badge " + booking.paymentStatus}
                >
                  {paymentLabels[booking.paymentStatus]}
                </span>
              </div>
              <dl className="booking-cost-lines">
                <div>
                  <dt>Vé người lớn (×{booking.adults})</dt>
                  <dd>
                    {adultTotal == null
                      ? "Theo báo giá đã chốt"
                      : money(adultTotal)}
                  </dd>
                </div>
                {booking.children > 0 && (
                  <div>
                    <dt>Vé trẻ em (×{booking.children})</dt>
                    <dd>
                      {childTotal == null
                        ? "Theo báo giá đã chốt"
                        : money(childTotal)}
                    </dd>
                  </div>
                )}
                {booking.snapshot.discountAmount > 0 && (
                  <div className="booking-discount">
                    <dt>
                      Ưu đãi
                      {booking.snapshot.appliedCoupon
                        ? " · " + booking.snapshot.appliedCoupon
                        : ""}
                    </dt>
                    <dd>−{money(booking.snapshot.discountAmount)}</dd>
                  </div>
                )}
              </dl>
              <div className="booking-cost-total">
                <div>
                  <strong>Tổng cộng</strong>
                  <span>
                    {booking.paymentMethod === "zalopay"
                      ? "Thanh toán qua ZaloPay"
                      : booking.paymentMethod === "qr_transfer"
                        ? "Chuyển khoản ngân hàng"
                        : "Thanh toán tại điểm hẹn"}
                  </span>
                </div>
                <strong>{money(booking.snapshot.total)}</strong>
              </div>
              {!isPreview && (
                <button
                  type="button"
                  className="booking-refresh"
                  onClick={() => {
                    setError("");
                    void paymentSync.checkNow().then(() => result.refresh());
                  }}
                  disabled={busy || paying}
                >
                  <Icon name="history" size={15} />
                  Cập nhật trạng thái thanh toán / chuyến
                </button>
              )}
              {canCancel &&
                booking.paymentMethod === "zalopay" &&
                booking.paymentStatus === "unpaid" && (
                  <button
                    className="button button-primary button-wide booking-pay-button"
                    disabled={isPreview || paying || busy}
                    onClick={handlePayment}
                  >
                    {paying ? "Đang mở ZaloPay…" : "Thanh toán qua ZaloPay"}
                    <Icon name="arrow" size={18} />
                  </button>
                )}
            </section>
            {booking.status === "completed" && (
              <section className="booking-panel booking-review-invitation">
                <h2>
                  <Icon name="star" size={20} />
                  Đánh giá chuyến đi
                </h2>
                <p>Chia sẻ trải nghiệm của bạn hoặc xem lại đánh giá đã gửi.</p>
                <AppLink
                  className="button button-primary button-wide"
                  to={
                    "/tours/" +
                    booking.tourId +
                    "?reviewBookingId=" +
                    booking._id
                  }
                >
                  Viết / xem đánh giá <Icon name="arrow" size={18} />
                </AppLink>
              </section>
            )}
            <div className="booking-order-details">
              <details className="booking-policy">
                <summary>
                  <Icon name="shield" size={17} />
                  Chính sách hủy đã ghi nhận
                  <Icon name="chevron" size={16} />
                </summary>
                <p>{booking.snapshot.cancellationPolicy}</p>
              </details>
              {Boolean(booking.history?.length) && (
                <details className="booking-policy">
                  <summary>
                    <Icon name="history" size={17} />
                    Lịch sử đơn đặt tour
                    <Icon name="chevron" size={16} />
                  </summary>
                  <ol className="booking-order-history">
                    {booking.history?.map((entry, index) => (
                      <li key={index}>
                        <strong>{bookingHistoryLabel(entry.status)}</strong>
                        <time dateTime={entry.at}>{dateTime(entry.at)}</time>
                        {entry.reason && <p>{entry.reason}</p>}
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </div>
            <div className="booking-detail-actions">
              {hasHotline && !isPreview ? (
                <a
                  className="button button-primary button-wide"
                  href={"tel:" + phoneNumber}
                >
                  <Icon name="phone" size={19} />
                  Gọi Hotline hỗ trợ: {phone}
                </a>
              ) : (
                <button
                  type="button"
                  className="button button-primary button-wide"
                  aria-expanded={showSupport}
                  onClick={() => setShowSupport(!showSupport)}
                >
                  <Icon name="phone" size={19} />
                  {isPreview
                    ? "Hotline hỗ trợ • Bản xem mẫu"
                    : "Liên hệ hỗ trợ VNA"}
                </button>
              )}
              {showSupport && (
                <div className="booking-support-note">
                  {isPreview ? (
                    "Đây là giao diện minh họa, không gọi hotline thật."
                  ) : /^\d+$/.test(oaId) ? (
                    <a
                      href={"https://zalo.me/" + oaId}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Nhắn tin cho VNA trên Zalo{" "}
                      <Icon name="external" size={14} />
                    </a>
                  ) : (
                    <>
                      Xem thông tin liên hệ tại{" "}
                      <AppLink to="/account">Tài khoản → Hỗ trợ VNA</AppLink>.
                      Cung cấp mã đơn <strong>{booking.code}</strong> khi liên
                      hệ.
                    </>
                  )}
                </div>
              )}
              {canCancel &&
                (!showCancel ? (
                  <button
                    type="button"
                    className="button button-wide booking-cancel-button"
                    disabled={busy || paying}
                    onClick={() => setShowCancel(true)}
                  >
                    <Icon name="close" size={18} />
                    Hủy yêu cầu đặt tour
                  </button>
                ) : (
                  <form
                    className="booking-panel cancel-form"
                    onSubmit={handleCancel}
                  >
                    <h2>Hủy yêu cầu đặt tour?</h2>
                    <p>
                      {booking.paymentStatus === "paid"
                        ? "Đơn đã thanh toán. Tiền hoàn được xử lý riêng theo chính sách của chuyến, không hoàn ngay khi bấm hủy."
                        : "Kiểm tra chính sách hủy của đơn trước khi tiếp tục."}
                    </p>
                    <label>
                      Lý do hủy
                      <textarea
                        value={reason}
                        maxLength={1000}
                        required
                        disabled={busy}
                        onChange={(event) => setReason(event.target.value)}
                      />
                    </label>
                    <div className="cancel-actions">
                      <button
                        type="button"
                        className="button button-outline"
                        disabled={busy}
                        onClick={() => setShowCancel(false)}
                      >
                        Giữ yêu cầu
                      </button>
                      <button
                        className="button button-danger"
                        disabled={busy || !reason.trim()}
                      >
                        {busy ? "Đang hủy…" : "Xác nhận hủy"}
                      </button>
                    </div>
                  </form>
                ))}
              {canCancel && (
                <p className="booking-cancel-note">
                  Việc hủy và hoàn tiền áp dụng theo chính sách đã ghi nhận
                  trong đơn.
                </p>
              )}
              {(paymentSync.error || result.refreshError) && (
                <p role="alert" className="form-error">
                  {paymentSync.error || result.refreshError}
                </p>
              )}
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}
