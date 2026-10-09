import { useEffect, useRef, useState } from "react";
import Icon from "../common/Icon";
import useApi from "../../hooks/useApi";
import type { AvailableCoupon, ListResponse } from "../../types/api";
import { API_PATHS } from "../../utils/api";
import { dateTime, money } from "../../utils/format";

const previewOffers: ListResponse<AvailableCoupon> = {
  data: [],
  pagination: { page: 1, limit: 10, total: 0, pages: 0 },
};

export default function CouponPicker({
  value,
  onChange,
  orderTotal,
  disabled,
}: {
  value: string;
  onChange: (code: string) => void;
  orderTotal: number;
  disabled: boolean;
}) {
  const [page, setPage] = useState(1);
  const offers = useApi<ListResponse<AvailableCoupon>>(
    `${API_PATHS.COUPONS.AVAILABLE}?page=${page}&limit=10`,
    previewOffers,
  );
  const selected = useRef<AvailableCoupon | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (offers.loading || !offers.data) return;
    // Preserve the chosen offer across pages. Recheck minimum after party changes.
    const current = offers.data.data.find((offer) => offer.code === value);
    if (current) selected.current = current;
    if (
      selected.current?.code === value &&
      orderTotal < selected.current.minOrderValue
    ) {
      onChange("");
      setMessage("Đã bỏ ưu đãi vì giá trị đơn chưa đạt mức tối thiểu.");
    }
  }, [value, orderTotal, offers.data, offers.loading, onChange]);

  return (
    <section className="card coupon-picker" aria-labelledby="coupon-heading">
      <h2 id="coupon-heading">
        <Icon name="ticket" />
        Ưu đãi cho chuyến đi
      </h2>
      <p className="muted">Chọn một ưu đãi phù hợp với đơn của bạn.</p>
      {value && (
        <div className="coupon-picker-selection">
          <span>
            Đã chọn <strong>{value}</strong>
          </span>
          <button
            type="button"
            className="text-link"
            disabled={disabled}
            onClick={() => {
              onChange("");
              setMessage("");
            }}
          >
            Bỏ chọn
          </button>
        </div>
      )}
      {offers.loading ? (
        <p className="helper" role="status">
          Đang tải ưu đãi…
        </p>
      ) : offers.error ? (
        <div role="alert">
          <p className="helper">{offers.error}</p>
          <button
            type="button"
            className="text-link"
            onClick={offers.retry}
            disabled={disabled}
          >
            Tải lại ưu đãi
          </button>
        </div>
      ) : !offers.data?.data.length ? (
        <p className="helper">
          Hiện chưa có ưu đãi còn hiệu lực. Bạn vẫn có thể tiếp tục đặt tour.
        </p>
      ) : (
        <>
          <fieldset
            className="coupon-picker-options"
            disabled={disabled}
            aria-label="Chọn ưu đãi"
          >
            {offers.data.data.map((offer) => {
              const eligible = orderTotal >= offer.minOrderValue;
              return (
                <label
                  className={`coupon-picker-option ${value === offer.code ? "is-selected" : ""} ${eligible ? "" : "is-unavailable"}`}
                  key={offer.code}
                >
                  <input
                    type="radio"
                    name="booking-coupon"
                    value={offer.code}
                    checked={value === offer.code}
                    disabled={!eligible}
                    onChange={() => {
                      selected.current = offer;
                      onChange(offer.code);
                      setMessage("");
                    }}
                  />
                  <span className="coupon-picker-copy">
                    <strong>
                      Giảm{" "}
                      {offer.discountType === "percentage"
                        ? `${offer.discountValue}%`
                        : money(offer.discountValue)}
                    </strong>
                    {offer.description && <span>{offer.description}</span>}
                    <small>
                      Đơn từ {money(offer.minOrderValue)}
                      {offer.discountType === "percentage" &&
                      offer.maxDiscount != null
                        ? ` · Giảm tối đa ${money(offer.maxDiscount)}`
                        : ""}
                    </small>
                    <small>Hết hạn {dateTime(offer.validUntil)}</small>
                    <small className="coupon-picker-code">{offer.code}</small>
                    {!eligible && (
                      <small className="coupon-picker-minimum">
                        Cần thêm {money(offer.minOrderValue - orderTotal)} để
                        chọn
                      </small>
                    )}
                  </span>
                </label>
              );
            })}
          </fieldset>
          {offers.data.pagination.pages > 1 && (
            <div className="pagination">
              <button
                type="button"
                className="button button-outline"
                aria-label="Ưu đãi trước"
                disabled={disabled || page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Trước
              </button>
              <span>
                Trang {page} / {offers.data.pagination.pages}
              </span>
              <button
                type="button"
                className="button button-outline"
                aria-label="Ưu đãi tiếp theo"
                disabled={disabled || page >= offers.data.pagination.pages}
                onClick={() => setPage(page + 1)}
              >
                Tiếp
              </button>
            </div>
          )}
        </>
      )}
      {message && (
        <p className="helper" role="status">
          {message}
        </p>
      )}
      <p className="helper">Mức giảm được xác nhận khi kiểm tra yêu cầu.</p>
    </section>
  );
}
