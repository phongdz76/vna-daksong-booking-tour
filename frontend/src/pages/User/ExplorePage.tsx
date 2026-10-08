import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "../../components/layout/Header";
import AppLink from "../../components/common/AppLink";
import DestinationCard from "../../components/tour/DestinationCard";
import Icon from "../../components/common/Icon";
import Photo from "../../components/common/Photo";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/common/States";
import { usePreview } from "../../context/PreviewContext";
import useApi from "../../hooks/useApi";
import { previewList } from "../../data/preview";
import {
  previewExploreDestinations,
  previewExploreGuides,
  type ExploreGuide,
} from "../../data/previewExplore";
import { API_PATHS } from "../../utils/api";
import { themeLabels } from "../../utils/format";
import {
  readDestinationBookmarks,
  storeDestinationBookmarks,
} from "../../utils/zalo";
import type {
  ArticleSummary,
  Destination,
  ListResponse,
} from "../../types/api";

export default function ExplorePage() {
  const { isPreview } = usePreview();
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "";
  const group = params.get("group") || "";
  const tab = params.get("tab") === "guides" ? "guides" : "destinations";
  const page = Number(params.get("page")) || 1;
  const bookmarkKey = `vna-destinations-${isPreview ? "preview" : "api"}`;
  const [saved, setSaved] = useState(() =>
    readDestinationBookmarks(bookmarkKey),
  );
  const [bookmarkMessage, setBookmarkMessage] = useState("");
  const [expandedGuide, setExpandedGuide] = useState("");
  const previewData = useMemo(
    () =>
      previewList(
        previewExploreDestinations.filter(
          (destination) =>
            (!category || destination.category === category) &&
            (!group || destination.group === group),
        ),
      ),
    [category, group],
  );
  const result = useApi<ListResponse<Destination>>(
    `${API_PATHS.DESTINATIONS.GET_ALL}?limit=8&page=${page}${category ? `&category=${encodeURIComponent(category)}` : ""}`,
    previewData,
  );
  const articles = useApi<ListResponse<ArticleSummary>>(
    "/articles?status=published&limit=100",
  );
  const articleCategories = {
    culture: "Văn hóa",
    food: "Ẩm thực",
    travel_tips: "Cẩm nang",
    story: "Câu chuyện",
  };
  const guides: ExploreGuide[] = isPreview
    ? previewExploreGuides
    : (articles.data?.data || []).map((article) => ({
        id: article._id,
        title: article.title,
        description: article.summary,
        image: article.images?.[0]?.url,
        category: articleCategories[article.category] || "Bài viết",
        href: "/articles/" + article._id,
      }));

  const requestedTab = params.get("tab");
  useEffect(() => {
    if (!requestedTab) return;
    document
      .getElementById(`explore-${tab}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [tab, requestedTab, result.loading, articles.loading]);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page" && key !== "tab") next.delete("page");
    setParams(next);
  }
  function toggleSaved(destination: Destination) {
    const exists = saved.includes(destination._id);
    const next = exists
      ? saved.filter((id) => id !== destination._id)
      : [...saved, destination._id];
    setSaved(next);
    storeDestinationBookmarks(bookmarkKey, next);
    setBookmarkMessage(
      `${exists ? "Đã bỏ lưu" : "Đã lưu"} ${destination.name}.`,
    );
  }
  const filters = isPreview
    ? [
        ["clouds-pine", "Săn mây & Rừng thông"],
        ["wind-coffee", "Cánh đồng gió & Cà phê"],
      ]
    : Object.entries(themeLabels);
  const filterKey = isPreview ? "group" : "category";
  const currentFilter = isPreview ? group : category;
  return (
    <div className="page stitch-explore">
      <Header title="Khám phá" />
      <div className="explore-subnav">
        <h1>Khám Phá Đắk Song</h1>
        <div className="explore-segments" aria-label="Nội dung khám phá">
          <button
            type="button"
            className={tab === "destinations" ? "selected" : ""}
            aria-pressed={tab === "destinations"}
            onClick={() => update("tab", "destinations")}
          >
            <Icon name="pin" size={16} /> Điểm đến
          </button>
          <button
            type="button"
            className={tab === "guides" ? "selected" : ""}
            aria-pressed={tab === "guides"}
            onClick={() => update("tab", "guides")}
          >
            <Icon name="book" size={16} /> Cẩm nang
          </button>
        </div>
      </div>
      <div className="explore-content">
        <section id="explore-destinations" aria-label="Điểm đến Đắk Song">
          <div className="explore-filters">
            <button
              type="button"
              className={`explore-chip ${!currentFilter ? "selected" : ""}`}
              aria-pressed={!currentFilter}
              onClick={() => update(filterKey, "")}
            >
              Tất cả
              {!currentFilter && result.data
                ? ` (${result.data.pagination.total})`
                : ""}
            </button>
            {filters.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`explore-chip ${currentFilter === value ? "selected" : ""}`}
                aria-pressed={currentFilter === value}
                onClick={() => update(filterKey, value)}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="sr-only" role="status">
            {bookmarkMessage}
          </p>
          {result.loading ? (
            <LoadingState />
          ) : result.error ? (
            <ErrorState message={result.error} retry={result.retry} />
          ) : result.data?.data.length ? (
            <>
              <div className="explore-destination-grid">
                {result.data.data.map((destination) => {
                  const preview = isPreview
                    ? previewExploreDestinations.find(
                        (item) => item._id === destination._id,
                      )
                    : undefined;
                  return (
                    <DestinationCard
                      key={destination._id}
                      variant="explore"
                      destination={destination}
                      distanceKm={preview?.distanceKm}
                      featured={preview?.featured}
                    />
                  );
                })}
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
              title="Chưa có điểm đến"
              description="Thử khám phá một chủ đề khác."
            />
          )}
        </section>
        <section
          id="explore-guides"
          className="explore-guides"
          aria-label="Cẩm nang du lịch"
        >
          <div className="explore-section-heading">
            <div>
              <h2>Cẩm nang du lịch</h2>
              <p>
                {isPreview
                  ? "Bí kíp vi vu bản địa từ thiết kế Stitch"
                  : "Thông tin chuẩn bị trước khi ghé điểm đến"}
              </p>
            </div>
            <Icon name="book" size={22} />
          </div>
          {articles.loading && !isPreview ? (
            <LoadingState />
          ) : articles.error && !isPreview ? (
            <ErrorState message={articles.error} retry={articles.retry} />
          ) : guides.length ? (
            guides.map((guide) => (
              <article className="explore-guide-card" key={guide.id}>
                <div className="explore-guide-image">
                  <Photo src={guide.image} alt={guide.title} />
                  <span>
                    <Icon
                      name={
                        guide.category === "Ẩm thực vùng cao"
                          ? "coffee"
                          : "mountain"
                      }
                      size={14}
                    />
                    {guide.category}
                  </span>
                </div>
                <div className="explore-guide-body">
                  <h3>{guide.title}</h3>
                  <p
                    id={`guide-content-${guide.id}`}
                    className={expandedGuide === guide.id ? "expanded" : ""}
                  >
                    {guide.description}
                  </p>
                  <div className="explore-guide-footer">
                    <span>
                      {guide.readingMinutes && (
                        <>
                          <Icon name="clock" size={15} />
                          {guide.readingMinutes} phút đọc
                        </>
                      )}
                    </span>
                    {guide.href ? (
                      <AppLink to={guide.href}>
                        Đọc tiếp <Icon name="arrow" size={16} />
                      </AppLink>
                    ) : (
                      <button
                        type="button"
                        aria-expanded={expandedGuide === guide.id}
                        aria-controls={`guide-content-${guide.id}`}
                        onClick={() =>
                          setExpandedGuide(
                            expandedGuide === guide.id ? "" : guide.id,
                          )
                        }
                      >
                        {expandedGuide === guide.id ? "Thu gọn" : "Đọc tiếp"}
                        <Icon name="arrow" size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))
          ) : (
            <EmptyState
              title="Cẩm nang đang được chuẩn bị"
              description="Các lưu ý tham quan sẽ xuất hiện khi được cập nhật."
            />
          )}
        </section>
        {isPreview && (
          <aside className="explore-weather">
            <div>
              <small>KHÍ HẬU MINH HỌA</small>
              <h2>21°C · Mát mẻ trong lành</h2>
              <p>Lý tưởng để trekking rừng thông & check-in cối xay gió</p>
            </div>
            <span>
              <Icon name="sun" size={32} />
            </span>
          </aside>
        )}
      </div>
    </div>
  );
}
