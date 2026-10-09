import { API_PATHS } from "../../../utils/api";
import { useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../../../components/layout/Header";
import AppLink, { useAppNavigate } from "../../../components/common/AppLink";
import Icon from "../../../components/common/Icon";
import Photo from "../../../components/common/Photo";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../../components/common/States";
import BookingSteps from "../../../components/booking/BookingSteps";
import GuestCounter from "../../../components/booking/GuestCounter";
import CouponPicker from "../../../components/booking/CouponPicker";
import { useBookingDraft } from "../../../context/BookingDraftContext";
import { usePreview } from "../../../context/PreviewContext";
import useApi from "../../../hooks/useApi";
import {
  previewDepartures,
  previewList,
  previewTours,
} from "../../../data/preview";
import { dateTime, duration, money } from "../../../utils/format";
import { api, errorMessage } from "../../../utils/api";
import type { Departure, ListResponse, Quote, Tour } from "../../../types/api";

export default function SelectDeparturePage() {
  const { id } = useParams();
  const navigate = useAppNavigate();
  const { draft, setDraft, attempt } = useBookingDraft();
  const { isPreview } = usePreview();
  const saved = draft?.tourId === id ? draft : null;
  const [selectedId, setSelectedId] = useState(saved?.departure._id || "");
  const [adults, setAdults] = useState(saved?.adults || 1);
  const [children, setChildren] = useState(saved?.children || 0);
  const [coupon, setCoupon] = useState(saved?.quote.appliedCoupon || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sending = useRef(false);
  const [page, setPage] = useState(1);
  const tourResult = useApi<Tour>(API_PATHS.TOURS.GET_BY_ID(id!),
    previewTours.find((tour) => tour._id === id),
  );
  const previewData = useMemo(
    () => previewList(previewDepartures.filter((d) => d.tourId === id)),
    [id],
  );
  const departures = useApi<ListResponse<Departure>>(
    `/tours/${id}/departures?page=${page}&limit=12`,
    previewData,
  );
  const available =
    departures.data?.data.filter(
      (d) =>
        d.status === "open" &&
        new Date(d.bookingDeadline).getTime() > Date.now() &&
        new Date(d.departureAt).getTime() > Date.now(),
    ) || [];
  const selected =
    available.find((d) => d._id === selectedId) ||
    (selectedId ? undefined : available[0]);
  const tour = tourResult.data;
  const canSelectChildren = selected?.childPrice != null;
  const maxGuests = selected?.maxGuestsPerBooking ?? 1;
  const estimated = selected
    ? adults * selected.adultPrice + children * (selected.childPrice ?? 0)
    : null;

  async function handleContinue() {
    if (!selected || !tour || sending.current) return;
    if (attempt) {
      setError(
        "Yêu cầu trước đang chờ kiểm tra. Quay lại bước kiểm tra để thử gửi lại cùng yêu cầu.",
      );
      return;
    }
    if (adults + children > maxGuests || (children > 0 && !canSelectChildren)) {
      setError(
        "Số khách chưa phù hợp với chuyến này. Vui lòng điều chỉnh lại.",
      );
      return;
    }
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      let quote: Quote;
      if (isPreview) {
        if (coupon.trim()) {
          setError(
            "Bản xem mẫu chưa áp dụng mã giảm giá. Hãy bỏ mã để tiếp tục.",
          );
          return;
        }
        quote = {
          departureId: selected._id,
          adults,
          children,
          tourName: tour.name,
          departureAt: selected.departureAt,
          meetingPoint: tour.meetingPoint,
          adultPrice: selected.adultPrice,
          childPrice: selected.childPrice,
          subTotal: estimated ?? 0,
          discountAmount: 0,
          total: estimated ?? 0,
          appliedCoupon: null,
          cancellationPolicy: tour.cancellationPolicy,
          childPolicy: tour.childPolicy,
          durationHours: tour.durationHours,
          quoteToken: "design-preview-only",
          expiresAt: new Date(Date.now() + 600000).toISOString(),
          message:
            "Dữ liệu minh họa. Bản xem mẫu không gửi yêu cầu đặt tour thật.",
        };
      } else {
        const response = await api.post<Quote>("/bookings/quote", {
          departureId: selected._id,
          adults,
          children,
          couponCode: coupon.trim().toUpperCase() || undefined,
        });
        quote = response.data;
      }
      setDraft({
        tourId: tour._id,
        departure: selected,
        adults,
        children,
        quote,
        contact: saved?.contact || { name: "", phone: "", email: "" },
        note: saved?.note || "",
      });
      navigate(`/booking/${id}/review`);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="page has-action-bar">
      <Header title="Chọn chuyến của bạn" back fallback={`/tours/${id}`} />
      <div className="checkout-body">
        <BookingSteps step={1} />
        {tourResult.loading || departures.loading ? (
          <LoadingState />
        ) : tourResult.error ? (
          <ErrorState message={tourResult.error} retry={tourResult.retry} />
        ) : departures.error ? (
          <ErrorState message={departures.error} retry={departures.retry} />
        ) : (
          tour && (
            <>
              <div className="mini-tour card">
                <Photo src={tour.images?.[0]?.url} alt={tour.name} />
                <div>
                  <span className="eyebrow">HÀNH TRÌNH ĐÃ CHỌN</span>
                  <h2>{tour.name}</h2>
                  <span className="meta">
                    <Icon name="clock" size={15} />
                    {duration(tour.durationHours)}
                  </span>
                </div>
              </div>
              {available.length ? (
                <>
                  <section className="card">
                    <h2>
                      <Icon name="calendar" />
                      Chuyến khởi hành
                    </h2>
                    <p className="muted">Chọn ngày phù hợp với bạn.</p>
                    <fieldset
                      className="departure-options"
                      disabled={busy || Boolean(attempt)}
                    >
                      {available.map((departure) => {
                        const maxCap = departure.maxCapacity || 50;
                        const booked = departure.bookedGuests ?? 0;
                        const avail = departure.availableSeats ?? Math.max(0, maxCap - booked);
                        const isFull = avail <= 0 || departure.status === "closed";
                        const isSelected = selected?._id === departure._id;

                        return (
                          <label
                            className={`departure-option ${isSelected ? "selected" : ""} ${isFull ? "disabled full" : ""}`}
                            key={departure._id}
                          >
                            <input
                              type="radio"
                              name="departure"
                              checked={isSelected}
                              disabled={busy || Boolean(attempt) || isFull}
                              onChange={() => {
                                if (isFull) return;
                                setSelectedId(departure._id);
                                setChildren(0);
                                setAdults(1);
                                setError("");
                              }}
                            />
                            <div>
                              <strong>{dateTime(departure.departureAt)}</strong>
                              <small className={isFull ? "status-full" : "status-open"}>
                                {isFull ? (
                                  <>Đã hết chỗ ({booked}/{maxCap} khách)</>
                                ) : (
                                  <>Còn {avail}/{maxCap} chỗ (Đang nhận yêu cầu)</>
                                )}
                              </small>
                            </div>
                            <strong>{money(departure.adultPrice)}</strong>
                          </label>
                        );
                      })}
                    </fieldset>
                    {departures.data &&
                      departures.data.pagination.pages > 1 && (
                        <div className="pagination">
                          <button
                            className="button button-outline"
                            disabled={page <= 1 || busy}
                            onClick={() => {
                              setPage(page - 1);
                              setSelectedId("");
                            }}
                          >
                            Trước
                          </button>
                          <span>
                            {page} / {departures.data.pagination.pages}
                          </span>
                          <button
                            className="button button-outline"
                            disabled={
                              page >= departures.data.pagination.pages || busy
                            }
                            onClick={() => {
                              setPage(page + 1);
                              setSelectedId("");
                            }}
                          >
                            Tiếp
                          </button>
                        </div>
                      )}
                  </section>
                  <section className="card">
                    <h2>
                      <Icon name="people" />
                      Bạn đi cùng ai?
                    </h2>
                    <fieldset disabled={busy || Boolean(attempt)}>
                      <GuestCounter
                        label="Người lớn"
                        description={
                          selected
                            ? `${money(selected.adultPrice)} / khách`
                            : ""
                        }
                        value={adults}
                        minimum={1}
                        maximum={Math.max(1, maxGuests - children)}
                        onChange={setAdults}
                      />
                      <GuestCounter
                        label="Trẻ em"
                        description={
                          canSelectChildren
                            ? `${money(selected?.childPrice)} / khách`
                            : "Chưa có giá trẻ em cho chuyến này"
                        }
                        value={children}
                        minimum={0}
                        maximum={
                          canSelectChildren
                            ? Math.max(0, maxGuests - adults)
                            : 0
                        }
                        onChange={setChildren}
                      />
                    </fieldset>
                    <p className="helper">
                      Tối đa {maxGuests} khách mỗi yêu cầu.
                    </p>
                    {tour.childPolicy && (
                      <p className="helper">{tour.childPolicy}</p>
                    )}
                  </section>
                  <CouponPicker value={coupon} onChange={setCoupon} orderTotal={estimated ?? 0} disabled={busy || Boolean(attempt)} />
                  <div className="notice">
                    <Icon name="info" />
                    <p>
                      Gửi yêu cầu chưa phải xác nhận chỗ. VNA sẽ kiểm tra và
                      liên hệ với bạn.
                    </p>
                  </div>
                </>
              ) : (
                <EmptyState
                  title="Chưa có chuyến đang mở"
                  description="Quay lại trang tour để chọn một hành trình khác."
                />
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              {attempt && (
                <AppLink
                  to={`/booking/${draft?.tourId}/review`}
                  className="text-link"
                >
                  Quay lại yêu cầu đang chờ kiểm tra{" "}
                  <Icon name="arrow" size={17} />
                </AppLink>
              )}
            </>
          )
        )}
      </div>
      <div className="action-bar">
        <div className="action-total">
          <span>Tạm tính trước ưu đãi</span>
          <strong>{money(estimated)}</strong>
        </div>
        <button
          className="button button-primary button-wide"
          onClick={handleContinue}
          disabled={busy || !selected || !tour || Boolean(attempt)}
        >
          {busy ? "Đang kiểm tra giá…" : "Kiểm tra yêu cầu"}
          <Icon name="arrow" size={19} />
        </button>
      </div>
    </div>
  );
}
