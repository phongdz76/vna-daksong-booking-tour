import { useState } from "react";
import { validDate, validIntegerInput, validText } from '../../utils/inputValidation';
import type { FormEvent } from "react";
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
  Stat,
} from "../../components/admin/ui";
import { useFilters, useQuery } from "../../hooks/useAdminQuery";
import useAdminForm from "../../hooks/useAdminForm";
import { useToast } from "../../context/AdminToastContext";
import type { Coupon, ListResponse } from "../../types/admin";
import { api, changed, errorMessage, query } from "../../utils/adminApi";
import {
  couponState,
  date,
  isoDateTime,
  localDateTime,
  money,
} from "../../utils/adminPresentation";

export default function CouponsPage() {
  const filters = useFilters();
  const toast = useToast();
  const list = useQuery<ListResponse<Coupon>>(
    query("/coupons", {
      page: filters.page,
      limit: filters.limit,
      isActive: filters.get("isActive"),
      sort: filters.get("sort") || "newest",
    }),
  );
  const active = useQuery<ListResponse<Coupon>>(
    "/coupons?isActive=true&limit=1",
  );
  const inactive = useQuery<ListResponse<Coupon>>(
    "/coupons?isActive=false&limit=1",
  );
  const [edit, setEdit] = useState<Coupon | "new" | null>(null);
  const [action, setAction] = useState<{
    coupon: Coupon;
    type: "delete" | "toggle";
  } | null>(null);
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="ƯU ĐÃI & CHĂM SÓC KHÁCH HÀNG"
        title="Mã giảm giá"
        description="Tạo ưu đãi phù hợp và quản lý điều kiện sử dụng cho khách đặt tour."
      >
        <Button icon="plus" onClick={() => setEdit("new")}>
          Tạo mã giảm giá
        </Button>
      </PageHeader>
      <div className="stats-grid three">
        <Stat
          title="Kết quả trong bộ lọc"
          value={list.data?.pagination.total ?? "—"}
          caption="Số mã phù hợp lựa chọn hiện tại."
          icon="coupon"
        />
        <Stat
          title="Đang bật"
          value={active.data?.pagination.total ?? "—"}
          caption="Cần còn thời hạn và lượt dùng để áp dụng."
          icon="check"
        />
        <Stat
          title="Đã tắt"
          value={inactive.data?.pagination.total ?? "—"}
          caption="Khách không thể sử dụng các mã này."
          icon="lock"
        />
      </div>
      <div className="filters">
        <Field label="Thiết lập sử dụng">
          <select
            aria-label="Lọc mã giảm giá"
            value={filters.get("isActive")}
            onChange={(event) =>
              filters.update({ isActive: event.target.value })
            }
          >
            <option value="">Tất cả mã</option>
            <option value="true">Đang bật</option>
            <option value="false">Đã tắt</option>
          </select>
        </Field>
        <Field label="Sắp xếp">
          <select
            aria-label="Sắp xếp mã giảm giá"
            value={filters.get("sort") || "newest"}
            onChange={(event) => filters.update({ sort: event.target.value })}
          >
            <option value="newest">Mới nhất trước</option>
            <option value="oldest">Cũ nhất trước</option>
          </select>
        </Field>
        <div className="filter-actions">
          <Button variant="secondary" icon="refresh" onClick={changed}>
            Làm mới
          </Button>
          <Button variant="ghost" onClick={filters.reset}>
            Đặt lại
          </Button>
        </div>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>
            Danh sách mã giảm giá
            {list.data && (
              <span className="count-pill">
                {list.data.pagination.total} mã
              </span>
            )}
          </h2>
          <Icon name="coupon" />
        </div>
        <QueryState {...list}>
          {list.data?.data.length ? (
            <>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Mã ưu đãi / Mô tả</th>
                      <th>Mức giảm</th>
                      <th>Thời gian áp dụng</th>
                      <th>Lượt sử dụng</th>
                      <th>Tình trạng</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.data.map((c) => {
                      const state = couponState(c);
                      return (
                        <tr key={c._id}>
                          <td>
                            <button
                              className="coupon-code"
                              onClick={() => setEdit(c)}
                            >
                              <Icon name="coupon" size={16} />
                              {c.code}
                            </button>
                            <small className="coupon-description">
                              {c.description || "Chưa bổ sung mô tả"}
                            </small>
                          </td>
                          <td>
                            <strong className="price">
                              {c.discountType === "percentage"
                                ? `${c.discountValue}%`
                                : money(c.discountValue)}
                            </strong>
                            {c.discountType === "percentage" &&
                              c.maxDiscount != null && (
                                <small>Tối đa {money(c.maxDiscount)}</small>
                              )}
                            <small>Đơn từ {money(c.minOrderValue)}</small>
                          </td>
                          <td>
                            <span className="nowrap">
                              {date(c.validFrom, true)}
                            </span>
                            <small>đến {date(c.validUntil, true)}</small>
                          </td>
                          <td>
                            <strong>
                              {c.usedCount} /{" "}
                              {c.usageLimit == null
                                ? "Không giới hạn"
                                : c.usageLimit}
                            </strong>
                            {c.usageLimit != null && (
                              <div className="usage-track">
                                <span
                                  style={{
                                    width: `${c.usageLimit ? Math.min(100, (c.usedCount / c.usageLimit) * 100) : 100}%`,
                                  }}
                                />
                              </div>
                            )}
                          </td>
                          <td>
                            <Badge color={state.tone}>{state.text}</Badge>
                            <small>{c.isActive ? "Đang bật" : "Đã tắt"}</small>
                          </td>
                          <td>
                            <div className="actions">
                              <button
                                className="icon-button"
                                aria-label={`Sửa mã ${c.code}`}
                                onClick={() => setEdit(c)}
                              >
                                <Icon name="edit" size={18} />
                              </button>
                              <button
                                className="icon-button"
                                aria-label={`${c.isActive ? "Tắt" : "Bật"} mã ${c.code}`}
                                onClick={() =>
                                  setAction({ coupon: c, type: "toggle" })
                                }
                              >
                                <Icon
                                  name={c.isActive ? "lock" : "check"}
                                  size={18}
                                />
                              </button>
                              <button
                                className="icon-button danger"
                                aria-label={`Xóa mã ${c.code}`}
                                onClick={() =>
                                  setAction({ coupon: c, type: "delete" })
                                }
                              >
                                <Icon name="archive" size={18} />
                              </button>
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
              title="Chưa có mã phù hợp"
              description="Tạo một mã mới hoặc thay đổi bộ lọc để xem ưu đãi."
            />
          )}
        </QueryState>
      </section>
      <Notice>
        Mã được áp dụng khi đang bật, trong thời hạn, còn lượt dùng và đơn đủ
        điều kiện. Lượt dùng có thể giảm khi đơn bị hủy hoặc từ chối.
      </Notice>
      {edit && (
        <CouponForm
          initial={edit === "new" ? undefined : edit}
          onClose={() => setEdit(null)}
        />
      )}
      {action && (
        <Confirm
          title={
            action.type === "delete"
              ? "Xóa mã giảm giá"
              : `${action.coupon.isActive ? "Tắt" : "Bật"} mã giảm giá`
          }
          action={
            action.type === "delete"
              ? "Xóa mã"
              : action.coupon.isActive
                ? "Tắt mã"
                : "Bật mã"
          }
          danger={action.type === "delete"}
          onClose={() => setAction(null)}
          onConfirm={async () => {
            try {
              if (action.type === "delete")
                await api.delete(`/coupons/${action.coupon._id}`);
              else
                await api.put(`/coupons/${action.coupon._id}`, {
                  isActive: !action.coupon.isActive,
                });
              changed();
              toast("Đã cập nhật mã giảm giá.");
            } catch (error) {
              throw new Error(errorMessage(error));
            }
          }}
        >
          <p>
            Mã <strong>{action.coupon.code}</strong>
          </p>
          <Notice>
            {action.type === "delete"
              ? "Mã sẽ bị xóa và không thể khôi phục. Bạn có thể tắt mã nếu muốn giữ lại để tra cứu. Thông tin ưu đãi của các đơn đã đặt vẫn được giữ."
              : action.coupon.isActive
                ? "Khách sẽ không thể sử dụng mã cho đơn mới."
                : "Mã được áp dụng nếu thời hạn, lượt dùng và điều kiện đơn đều phù hợp."}
          </Notice>
        </Confirm>
      )}
    </div>
  );
}

function CouponForm({
  initial,
  onClose,
}: {
  initial?: Coupon;
  onClose: () => void;
}) {
  const form = useAdminForm(onClose);
  const toast = useToast();
  const [value, setValue] = useState({
    code: initial?.code || "",
    description: initial?.description || "",
    type: initial?.discountType || "percentage",
    discount: initial ? String(initial.discountValue) : "",
    max: initial?.maxDiscount == null ? "" : String(initial.maxDiscount),
    min: String(initial?.minOrderValue || 0),
    from: localDateTime(initial?.validFrom || new Date().toISOString()),
    until: localDateTime(initial?.validUntil),
    limit: initial?.usageLimit == null ? "" : String(initial.usageLimit),
    active: initial?.isActive ?? true,
  });
  const updateField = (
    key: Exclude<keyof typeof value, "active">,
    text: string,
  ) => setValue((v) => ({ ...v, [key]: text }));
  async function handleSave(event: FormEvent) {
    event.preventDefault();
    form.setError("");
    if (!validDate(value.from) || !validDate(value.until)) {
      form.setError('Chọn ngày giờ bắt đầu và hết hạn hợp lệ.'); return;
    }
    if (!validText(value.description, 1000)) {
      form.setError('Mô tả tối đa 1.000 ký tự, không chứa ký tự điều khiển.'); return;
    }
    if (!validIntegerInput(value.discount, 0, value.type === 'percentage' ? 100 : 1000000000) ||
        !validIntegerInput(value.min, 0, 1000000000) ||
        (value.type === 'percentage' && value.max !== '' && !validIntegerInput(value.max, 0, 1000000000)) ||
        (value.limit !== '' && !validIntegerInput(value.limit, 0, 1000000000))) {
      form.setError('Nhập số nguyên hợp lệ; phần trăm tối đa 100%, các số tiền và lượt dùng tối đa 1.000.000.000.'); return;
    }
    if (value.until < value.from) {
      form.setError("Ngày hết hạn phải từ ngày bắt đầu trở đi.");
      return;
    }
    const payload = {
      description: value.description.trim(),
      discountType: value.type,
      discountValue: Number(value.discount),
      maxDiscount:
        value.type === "percentage" && value.max !== ""
          ? Number(value.max)
          : null,
      minOrderValue: Number(value.min),
      validFrom: isoDateTime(value.from),
      validUntil: isoDateTime(value.until),
      usageLimit: value.limit === "" ? null : Number(value.limit),
      isActive: value.active,
    };
    form.setBusy(true);
    try {
      if (initial) await api.put(`/coupons/${initial._id}`, payload);
      else await api.post("/coupons", payload);
      onClose();
      changed();
      toast(`Đã ${initial ? "cập nhật" : "tạo"} mã giảm giá.`);
    } catch (error) {
      form.setError(errorMessage(error));
    } finally {
      form.setBusy(false);
    }
  }
  const number = (
    title: string,
    key: "discount" | "max" | "min" | "limit",
    required = false,
    max = 1000000000,
  ) => (
    <Field label={title}>
      <input
        aria-label={title}
        type="number"
        min={0}
        max={max}
        step={1}
        required={required}
        value={value[key]}
        onChange={(event) => updateField(key, event.target.value)}
      />
    </Field>
  );
  return (
    <Modal
      title={initial ? "Chỉnh sửa mã giảm giá" : "Tạo mã giảm giá"}
      onClose={form.close}
      busy={form.busy}
    >
      <form onSubmit={handleSave} onChange={form.touch}>
        <fieldset className="form-fieldset" disabled={form.busy}>
          <div className="modal-body">
            <div className="form-grid">
              {initial ? (
                <Field
                  label="Mã giảm giá"
                  hint="Mã được tạo tự động và giữ nguyên khi chỉnh sửa."
                  full
                >
                  <input
                    aria-label="Mã giảm giá"
                    readOnly
                    value={initial.code}
                  />
                </Field>
              ) : (
                <div className="field full">
                  <Notice>
                    Mã ưu đãi được tạo tự động sau khi lưu. Khách sẽ thấy ưu đãi
                    để chọn khi đặt tour.
                  </Notice>
                </div>
              )}
              <Field label="Mô tả ưu đãi" full>
                <textarea
                  aria-label="Mô tả ưu đãi"
                  rows={3}
                  value={value.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                />
              </Field>
              <Field label="Hình thức giảm">
                <select
                  aria-label="Hình thức giảm"
                  value={value.type}
                  onChange={(event) => updateField("type", event.target.value)}
                >
                  <option value="percentage">Theo phần trăm</option>
                  <option value="fixed">Theo số tiền</option>
                </select>
              </Field>
              {number(
                value.type === "percentage"
                  ? "Mức giảm (%)"
                  : "Mức giảm (đồng)",
                "discount",
                true,
                value.type === "percentage" ? 100 : Number.MAX_SAFE_INTEGER,
              )}
              {value.type === "percentage" &&
                number("Giảm tối đa (đồng)", "max")}
              {number("Giá trị đơn tối thiểu (đồng)", "min", true)}
              <Field label="Bắt đầu áp dụng">
                <input
                  aria-label="Bắt đầu áp dụng"
                  type="datetime-local"
                  required
                  value={value.from}
                  onChange={(event) => updateField("from", event.target.value)}
                />
              </Field>
              <Field label="Hết hạn">
                <input
                  aria-label="Hết hạn"
                  type="datetime-local"
                  required
                  value={value.until}
                  onChange={(event) => updateField("until", event.target.value)}
                />
              </Field>
              {number("Giới hạn lượt sử dụng", "limit")}
              <Field label="Thiết lập sử dụng">
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={value.active}
                    onChange={(event) =>
                      setValue((v) => ({ ...v, active: event.target.checked }))
                    }
                  />
                  Bật mã giảm giá
                </label>
              </Field>
            </div>
            <Notice>
              Để trống giới hạn lượt dùng để không giới hạn. Nhập 0 để không cho
              phép lượt dùng mới. Ngày giờ theo giờ Việt Nam.
            </Notice>
            {form.error && <Notice error>{form.error}</Notice>}
          </div>
        </fieldset>
        <div className="modal-footer">
          <Button
            type="button"
            variant="secondary"
            disabled={form.busy}
            onClick={form.close}
          >
            Quay lại
          </Button>
          <Button type="submit" busy={form.busy} icon="check">
            Lưu mã giảm giá
          </Button>
        </div>
      </form>
    </Modal>
  );
}
