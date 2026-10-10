import Header from "../../components/layout/Header";
import AppLink from "../../components/common/AppLink";
import Icon from "../../components/common/Icon";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/common/States";
import DestinationCard from "../../components/tour/DestinationCard";
import TourCard from "../../components/tour/TourCard";
import useApi from "../../hooks/useApi";
import { usePreview } from "../../context/PreviewContext";
import {
  previewHomeDestinations,
  previewHomeTours,
  previewImages,
} from "../../data/preview";
import { API_PATHS } from "../../utils/api";
import type { Destination, ListResponse, Tour } from "../../types/api";
import { useEffect, useRef } from "react";

export default function HomePage() {
  const { isPreview } = usePreview();
  const destinations = useApi<ListResponse<Destination>>(
    API_PATHS.DESTINATIONS.GET_ALL + "?limit=6",
    previewHomeDestinations,
  );
  const tours = useApi<ListResponse<Tour>>(
    API_PATHS.TOURS.GET_ALL + "?limit=4&sort=newest",
    previewHomeTours,
  );

  const sliderRef = useRef<HTMLDivElement>(null);
  const heroImages = isPreview
    ? [previewImages.hero, previewImages.forest, previewImages.camping]
    : [
        ...new Set([
          ...(tours.data?.data || []).flatMap((tour) =>
            tour.images.map((image) => image.url),
          ),
          ...(destinations.data?.data || []).flatMap((destination) =>
            destination.images.map((image) => image.url),
          ),
        ]),
      ].slice(0, 4);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    const interval = setInterval(() => {
      // Calculate next scroll position
      const maxScroll = slider.scrollWidth - slider.clientWidth;
      let nextScroll = slider.scrollLeft + slider.clientWidth;
      if (nextScroll > maxScroll - 5) {
        nextScroll = 0; // Loop back to start if at the end
      }
      slider.scrollTo({
        left: nextScroll,
        behavior: "smooth",
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page stitch-home">
      <Header title="Trang chủ" />
      <section className="home-hero">
        <div className="hero-slider" ref={sliderRef}>
          {heroImages.map((image) => (
            <div
              key={image}
              className="hero-slide"
              style={{ backgroundImage: `url(${JSON.stringify(image)})` }}
            />
          ))}
        </div>
        <div className="hero-content">
          <span className="eyebrow">VNA ĐẮK SONG</span>
          <h1>Khám Phá Đại Ngàn</h1>
          <AppLink to="/explore" className="button button-clay">
            Khám phá ngay <Icon name="arrow" size={18} />
          </AppLink>
        </div>
      </section>

      <section className="section destination-section">
        <div className="section-heading">
          <h2>Điểm đến nổi bật</h2>
          <AppLink to="/explore" className="text-link">
            Xem tất cả <Icon name="chevron" size={16} />
          </AppLink>
        </div>
        {destinations.loading ? (
          <LoadingState />
        ) : destinations.error ? (
          <ErrorState message={destinations.error} retry={destinations.retry} />
        ) : destinations.data?.data.length ? (
          <div className="destination-rail">
            {destinations.data.data.map((destination) => (
              <DestinationCard
                key={destination._id}
                destination={destination}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Điểm đến đang được cập nhật"
            description="Quay lại sau để khám phá những địa điểm mới."
          />
        )}
      </section>

      <section className="section home-tours" id="tours-section">
        <div className="section-heading">
          <h2>Tour đề xuất</h2>
          <AppLink to="/tours" className="text-link">
            Xem tất cả <Icon name="chevron" size={16} />
          </AppLink>
        </div>
        {tours.loading ? (
          <LoadingState />
        ) : tours.error ? (
          <ErrorState message={tours.error} retry={tours.retry} />
        ) : tours.data?.data.length ? (
          <div className="tour-list">
            {tours.data.data.map((tour) => (
              <TourCard key={tour._id} tour={tour} compact />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Chưa có tour được mở"
            description="VNA đang chuẩn bị những hành trình mới cho bạn."
          />
        )}
      </section>
    </div>
  );
}
