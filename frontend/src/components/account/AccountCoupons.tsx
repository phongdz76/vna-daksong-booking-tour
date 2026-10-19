import AppLink from "../common/AppLink";
import Icon from "../common/Icon";
import { EmptyState, ErrorState, LoadingState } from "../common/States";
import type { AvailableCoupon, ListResponse } from "../../types/api";
import { dateTime, money } from "../../utils/format";

export default function AccountCoupons({ data, loading, error, page, onPageChange, onRetry, onUse }: {
  data: ListResponse<AvailableCoupon> | null;
  loading: boolean;
  error: string;
  page: number;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onUse: () => void;
}) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} retry={onRetry} />;
  if (!data?.data.length) return <EmptyState
    title="Chưa có mã ưu đãi khả dụng"
    description="Các ưu đãi còn hiệu lực và phù hợp với hạng thành viên sẽ xuất hiện tại đây."
  >
    <AppLink to="/tours" className="button button-primary" onClick={onUse}>Khám phá tour</AppLink>
  </EmptyState>;

  return <section className="account-coupons" aria-label="Voucher có thể sử dụng">
    <p className="account-coupons-intro">Bạn có {data.pagination.total} ưu đãi khả dụng. Chọn tour rồi áp dụng mã tại bước đặt chuyến.</p>
    <div className="account-coupon-list">
      {data.data.map(offer => <article className="account-coupon" key={offer.code} aria-label={`Mã ưu đãi ${offer.code}`}>
        <div className="account-coupon-heading">
          <span className="account-coupon-icon"><Icon name="ticket" size={23} /></span>
          <div>
            <strong className="account-coupon-discount">Giảm {offer.discountType === "percentage" ? `${offer.discountValue}%` : money(offer.discountValue)}</strong>
            <span className="account-coupon-tier">{offer.applicableTier && offer.applicableTier !== "all" ? `Hạng ${offer.applicableTier}` : "Tất cả hạng"}</span>
          </div>
        </div>
        {offer.description && <p className="account-coupon-description">{offer.description}</p>}
        <dl className="account-coupon-conditions">
          <div><dt>Đơn tối thiểu</dt><dd>{money(offer.minOrderValue)}</dd></div>
          {offer.discountType === "percentage" && offer.maxDiscount != null && <div><dt>Giảm tối đa</dt><dd>{money(offer.maxDiscount)}</dd></div>}
          <div><dt>Hết hạn</dt><dd>{dateTime(offer.validUntil)}</dd></div>
        </dl>
        <div className="account-coupon-footer">
          <span className="account-coupon-code">{offer.code}</span>
          <AppLink to="/tours" className="button button-primary" onClick={onUse}>Sử dụng ngay <Icon name="arrow" size={16} /></AppLink>
        </div>
      </article>)}
    </div>
    {data.pagination.pages > 1 && <nav className="account-coupons-pagination" aria-label="Phân trang mã ưu đãi">
      <button type="button" className="button button-outline" aria-label="Mã ưu đãi trang trước" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Trước</button>
      <span>Trang {page} / {data.pagination.pages}</span>
      <button type="button" className="button button-outline" aria-label="Mã ưu đãi trang tiếp" disabled={page >= data.pagination.pages} onClick={() => onPageChange(page + 1)}>Tiếp</button>
    </nav>}
  </section>;
}
