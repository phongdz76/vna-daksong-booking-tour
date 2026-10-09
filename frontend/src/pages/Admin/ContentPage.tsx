import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
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
  Photo,
  QueryState,
  Stat,
} from "../../components/admin/ui";
import Icon from "../../components/admin/Icon";
import ContentForm, { resourceNames } from "../../components/admin/ContentForm";
import type { Content, Resource } from "../../components/admin/ContentForm";
import { useFilters, useOptions, useQuery } from "../../hooks/useAdminQuery";
import { useToast } from "../../context/AdminToastContext";
import { api, changed, errorMessage, query } from "../../utils/adminApi";
import {
  articleLabels,
  contentLabels,
  date,
  label,
  money,
  themeLabels,
  tone,
} from "../../utils/adminPresentation";
import type {
  Destination,
  ListResponse,
  Review,
  ReviewList,
  Tour,
} from "../../types/admin";

const titles = {
  tours: "Quản lý tour",
  destinations: "Điểm đến",
  articles: "Cẩm nang & bài viết",
};
const descriptions = {
  tours: "Chăm chút lịch trình và nội dung cho từng hành trình khám phá.",
  destinations: "Lưu giữ những điểm đến và câu chuyện đặc trưng của Đắk Song.",
  articles: "Chia sẻ văn hóa, ẩm thực và kinh nghiệm cho mỗi chuyến đi.",
};
export default function ContentPage({ resource }: { resource: Resource }) {
  const filters = useFilters();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const toast = useToast();
  const [search, setSearch] = useState(filters.get("q"));
  const [archive, setArchive] = useState<Content | null>(null);
  const [reviewTour, setReviewTour] = useState<Tour | null>(null);
  useEffect(() => {
    setSearch(filters.get("q"));
  }, [location.search]);
  const list = useQuery<ListResponse<Content>>(
    query(`/${resource}`, {
      page: filters.page,
      limit: filters.limit,
      q: filters.get("q"),
      status: filters.get("status"),
      ...(resource === "tours"
        ? { theme: filters.get("theme"), sort: filters.get("sort") || "newest" }
        : {
            category: filters.get("category"),
            ...(resource === "articles"
              ? { destinationId: filters.get("destinationId") }
              : {}),
          }),
    }),
  );
  const published = useQuery<ListResponse<Content>>(
    `/${resource}?status=published&limit=1`,
  );
  const draft = useQuery<ListResponse<Content>>(
    `/${resource}?status=draft&limit=1`,
  );
  const destinations = useOptions<Destination>(
    resource === "articles" ? "/destinations" : null,
  );
  const detail = useQuery<Content>(id ? `/${resource}/${id}` : null);
  const creating = location.pathname.endsWith("/new");
  const close = () => navigate(`/${resource}${location.search}`);
  const name = (content: Content) =>
    "title" in content ? content.title : content.name;
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={
          resource === "tours"
            ? "HÀNH TRÌNH & TRẢI NGHIỆM"
            : "NỘI DUNG ĐỊA PHƯƠNG"
        }
        title={titles[resource]}
        description={descriptions[resource]}
        dark={resource === "articles"}
      >
        <Link
          className="button primary"
          to={`/${resource}/new${location.search}`}
        >
          <Icon name="plus" size={18} />
          Tạo {resourceNames[resource]}
        </Link>
      </PageHeader>
      <div className="stats-grid three">
        <Stat
          title="Kết quả trong bộ lọc"
          value={list.data?.pagination.total ?? "—"}
          caption={`Số ${resourceNames[resource]} phù hợp lựa chọn hiện tại.`}
          icon={
            resource === "tours"
              ? "tour"
              : resource === "destinations"
                ? "pin"
                : "article"
          }
        />
        <Stat
          title="Đã xuất bản"
          value={published.data?.pagination.total ?? "—"}
          caption="Tổng nội dung có thể hiển thị với khách."
          icon="check"
        />
        <Stat
          title="Bản nháp"
          value={draft.data?.pagination.total ?? "—"}
          caption="Tổng nội dung đang chuẩn bị."
          icon="edit"
        />
      </div>
      <form
        className="filters"
        onSubmit={(event) => {
          event.preventDefault();
          filters.update({ q: search.trim() });
        }}
      >
        <Field label={`Tìm ${resourceNames[resource]}`}>
          <div className="search-input">
            <Icon name="search" size={18} />
            <input
              aria-label="Tìm nội dung"
              placeholder={
                resource === "articles"
                  ? "Tiêu đề, nội dung…"
                  : "Tên, nội dung…"
              }
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </Field>
        <Field label="Trạng thái">
          <select
            aria-label="Lọc trạng thái nội dung"
            value={filters.get("status")}
            onChange={(event) => filters.update({ status: event.target.value })}
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(contentLabels).map(([key, title]) => (
              <option key={key} value={key}>
                {title}
              </option>
            ))}
          </select>
        </Field>
        <Field label={resource === "tours" ? "Chủ đề" : "Chuyên mục"}>
          <select
            aria-label="Lọc chuyên mục"
            value={filters.get(resource === "tours" ? "theme" : "category")}
            onChange={(event) =>
              filters.update({
                [resource === "tours" ? "theme" : "category"]:
                  event.target.value,
              })
            }
          >
            <option value="">Tất cả</option>
            {Object.entries(
              resource === "articles" ? articleLabels : themeLabels,
            ).map(([key, title]) => (
              <option key={key} value={key}>
                {title}
              </option>
            ))}
          </select>
        </Field>
        {resource === "tours" && (
          <Field label="Sắp xếp">
            <select
              aria-label="Sắp xếp tour"
              value={filters.get("sort") || "newest"}
              onChange={(event) => filters.update({ sort: event.target.value })}
            >
              <option value="newest">Mới nhất</option>
              <option value="most_bought">Nhiều khách nhất</option>
              <option value="duration">Thời lượng tăng dần</option>
              <option value="price_asc">Giá tăng dần</option>
              <option value="price_desc">Giá giảm dần</option>
            </select>
          </Field>
        )}
        {resource === "articles" && (
          <Field label="Điểm đến">
            <select
              aria-label="Lọc theo điểm đến"
              value={filters.get("destinationId")}
              disabled={destinations.loading}
              onChange={(event) =>
                filters.update({ destinationId: event.target.value })
              }
            >
              <option value="">Tất cả điểm đến</option>
              {destinations.data.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="filter-actions">
          <Button type="submit" icon="search">
            Tìm kiếm
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSearch("");
              filters.reset();
            }}
          >
            Đặt lại
          </Button>
        </div>
      </form>
      {destinations.error && (
        <Notice error>
          Chưa tải được lựa chọn điểm đến. Hãy làm mới để thử lại.
        </Notice>
      )}
      <section className="panel">
        <div className="panel-heading">
          <h2>
            Danh sách {resourceNames[resource]}
            {list.data && (
              <span className="count-pill">{list.data.pagination.total}</span>
            )}
          </h2>
          <Button variant="ghost" icon="refresh" onClick={changed}>
            Làm mới
          </Button>
        </div>
        <QueryState {...list}>
          {list.data?.data.length ? (
            <>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>
                        {resource === "articles"
                          ? "Bài viết"
                          : resource === "tours"
                            ? "Tour trải nghiệm"
                            : "Điểm đến"}
                      </th>
                      <th>
                        {resource === "tours"
                          ? "Thời lượng / Chủ đề"
                          : "Chuyên mục"}
                      </th>
                      <th>
                        {resource === "tours"
                          ? "Giá từ / Số khách"
                          : resource === "destinations"
                            ? "Địa chỉ"
                            : "Xuất bản / Cập nhật"}
                      </th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.data.map((item) => (
                      <tr key={item._id}>
                        <td>
                          <div className="table-identity">
                            <Photo src={item.images[0]?.url} alt={name(item)} />
                            <div>
                              <Link
                                to={`/${resource}/${item._id}/edit${location.search}`}
                                className="cell-title"
                              >
                                {name(item)}
                              </Link>
                              <small>{item.summary}</small>
                              {resource === "tours" && (
                                <button
                                  className="rating-link"
                                  onClick={() => setReviewTour(item as Tour)}
                                >
                                  <span>★</span>
                                  {(item as Tour).averageRating == null
                                    ? "Chưa có đánh giá"
                                    : `${(item as Tour).averageRating!.toFixed(1)} · ${(item as Tour).reviewCount || 0} đánh giá`}
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          {"durationHours" in item ? (
                            <>
                              <strong>{item.durationHours} giờ</strong>
                              <small>
                                {item.themes
                                  .map((t) => label(themeLabels, t))
                                  .join(" · ") || "Chưa chọn chủ đề"}
                              </small>
                            </>
                          ) : (
                            <Badge color="gray">
                              {label(
                                resource === "articles"
                                  ? articleLabels
                                  : themeLabels,
                                item.category,
                              )}
                            </Badge>
                          )}
                        </td>
                        <td>
                          {"durationHours" in item ? (
                            <>
                              <strong className="price">
                                {item.priceFrom == null
                                  ? "Chưa có giá mở bán"
                                  : money(item.priceFrom)}
                              </strong>
                              <small>
                                {item.soldCount || 0} khách xác nhận / hoàn
                                thành
                              </small>
                              <Link
                                className="text-link small-text"
                                to={`/departures?tourId=${item._id}`}
                              >
                                Xem chuyến khởi hành
                              </Link>
                            </>
                          ) : "address" in item ? (
                            <span className="address-cell">
                              {item.address || "Chưa bổ sung địa chỉ"}
                            </span>
                          ) : (
                            <>
                              <span>{date(item.publishedAt)}</span>
                              <small>Cập nhật {date(item.updatedAt)}</small>
                            </>
                          )}
                        </td>
                        <td>
                          <Badge color={tone(item.status)}>
                            {label(contentLabels, item.status)}
                          </Badge>
                        </td>
                        <td>
                          <div className="actions">
                            <Link
                              className="icon-button"
                              to={`/${resource}/${item._id}/edit${location.search}`}
                              aria-label={`Sửa ${name(item)}`}
                            >
                              <Icon name="edit" size={18} />
                            </Link>
                            {item.status !== "archived" && (
                              <button
                                className="icon-button danger"
                                aria-label={`Lưu trữ ${name(item)}`}
                                onClick={() => setArchive(item)}
                              >
                                <Icon name="archive" size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                data={list.data.pagination}
                onPage={(page) => filters.update({ page }, true)}
                onLimit={(limit) => filters.update({ limit })}
              />
            </>
          ) : (
            <Empty
              title={`Chưa có ${resourceNames[resource]} phù hợp`}
              description="Thử thay đổi bộ lọc hoặc tạo nội dung mới."
            />
          )}
        </QueryState>
      </section>
      <div className="guide-grid">
        <div className="soft-box">
          <h3>
            <Icon name="check" size={18} />
            Trước khi xuất bản
          </h3>
          <p>
            {resource === "tours"
              ? "Kiểm tra lịch trình, điểm tập trung và chính sách hủy. Tạo chuyến khởi hành để tour có giá mở bán."
              : "Kiểm tra thông tin, nguồn tham khảo và ngày kiểm tra nguồn. Bổ sung ảnh có ghi nhận tác giả."}
          </p>
        </div>
        <div className="soft-box">
          <h3>
            <Icon name="archive" size={18} />
            Lưu trữ nội dung
          </h3>
          <p>
            Nội dung lưu trữ được giữ để tra cứu. Chỉnh sửa và đổi trạng thái
            khi cần sử dụng lại.
          </p>
        </div>
      </div>
      {creating && <ContentForm resource={resource} onClose={close} />}
      {id &&
        (detail.data ? (
          <ContentForm
            key={id}
            resource={resource}
            initial={detail.data}
            onClose={close}
          />
        ) : (
          <Modal title={`Chỉnh sửa ${resourceNames[resource]}`} onClose={close}>
            <QueryState {...detail}>
              <Empty title="Không tìm thấy nội dung" />
            </QueryState>
          </Modal>
        ))}
      {archive && (
        <Confirm
          title={`Lưu trữ ${resourceNames[resource]}`}
          action="Lưu trữ"
          danger
          onClose={() => setArchive(null)}
          onConfirm={async () => {
            try {
              await api.delete(`/${resource}/${archive._id}`);
              changed();
              toast(`Đã lưu trữ ${resourceNames[resource]}.`);
            } catch (error) {
              throw new Error(errorMessage(error));
            }
          }}
        >
          <p>
            Lưu trữ <strong>{name(archive)}</strong>? Nội dung sẽ không còn hiển
            thị với khách.
          </p>
        </Confirm>
      )}
      {reviewTour && (
        <ReviewsModal tour={reviewTour} onClose={() => setReviewTour(null)} />
      )}
    </div>
  );
}

function ReviewsModal({ tour, onClose }: { tour: Tour; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const [remove, setRemove] = useState<Review | null>(null);
  const toast = useToast();
  const reviews = useQuery<ReviewList>(
    `/tours/${tour._id}/reviews?page=${page}&limit=10`,
  );
  return (
    <Modal wide title={`Đánh giá · ${tour.name}`} onClose={onClose}>
      <QueryState {...reviews}>
        {reviews.data && (
          <>
            <div className="modal-body">
              <Notice>
                {reviews.data.summary.reviewCount} đánh giá · Điểm trung bình{" "}
                {reviews.data.summary.averageRating == null
                  ? "chưa có"
                  : `${reviews.data.summary.averageRating.toFixed(1)} / 5`}
              </Notice>
              {reviews.data.data.length ? (
                reviews.data.data.map((review) => (
                  <article className="review-card" key={review._id}>
                    <div className="review-heading">
                      <div>
                        <strong>{review.author.name}</strong>
                        <small>{date(review.createdAt, true)}</small>
                      </div>
                      <span
                        className="review-stars"
                        aria-label={`${review.rating} trên 5 sao`}
                      >
                        {"★".repeat(review.rating)}
                        {"☆".repeat(5 - review.rating)}
                      </span>
                    </div>
                    <p>{review.comment || "Khách chưa để lại nhận xét."}</p>
                    <Button
                      variant="ghost"
                      icon="archive"
                      onClick={() => setRemove(review)}
                    >
                      Xóa đánh giá
                    </Button>
                  </article>
                ))
              ) : (
                <Empty title="Chưa có đánh giá" />
              )}
            </div>
            <Pagination data={reviews.data.pagination} onPage={setPage} />
          </>
        )}
      </QueryState>
      {remove && (
        <Confirm
          title="Xóa đánh giá"
          action="Xóa đánh giá"
          danger
          onClose={() => setRemove(null)}
          onConfirm={async () => {
            try {
              await api.delete(`/reviews/${remove._id}`);
              changed();
              toast("Đã xóa đánh giá.");
            } catch (error) {
              throw new Error(errorMessage(error));
            }
          }}
        >
          <p>
            Xóa đánh giá của <strong>{remove.author.name}</strong>? Đánh giá đã
            xóa không thể khôi phục.
          </p>
        </Confirm>
      )}
    </Modal>
  );
}
