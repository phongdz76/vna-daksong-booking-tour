import { API_PATHS } from "../../../utils/api";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
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
import { previewList } from "../../../data/preview";
import useApi from "../../../hooks/useApi";
import useBookingPaymentSync from "../../../hooks/useBookingPaymentSync";
import {
  bookingLabels,
  dateTime,
  money,
  paymentLabels,
} from "../../../utils/format";
import type { Booking, ListResponse } from "../../../types/api";

export default function MyBookingsPage() {
  const { user, loading } = useAuth();
  const { isPreview, previewBooking } = usePreview();
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "";
  const page = Number(params.get("page")) || 1;
  const previewData = useMemo(
    () =>
      previewList(
        previewBooking && (!status || previewBooking.status === status)
          ? [previewBooking]
          : [],
      ),
    [previewBooking, status],
  );
  const result = useApi<ListResponse<Booking>>(
    user
      ? `/bookings/mine?limit=8&page=${page}${status ? `&status=${status}` : ""}`
      : null,
    previewData,
  );
  const paymentSync = useBookingPaymentSync(result.data?.data, result.refresh);
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  }
  return (
    <div className="page">
      <Header title="Đơn hàng của tôi" />
      <section className="page-intro">
        <span className="eyebrow">HÀNH TRÌNH ĐÃ CHỌN</span>
        <h1>Hẹn bạn ở đại ngàn.</h1>
        <p>Theo dõi từng bước chuẩn bị cho chuyến đi.</p>
      </section>
      {loading ? (
        <LoadingState />
      ) : !user && !isPreview ? (
        <EmptyState
          title="Đăng nhập để xem đơn"
          description="Xem lại chuyến đã chọn và cập nhật từ VNA."
        >
          <AppLink
            className="button button-primary"
            to="/login?returnTo=%2Fmy-bookings"
          >
            Đăng nhập Zalo <Icon name="arrow" size={18} />
          </AppLink>
        </EmptyState>
      ) : (
        <>
          <div className="chip-rail">
            <button
              className={`chip ${!status ? "selected" : ""}`}
              onClick={() => update("status", "")}
            >
              Tất cả
            </button>
            {[
              "pending_confirmation",
              "confirmed",
              "completed",
              "cancelled",
            ].map((value) => (
              <button
                className={`chip ${status === value ? "selected" : ""}`}
                key={value}
                onClick={() => update("status", value)}
              >
                {bookingLabels[value]}
              </button>
            ))}
          </div>
          <section className="section">
            {(paymentSync.error || result.refreshError) && (
              <p className="form-error" role="alert">
                {paymentSync.error || result.refreshError}{" "}
                <button
                  type="button"
                  className="text-link"
                  disabled={paymentSync.checking}
                  onClick={() => void paymentSync.checkNow()}
                >
                  Kiểm tra lại thanh toán
                </button>
              </p>
            )}
            {result.loading ? (
              <LoadingState />
            ) : result.error ? (
              <ErrorState message={result.error} retry={result.retry} />
            ) : result.data?.data.length ? (
              <>
                <div className="booking-list">
                  {result.data.data.map((booking) => (
                    <AppLink
                      to={`/my-bookings/${booking._id}`}
                      className="card booking-card"
                      key={booking._id}
                    >
                      <div className="booking-card-top">
                        <small>{booking.code}</small>
                        <span className={`status-badge ${booking.status}`}>
                          {bookingLabels[booking.status]}
                        </span>
                      </div>
                      <h2>{booking.snapshot.tourName}</h2>
                      <p className="meta">
                        <Icon name="calendar" size={17} />
                        {dateTime(booking.snapshot.departureAt)}
                      </p>
                      <p className="meta">
                        <Icon name="people" size={17} />
                        {booking.adults + booking.children} khách
                      </p>
                      <div className="booking-card-footer">
                        <span
                          className={
                            "booking-payment-label " + booking.paymentStatus
                          }
                          aria-live="polite"
                        >
                          {paymentLabels[booking.paymentStatus]}
                        </span>
                        <strong>{money(booking.snapshot.total)}</strong>
                        <Icon name="chevron" size={17} />
                      </div>
                      {booking.status === "completed" && (
                        <p className="meta">
                          <Icon name="star" size={16} />
                          Xem đơn để viết / sửa đánh giá
                        </p>
                      )}
                    </AppLink>
                  ))}
                </div>
                {result.data.pagination.pages > 1 && (
                  <div className="pagination">
                    <button
                      className="button button-outline"
                      disabled={page <= 1}
                      onClick={() => update("page", String(page - 1))}
                    >
                      Trước
                    </button>
                    <span>
                      {page} / {result.data.pagination.pages}
                    </span>
                    <button
                      className="button button-outline"
                      disabled={page >= result.data.pagination.pages}
                      onClick={() => update("page", String(page + 1))}
                    >
                      Tiếp
                    </button>
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                title="Chưa có yêu cầu nào"
                description="Chọn một hành trình, chúng tôi sẽ cùng bạn chuẩn bị chuyến đi."
              >
                <AppLink className="button button-primary" to="/tours">
                  Khám phá tour <Icon name="arrow" size={18} />
                </AppLink>
              </EmptyState>
            )}
          </section>
        </>
      )}
    </div>
  );
}
