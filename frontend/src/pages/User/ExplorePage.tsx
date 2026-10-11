import { useLayoutEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "../../components/layout/Header";
import AppLink from "../../components/common/AppLink";
import DestinationCard from "../../components/tour/DestinationCard";
import Icon from "../../components/common/Icon";
import Photo from "../../components/common/Photo";
import { EmptyState, ErrorState, LoadingState } from "../../components/common/States";
import { usePreview } from "../../context/PreviewContext";
import useApi from "../../hooks/useApi";
import { previewList } from "../../data/preview";
import { previewExploreDestinations, previewExploreGuides, type ExploreGuide } from "../../data/previewExplore";
import { themeLabels } from "../../utils/format";
import { catalogPage, uniqueDestinations } from "../../utils/exploreCatalog";
import { readArticleCatalog, readDestinationCatalog } from "../../utils/readCatalog";
import type { ArticleSummary, Destination, ListResponse } from "../../types/api";

type ExploreTab = "destinations" | "guides";
const articleCategories: Record<ArticleSummary["category"], string> = {
  travel_tips: "Kinh nghiệm", food: "Ẩm thực", culture: "Văn hóa", story: "Câu chuyện",
};
const scrollMemory = { api: { destinations: 0, guides: 0 }, preview: { destinations: 0, guides: 0 } };
const destinationPreview = previewList(previewExploreDestinations);

function GuideCard({ guide, featured }: { guide: ExploreGuide; featured: boolean }) {
  return <article className={`explore-guide-card ${featured ? "featured-guide" : "guide-row"}`}>
    <AppLink to={guide.href}>
      <div className="explore-guide-image"><Photo src={guide.image} alt={guide.title} eager={featured} /></div>
      <div className="explore-guide-body">
        <span className="explore-guide-category">{guide.category}</span><h3>{guide.title}</h3><p>{guide.description}</p>
        <div className="explore-guide-footer"><span>{guide.readingMinutes ? <><Icon name="clock" size={13} /> {guide.readingMinutes} phút đọc</> : "Đọc bài viết"}</span><Icon name="arrow" size={16} /></div>
      </div>
    </AppLink>
  </article>;
}

export default function ExplorePage() {
  const { isPreview } = usePreview();
  const [params, setParams] = useSearchParams();
  const tab: ExploreTab = params.get("tab") === "guides" ? "guides" : "destinations";
  const category = params.get("category") || "";
  const guideCategory = params.get("guideCategory") || "";
  const currentFilter = tab === "destinations" ? category : guideCategory;
  const requestedPage = Math.max(1, Math.floor(Number(params.get(tab === "destinations" ? "page" : "guidePage")) || 1));
  const positions = useRef(scrollMemory[isPreview ? "preview" : "api"]);
  const result = useApi<ListResponse<Destination>>("/destinations?limit=100", destinationPreview, readDestinationCatalog, tab === "destinations");
  const articles = useApi<ListResponse<ArticleSummary>>("/articles?status=published&limit=100", undefined, readArticleCatalog, tab === "guides");
  const destinations = useMemo(() => uniqueDestinations(result.data?.data || []), [result.data]);
  const guides = useMemo<ExploreGuide[]>(() => isPreview ? previewExploreGuides : (articles.data?.data || []).map(article => ({
    id: article._id, title: article.title, description: article.summary, image: article.images?.[0]?.url,
    category: articleCategories[article.category], categoryKey: article.category, href: "/articles/" + article._id,
  })), [isPreview, articles.data]);
  const destinationPage = catalogPage(destinations.filter(item => !category || item.category === category), requestedPage);
  const guidePage = catalogPage(guides.filter(item => !guideCategory || item.categoryKey === guideCategory), requestedPage);
  const pagination = tab === "destinations" ? destinationPage : guidePage;
  const loading = tab === "destinations" ? result.loading : !isPreview && articles.loading;
  const error = tab === "destinations" ? result.error : !isPreview && articles.error;
  const retry = tab === "destinations" ? result.retry : articles.retry;
  const filters = tab === "destinations" ? Object.entries(themeLabels).filter(([key]) => destinations.some(item => item.category === key)) : Object.entries(articleCategories).filter(([key]) => guides.some(item => item.categoryKey === key));
  const total = tab === "destinations" ? destinations.length : guides.length;

  useLayoutEffect(() => {
    const scroller = document.querySelector<HTMLDivElement>(".page-content");
    if (!scroller || loading) return;
    scroller.scrollTop = positions.current[tab];
    const remember = () => { positions.current[tab] = scroller.scrollTop; };
    scroller.addEventListener("scroll", remember, { passive: true });
    return () => { scroller.removeEventListener("scroll", remember); };
  }, [tab, currentFilter, requestedPage, loading]);

  function switchTab(nextTab: ExploreTab) {
    if (nextTab === tab) return;
    const scroller = document.querySelector<HTMLDivElement>(".page-content");
    if (scroller) positions.current[tab] = scroller.scrollTop;
    const next = new URLSearchParams(params); next.set("tab", nextTab); setParams(next);
  }
  function update(key: string, value: string) {
    positions.current[tab] = 0;
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key === "category") next.delete("page");
    if (key === "guideCategory") next.delete("guidePage");
    setParams(next);
  }

  return <div className="page stitch-explore">
    <Header title="Khám phá" />
    <div className="explore-subnav">
      <h1>Khám Phá Đắk Song</h1>
      <div className="explore-segments" role="tablist" aria-label="Nội dung khám phá">
        {(["destinations", "guides"] as const).map(item => <button key={item} type="button" role="tab" id={`explore-tab-${item}`} aria-selected={tab === item} aria-controls={`explore-${item}`} tabIndex={tab === item ? 0 : -1} className={tab === item ? "selected" : ""} onClick={() => switchTab(item)} onKeyDown={event => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === "Home" ? "destinations" : event.key === "End" ? "guides" : item === "destinations" ? "guides" : "destinations";
          switchTab(next); document.getElementById(`explore-tab-${next}`)?.focus();
        }}><Icon name={item === "destinations" ? "pin" : "book"} size={17} />{item === "destinations" ? "Điểm đến" : "Cẩm nang"}</button>)}
      </div>
    </div>
    <div className="explore-content">
      <section key={tab} id={`explore-${tab}`} role="tabpanel" aria-labelledby={`explore-tab-${tab}`} tabIndex={0} className="explore-panel" aria-busy={loading}>
        <div className="explore-filters" aria-label={tab === "destinations" ? "Loại điểm đến" : "Chủ đề cẩm nang"}>
          <button type="button" className={`explore-chip ${!currentFilter ? "selected" : ""}`} aria-pressed={!currentFilter} onClick={() => update(tab === "destinations" ? "category" : "guideCategory", "")}>Tất cả{!loading && !error ? ` (${total})` : ""}</button>
          {filters.map(([value, label]) => <button key={value} type="button" className={`explore-chip ${currentFilter === value ? "selected" : ""}`} aria-pressed={currentFilter === value} onClick={() => update(tab === "destinations" ? "category" : "guideCategory", value)}>{label}</button>)}
        </div>
        {!loading && !error && <div className="explore-results-heading"><h2>{tab === "destinations" ? "Ghé thăm Đắk Song" : "Cẩm nang cho hành trình"}</h2><span>{pagination.total} {tab === "destinations" ? "địa điểm" : "bài viết"}</span></div>}
        {loading ? <LoadingState /> : error ? <ErrorState message={error} retry={retry} /> : pagination.total ? <>
          {tab === "destinations" ? <div className="explore-destination-grid">{destinationPage.data.map(destination => <DestinationCard key={destination._id} variant="explore" destination={destination} />)}</div> : <div className="explore-guides">{guidePage.data.map((guide, index) => <GuideCard key={guide.id} guide={guide} featured={guidePage.page === 1 && index === 0} />)}</div>}
          {pagination.pages > 1 && <div className="pagination">
            <button className="button button-outline" disabled={pagination.page <= 1} onClick={() => update(tab === "destinations" ? "page" : "guidePage", String(pagination.page - 1))}>Trước</button><span>{pagination.page} / {pagination.pages}</span>
            <button className="button button-outline" disabled={pagination.page >= pagination.pages} onClick={() => update(tab === "destinations" ? "page" : "guidePage", String(pagination.page + 1))}>Tiếp</button>
          </div>}
        </> : <EmptyState title={tab === "destinations" ? "Chưa có điểm đến" : "Chưa có bài viết"} description={currentFilter ? "Chọn Tất cả để xem những nội dung khác." : "Nội dung đang được chuẩn bị. Bạn quay lại sau nhé."} />}
      </section>
    </div>
  </div>;
}
