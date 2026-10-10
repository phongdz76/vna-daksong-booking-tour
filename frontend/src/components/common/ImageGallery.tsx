import { useState } from "react";
import Photo from "./Photo";
import Icon from "./Icon";
import type { ImageAsset } from "../../types/api";

export interface ImageGalleryProps {
  images: ImageAsset[];
  title?: string;
  className?: string;
}

export default function ImageGallery({
  images,
  title,
  className = "",
}: ImageGalleryProps) {
  const [viewMode, setViewMode] = useState<"grid" | "slider">("grid");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [sliderIndex, setSliderIndex] = useState(0);

  if (!images || images.length === 0) return null;

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const nextLightbox = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % images.length);
    }
  };

  const prevLightbox = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + images.length) % images.length);
    }
  };

  return (
    <div className={`vna-gallery-wrapper ${className}`}>
      {/* Gallery Header Bar with controls */}
      {images.length > 1 && (
        <div className="vna-gallery-toolbar">
          <span className="vna-gallery-count">
            <Icon name="camera" size={15} />
            <span>Bộ ảnh ({images.length})</span>
          </span>
          <div className="vna-gallery-toggle">
            <button
              type="button"
              className={`vna-gallery-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
              aria-label="Xem dạng lưới 2 cột"
            >
              <Icon name="grid" size={14} />
              <span>Lưới 2 cột</span>
            </button>
            <button
              type="button"
              className={`vna-gallery-btn ${viewMode === "slider" ? "active" : ""}`}
              onClick={() => setViewMode("slider")}
              aria-label="Xem dạng trượt ngang"
            >
              <Icon name="arrow" size={14} />
              <span>Trượt</span>
            </button>
          </div>
        </div>
      )}

      {/* Grid Mode Layout */}
      {viewMode === "grid" ? (
        <div className={`vna-gallery-grid ${images.length === 1 ? "single-image" : ""}`}>
          {images.map((img, idx) => {
            const isFeatured = idx === 0 && images.length > 1 && images.length % 2 !== 0;
            return (
              <figure
                key={img.url || idx}
                className={`vna-gallery-card ${isFeatured ? "featured" : ""}`}
                onClick={() => openLightbox(idx)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && openLightbox(idx)}
              >
                <div className="vna-gallery-photo-box">
                  <Photo
                    className="vna-gallery-photo"
                    src={img.url}
                    alt={img.alt || title || `Ảnh du lịch Đắk Song ${idx + 1}`}
                    hideOnError
                  />
                  <div className="vna-gallery-hover-overlay">
                    <span className="vna-gallery-zoom-tag">
                      <Icon name="search" size={14} />
                      <span>Phóng to</span>
                    </span>
                  </div>
                </div>
                {img.alt && (
                  <figcaption className="vna-gallery-caption">{img.alt}</figcaption>
                )}
              </figure>
            );
          })}
        </div>
      ) : (
        /* Slider Mode Layout */
        <div className="vna-gallery-slider-box">
          <div
            className="vna-gallery-slider"
            onScroll={(e) => {
              const el = e.currentTarget;
              if (el.clientWidth > 0) {
                const index = Math.round(el.scrollLeft / (el.clientWidth * 0.85));
                setSliderIndex(Math.min(Math.max(0, index), images.length - 1));
              }
            }}
          >
            {images.map((img, idx) => (
              <figure
                key={img.url || idx}
                className="vna-gallery-slide-card"
                onClick={() => openLightbox(idx)}
              >
                <Photo
                  className="vna-gallery-slide-photo"
                  src={img.url}
                  alt={img.alt || title || `Ảnh du lịch Đắk Song ${idx + 1}`}
                  hideOnError
                />
                {img.alt && (
                  <figcaption className="vna-gallery-caption">{img.alt}</figcaption>
                )}
              </figure>
            ))}
          </div>
          {/* Pagination Indicators */}
          <div className="vna-gallery-dots">
            {images.map((_, idx) => (
              <span
                key={idx}
                className={`vna-gallery-dot ${idx === sliderIndex ? "active" : ""}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {lightboxIndex !== null && (
        <div className="vna-lightbox-portal" onClick={closeLightbox}>
          <div className="vna-lightbox-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="vna-lightbox-header">
              <span className="vna-lightbox-counter">
                <Icon name="camera" size={16} />
                {lightboxIndex + 1} / {images.length}
              </span>
              <button
                type="button"
                className="vna-lightbox-close"
                onClick={closeLightbox}
                aria-label="Đóng ảnh"
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="vna-lightbox-body">
              {images.length > 1 && (
                <button
                  type="button"
                  className="vna-lightbox-arrow prev"
                  onClick={prevLightbox}
                  aria-label="Ảnh trước"
                >
                  <Icon name="back" size={24} />
                </button>
              )}
              <div className="vna-lightbox-img-wrap">
                <img
                  src={images[lightboxIndex]?.url}
                  alt={images[lightboxIndex]?.alt || title || `Ảnh ${lightboxIndex + 1}`}
                  className="vna-lightbox-img"
                />
              </div>
              {images.length > 1 && (
                <button
                  type="button"
                  className="vna-lightbox-arrow next"
                  onClick={nextLightbox}
                  aria-label="Ảnh tiếp"
                >
                  <Icon name="chevron" size={24} />
                </button>
              )}
            </div>
            {images[lightboxIndex]?.alt && (
              <div className="vna-lightbox-footer">
                <p>{images[lightboxIndex].alt}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
