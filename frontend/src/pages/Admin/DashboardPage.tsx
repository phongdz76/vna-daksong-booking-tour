import { Link } from "react-router-dom";
import { useOverview } from "../../components/layout/AdminLayout";
import Icon from "../../components/admin/Icon";
import {
  Badge,
  Empty,
  PageHeader,
  Photo,
  QueryState,
  Stat,
} from "../../components/admin/ui";
import { useQuery } from "../../hooks/useAdminQuery";
import type { Booking, ListResponse, Tour } from "../../types/admin";
import {
  bookingLabels,
  date,
  label,
  money,
  paymentLabels,
  tone,
} from "../../utils/adminPresentation";

export default function DashboardPage() {
  const overview = useOverview();
  const latest = useQuery<ListResponse<Booking>>("/bookings?page=1&limit=5");
  const tours = useQuery<ListResponse<Tour>>(
    "/tours?status=published&sort=most_bought&page=1&limit=3",
  );
  const counts = overview.data?.bookings || {};
  const total = Object.values(counts).reduce((sum, n) => sum + (n || 0), 0);
  const pending = counts.pending_confirmation || 0;
  const hasConfirmedGuests =
    tours.data?.data.some((tour) => tour.soldCount > 0) || false;
  const guestDescription =
    tours.data?.data.length && !hasConfirmedGuests
      ? "Chưa ghi nhận khách trong đơn đã xác nhận hoặc hoàn thành."
      : "Theo số khách trong đơn đã xác nhận hoặc hoàn thành.";
  const segments = Object.entries(bookingLabels).map(([key, text], i) => ({
    key,
    text,
    count: counts[key as keyof typeof counts] || 0,
    color: ["#eca66c", "#04432f", "#458368", "#94a29a", "#cf5959"][i],
  }));
  let position = 0;
  const gradient = segments
    .map((s) => {
      const start = position;
      position += total ? (s.count / total) * 100 : 0;
      return `${s.color} ${start}% ${position}%`;
    })
    .join(", ");
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="VNA ĐẮK SONG · ĐIỀU HÀNH"
        title="Tổng quan quản trị"
        description="Theo dõi hoạt động và những công việc cần xử lý."
      >
        <Link className="button secondary" to="/bookings">
          <Icon name="booking" size={18} />
          Quản lý đơn đặt
        </Link>
        <Link className="button primary" to="/tours/new">
          <Icon name="plus" size={18} />
          Tạo tour mới
        </Link>
      </PageHeader>
      <QueryState {...overview}>
        {overview.data && (
          <>
            {pending > 0 && (
              <div className="task-banner">
                <div className="task-symbol">
                  <Icon name="booking" size={20} />
                  <span className="task-symbol-dot" />
                </div>
                <div className="task-banner-body">
                  <div className="task-banner-header">
                    <strong>Yêu cầu chờ xử lý</strong>
                    <span className="task-banner-badge">{pending} đơn mới</span>
                  </div>
                  <p>
                    Có {pending} đơn đặt tour đang chờ bạn kiểm tra lịch khởi
                    hành và xác nhận với khách hàng.
                  </p>
                </div>
                <Link
                  className="button primary task-banner-btn"
                  to="/bookings?status=pending_confirmation"
                >
                  <span>Xử lý đơn chờ</span>
                  <Icon name="arrow" size={16} />
                </Link>
              </div>
            )}
            <div className="stats-grid">
              <Stat
                title="Giá trị đơn xác nhận / hoàn thành"
                value={money(overview.data.totalRevenue)}
                caption="Bao gồm đơn chưa thanh toán."
                icon="money"
              />
              <Stat
                title="Tổng số đơn đặt"
                value={total.toLocaleString("vi-VN")}
                caption={`${pending} đơn đang chờ xác nhận`}
                icon="booking"
              />
              <Stat
                title="Chuyến đang mở"
                value={overview.data.openDepartures}
                caption="Chuyến mở và còn hạn nhận đặt."
                icon="calendar"
              />
              <Stat
                title="Nội dung đã xuất bản"
                value={
                  <div className="stat-counts">
                    <div>
                      <span>{overview.data.tours}</span>
                      <small>Tour</small>
                    </div>
                    <div>
                      <span>{overview.data.destinations}</span>
                      <small>Điểm đến</small>
                    </div>
                  </div>
                }
                caption="Tour và điểm đến đang hiển thị."
                icon="leaf"
              />
            </div>
            <div className="dashboard-middle">
              <section className="panel status-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Phân bố trạng thái đơn</h2>
                    <p>Tổng quan toàn bộ đơn đặt tour</p>
                  </div>
                  <Icon name="dashboard" />
                </div>
                {total ? (
                  <>
                    <div
                      className="donut"
                      role="img"
                      aria-label={`Phân bố trạng thái của ${total} đơn`}
                      style={{ background: `conic-gradient(${gradient})` }}
                    >
                      <div>
                        <strong>{total.toLocaleString("vi-VN")}</strong>
                        <span>TỔNG ĐƠN</span>
                      </div>
                    </div>
                    <div className="chart-legend">
                      {segments.map((s) => (
                        <Link to={`/bookings?status=${s.key}`} key={s.key}>
                          <span
                            className="legend-dot"
                            style={{ background: s.color }}
                          />
                          <span>{s.text}</span>
                          <strong>
                            {((s.count / total) * 100).toFixed(1)}%
                          </strong>
                          <small>{s.count} đơn</small>
                        </Link>
                      ))}
                    </div>
                  </>
                ) : (
                  <Empty
                    title="Chưa có đơn đặt"
                    description="Biểu đồ sẽ được cập nhật khi có đơn đầu tiên."
                  />
                )}
              </section>
              <section className="panel top-tours">
                <div className="panel-heading">
                  <div>
                    <h2>
                      {hasConfirmedGuests
                        ? "Tour có nhiều khách nhất"
                        : "Tour đã xuất bản"}
                    </h2>
                    <p>{guestDescription}</p>
                  </div>
                  <Link to="/tours?sort=most_bought" className="text-link">
                    Xem tất cả
                    <Icon name="chevron" size={16} />
                  </Link>
                </div>
                <QueryState {...tours}>
                  {tours.data?.data.length ? (
                    <div className="rank-list">
                      {tours.data.data.map((tour, index) => (
                        <Link
                          className="rank-item"
                          to={`/tours/${tour._id}/edit`}
                          key={tour._id}
                        >
                          {hasConfirmedGuests && (
                            <span className="rank-number">{index + 1}</span>
                          )}
                          <Photo src={tour.images[0]?.url} alt={tour.name} />
                          <div className="rank-description">
                            <strong>{tour.name}</strong>
                            <span>
                              {tour.durationHours} giờ ·{" "}
                              {tour.priceFrom == null
                                ? "Chưa có giá mở bán"
                                : `Từ ${money(tour.priceFrom)}`}
                            </span>
                          </div>
                          <div
                            className="rank-count"
                            aria-label={`${tour.soldCount.toLocaleString("vi-VN")} khách trong đơn đã xác nhận hoặc hoàn thành`}
                          >
                            <strong>
                              {tour.soldCount.toLocaleString("vi-VN")}
                            </strong>
                            <small>khách</small>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      title="Chưa có tour xuất bản"
                      description="Tạo tour và xuất bản để bắt đầu nhận yêu cầu."
                    />
                  )}
                </QueryState>
                <div className="panel-bottom">
                  <Icon name="people" size={18} /> Tính cả người lớn và trẻ em.
                  Đơn chờ xác nhận chưa được tính.
                </div>
              </section>
            </div>
          </>
        )}
      </QueryState>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>
              <Icon name="booking" />
              Đơn đặt mới nhất
            </h2>
            <p>Các yêu cầu được gửi gần đây</p>
          </div>
          <Link className="text-link" to="/bookings">
            Xem tất cả
            <Icon name="chevron" size={16} />
          </Link>
        </div>
        <QueryState {...latest}>
          {latest.data?.data.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Mã đơn / Khách liên hệ</th>
                    <th>Tour / Khởi hành</th>
                    <th>Số khách</th>
                    <th>Tổng tiền</th>
                    <th>Đơn đặt</th>
                    <th>Thanh toán</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {latest.data.data.map((b) => (
                    <tr key={b._id}>
                      <td>
                        <Link className="code-link" to={`/bookings/${b._id}`}>
                          {b.code}
                        </Link>
                        <small>{b.contact.name}</small>
                      </td>
                      <td>
                        <strong className="cell-title">
                          {b.snapshot.tourName}
                        </strong>
                        <small>{date(b.snapshot.departureAt, true)}</small>
                      </td>
                      <td className="nowrap">
                        {b.adults} lớn · {b.children} trẻ
                      </td>
                      <td className="price">{money(b.snapshot.total)}</td>
                      <td>
                        <Badge color={tone(b.status)}>
                          {label(bookingLabels, b.status)}
                        </Badge>
                      </td>
                      <td>
                        <Badge color={tone(b.paymentStatus)}>
                          {label(paymentLabels, b.paymentStatus)}
                        </Badge>
                      </td>
                      <td>
                        <Link
                          className="icon-button"
                          aria-label={`Xem đơn ${b.code}`}
                          to={`/bookings/${b._id}`}
                        >
                          <Icon name="arrow" size={18} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="Chưa có đơn đặt tour"
              description="Yêu cầu của khách sẽ xuất hiện tại đây."
            />
          )}
        </QueryState>
      </section>
    </div>
  );
}
