import { useEffect, useState } from "react";
import { validText } from '../../utils/inputValidation';
import type { FormEvent } from "react";
import axios from "axios";
import { Link, useParams } from "react-router-dom";
import Icon from "../../components/admin/Icon";
import {
  Badge,
  Button,
  Confirm,
  Empty,
  Field,
  Modal,
  Notice,
  PageHeader,
  Pagination,
  QueryState,
} from "../../components/admin/ui";
import { useToast } from "../../context/AdminToastContext";
import { useAuth } from "../../context/AdminAuthContext";
import { useFilters, useOptions, useQuery } from "../../hooks/useAdminQuery";
import type {
  Booking,
  BookingDetail,
  BookingStatus,
  Departure,
  ListResponse,
  Payment,
  Tour,
} from "../../types/admin";
import { api, changed, errorMessage, query } from "../../utils/adminApi";
import {
  bookingLabels,
  date,
  historyLabels,
  label,
  methodLabels,
  money,
  paymentLabels,
  refundLabels,
  tone,
  transactionLabels,
} from "../../utils/adminPresentation";

export default function BookingsPage() {
  const { id } = useParams();
  const filters = useFilters();
  const list = useQuery<ListResponse<Booking>>(
    query("/bookings", {
      page: filters.page,
      limit: filters.limit,
      status: filters.get("status"),
      code: filters.get("code"),
      departureId: filters.get("departureId"),
    }),
  );
  const detail = useQuery<BookingDetail>(id ? `/bookings/${id}` : null);
  const departures = useOptions<Departure>("/departures");
  const tours = useOptions<Tour>("/tours");
  const [searchCode, setSearchCode] = useState(filters.get("code"));
  const currentCode = filters.get("code");
  useEffect(() => {
    setSearchCode(currentCode);
  }, [currentCode]);
  const listUrl = `/bookings${window.location.search}`;
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="ĐIỀU PHỐI & CHĂM SÓC KHÁCH HÀNG"
        title="Quản lý đơn đặt tour"
        description="Kiểm tra yêu cầu, xác nhận chuyến đi và theo dõi thanh toán."
      >
        <Button variant="secondary" icon="refresh" onClick={changed}>
          Làm mới
        </Button>
      </PageHeader>
      <form
        className="filters"
        onSubmit={(event) => {
          event.preventDefault();
          filters.update({
            code: searchCode.trim().replace(/^#/, "").toUpperCase(),
          });
        }}
      >
        <Field label="Trạng thái đơn">
          <select
            aria-label="Trạng thái đơn"
            value={filters.get("status")}
            onChange={(event) => filters.update({ status: event.target.value })}
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(bookingLabels).map(([value, text]) => (
              <option value={value} key={value}>
                {text}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Chuyến khởi hành">
          <select
            aria-label="Chuyến khởi hành"
            value={filters.get("departureId")}
            disabled={departures.loading}
            onChange={(event) =>
              filters.update({ departureId: event.target.value })
            }
          >
            <option value="">Tất cả chuyến khởi hành</option>
            {departures.data.map((d) => (
              <option key={d._id} value={d._id}>
                {date(d.departureAt, true)} ·{" "}
                {tours.data.find((t) => t._id === d.tourId)?.name ||
                  "Chuyến khởi hành"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Mã đơn chính xác">
          <div className="search-input">
            <Icon name="search" size={18} />
            <input
              aria-label="Mã đơn chính xác"
              maxLength={50}
              value={searchCode}
              onChange={(event) => setSearchCode(event.target.value)}
              placeholder="Nhập mã đơn VNA-…"
            />
          </div>
        </Field>
        <div className="filter-actions">
          <Button type="submit">Tra cứu</Button>
          <Button
            variant="ghost"
            type="button"
            onClick={() => {
              setSearchCode("");
              filters.reset();
            }}
          >
            Đặt lại
          </Button>
        </div>
      </form>
      {(departures.error || tours.error) && (
        <Notice error>
          Chưa tải được lựa chọn chuyến khởi hành. Hãy làm mới trang để thử lại.
        </Notice>
      )}
      <div className={`booking-grid ${id ? "has-selection" : ""}`}>
        <section className="panel booking-list">
          <div className="panel-heading">
            <h2>
              Danh sách đơn đặt{" "}
              {list.data && (
                <span className="count-pill">
                  {list.data.pagination.total} đơn
                </span>
              )}
            </h2>
            <span className="muted small-text">Mới nhất trước</span>
          </div>
          <QueryState {...list}>
            {list.data?.data.length ? (
              <>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Mã đơn / Liên hệ</th>
                        <th>Tour / Khởi hành</th>
                        <th>Khách / Tổng tiền</th>
                        <th>Trạng thái</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {list.data.data.map((b) => (
                        <tr
                          key={b._id}
                          className={id === b._id ? "selected" : ""}
                        >
                          <td>
                            <Link
                              className="code-link"
                              to={`/bookings/${b._id}${window.location.search}`}
                            >
                              {b.code}
                            </Link>
                            <strong className="contact-name">
                              {b.contact.name}
                            </strong>
                            <a
                              className="small-text muted"
                              href={`tel:${b.contact.phone}`}
                            >
                              {b.contact.phone}
                            </a>
                          </td>
                          <td>
                            <strong className="cell-title">
                              {b.snapshot.tourName}
                            </strong>
                            <small>{date(b.snapshot.departureAt, true)}</small>
                          </td>
                          <td>
                            <span className="nowrap small-text">
                              {b.adults} lớn · {b.children} trẻ
                            </span>
                            <strong className="price">
                              {money(b.snapshot.total)}
                            </strong>
                          </td>
                          <td>
                            <div className="badge-stack">
                              <Badge color={tone(b.status)}>
                                {label(bookingLabels, b.status)}
                              </Badge>
                              <Badge color={tone(b.paymentStatus)}>
                                {label(paymentLabels, b.paymentStatus)}
                              </Badge>
                            </div>
                          </td>
                          <td>
                            <Link
                              className="icon-button"
                              aria-label={`Xem đơn ${b.code}`}
                              to={`/bookings/${b._id}${window.location.search}`}
                            >
                              <Icon name="chevron" size={18} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  data={list.data.pagination}
                  onPage={(n) => filters.update({ page: n }, true)}
                  onLimit={(n) => filters.update({ limit: n })}
                />
              </>
            ) : (
              <Empty
                title="Không tìm thấy đơn đặt"
                description="Thử thay đổi bộ lọc hoặc kiểm tra lại mã đơn."
              />
            )}
          </QueryState>
        </section>
        {id && (
          <aside className="panel booking-detail">
            <div className="detail-close">
              <Link className="text-link" to={listUrl}>
                <Icon
                  name="chevron"
                  size={16}
                  style={{ transform: "rotate(180deg)" }}
                />
                Về danh sách
              </Link>
            </div>
            <QueryState {...detail}>
              {detail.data && <BookingView detail={detail.data} />}
            </QueryState>
          </aside>
        )}
      </div>
    </div>
  );
}

const transitions: Partial<Record<BookingStatus, BookingStatus[]>> = {
  pending_confirmation: ["confirmed", "rejected", "cancelled"],
  confirmed: ["completed", "cancelled"],
};
const actionLabels: Partial<Record<BookingStatus, string>> = {
  confirmed: "Xác nhận đơn",
  rejected: "Từ chối đơn",
  cancelled: "Hủy đơn",
  completed: "Hoàn thành chuyến",
};
function BookingView({ detail }: { detail: BookingDetail }) {
  const booking = detail.data;
  const toast = useToast();
  const { user } = useAuth();
  const [action, setAction] = useState<BookingStatus | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const end =
    new Date(booking.snapshot.departureAt).getTime() +
    (booking.snapshot.durationHours || 0) * 3600000;
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validText(reason, 1000, action === 'cancelled' || action === 'rejected')) {
      setError('Nhập lý do xử lý hợp lệ, tối đa 1.000 ký tự.'); return;
    }
    setBusy(true);
    setError("");
    try {
      await api.patch(`/bookings/${booking._id}/status`, {
        status: action,
        reason: reason.trim(),
      });
      setAction(null);
      changed();
      toast("Đã cập nhật trạng thái đơn đặt.");
    } catch (error) {
      const message = errorMessage(error);
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setAction(null);
        changed();
        toast(message);
      } else setError(message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="detail-body">
      <div className="detail-title">
        <div>
          <span className="eyebrow">CHI TIẾT ĐƠN ĐẶT</span>
          <h2>{booking.code}</h2>
          <small className="muted">
            Tạo lúc {date(booking.createdAt, true)}
          </small>
        </div>
        <Badge color={tone(booking.status)}>
          {label(bookingLabels, booking.status)}
        </Badge>
      </div>
      {!!transitions[booking.status]?.length && (
        <section className="detail-section action-box">
          <h3>Thao tác xử lý</h3>
          <p>
            {booking.status === "pending_confirmation"
              ? "Kiểm tra lịch trình và thống nhất với khách trước khi xác nhận."
              : "Cập nhật kết quả sau khi chuyến đi kết thúc."}
          </p>
          <div className="actions wrap">
            {transitions[booking.status]!.map((status) => (
              <Button
                key={status}
                variant={
                  status === "rejected"
                    ? "danger"
                    : status === "cancelled"
                      ? "secondary"
                      : "primary"
                }
                icon={
                  status === "confirmed" || status === "completed"
                    ? "check"
                    : "close"
                }
                disabled={status === "completed" && end > Date.now()}
                title={
                  status === "completed" && end > Date.now()
                    ? "Chuyến đi chưa kết thúc"
                    : undefined
                }
                onClick={() => {
                  setAction(status);
                  setReason("");
                  setError("");
                }}
              >
                {actionLabels[status]}
              </Button>
            ))}
          </div>
        </section>
      )}
      <section className="detail-section">
        <h3>Khách hàng & ghi chú</h3>
        <dl>
          <div>
            <dt>Người liên hệ</dt>
            <dd>{booking.contact.name}</dd>
          </div>
          <div>
            <dt>Điện thoại</dt>
            <dd>
              <a className="text-link" href={`tel:${booking.contact.phone}`}>
                {booking.contact.phone}
              </a>
            </dd>
          </div>
        </dl>
        {booking.note && <div className="customer-note">{booking.note}</div>}
      </section>
      <section className="detail-section">
        <h3>Thông tin tour khi đặt</h3>
        <div className="soft-box">
          <strong>{booking.snapshot.tourName}</strong>
          <p className="icon-line">
            <Icon name="calendar" size={16} />
            {date(booking.snapshot.departureAt, true)}
          </p>
          <p className="icon-line">
            <Icon name="pin" size={16} />
            {booking.snapshot.meetingPoint}
          </p>
          <dl>
            <div>
              <dt>Người lớn</dt>
              <dd>
                {booking.adults} × {money(booking.snapshot.adultPrice)}
              </dd>
            </div>
            {booking.children > 0 && (
              <div>
                <dt>Trẻ em</dt>
                <dd>
                  {booking.children} × {money(booking.snapshot.childPrice)}
                </dd>
              </div>
            )}
            {booking.snapshot.appliedCoupon && (
              <div>
                <dt>Ưu đãi · {booking.snapshot.appliedCoupon}</dt>
                <dd>−{money(booking.snapshot.discountAmount)}</dd>
              </div>
            )}
            <div className="total-row">
              <dt>Tổng giá trị đơn</dt>
              <dd>{money(booking.snapshot.total)}</dd>
            </div>
          </dl>
        </div>
        <details className="policy">
          <summary>Chính sách khi đặt tour</summary>
          <p>{booking.snapshot.cancellationPolicy}</p>
          {booking.snapshot.childPolicy && (
            <p>{booking.snapshot.childPolicy}</p>
          )}
        </details>
      </section>
      <section className="detail-section">
        <h3>Thanh toán</h3>
        <div className="payment-summary">
          <Badge color={tone(booking.paymentStatus)}>
            {label(paymentLabels, booking.paymentStatus)}
          </Badge>
          <span>{label(methodLabels, booking.paymentMethod)}</span>
        </div>
        {detail.payments?.length ? (
          detail.payments.map((p) => (
            <PaymentCard key={p._id || p.appTransId} payment={p} />
          ))
        ) : (
          <p className="muted small-text">
            Chưa có giao dịch thanh toán trực tuyến.
          </p>
        )}
      </section>
      <section className="detail-section">
        <h3>Lịch sử xử lý</h3>
        <ol className="timeline">
          {booking.history.map((event, index) => (
            <li key={`${index}-${event.at}`}>
              <span className={`timeline-dot ${tone(event.status)}`} />
              <strong>
                {index === 0 && event.status === "pending_confirmation"
                  ? "Đã nhận yêu cầu đặt tour"
                  : label(historyLabels, event.status)}
              </strong>
              <small>
                {date(event.at, true)}
                {event.actorId === user?._id ? ` · ${user.name}` : ""}
              </small>
              {event.reason && <p>{event.reason}</p>}
            </li>
          ))}
        </ol>
      </section>
      {action && (
        <Modal
          title={`${actionLabels[action]} · ${booking.code}`}
          onClose={() => setAction(null)}
          busy={busy}
        >
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <p>
                {action === "confirmed"
                  ? "Xác nhận rằng bạn đã kiểm tra chuyến đi và thống nhất yêu cầu với khách."
                  : action === "completed"
                    ? "Chuyến đi đã kết thúc. Hoàn thành đơn sẽ cập nhật điểm tích lũy của khách."
                    : "Khách sẽ nhìn thấy lý do bạn nhập. Vui lòng diễn đạt rõ ràng."}
              </p>
              {["cancelled", "rejected"].includes(action) &&
                booking.paymentStatus === "paid" && (
                  <Notice>
                    Đơn đã thanh toán sẽ chuyển sang chờ hoàn tiền. Việc hoàn
                    tiền được xử lý riêng.
                  </Notice>
                )}
              <Field
                label={
                  ["cancelled", "rejected"].includes(action)
                    ? "Lý do (bắt buộc)"
                    : "Ghi chú xử lý"
                }
              >
                <textarea
                  aria-label="Lý do xử lý"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  required={["cancelled", "rejected"].includes(action)}
                  maxLength={1000}
                  rows={4}
                  placeholder="Nhập nội dung gửi đến khách…"
                />
                <small>{reason.length}/1.000 ký tự</small>
              </Field>
              {error && <Notice error>{error}</Notice>}
            </div>
            <div className="modal-footer">
              <Button
                variant="secondary"
                type="button"
                disabled={busy}
                onClick={() => setAction(null)}
              >
                Quay lại
              </Button>
              <Button
                type="submit"
                busy={busy}
                variant={
                  ["cancelled", "rejected"].includes(action)
                    ? "danger"
                    : "primary"
                }
              >
                {actionLabels[action]}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function PaymentCard({ payment: payment }: { payment: Payment }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const toast = useToast();
  async function handlePaymentAction(
    action: "query" | "refund" | "refund/query",
  ) {
    setBusy(true);
    setError("");
    try {
      await api.post(
        `/payments/zalopay/${encodeURIComponent(payment.appTransId)}/${action}`,
      );
      changed();
      toast(
        action === "refund"
          ? "Đã gửi yêu cầu hoàn tiền. Hãy kiểm tra kết quả xử lý."
          : "Đã kiểm tra trạng thái giao dịch.",
      );
    } catch (error) {
      const message = errorMessage(error);
      setError(message);
      if (action === "refund") throw new Error(message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="payment-card">
      <div className="payment-card-title">
        <strong>{money(payment.amount)}</strong>
        <Badge color={tone(payment.status)}>
          {label(transactionLabels, payment.status)}
        </Badge>
      </div>
      <small className="muted">
        Mã giao dịch:{" "}
        <span className="break-anywhere">{payment.appTransId}</span>
      </small>
      {payment.paidAt && (
        <small>Thanh toán: {date(payment.paidAt, true)}</small>
      )}
      {payment.refundState && payment.refundState !== "none" && (
        <p className="small-text">{label(refundLabels, payment.refundState)}</p>
      )}
      {payment.refundedAt && (
        <small>Hoàn tiền: {date(payment.refundedAt, true)}</small>
      )}
      {error && <Notice error>{error}</Notice>}
      <div className="actions wrap">
        <Button
          variant="secondary"
          icon="refresh"
          busy={busy}
          onClick={() => void handlePaymentAction("query")}
        >
          Kiểm tra thanh toán
        </Button>
        {payment.status === "refund_pending" &&
          !["pending", "success"].includes(payment.refundState || "") && (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setConfirm(true)}
            >
              Yêu cầu hoàn tiền
            </Button>
          )}
        {payment.refundRequestId && payment.status !== "refunded" && (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => void handlePaymentAction("refund/query")}
          >
            Kiểm tra hoàn tiền
          </Button>
        )}
      </div>
      {confirm && (
        <Confirm
          title="Yêu cầu hoàn tiền"
          action="Gửi yêu cầu hoàn tiền"
          danger
          onClose={() => setConfirm(false)}
          onConfirm={() => handlePaymentAction("refund")}
        >
          <p>
            Hoàn toàn bộ <strong>{money(payment.amount)}</strong> của giao dịch{" "}
            <strong className="break-anywhere">{payment.appTransId}</strong>.
          </p>
          <Notice>
            Kết quả sẽ được xác nhận sau khi kiểm tra trạng thái hoàn tiền.
          </Notice>
        </Confirm>
      )}
    </div>
  );
}
