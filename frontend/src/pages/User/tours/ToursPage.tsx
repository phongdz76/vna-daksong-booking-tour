import { API_PATHS } from "../../../utils/api";
import { useMemo, useState } from "react";
import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "../../../components/layout/Header";
import Icon from "../../../components/common/Icon";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../../components/common/States";
import TourCard from "../../../components/tour/TourCard";
import useApi from "../../../hooks/useApi";
import { previewList, previewTours } from "../../../data/preview";
import { themeLabels } from "../../../utils/format";
import type { ListResponse, Theme, Tour } from "../../../types/api";

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div className="filter-select" ref={root}>
      <span className="filter-label">{label}</span>
      <button
        type="button"
        className={`filter-select-trigger ${open ? "open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected.label}</span>
        <Icon name="chevron" size={16} />
      </button>
      {open && (
        <div className="filter-select-menu" role="listbox" aria-label={label}>
          {options.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={option.value === value ? "selected" : ""}
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <span>{option.label}</span>
              {option.value === value && <Icon name="check" size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ToursPage() {
  const [params, setParams] = useSearchParams();
  const theme = params.get("theme") || "";
  const q = params.get("q") || "";
  const sort = params.get("sort") || "newest";
  const maxDuration = params.get("maxDurationHours") || "";
  const page = Number(params.get("page")) || 1;
  const [search, setSearch] = useState(q);
  const [showFilters, setShowFilters] = useState(false);
  const previewData = useMemo(() => {
    const tours = previewTours.filter(
      (t) =>
        (!theme || t.themes.includes(theme as Theme)) &&
        (!q ||
          [t.name, t.summary, t.description || ""].some((value) =>
            value.toLocaleLowerCase("vi").includes(q.toLocaleLowerCase("vi")),
          )) &&
        (!maxDuration || t.durationHours <= Number(maxDuration)),
    );
    if (sort === "price_asc")
      tours.sort((a, b) => (a.priceFrom ?? 0) - (b.priceFrom ?? 0));
    if (sort === "price_desc")
      tours.sort((a, b) => (b.priceFrom ?? 0) - (a.priceFrom ?? 0));
    if (sort === "duration")
      tours.sort((a, b) => a.durationHours - b.durationHours);
    return previewList(tours);
  }, [theme, q, sort, maxDuration]);
  const query = new URLSearchParams({ limit: "8", page: String(page), sort });
  if (theme) query.set("theme", theme);
  if (q) query.set("q", q);
  if (maxDuration) query.set("maxDurationHours", maxDuration);
  const result = useApi<ListResponse<Tour>>(`${API_PATHS.TOURS.GET_ALL}?${query}`, previewData);
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  }
  function clearSearch() {
    setSearch("");
    update("q", "");
  }
  function showAllTours() {
    setSearch("");
    const next = new URLSearchParams();
    if (sort !== "newest") next.set("sort", sort);
    setParams(next);
  }
  return (
    <div className="page">
      <Header title="Tour & trải nghiệm" />
      <section className="page-intro">
        <span className="eyebrow">ĐẮK SONG ĐỢI BẠN</span>
        <h1>Chọn một hành trình.</h1>
        <p>Một ngày khám phá hay một đêm giữa đại ngàn?</p>
      </section>
      <form
        className="search-box search-form"
        onSubmit={(event) => {
          event.preventDefault();
          update("q", search.trim());
        }}
      >
        <Icon name="search" size={20} />
        <input
          aria-label="Tìm tên tour"
          placeholder="Tìm hành trình của bạn…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button
          type={search ? "button" : "submit"}
          className="icon-button search-submit"
          aria-label={search ? "Xóa từ khóa" : "Tìm kiếm"}
          onClick={search ? clearSearch : undefined}
        >
          <Icon name={search ? "close" : "arrow"} size={19} />
        </button>
      </form>
      <div className="chip-rail">
        <button
          className={`chip ${!theme ? "selected" : ""}`}
          onClick={() => update("theme", "")}
        >
          Tất cả
        </button>
        {Object.entries(themeLabels).map(([value, label]) => (
          <button
            key={value}
            className={`chip ${theme === value ? "selected" : ""}`}
            onClick={() => update("theme", value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="list-toolbar">
        <span>
          {result.data
            ? `${result.data.pagination.total} hành trình`
            : "Hành trình tại Đắk Song"}
        </span>
        <button
          className="text-link"
          aria-expanded={showFilters}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Icon name="filter" size={17} /> Bộ lọc
        </button>
      </div>
      {showFilters && (
        <div className="filter-panel card">
          <FilterSelect
            label="Sắp xếp"
            value={sort}
            onChange={(value) => update("sort", value)}
            options={[
              { value: "newest", label: "Mới nhất" },
              { value: "price_asc", label: "Giá tăng dần" },
              { value: "price_desc", label: "Giá giảm dần" },
              { value: "duration", label: "Thời lượng ngắn nhất" },
            ]}
          />
          <FilterSelect
            label="Thời lượng"
            value={maxDuration}
            onChange={(value) => update("maxDurationHours", value)}
            options={[
              { value: "", label: "Tất cả" },
              { value: "12", label: "Trong ngày · tối đa 12 giờ" },
              { value: "48", label: "Tối đa 2 ngày" },
              { value: "72", label: "Tối đa 3 ngày" },
            ]}
          />
        </div>
      )}
      <section className="section list-section">
        {result.loading ? (
          <LoadingState />
        ) : result.error ? (
          <ErrorState message={result.error} retry={result.retry} />
        ) : result.data?.data.length ? (
          <>
            <div className="tour-list">
              {result.data.data.map((tour) => (
                <TourCard key={tour._id} tour={tour} />
              ))}
            </div>
            {result.data.pagination.pages > 1 && (
              <div className="pagination">
                <button
                  className="button button-outline"
                  disabled={page <= 1}
                  onClick={() => update("page", String(page - 1))}
                >
                  Trước
                </button>
                <span>
                  {page} / {result.data.pagination.pages}
                </span>
                <button
                  className="button button-outline"
                  disabled={page >= result.data.pagination.pages}
                  onClick={() => update("page", String(page + 1))}
                >
                  Tiếp
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            title="Chưa tìm thấy hành trình"
            description="Thử một chủ đề hoặc từ khóa khác nhé."
          >
            <button className="button button-outline" onClick={showAllTours}>
              Xem tất cả hành trình
            </button>
          </EmptyState>
        )}
      </section>
    </div>
  );
}
