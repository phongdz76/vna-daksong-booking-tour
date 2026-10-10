import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../../../components/layout/Header";
import AppLink, { useAppNavigate } from "../../../components/common/AppLink";
import Photo from "../../../components/common/Photo";
import Icon from "../../../components/common/Icon";
import RatingStars from "../../../components/tour/RatingStars";
import TourReviews from "../../../components/tour/TourReviews";
import TourLocationMap from "../../../components/tour/TourLocationMap";
import { ErrorState, LoadingState } from "../../../components/common/States";
import { useAuth } from "../../../context/AuthContext";
import { usePreview } from "../../../context/PreviewContext";
import useApi from "../../../hooks/useApi";
import {
  previewDepartures,
  previewList,
  previewTours,
  previewImages,
} from "../../../data/preview";
import { duration, money, themeLabels } from "../../../utils/format";
import { api, API_PATHS, errorMessage } from "../../../utils/api";
import { getPreviewReviews } from "../../../data/previewReviews";
import type {
  Departure,
  ListResponse,
  ReviewListResponse,
  Tour,
} from "../../../types/api";

export default function TourDetailPage() {
  const { id } = useParams();
  const navigate = useAppNavigate();
  const { user } = useAuth();
  const { isPreview } = usePreview();
  const [imageIndex, setImageIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [reviewPage, setReviewPage] = useState(1);
  useEffect(() => setReviewPage(1), [id]);
  const reviewPreview = useMemo(
    () => getPreviewReviews(id || "", reviewPage),
    [id, reviewPage],
  );
  const reviews = useApi<ReviewListResponse>(
    API_PATHS.TOURS.REVIEWS(id!) + `?page=${reviewPage}&limit=6`,
    reviewPreview,
  );
  const tourResult = useApi<Tour>(
    "/tours/" + id,
    previewTours.find((tour) => tour._id === id),
  );
  const departurePreview = useMemo(
    () => previewList(previewDepartures.filter((item) => item.tourId === id)),
    [id],
  );
  const departures = useApi<ListResponse<Departure>>(
    "/tours/" + id + "/departures?limit=100",
    departurePreview,
  );
  const tour = tourResult.data;
  const openDepartures =
    departures.data?.data.filter(
      (d) =>
        d.status === "open" &&
        new Date(d.bookingDeadline).getTime() > Date.now() &&
        new Date(d.departureAt).getTime() > Date.now(),
    ) || [];
  const priceFrom = openDepartures.length
    ? Math.min(...openDepartures.map((d) => d.adultPrice))
    : tour?.referencePrice ?? null;
  const isSaved = saved ?? Boolean(user?.savedTours?.includes(id || ""));
  const mapLocation = [tour?.meetingPoint, "Đắk Song, Việt Nam"]
    .filter(Boolean)
    .join(", ");
  const directionsUrl =
    "https://www.google.com/maps/dir/?" +
    new URLSearchParams({
      api: "1",
      origin: "Gia Nghĩa, Việt Nam",
      destination: mapLocation,
      travelmode: "driving",
    }).toString();

  function handleBack() {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/tours");
  }
  async function handleSave() {
    if (saving) return;
    if (!user && !isPreview) {
      navigate("/login?returnTo=" + encodeURIComponent("/tours/" + id));
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      if (isPreview) setSaved(!isSaved);
      else {
        const response = await api.post<{ isSaved: boolean }>(
          "/tours/" + id + "/save",
        );
        setSaved(response.data.isSaved);
      }
    } catch (error) {
      setSaveError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page stitch-detail has-action-bar">
      <Header title="Chi tiết tour" back fallback="/tours" />
      {tourResult.loading ? (
        <LoadingState />
      ) : tourResult.error ? (
        <ErrorState message={tourResult.error} retry={tourResult.retry} />
      ) : (
        tour && (
          <>
            <div className="tour-gallery">
              <Photo
                className="detail-cover"
                src={tour.images?.[imageIndex]?.url}
                alt={tour.images?.[imageIndex]?.alt || tour.name}
                eager
              />
              <div className="gallery-float" style={{ justifyContent: "flex-end" }}>
                <button
                  className={"icon-button " + (isSaved ? "saved" : "")}
                  aria-label={isSaved ? "Bỏ lưu tour" : "Lưu tour"}
                  aria-pressed={isSaved}
                  disabled={saving}
                  onClick={handleSave}
                >
                  <Icon name={isSaved ? "heart-filled" : "heart"} size={20} />
                </button>
              </div>
              {tour.images.length > 0 && (
                <button
                  className="gallery-controls"
                  aria-label="Ảnh tiếp theo"
                  onClick={() =>
                    setImageIndex((imageIndex + 1) % tour.images.length)
                  }
                >
                  <Icon name="camera" size={14} />
                  <span>
                    {imageIndex + 1}/{tour.images.length}
                  </span>
                </button>
              )}
            </div>

            <div className="detail-sheet">
              <section className="section detail-overview">
                <div className="badge-row">
                  {isPreview && (
                    <span className="badge badge-clay">BÁN CHẠY NHẤT</span>
                  )}
                  {tour.themes.map((theme) => (
                    <span className="badge" key={theme}>
                      {isPreview && theme === "nature"
                        ? "Eco-Trekking"
                        : themeLabels[theme]}
                    </span>
                  ))}
                </div>
                <h1 className="detail-title">{tour.name}</h1>
                <button
                  type="button"
                  className="rating-line review-summary-link"
                  onClick={() =>
                    document
                      .getElementById("tour-reviews")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                >
                  {reviews.loading ? (
                    <span>Đang tải đánh giá…</span>
                  ) : reviews.error ? (
                    <span>Xem đánh giá & thử tải lại</span>
                  ) : reviews.data?.summary.reviewCount ? (
                    <>
                      <RatingStars
                        value={reviews.data.summary.averageRating || 0}
                      />
                      <strong>
                        {reviews.data.summary.averageRating?.toFixed(1)}
                      </strong>
                      <small>
                        ({reviews.data.summary.reviewCount} đánh giá)
                      </small>
                    </>
                  ) : (
                    <>
                      <RatingStars value={0} />
                      <span>Chưa có đánh giá</span>
                    </>
                  )}
                </button>
                {saveError && (
                  <p className="form-error" role="alert">
                    {saveError}
                  </p>
                )}
              </section>

              <div className="tour-facts">
                <div>
                  <Icon name="clock" />
                  <small>Thời lượng</small>
                  <strong>
                    {duration(tour.durationHours)}
                  </strong>
                </div>
                <div>
                  <Icon name="bus" />
                  <small>Phương tiện</small>
                  <strong>{isPreview ? "Xe 16 chỗ" : "VNA tư vấn"}</strong>
                </div>
                <div>
                  <Icon name="pin" />
                  <small>Tập trung</small>
                  <strong title={tour.meetingPoint}>{tour.meetingPoint}</strong>
                </div>
              </div>

              <section className="section detail-section">
                <h2>
                  <Icon name="compass" size={20} />
                  Tổng quan trải nghiệm
                </h2>
                <p
                  className={"prose " + (!expanded ? "overview-collapsed" : "")}
                >
                  {tour.description}
                </p>
                <button
                  className="text-link overview-toggle"
                  aria-expanded={expanded}
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? "Thu gọn" : "Xem thêm"}{" "}
                  <Icon name="chevron" size={14} />
                </button>
              </section>

              <section className="section detail-section">
                <div className="detail-section-heading">
                  <h2>
                    <Icon name="calendar" size={20} />
                    Lịch trình chi tiết
                  </h2>
                  <span>{tour.itinerary.length} chặng chính</span>
                </div>
                <ol className="itinerary">
                  {tour.itinerary.map((stop, index) => {
                    const time = stop.title.match(
                      /^(\d{2}:\d{2})\s*[·\-]\s*(.+)$/,
                    );
                    return (
                      <li key={index}>
                        <span className="itinerary-number">
                          <Icon
                            name={
                              ["people", "leaf", "coffee", "mountain"][
                                index % 4
                              ]
                            }
                            size={14}
                          />
                        </span>
                        <div>
                          <h3>
                            {time ? (
                              <>
                                <time>{time[1]}</time>
                                {time[2]}
                              </>
                            ) : (
                              stop.title
                            )}
                          </h3>
                          <p>{stop.description}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>

              {!isPreview && (tour.routeDestinations?.length || 0) > 0 ? <TourLocationMap tour={tour} /> : <section className="section detail-section tour-location">
                <div className="tour-location-heading">
                  <h2>
                    <Icon name="map" size={20} />
                    Vị trí & Cung đường
                  </h2>
                  <span>
                    {isPreview ? "Huyện Đắk Song, Đắk Nông" : tour.meetingPoint || "Đắk Song"}
                  </span>
                </div>
                <div className="tour-location-map">
                  {isPreview ? (
                    <img
                      src={previewImages.mapPreview}
                      alt="Bản đồ khu vực Đắk Song minh họa theo thiết kế"
                      loading="lazy"
                    />
                  ) : (
                    <iframe
                      key={mapLocation}
                      title={`Bản đồ điểm tập trung: ${tour.meetingPoint || "Đắk Song"}`}
                      src={`https://maps.google.com/maps?${new URLSearchParams({ q: mapLocation, z: "12", t: "p", hl: "vi", output: "embed" })}`}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      allowFullScreen
                    />
                  )}
                  <a
                    className={`tour-location-route${isPreview ? " is-preview" : ""}`}
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Xem chỉ đường từ TP. Gia Nghĩa đến ${tour.meetingPoint || "Đắk Song"} trên Google Maps`}
                  >
                    <Icon name="navigation" size={18} />
                    {isPreview ? "Cách TP. Gia Nghĩa ~35km" : "Chỉ đường từ TP. Gia Nghĩa"}
                  </a>
                </div>
              </section>}

              <section className="section detail-section">
                <h2>
                  <Icon name="shield" size={20} />
                  Điều khoản & dịch vụ
                </h2>
                {tour.sources?.length ? (
                  <details className="policy">
                    <summary>Nguồn tham khảo lịch trình</summary>
                    {tour.sources.map((source) => (
                      <p key={source.url}>
                        {/^https:\/\//.test(source.url) ? (
                          <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>
                        ) : source.title}
                      </p>
                    ))}
                  </details>
                ) : null}
                <details className="policy">
                  <summary>
                    <span>
                      <Icon name="check" size={20} />
                      Bao gồm & chưa bao gồm
                    </span>
                  </summary>
                  <ul className="included-list">
                    {tour.includes.map((item) => (
                      <li key={item}>
                        <Icon name="check" size={16} />
                        {item}
                      </li>
                    ))}
                  </ul>
                  {tour.excludes.length > 0 && (
                    <>
                      <h4>Chưa bao gồm</h4>
                      <ul className="included-list excluded">
                        {tour.excludes.map((item) => (
                          <li key={item}>
                            <Icon name="minus" size={16} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </details>
                <details className="policy">
                  <summary>
                    <span>
                      <Icon name="orders" size={20} />
                      Chính sách hoàn hủy
                    </span>
                  </summary>
                  <p>{tour.cancellationPolicy}</p>
                </details>
                {tour.childPolicy && (
                  <details className="policy">
                    <summary>
                      <span>
                        <Icon name="people" size={20} />
                        Chính sách trẻ em
                      </span>
                    </summary>
                    <p>{tour.childPolicy}</p>
                  </details>
                )}
                {departures.error && (
                  <ErrorState
                    message={departures.error}
                    retry={departures.retry}
                  />
                )}
                {!departures.loading &&
                  !departures.error &&
                  openDepartures.length === 0 && (
                    <div className="notice">
                      <Icon name="info" />
                      <p>
                        Tour chưa có chuyến đang mở. Bạn có thể quay lại để xem
                        lịch mới.
                        {tour.referencePriceNote && <> {tour.referencePriceNote}</>}
                      </p>
                    </div>
                  )}
              </section>
              <TourReviews
                key={id}
                tourId={id!}
                result={reviews}
                page={reviewPage}
                setPage={setReviewPage}
              />
            </div>

            <div className="action-bar detail-action">
              <div>
                <small>Từ</small>
                <strong>
                  {departures.loading ? "Đang tải…" : money(priceFrom)}
                </strong>
                <span>/ khách</span>
              </div>
              {openDepartures.length > 0 ? (
                <AppLink
                  className="button button-primary"
                  to={"/booking/" + id + "/select"}
                >
                  Đặt tour ngay <Icon name="arrow" size={20} />
                </AppLink>
              ) : (
                <button className="button button-primary" disabled>
                  Chưa có lịch
                </button>
              )}
            </div>
          </>
        )
      )}
    </div>
  );
}
