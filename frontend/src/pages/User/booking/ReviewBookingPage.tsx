import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Header from "../../../components/layout/Header";
import AppLink, { useAppNavigate } from "../../../components/common/AppLink";
import Icon from "../../../components/common/Icon";
import Photo from "../../../components/common/Photo";
import { EmptyState } from "../../../components/common/States";
import BookingSteps from "../../../components/booking/BookingSteps";
import { useBookingDraft } from "../../../context/BookingDraftContext";
import { useAuth } from "../../../context/AuthContext";
import { usePreview } from "../../../context/PreviewContext";
import { previewTours, previewImages } from "../../../data/preview";
import { api, API_PATHS, errorMessage } from "../../../utils/api";
import { dateTime, duration, money } from "../../../utils/format";
import useApi from "../../../hooks/useApi";
import type { Booking, Quote, Tour } from "../../../types/api";

export default function ReviewBookingPage() {
  const { id } = useParams();
  const navigate = useAppNavigate();
  const { draft, setDraft, attempt, setAttempt } = useBookingDraft();
  const { user, loading: authLoading } = useAuth();
  const { isPreview, setPreviewBooking } = usePreview();
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [quoteInvalid, setQuoteInvalid] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [paymentMethod, setPaymentMethod] = useState<"cash_on_arrival" | "zalopay">("cash_on_arrival");
  const sending = useRef(false);
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const selected = draft?.tourId === id ? draft : null;
  const quote = selected?.quote;
  const locked = busy || refreshing || authLoading || Boolean(attempt);
  const expired = quote ? now >= new Date(quote.expiresAt).getTime() : false;
  const tourResult = useApi<Tour>(
    API_PATHS.TOURS.GET_BY_ID(id!),
    previewTours.find((tour) => tour._id === id),
  );
  const tour = tourResult.data;

  function updateContact(field: "name" | "phone" | "email", value: string) {
    setDraft((previous) =>
      previous
        ? { ...previous, contact: { ...previous.contact, [field]: value } }
        : previous,
    );
  }

  async function refreshQuote() {
    if (!selected || refreshing || attempt) return;
    setRefreshing(true);
    setError("");
    try {
      let updatedQuote: Quote;
      if (isPreview) {
        updatedQuote = {
          ...selected.quote,
          expiresAt: new Date(Date.now() + 600000).toISOString(),
        };
      } else {
        const response = await api.post<Quote>(`${API_PATHS.BOOKINGS.GET_ALL}/quote`, {
          departureId: selected.departure._id,
          adults: selected.adults,
          children: selected.children,
          couponCode: selected.quote.appliedCoupon || undefined,
        });
        updatedQuote = response.data;
      }
      setDraft({ ...selected, quote: updatedQuote });
      setNow(Date.now());
      setQuoteInvalid(false);
      setAgreed(false);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !quote || sending.current) return;
    if (!isPreview && !user) {
      navigate(
        "/login?returnTo=" + encodeURIComponent("/booking/" + id + "/review"),
      );
      return;
    }
    if (!attempt && (expired || quoteInvalid || !agreed)) {
      setError("Kiểm tra báo giá và đồng ý điều kiện trước khi gửi.");
      return;
    }
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      let booking: Booking;
      if (isPreview) {
        const {
          quoteToken,
          expiresAt,
          message,
          departureId,
          adults,
          children,
          ...snapshot
        } = quote;
        booking = {
          _id: "preview-booking",
          code: "VNA-MAU",
          tourId: selected.tourId,
          departureId: selected.departure._id,
          adults: selected.adults,
          children: selected.children,
          contact: {
            name: selected.contact.name.trim(),
            phone: selected.contact.phone.trim(),
            email: selected.contact.email.trim().toLowerCase(),
          },
          note: selected.note.trim(),
          snapshot,
          status: "pending_confirmation",
          paymentStatus: "unpaid",
          paymentMethod: paymentMethod,
        };
        setPreviewBooking(booking);
      } else {
        const request = attempt || {
          key: crypto.randomUUID(),
          payload: {
            quoteToken: quote.quoteToken,
            contact: {
              name: selected.contact.name.trim(),
              phone: selected.contact.phone.trim(),
              email: selected.contact.email.trim().toLowerCase(),
            },
            note: selected.note.trim(),
            couponCode: quote.appliedCoupon || "",
            paymentMethod: paymentMethod,
          },
        };
        setAttempt(request);
        const response = await api.post<{ data: Booking }>(
          "/bookings",
          request.payload,
          {
            headers: { "Idempotency-Key": request.key },
          },
        );
        booking = response.data.data;
        
        if (paymentMethod === "zalopay") {
          try {
            const paymentResponse = await api.post<{ order_url: string }>("/payments/zalopay/create", { bookingId: booking._id });
            if (paymentResponse.data.order_url) {
              setAttempt(null);
              setDraft(null);
              window.location.href = paymentResponse.data.order_url;
              return;
            }
          } catch (e) {
            // Proceed to success page even if ZaloPay API fails, they can retry on Detail Page
            console.error("ZaloPay create error:", e);
          }
        }
      }
      setAttempt(null);
      setDraft(null);
      navigate("/booking/success/" + booking._id, true);
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        error.response &&
        error.response.status < 500
      ) {
        setAttempt(null);
        if (error.response.status === 409) {
          setQuoteInvalid(true);
          setAgreed(false);
        }
      }
      setError(errorMessage(error));
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="page stitch-review has-action-bar">
      <Header
        title="Xác nhận & đặt tour"
        back
        fallback={"/booking/" + id + "/select"}
      />
      {!selected || !quote ? (
        <EmptyState
          title="Chọn chuyến trước nhé"
          description="Chọn ngày khởi hành và số khách để kiểm tra giá."
        >
          <AppLink
            className="button button-primary"
            to={"/booking/" + id + "/select"}
          >
            Chọn chuyến <Icon name="arrow" size={18} />
          </AppLink>
        </EmptyState>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="checkout-body">
            <BookingSteps step={2} />
            <section className="card booking-summary">
              <div className="mini-tour">
                <Photo
                  src={
                    isPreview
                      ? previewImages.reviewTour
                      : tour?.images?.[0]?.url
                  }
                  alt={quote.tourName}
                />
                <div>
                  <span className="eyebrow">
                    {isPreview ? "Hành trình trải nghiệm" : "Tour đã chọn"}
                  </span>
                  <h2>{quote.tourName}</h2>
                  <span className="meta">
                    <Icon name="clock" size={15} />
                    {isPreview && id === "preview-trekking"
                      ? "2 Ngày 1 Đêm"
                      : duration(quote.durationHours)}
                  </span>
                </div>
              </div>
              <div className="summary-facts">
                <p>
                  <Icon name="calendar" size={18} />
                  <span>Khởi hành:</span>
                  <strong>{dateTime(quote.departureAt)}</strong>
                </p>
                <p>
                  <Icon name="people" size={18} />
                  <span>Thành viên:</span>
                  <strong>
                    {selected.adults} Người lớn
                    {selected.children > 0
                      ? ", " + selected.children + " Trẻ em"
                      : ""}
                  </strong>
                </p>
                <p>
                  <Icon name="pin" size={18} />
                  <span>Điểm đón:</span>
                  <strong>{quote.meetingPoint}</strong>
                </p>
              </div>
              <dl className="price-breakdown">
                <div className="price-total">
                  <dt>Tạm tính:</dt>
                  <dd>{money(quote.total)}</dd>
                </div>
              </dl>
              {tour?.includes.length ? (
                <p className="summary-includes">
                  <Icon name="check" size={14} />
                  <span>{tour.includes.join(", ")}</span>
                </p>
              ) : null}
              <details className="quote-details">
                <summary>Chi tiết giá & thay đổi lựa chọn</summary>
                <p>
                  Người lớn: {selected.adults} × {money(quote.adultPrice)}
                </p>
                {selected.children > 0 && (
                  <p>
                    Trẻ em: {selected.children} × {money(quote.childPrice)}
                  </p>
                )}
                {quote.discountAmount > 0 && (
                  <p>
                    Ưu đãi {quote.appliedCoupon}: −{money(quote.discountAmount)}
                  </p>
                )}
                <p className="helper">
                  {isPreview
                    ? "Giá minh họa."
                    : "Báo giá có hiệu lực đến " +
                      dateTime(quote.expiresAt) +
                      "."}
                </p>
                {!attempt && (
                  <AppLink
                    className="text-link"
                    to={"/booking/" + id + "/select"}
                  >
                    Thay đổi chuyến hoặc số khách{" "}
                    <Icon name="chevron" size={15} />
                  </AppLink>
                )}
              </details>
            </section>

            {!isPreview && !user && (
              <div className="notice">
                <Icon name="user" />
                <div>
                  <strong>Đăng nhập để gửi yêu cầu</strong>
                  <p>Lựa chọn được giữ khi quay lại.</p>
                  <AppLink
                    className="text-link"
                    to={
                      "/login?returnTo=" +
                      encodeURIComponent("/booking/" + id + "/review")
                    }
                  >
                    Đăng nhập Zalo <Icon name="arrow" size={16} />
                  </AppLink>
                </div>
              </div>
            )}

            <section className="card">
              <div className="contact-heading">
                <h2>
                  <Icon name="user" size={20} />
                  Thông tin người liên hệ
                </h2>
                <span>* Bắt buộc</span>
              </div>
              <fieldset disabled={locked} className="contact-fields">
                <label>
                  Họ và tên <span className="required">*</span>
                  <div className="stitch-input">
                    <Icon name="user" size={20} />
                    <input
                      name="name"
                      autoComplete="name"
                      required
                      maxLength={200}
                      value={selected.contact.name}
                      onChange={(event) =>
                        updateContact("name", event.target.value)
                      }
                      placeholder="Nhập họ và tên..."
                    />
                  </div>
                </label>
                <label>
                  Số điện thoại <span className="required">*</span>
                  <div className="stitch-input">
                    <Icon name="phone" size={20} />
                    <input
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      required
                      minLength={7}
                      maxLength={20}
                      pattern="(0|\+84)[3|5|7|8|9][0-9]{8}"
                      value={selected.contact.phone}
                      onChange={(event) =>
                        updateContact("phone", event.target.value)
                      }
                      placeholder="Nhập số điện thoại..."
                    />
                  </div>
                  <span className="helper">
                    <Icon name="info" size={13} />
                    VNA dùng để liên hệ về chuyến đi của bạn.
                  </span>
                </label>
                <label>
                  Email <span className="required">*</span>
                  <div className="stitch-input">
                    <Icon name="mail" size={20} />
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={254}
                      value={selected.contact.email}
                      onChange={(event) =>
                        updateContact("email", event.target.value)
                      }
                      placeholder="Nhập email để nhận xác nhận..."
                    />
                  </div>
                  <span className="helper">
                    <Icon name="info" size={13} />
                    Xác nhận đặt tour sẽ được gửi về email này.
                  </span>
                </label>
                <label>
                  Ghi chú cho Hướng dẫn viên (HDV)
                  <textarea
                    name="note"
                    maxLength={2000}
                    rows={3}
                    value={selected.note}
                    onChange={(event) =>
                      setDraft({ ...selected, note: event.target.value })
                    }
                    placeholder="Yêu cầu ăn kiêng đặc biệt hoặc điều cần lưu ý..."
                  />
                </label>
              </fieldset>
            </section>

            <section className="card">
              <h2>
                <Icon name="wallet" size={20} />
                Phương thức thanh toán
              </h2>
              <div className="payment-options">
                <div
                  className="payment-option"
                  onClick={() => !locked && setPaymentMethod("zalopay")}
                  role="radio"
                  aria-checked={paymentMethod === "zalopay"}
                  style={{ cursor: locked ? "not-allowed" : "pointer", opacity: locked ? 0.7 : 1 }}
                >
                  <span className="radio-mark" />
                  <div>
                    <strong>Thanh toán qua ZaloPay</strong>
                    <p>Mở ứng dụng ZaloPay hoặc quét mã QR để xác nhận ngay.</p>
                  </div>
                  <Icon name="qr" size={22} />
                </div>
                <div 
                  className="payment-option"
                  onClick={() => !locked && setPaymentMethod("cash_on_arrival")}
                  role="radio"
                  aria-checked={paymentMethod === "cash_on_arrival"}
                  style={{ cursor: locked ? "not-allowed" : "pointer", opacity: locked ? 0.7 : 1 }}
                >
                  <span className="radio-mark" />
                  <div>
                    <strong>Thanh toán tại điểm hẹn</strong>
                    <p>
                      Chưa thu tiền khi gửi yêu cầu. VNA sẽ trao đổi khi xác
                      nhận chuyến.
                    </p>
                  </div>
                  <Icon name="pin" size={22} />
                </div>
              </div>
              <div className="payment-info">
                <Icon name="shield" size={20} />
                <p>
                  {isPreview
                    ? "Bản xem mẫu không gửi đơn thật và không thu tiền."
                    : "Thông tin liên hệ được dùng để xử lý yêu cầu đặt tour."}
                </p>
              </div>
            </section>

            <details className="policy">
              <summary>Điều kiện hủy chuyến</summary>
              <p>{quote.cancellationPolicy}</p>
            </details>
            {(expired || quoteInvalid) && !attempt && (
              <div className="form-error" role="alert">
                <p>
                  Báo giá hết hạn hoặc đã thay đổi. Kiểm tra lại giá trước khi
                  gửi.
                </p>
                <button
                  type="button"
                  className="text-link"
                  disabled={refreshing}
                  onClick={refreshQuote}
                >
                  {refreshing ? "Đang kiểm tra…" : "Kiểm tra lại giá"}{" "}
                  <Icon name="arrow" size={17} />
                </button>
              </div>
            )}
            <label className="agreement">
              <input
                type="checkbox"
                checked={agreed}
                disabled={locked}
                onChange={(event) => setAgreed(event.target.checked)}
              />
              <span>
                Tôi đã kiểm tra thông tin và đồng ý điều kiện của chuyến đi.
              </span>
            </label>
            {attempt && !busy && (
              <div className="form-error" role="alert">
                Chưa xác định được kết quả gửi. Thử gửi lại cùng yêu cầu để
                tránh tạo đơn trùng.
              </div>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </div>

          <div className="action-bar">
            <div className="action-total">
              <span>Tổng thanh toán:</span>
              <strong>{money(quote.total)}</strong>
            </div>
            <button
              className="button button-primary button-wide"
              type="submit"
              disabled={
                busy ||
                refreshing ||
                authLoading ||
                (!attempt && (expired || quoteInvalid || !agreed))
              }
            >
              {busy
                ? "Đang gửi yêu cầu…"
                : attempt
                  ? "Thử gửi lại cùng yêu cầu"
                  : isPreview
                    ? "Thử gửi yêu cầu mẫu"
                    : "Xác nhận yêu cầu đặt tour"}
              <Icon name="arrow" size={20} />
            </button>
            <p className="checkout-footer-note">
              <Icon name="info" size={13} />
              Chỗ được VNA xác nhận sau khi nhận yêu cầu.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
