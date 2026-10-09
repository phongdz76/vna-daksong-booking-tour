import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
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
import { useFilters, useOptions, useQuery } from "../../hooks/useAdminQuery";
import useAdminForm from "../../hooks/useAdminForm";
import { useToast } from "../../context/AdminToastContext";
import type { Departure, ListResponse, Tour } from "../../types/admin";
import { api, changed, errorMessage, query } from "../../utils/adminApi";
import {
  date,
  departureState,
  isoDateTime,
  localDateTime,
  money,
} from "../../utils/adminPresentation";

export default function DeparturesPage() {
  const filters = useFilters();
  const toast = useToast();
  const tours = useOptions<Tour>("/tours");
  const list = useQuery<ListResponse<Departure>>(
    query("/departures", {
      page: filters.page,
      limit: filters.limit,
      tourId: filters.get("tourId"),
      status: filters.get("status"),
    }),
  );
  const [edit, setEdit] = useState<Departure | "new" | null>(null);
  const [toggle, setToggle] = useState<Departure | null>(null);
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="ĐIỀU PHỐI HÀNH TRÌNH"
        title="Chuyến khởi hành"
        description="Quản lý ngày đi, giá bán và hạn nhận đặt cho từng chuyến."
      >
        <Button icon="plus" onClick={() => setEdit("new")}>
          Tạo chuyến khởi hành
        </Button>
      </PageHeader>
      <form className="filters" onSubmit={(event) => event.preventDefault()}>
        <Field label="Tour trải nghiệm">
          <select
            aria-label="Lọc chuyến theo tour"
            value={filters.get("tourId")}
            disabled={tours.loading}
            onChange={(event) => filters.update({ tourId: event.target.value })}
          >
            <option value="">Tất cả tour</option>
            {tours.data.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Thiết lập nhận đặt">
          <select
            aria-label="Lọc trạng thái chuyến"
            value={filters.get("status")}
            onChange={(event) => filters.update({ status: event.target.value })}
          >
            <option value="">Tất cả chuyến</option>
            <option value="open">Đang bật nhận đặt</option>
            <option value="closed">Đã đóng nhận đặt</option>
          </select>
        </Field>
        <div className="filter-actions">
          <Button
            type="button"
            variant="secondary"
            icon="refresh"
            onClick={changed}
          >
            Làm mới
          </Button>
          <Button type="button" variant="ghost" onClick={filters.reset}>
            Đặt lại
          </Button>
        </div>
      </form>
      {tours.error && (
        <Notice error>
          Chưa tải được danh sách tour. Hãy làm mới để thử lại.
        </Notice>
      )}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>
              Lịch khởi hành
              {list.data && (
                <span className="count-pill">
                  {list.data.pagination.total} chuyến
                </span>
              )}
            </h2>
            <p>Sắp xếp theo thời điểm khởi hành</p>
          </div>
          <Icon name="calendar" />
        </div>
        <QueryState {...list}>
          {list.data?.data.length ? (
            <>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Tour / Khởi hành</th>
                      <th>Hạn nhận đặt</th>
                      <th>Giá người lớn / Trẻ em</th>
                      <th>Giới hạn mỗi đơn</th>
                      <th>Tình trạng nhận đặt</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.data.map((d) => {
                      const state = departureState(d);
                      return (
                        <tr key={d._id}>
                          <td>
                            <div className="departure-identity">
                              <div className="calendar-tile">
                                <strong>
                                  {date(d.departureAt).slice(0, 2)}
                                </strong>
                                <span>
                                  THÁNG {date(d.departureAt).slice(3, 5)}
                                </span>
                              </div>
                              <div>
                                <strong className="cell-title">
                                  {tours.data.find((t) => t._id === d.tourId)
                                    ?.name ||
                                    (tours.loading
                                      ? "Đang tải tên tour…"
                                      : "Tour không còn khả dụng")}
                                </strong>
                                <small>{date(d.departureAt, true)}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="nowrap">
                              {date(d.bookingDeadline, true)}
                            </span>
                          </td>
                          <td>
                            <strong className="price">
                              {money(d.adultPrice)}
                            </strong>
                            <small>
                              {d.childPrice == null
                                ? "Không nhận trẻ em"
                                : `Trẻ em: ${money(d.childPrice)}`}
                            </small>
                          </td>
                          <td>
                            <strong>{d.maxGuestsPerBooking} khách / đơn</strong>
                          </td>
                          <td>
                            <Badge color={state.tone}>{state.text}</Badge>
                            {d.status === "open" && state.tone !== "green" && (
                              <small>Đang bật · khách không thể đặt</small>
                            )}
                          </td>
                          <td>
                            <div className="actions">
                              <button
                                className="icon-button"
                                aria-label={`Sửa chuyến ${date(d.departureAt, true)}`}
                                onClick={() => setEdit(d)}
                              >
                                <Icon name="edit" size={18} />
                              </button>
                              <button
                                className={`icon-button ${d.status === "open" ? "danger" : ""}`}
                                aria-label={
                                  d.status === "open"
                                    ? "Đóng nhận đặt"
                                    : "Bật nhận đặt"
                                }
                                onClick={() => setToggle(d)}
                              >
                                <Icon
                                  name={d.status === "open" ? "lock" : "check"}
                                  size={18}
                                />
                              </button>
                              <Link
                                className="icon-button"
                                aria-label="Xem đơn của chuyến"
                                to={`/bookings?departureId=${d._id}`}
                              >
                                <Icon name="booking" size={18} />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
              title="Chưa có chuyến phù hợp"
              description="Tạo chuyến mới hoặc thay đổi lựa chọn tour để xem lịch."
            />
          )}
        </QueryState>
      </section>
      <div className="guide-grid">
        <div className="soft-box">
          <h3>
            <Icon name="people" size={18} />
            Giới hạn khách mỗi đơn
          </h3>
          <p>
            Giới hạn áp dụng cho một lần đặt tour. Kiểm tra khả năng phục vụ
            trước khi xác nhận đơn của khách.
          </p>
        </div>
        <div className="soft-box">
          <h3>
            <Icon name="clock" size={18} />
            Thay đổi lịch trình
          </h3>
          <p>
            Với chuyến đã có đơn đang xử lý hoặc đã xác nhận, tạo chuyến mới và
            thống nhất với khách nếu cần đổi giờ khởi hành.
          </p>
        </div>
      </div>
      {edit && (
        <DepartureForm
          initial={edit === "new" ? undefined : edit}
          defaultTour={filters.get("tourId")}
          tours={tours}
          onClose={() => setEdit(null)}
        />
      )}
      {toggle && (
        <Confirm
          title={
            toggle.status === "open"
              ? "Đóng nhận đặt chuyến"
              : "Bật nhận đặt chuyến"
          }
          action={toggle.status === "open" ? "Đóng nhận đặt" : "Bật nhận đặt"}
          danger={toggle.status === "open"}
          onClose={() => setToggle(null)}
          onConfirm={async () => {
            try {
              await api.patch(`/departures/${toggle._id}`, {
                status: toggle.status === "open" ? "closed" : "open",
              });
              changed();
              toast("Đã cập nhật thiết lập nhận đặt của chuyến.");
            } catch (error) {
              throw new Error(errorMessage(error));
            }
          }}
        >
          <p>
            {date(toggle.departureAt, true)} ·{" "}
            {tours.data.find((t) => t._id === toggle.tourId)?.name}
          </p>
          <Notice>
            {toggle.status === "open"
              ? "Khách sẽ không thể tạo đơn mới cho chuyến này. Các đơn đã đặt vẫn được giữ để xử lý."
              : "Khách có thể đặt khi tour đã xuất bản và chuyến còn hạn nhận đặt."}
          </Notice>
        </Confirm>
      )}
    </div>
  );
}

function DepartureForm({
  initial,
  defaultTour,
  tours,
  onClose,
}: {
  initial?: Departure;
  defaultTour: string;
  tours: ReturnType<typeof useOptions<Tour>>;
  onClose: () => void;
}) {
  const form = useAdminForm(onClose);
  const toast = useToast();
  const [value, setValue] = useState({
    tourId: initial?.tourId || defaultTour,
    departureAt: localDateTime(initial?.departureAt),
    deadline: localDateTime(initial?.bookingDeadline),
    adultPrice: initial ? String(initial.adultPrice) : "",
    childPrice: initial?.childPrice == null ? "" : String(initial.childPrice),
    guests: String(initial?.maxGuestsPerBooking || 20),
    status: initial?.status || "open",
  });
  const updateField = (key: keyof typeof value, text: string) =>
    setValue((v) => ({ ...v, [key]: text }));
  async function handleSave(event: FormEvent) {
    event.preventDefault();
    form.setError("");
    if (value.deadline >= value.departureAt) {
      form.setError("Hạn nhận đặt phải trước thời điểm khởi hành.");
      return;
    }
    if (!value.tourId) {
      form.setError("Chọn tour cho chuyến khởi hành.");
      return;
    }
    const payload = {
      ...(initial ? {} : { tourId: value.tourId }),
      departureAt: isoDateTime(value.departureAt),
      bookingDeadline: isoDateTime(value.deadline),
      adultPrice: Number(value.adultPrice),
      childPrice: value.childPrice === "" ? null : Number(value.childPrice),
      maxGuestsPerBooking: Number(value.guests),
      status: value.status,
    };
    form.setBusy(true);
    try {
      if (initial) await api.patch(`/departures/${initial._id}`, payload);
      else await api.post("/departures", payload);
      onClose();
      changed();
      toast(`Đã ${initial ? "cập nhật" : "tạo"} chuyến khởi hành.`);
    } catch (error) {
      form.setError(errorMessage(error));
    } finally {
      form.setBusy(false);
    }
  }
  const input = (
    title: string,
    key: keyof typeof value,
    type: string,
    min?: number,
    max?: number,
    required = true,
  ) => (
    <Field label={title}>
      <input
        aria-label={title}
        type={type}
        min={min}
        max={max}
        step={type === "number" ? 1 : undefined}
        required={required}
        value={value[key]}
        onChange={(event) => updateField(key, event.target.value)}
      />
    </Field>
  );
  return (
    <Modal
      title={initial ? "Chỉnh sửa chuyến khởi hành" : "Tạo chuyến khởi hành"}
      onClose={form.close}
      busy={form.busy}
    >
      <form onSubmit={handleSave} onChange={form.touch}>
        <fieldset disabled={form.busy} className="form-fieldset">
          <div className="modal-body">
            <Notice>
              Ngày giờ được nhập theo giờ Việt Nam. Giá thay đổi chỉ áp dụng cho
              đơn mới.
            </Notice>
            {tours.error && <Notice error>{tours.error}</Notice>}
            <div className="form-grid">
              <Field label="Tour trải nghiệm" full>
                <select
                  aria-label="Tour của chuyến"
                  required
                  disabled={Boolean(initial) || tours.loading}
                  value={value.tourId}
                  onChange={(event) =>
                    updateField("tourId", event.target.value)
                  }
                >
                  <option value="">Chọn tour</option>
                  {tours.data
                    .filter(
                      (t) =>
                        t.status !== "archived" || t._id === initial?.tourId,
                    )
                    .map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name}
                        {t.status === "draft"
                          ? " · Bản nháp"
                          : t.status === "archived"
                            ? " · Đã lưu trữ"
                            : ""}
                      </option>
                    ))}
                </select>
                <small>
                  {initial
                    ? "Tour của chuyến được giữ nguyên khi chỉnh sửa."
                    : "Tour cần được xuất bản để khách có thể đặt."}
                </small>
              </Field>
              {input("Khởi hành", "departureAt", "datetime-local")}
              {input("Hạn nhận đặt", "deadline", "datetime-local")}
              {input(
                "Giá người lớn (đồng)",
                "adultPrice",
                "number",
                0,
                1000000000,
              )}
              {input(
                "Giá trẻ em (đồng)",
                "childPrice",
                "number",
                0,
                1000000000,
                false,
              )}
              <p className="inline-note full">
                Để trống giá trẻ em nếu chuyến không nhận trẻ em. Nhập 0 nếu
                miễn phí.
              </p>
              {input("Số khách tối đa mỗi đơn", "guests", "number", 1, 100)}
              <Field label="Thiết lập nhận đặt">
                <select
                  aria-label="Thiết lập nhận đặt"
                  value={value.status}
                  onChange={(event) =>
                    updateField("status", event.target.value)
                  }
                >
                  <option value="open">Bật nhận đặt</option>
                  <option value="closed">Đóng nhận đặt</option>
                </select>
              </Field>
            </div>
            {form.error && <Notice error>{form.error}</Notice>}
          </div>
        </fieldset>
        <div className="modal-footer">
          <Button
            variant="secondary"
            type="button"
            disabled={form.busy}
            onClick={form.close}
          >
            Quay lại
          </Button>
          <Button
            type="submit"
            icon="check"
            busy={form.busy}
            disabled={!initial && (tours.loading || Boolean(tours.error))}
          >
            Lưu chuyến khởi hành
          </Button>
        </div>
      </form>
    </Modal>
  );
}
