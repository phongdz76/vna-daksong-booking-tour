import { useState } from "react";
import type {
  Destination,
  ImageAsset,
  Itinerary,
  Source,
} from "../../types/admin";
import { api, errorMessage } from "../../utils/adminApi";
import { Button, Field, Notice, Photo } from "./ui";
import Icon from "./Icon";

export function ImageFields({
  value,
  onChange,
  onBusy,
}: {
  value: ImageAsset[];
  onChange: (v: ImageAsset[]) => void;
  onBusy: (v: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const update = (index: number, patch: Partial<ImageAsset>) =>
    onChange(value.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  return (
    <div>
      {value.map((image, i) => (
        <div className="array-item" key={i}>
          <div className="array-item-header">
            <strong>{i === 0 ? "Ảnh đại diện" : `Ảnh ${i + 1}`}</strong>
            <div className="array-actions">
              <Button
                type="button"
                variant="ghost"
                disabled={i === 0 || busy}
                onClick={() => {
                  const copy = [...value];
                  [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
                  onChange(copy);
                }}
              >
                Lên trên
              </Button>
              <button
                type="button"
                className="icon-button danger"
                aria-label={`Bỏ ảnh ${i + 1}`}
                disabled={busy}
                onClick={() =>
                  onChange(value.filter((_, index) => index !== i))
                }
              >
                <Icon name="close" size={17} />
              </button>
            </div>
          </div>
          <div className="image-edit">
            <Photo src={image.url} alt={image.alt} />
            <div className="form-grid">
              <Field label="Đường dẫn ảnh" full>
                <input
                  aria-label={`Đường dẫn ảnh ${i + 1}`}
                  type="url"
                  required
                  maxLength={2000}
                  value={image.url}
                  onChange={(event) => update(i, { url: event.target.value })}
                />
              </Field>
              <Field label="Mô tả ảnh">
                <input
                  aria-label={`Mô tả ảnh ${i + 1}`}
                  maxLength={300}
                  value={image.alt}
                  onChange={(event) => update(i, { alt: event.target.value })}
                />
              </Field>
              <Field label="Nguồn / tác giả ảnh">
                <input
                  aria-label={`Nguồn ảnh ${i + 1}`}
                  maxLength={300}
                  value={image.credit}
                  onChange={(event) =>
                    update(i, { credit: event.target.value })
                  }
                />
              </Field>
            </div>
          </div>
        </div>
      ))}
      {error && <Notice error>{error}</Notice>}
      <div className="upload-bar">
        <input
          type="file"
          accept="image/*"
          aria-label="Tải ảnh lên"
          disabled={busy}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            if (
              !file.type.startsWith("image/") ||
              file.size > 5 * 1024 * 1024
            ) {
              setError("Chọn tập tin ảnh có dung lượng tối đa 5 MB.");
              return;
            }
            setBusy(true);
            onBusy(true);
            setError("");
            try {
              const form = new FormData();
              form.append("image", file);
              const { data } = await api.post<{ url: string }>("/upload", form);
              onChange([...value, { url: data.url, alt: "", credit: "" }]);
            } catch (error) {
              setError(errorMessage(error));
            } finally {
              setBusy(false);
              onBusy(false);
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          icon="plus"
          disabled={busy}
          onClick={() => onChange([...value, { url: "", alt: "", credit: "" }])}
        >
          Dùng đường dẫn ảnh
        </Button>
      </div>
      <p className="inline-note">
        {busy
          ? "Đang tải ảnh lên…"
          : "Ảnh đầu tiên là ảnh đại diện. Mỗi ảnh tối đa 5 MB."}
      </p>
    </div>
  );
}

export function SourceFields({
  value,
  onChange,
}: {
  value: Source[];
  onChange: (v: Source[]) => void;
}) {
  const update = (index: number, patch: Partial<Source>) =>
    onChange(value.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  return (
    <div>
      {value.map((source, i) => (
        <div className="array-item" key={i}>
          <div className="array-item-header">
            <strong>Nguồn tham khảo {i + 1}</strong>
            <button
              type="button"
              className="icon-button danger"
              aria-label={`Bỏ nguồn ${i + 1}`}
              onClick={() => onChange(value.filter((_, index) => index !== i))}
            >
              <Icon name="close" size={17} />
            </button>
          </div>
          <div className="form-grid">
            <Field label="Tên nguồn">
              <input
                aria-label={`Tên nguồn ${i + 1}`}
                required
                maxLength={300}
                value={source.title}
                onChange={(event) => update(i, { title: event.target.value })}
              />
            </Field>
            <Field label="Ngày kiểm tra">
              <input
                aria-label={`Ngày kiểm tra nguồn ${i + 1}`}
                type="date"
                required
                value={source.checkedAt}
                onChange={(event) =>
                  update(i, { checkedAt: event.target.value })
                }
              />
            </Field>
            <Field label="Liên kết tham khảo" full>
              <input
                aria-label={`Liên kết nguồn ${i + 1}`}
                type="url"
                maxLength={2000}
                required
                value={source.url}
                onChange={(event) => update(i, { url: event.target.value })}
                placeholder="https://…"
              />
            </Field>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        icon="plus"
        onClick={() =>
          onChange([...value, { title: "", url: "", checkedAt: "" }])
        }
      >
        Thêm nguồn tham khảo
      </Button>
      <p className="inline-note">
        Nội dung xuất bản cần ít nhất một nguồn đã kiểm tra.
      </p>
    </div>
  );
}

export function DestinationPicker({
  items,
  selected,
  onChange,
  loading,
  error,
}: {
  items: Destination[];
  selected: string[];
  onChange: (v: string[]) => void;
  loading: boolean;
  error: string;
}) {
  const [search, setSearch] = useState("");
  const display = items
    .filter((d) => d.status !== "archived" || selected.includes(d._id))
    .filter((d) =>
      d.name.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")),
    );
  return (
    <div className="field">
      {error && <Notice error>{error}</Notice>}
      <input
        aria-label="Tìm điểm đến để liên kết"
        placeholder="Tìm điểm đến…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <div className="multi-select">
        {loading ? (
          <span className="muted small-text">Đang tải điểm đến…</span>
        ) : !display.length ? (
          <span className="muted small-text">Chưa có điểm đến phù hợp.</span>
        ) : (
          display.map((d) => (
            <label key={d._id}>
              <input
                type="checkbox"
                checked={selected.includes(d._id)}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...selected, d._id]
                      : selected.filter((id) => id !== d._id),
                  )
                }
              />
              <span>
                {d.name}
                {d.status === "archived" ? " · Đã lưu trữ" : ""}
              </span>
            </label>
          ))
        )}
        {selected
          .filter((id) => !items.some((d) => d._id === id))
          .map((id) => (
            <label key={id}>
              <input
                type="checkbox"
                checked
                onChange={() => onChange(selected.filter((v) => v !== id))}
              />
              <span>Điểm đến không còn khả dụng</span>
            </label>
          ))}
      </div>
    </div>
  );
}

export function ItineraryFields({
  value,
  onChange,
  destinations,
}: {
  value: Itinerary[];
  onChange: (v: Itinerary[]) => void;
  destinations: Destination[];
}) {
  const update = (index: number, patch: Partial<Itinerary>) =>
    onChange(value.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  return (
    <div>
      {value.map((item, i) => (
        <div className="array-item" key={i}>
          <div className="array-item-header">
            <strong>Điểm dừng {i + 1}</strong>
            <div className="array-actions">
              <Button
                type="button"
                variant="ghost"
                disabled={i === 0}
                onClick={() => {
                  const copy = [...value];
                  [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
                  onChange(copy);
                }}
              >
                Lên trên
              </Button>
              <button
                type="button"
                className="icon-button danger"
                aria-label={`Bỏ điểm dừng ${i + 1}`}
                onClick={() =>
                  onChange(value.filter((_, index) => index !== i))
                }
              >
                <Icon name="close" size={17} />
              </button>
            </div>
          </div>
          <div className="form-grid">
            <Field label="Tiêu đề">
              <input
                aria-label={`Tiêu đề điểm dừng ${i + 1}`}
                required
                maxLength={200}
                value={item.title}
                onChange={(event) => update(i, { title: event.target.value })}
              />
            </Field>
            <Field label="Điểm đến liên kết">
              <select
                aria-label={`Điểm đến của điểm dừng ${i + 1}`}
                value={item.destinationId || ""}
                onChange={(event) =>
                  update(i, { destinationId: event.target.value || null })
                }
              >
                <option value="">Không liên kết điểm đến</option>
                {destinations.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Mô tả hoạt động" full>
              <textarea
                aria-label={`Mô tả điểm dừng ${i + 1}`}
                required
                maxLength={3000}
                rows={3}
                value={item.description}
                onChange={(event) =>
                  update(i, { description: event.target.value })
                }
              />
            </Field>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        icon="plus"
        onClick={() =>
          onChange([
            ...value,
            { title: "", description: "", destinationId: null },
          ])
        }
      >
        Thêm điểm dừng
      </Button>
    </div>
  );
}
