import type { Tour } from "../../types/api";
import { duration, money, themeLabels } from "../../utils/format";
import AppLink from "../common/AppLink";
import Icon from "../common/Icon";
import Photo from "../common/Photo";
import { usePreview } from "../../context/PreviewContext";
import { previewImages } from "../../data/preview";

export default function TourCard({
  tour,
  compact = false,
  saved = false,
  onToggleSaved,
}: {
  tour: Tour;
  compact?: boolean;
  saved?: boolean;
  onToggleSaved?: (e: React.MouseEvent) => void;
}) {
  const { isPreview } = usePreview();
  const displayedPrice = tour.priceFrom ?? tour.referencePrice;
  const isReferencePrice = tour.priceFrom == null && tour.referencePrice != null;
  const photo =
    isPreview && compact && tour._id === "preview-trekking"
      ? previewImages.trekking
      : tour.images?.[0]?.url;
  return (
    <AppLink
      to={`/tours/${tour._id}`}
      className={`tour-card ${compact ? "tour-card-compact" : ""}`}
    >
      <Photo src={photo} alt={tour.images?.[0]?.alt || tour.name} />
      {onToggleSaved && (
        <button
          type="button"
          className={`explore-save ${saved ? "saved" : ""}`}
          aria-label={`${saved ? "Bỏ lưu" : "Lưu"} ${tour.name}`}
          aria-pressed={saved}
          onClick={(e) => {
            e.preventDefault();
            onToggleSaved(e);
          }}
        >
          <Icon name="heart" size={16} />
        </button>
      )}
      <div className="tour-card-body">
        <h3>{tour.name}</h3>
        {!compact && (
          <div className="tour-card-tags">
            {tour.themes?.map((theme) => (
              <span className="badge" key={theme}>
                {themeLabels[theme]}
              </span>
            ))}
          </div>
        )}
        <span className="meta">
          <Icon name="clock" size={15} />
          {duration(tour.durationHours)}
        </span>
        <div className="tour-card-price">
          <span>{isReferencePrice ? "Tham khảo " : displayedPrice != null ? "Từ " : ""}</span>
          <strong>{money(displayedPrice)}</strong>
          {!compact && <Icon name="arrow" size={18} />}
        </div>
        {Boolean(tour.reviewCount) && tour.averageRating != null && (
          <span className="meta tour-card-rating">
            <Icon name="star" size={14} />
            {tour.averageRating.toFixed(1)} · {tour.reviewCount} đánh giá
          </span>
        )}
      </div>
    </AppLink>
  );
}
