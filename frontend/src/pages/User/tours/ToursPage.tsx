import { API_PATHS } from "../../../utils/api";
import { useMemo, useState } from "react";
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
          t.name.toLocaleLowerCase("vi").includes(q.toLocaleLowerCase("vi"))) &&
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
        <button type="submit" className="icon-button" aria-label="Tìm kiếm">
          <Icon name="arrow" size={19} />
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
          <label>
            Sắp xếp
            <select
              value={sort}
              onChange={(event) => update("sort", event.target.value)}
            >
              <option value="newest">Mới nhất</option>
              <option value="price_asc">Giá tăng dần</option>
              <option value="price_desc">Giá giảm dần</option>
              <option value="duration">Thời lượng ngắn nhất</option>
            </select>
          </label>
          <label>
            Thời lượng
            <select
              value={maxDuration}
              onChange={(event) =>
                update("maxDurationHours", event.target.value)
              }
            >
              <option value="">Tất cả</option>
              <option value="12">Trong ngày · tối đa 12 giờ</option>
              <option value="48">Tối đa 2 ngày</option>
              <option value="72">Tối đa 3 ngày</option>
            </select>
          </label>
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
          />
        )}
      </section>
    </div>
  );
}


