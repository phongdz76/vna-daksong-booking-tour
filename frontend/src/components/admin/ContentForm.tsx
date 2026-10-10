import { useState } from "react";
import type { FormEvent } from "react";
import type {
  Article,
  ContentStatus,
  Destination,
  ImageAsset,
  Itinerary,
  Source,
  Theme,
  Tour,
} from "../../types/admin";
import { api, changed, errorMessage } from "../../utils/adminApi";
import {
  articleLabels,
  contentLabels,
  localDateTime,
  slugify,
  themeLabels,
} from "../../utils/adminPresentation";
import { useOptions } from "../../hooks/useAdminQuery";
import useAdminForm from "../../hooks/useAdminForm";
import { useToast } from "../../context/AdminToastContext";
import { Button, Field, Modal, Notice } from "./ui";
import {
  DestinationPicker,
  ImageFields,
  ItineraryFields,
  SourceFields,
} from "./ContentFields";
import Icon from "./Icon";
import { validText, validHttpUrl, validDate } from '../../utils/inputValidation';

export type Resource = "tours" | "destinations" | "articles";
export type Content = Tour | Destination | Article;
export const resourceNames = {
  tours: "tour",
  destinations: "điểm đến",
  articles: "bài viết",
};

export default function ContentForm({
  resource,
  initial,
  onClose,
}: {
  resource: Resource;
  initial?: Content;
  onClose: () => void;
}) {
  const tour = initial as Tour | undefined;
  const destination = initial as Destination | undefined;
  const article = initial as Article | undefined;
  const form = useAdminForm(onClose);
  const toast = useToast();
  const [values, setValues] = useState({
    name: initial ? ("title" in initial ? initial.title : initial.name) : "",
    slug: initial?.slug || "",
    summary: initial?.summary || "",
    body:
      (resource === "articles" ? article?.content : tour?.description) || "",
    duration: String(tour?.durationHours || 8),
    meeting: tour?.meetingPoint || "",
    includes: tour?.includes?.join("\n") || "",
    excludes: tour?.excludes?.join("\n") || "",
    childPolicy: tour?.childPolicy || "",
    cancellation: tour?.cancellationPolicy || "",
    address: destination?.address || "",
    visitNotes: destination?.visitNotes || "",
    category:
      destination?.category || (resource === "articles" ? "culture" : "nature"),
    status: initial?.status || "draft",
  });
  const [slugEdited, setSlugEdited] = useState(Boolean(initial));
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<ImageAsset[]>(
    initial?.images.map((i) => ({
      url: i.url,
      alt: i.alt || "",
      credit: i.credit || "",
    })) || [],
  );
  const [sources, setSources] = useState<Source[]>(
    (resource === "tours" ? [] : destination?.sources || []).map((s) => ({
      title: s.title,
      url: s.url,
      checkedAt: localDateTime(s.checkedAt).slice(0, 10),
    })),
  );
  const [themes, setThemes] = useState<Theme[]>(tour?.themes || []);
  const [destinationIds, setDestinationIds] = useState<string[]>(
    resource === "destinations" ? [] : tour?.destinationIds || [],
  );
  const [itinerary, setItinerary] = useState<Itinerary[]>(
    tour?.itinerary?.map((i) => ({
      title: i.title,
      description: i.description,
      destinationId: i.destinationId || null,
    })) || [],
  );
  const destinations = useOptions<Destination>(
    resource === "destinations" ? null : "/destinations",
  );
  const updateField = (key: keyof typeof values, value: string) => {
    setValues((previous) => ({ ...previous, [key]: value }));
    form.touch();
  };
  const text = (
    title: string,
    key: keyof typeof values,
    maxLength: number,
    required = false,
    rows = 3,
  ) => (
    <Field label={title} full>
      <textarea
        aria-label={title}
        value={values[key]}
        onChange={(event) => updateField(key, event.target.value)}
        maxLength={maxLength}
        required={required}
        rows={rows}
      />
      <small>
        {values[key].length.toLocaleString("vi-VN")} /{" "}
        {maxLength.toLocaleString("vi-VN")} ký tự
      </small>
    </Field>
  );
  async function handleSave(event: FormEvent) {
    event.preventDefault();
    form.setError("");
    const limits: Partial<Record<keyof typeof values, number>> = {
      name: 200, slug: 180, summary: 1000, body: resource === 'articles' ? 50000 : 30000,
      meeting: 1000, childPolicy: 3000, cancellation: 3000, address: 500, visitNotes: 3000,
    };
    if (Object.entries(limits).some(([key, max]) => !validText(values[key as keyof typeof values], max!))) {
      form.setError('Nội dung vượt độ dài cho phép hoặc chứa ký tự điều khiển.'); return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug.trim())) {
      form.setError('Đường dẫn chỉ dùng chữ thường, số và dấu gạch nối.'); return;
    }
    if ([images, sources, itinerary, destinationIds].some(items => items.length > 100)) {
      form.setError('Mỗi danh sách ảnh, nguồn, điểm đến hoặc điểm dừng tối đa 100 mục.'); return;
    }
    if (resource === 'tours' && (!values.duration.trim() || !Number.isFinite(Number(values.duration)) || Number(values.duration) < 1 || Number(values.duration) > 720)) {
      form.setError('Thời lượng tour phải từ 1 đến 720 giờ.'); return;
    }
    if (images.some(image => !validText(image.alt, 300) || !validText(image.credit, 300)) || sources.some(source => !validText(source.title, 300, true) || !validDate(source.checkedAt))) {
      form.setError('Kiểm tra tên nguồn, ngày kiểm tra và chú thích ảnh.'); return;
    }
    if (itinerary.some(stop => !validText(stop.title, 200, true) || !validText(stop.description, 3000, true))) {
      form.setError('Mỗi điểm dừng cần tiêu đề tối đa 200 và mô tả tối đa 3.000 ký tự.'); return;
    }
    const lines = (value: string) =>
      value
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    if (
      ![values.name, values.slug, values.summary, values.body].every((v) =>
        v.trim(),
      )
    ) {
      form.setError(
        "Vui lòng điền đầy đủ tên, đường dẫn, tóm tắt và nội dung.",
      );
      return;
    }
    if (
      images.some((i) => !validHttpUrl(i.url.trim())) ||
      sources.some(
        (s) => !validHttpUrl(s.url.trim()) || !s.title.trim(),
      )
    ) {
      form.setError(
        "Đường dẫn ảnh và nguồn tham khảo cần bắt đầu bằng https:// hoặc http://. Nguồn tham khảo cần có tên.",
      );
      return;
    }
    if (
      resource === "tours" &&
      (!values.meeting.trim() || !values.cancellation.trim())
    ) {
      form.setError("Vui lòng bổ sung điểm tập trung và chính sách hủy tour.");
      return;
    }
    if (
      resource === "tours" &&
      itinerary.some(
        (i) =>
          !i.title.trim() ||
          !i.description.trim() ||
          (i.destinationId && !destinationIds.includes(i.destinationId)),
      )
    ) {
      form.setError(
        "Mỗi điểm dừng cần tiêu đề, mô tả và chỉ được liên kết với điểm đến đã chọn của tour.",
      );
      return;
    }
    if (
      lines(values.includes).length > 100 || lines(values.excludes).length > 100 || [...lines(values.includes), ...lines(values.excludes)].some(
        (s) => s.length > 500,
      )
    ) {
      form.setError(
        "Mỗi dòng dịch vụ bao gồm hoặc không bao gồm tối đa 500 ký tự.",
      );
      return;
    }
    if (
      values.status === "published" &&
      (resource === "tours" ? !itinerary.length : !sources.length)
    ) {
      form.setError(
        resource === "tours"
          ? "Bổ sung ít nhất một điểm dừng trước khi xuất bản tour."
          : "Bổ sung ít nhất một nguồn tham khảo đã kiểm tra trước khi xuất bản.",
      );
      return;
    }
    const shared = {
      slug: values.slug.trim(),
      summary: values.summary.trim(),
      status: values.status as ContentStatus,
      images: images.map((i) => ({
        url: i.url.trim(),
        alt: i.alt.trim(),
        credit: i.credit.trim(),
      })),
    };
    const references = sources.map((s) => ({
      title: s.title.trim(),
      url: s.url.trim(),
      checkedAt: new Date(`${s.checkedAt}T00:00:00+07:00`).toISOString(),
    }));
    const payload =
      resource === "tours"
        ? {
            ...shared,
            name: values.name.trim(),
            description: values.body.trim(),
            durationHours: Number(values.duration),
            themes,
            destinationIds,
            itinerary: itinerary.map((i) => ({
              ...i,
              title: i.title.trim(),
              description: i.description.trim(),
            })),
            meetingPoint: values.meeting.trim(),
            includes: lines(values.includes),
            excludes: lines(values.excludes),
            childPolicy: values.childPolicy.trim(),
            cancellationPolicy: values.cancellation.trim(),
          }
        : resource === "destinations"
          ? {
              ...shared,
              name: values.name.trim(),
              description: values.body.trim(),
              category: values.category,
              address: values.address.trim(),
              visitNotes: values.visitNotes.trim(),
              sources: references,
            }
          : {
              ...shared,
              title: values.name.trim(),
              content: values.body.trim(),
              category: values.category,
              destinationIds,
              sources: references,
            };
    form.setBusy(true);
    try {
      if (initial) await api.patch(`/${resource}/${initial._id}`, payload);
      else await api.post(`/${resource}`, payload);
      onClose();
      changed();
      toast(`Đã ${initial ? "cập nhật" : "tạo"} ${resourceNames[resource]}.`);
    } catch (error) {
      form.setError(errorMessage(error));
    } finally {
      form.setBusy(false);
    }
  }
  return (
    <Modal
      wide
      title={`${initial ? "Chỉnh sửa" : "Tạo"} ${resourceNames[resource]}`}
      onClose={form.close}
      busy={form.busy || uploading}
    >
      <form onSubmit={handleSave} onChange={form.touch}>
        <fieldset disabled={form.busy || uploading} className="form-fieldset">
          <div className="modal-body">
            <section className="form-section">
              <h3>
                <Icon
                  name={
                    resource === "tours"
                      ? "tour"
                      : resource === "articles"
                        ? "article"
                        : "pin"
                  }
                />
                Thông tin cơ bản
              </h3>
              <div className="form-grid">
                <Field
                  label={
                    resource === "articles"
                      ? "Tiêu đề bài viết"
                      : `Tên ${resourceNames[resource]}`
                  }
                  full
                >
                  <input
                    aria-label="Tên nội dung"
                    required
                    maxLength={200}
                    value={values.name}
                    onChange={(event) => {
                      const name = event.target.value;
                      setValues((v) => ({
                        ...v,
                        name,
                        ...(!slugEdited ? { slug: slugify(name) } : {}),
                      }));
                    }}
                  />
                </Field>
                <Field
                  label="Đường dẫn"
                  hint="Chữ thường không dấu, số và dấu gạch ngang."
                >
                  <input
                    aria-label="Đường dẫn nội dung"
                    required
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    maxLength={180}
                    value={values.slug}
                    onChange={(event) => {
                      setSlugEdited(true);
                      updateField("slug", event.target.value);
                    }}
                  />
                </Field>
                <Field label="Trạng thái xuất bản">
                  <select
                    aria-label="Trạng thái xuất bản"
                    value={values.status}
                    onChange={(event) =>
                      updateField("status", event.target.value)
                    }
                  >
                    {Object.entries(contentLabels).map(([key, title]) => (
                      <option key={key} value={key}>
                        {title}
                      </option>
                    ))}
                  </select>
                </Field>
                {text("Tóm tắt", "summary", 1000, true)}
                {resource !== "tours" && (
                  <Field label="Chuyên mục">
                    <select
                      aria-label="Chuyên mục"
                      value={values.category}
                      onChange={(event) =>
                        updateField("category", event.target.value)
                      }
                    >
                      {Object.entries(
                        resource === "articles" ? articleLabels : themeLabels,
                      ).map(([key, title]) => (
                        <option key={key} value={key}>
                          {title}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                {resource === "tours" && (
                  <>
                    <Field label="Thời lượng (giờ)">
                      <input
                        aria-label="Thời lượng (giờ)"
                        type="number"
                        min={1}
                        max={720}
                        step="any"
                        required
                        value={values.duration}
                        onChange={(event) =>
                          updateField("duration", event.target.value)
                        }
                      />
                    </Field>
                    <Field label="Chủ đề" full>
                      <div className="checkbox-options">
                        {Object.entries(themeLabels).map(([key, title]) => (
                          <label key={key}>
                            <input
                              type="checkbox"
                              checked={themes.includes(key as Theme)}
                              onChange={(event) => {
                                setThemes(
                                  event.target.checked
                                    ? [...themes, key as Theme]
                                    : themes.filter((v) => v !== key),
                                );
                              }}
                            />
                            {title}
                          </label>
                        ))}
                      </div>
                    </Field>
                  </>
                )}
                {resource === "destinations" && (
                  <Field label="Địa chỉ" full>
                    <input
                      aria-label="Địa chỉ"
                      value={values.address}
                      maxLength={500}
                      onChange={(event) =>
                        updateField("address", event.target.value)
                      }
                    />
                  </Field>
                )}
              </div>
            </section>
            <section className="form-section">
              <h3>Nội dung chi tiết</h3>
              {text(
                resource === "articles"
                  ? "Nội dung bài viết"
                  : "Mô tả chi tiết",
                "body",
                resource === "articles" ? 50000 : 30000,
                true,
                10,
              )}
              <p className="inline-note">
                Nội dung hiển thị dưới dạng văn bản. Xuống dòng để chia đoạn.
              </p>
            </section>
            {resource !== "destinations" && (
              <section className="form-section">
                <h3>
                  <Icon name="pin" />
                  Điểm đến liên quan
                </h3>
                <DestinationPicker
                  items={destinations.data}
                  loading={destinations.loading}
                  error={destinations.error}
                  selected={destinationIds}
                  onChange={(ids) => {
                    setDestinationIds(ids);
                    form.touch();
                  }}
                />
              </section>
            )}
            {resource === "tours" && (
              <>
                <section className="form-section">
                  <h3>
                    <Icon name="calendar" />
                    Lịch trình
                  </h3>
                  <ItineraryFields
                    value={itinerary}
                    onChange={(v) => {
                      setItinerary(v);
                      form.touch();
                    }}
                    destinations={destinations.data.filter((d) =>
                      destinationIds.includes(d._id),
                    )}
                  />
                </section>
                <section className="form-section">
                  <h3>Điểm tập trung & dịch vụ</h3>
                  <div className="form-grid">
                    {text("Điểm tập trung", "meeting", 1000, true)}
                    {text(
                      "Dịch vụ bao gồm · mỗi dòng một mục",
                      "includes",
                      30000,
                    )}
                    {text(
                      "Dịch vụ không bao gồm · mỗi dòng một mục",
                      "excludes",
                      30000,
                    )}
                  </div>
                </section>
                <section className="form-section">
                  <h3>Chính sách</h3>
                  {text("Chính sách hủy tour", "cancellation", 3000, true)}
                  {text("Chính sách trẻ em", "childPolicy", 3000)}
                </section>
              </>
            )}
            {resource === "destinations" && (
              <section className="form-section">
                <h3>Lưu ý tham quan</h3>
                {text("Lưu ý dành cho khách", "visitNotes", 3000)}
              </section>
            )}
            <section className="form-section">
              <h3>
                <Icon name="image" />
                Hình ảnh
              </h3>
              <ImageFields
                value={images}
                onChange={(v) => {
                  setImages(v);
                  form.touch();
                }}
                onBusy={setUploading}
              />
            </section>
            {resource !== "tours" && (
              <section className="form-section">
                <h3>Nguồn tham khảo</h3>
                <SourceFields
                  value={sources}
                  onChange={(v) => {
                    setSources(v);
                    form.touch();
                  }}
                />
              </section>
            )}
            {form.error && <Notice error>{form.error}</Notice>}
          </div>
        </fieldset>
        <div className="modal-footer">
          <span className="save-hint">
            {uploading
              ? "Đang tải ảnh lên…"
              : "Kiểm tra nội dung trước khi lưu."}
          </span>
          <Button
            type="button"
            variant="secondary"
            disabled={form.busy || uploading}
            onClick={form.close}
          >
            Quay lại
          </Button>
          <Button
            type="submit"
            busy={form.busy}
            disabled={uploading}
            icon="check"
          >
            Lưu {resourceNames[resource]}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
