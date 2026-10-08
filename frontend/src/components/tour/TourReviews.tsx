import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import AppLink from "../common/AppLink";
import Icon from "../common/Icon";
import { ErrorState, LoadingState } from "../common/States";
import RatingStars from "./RatingStars";
import useApi from "../../hooks/useApi";
import { useAuth } from "../../context/AuthContext";
import { usePreview } from "../../context/PreviewContext";
import { previewReviewEligibility } from "../../data/previewReviews";
import { api, API_PATHS, errorMessage } from "../../utils/api";
import { dateTime } from "../../utils/format";
import type {
  OwnReview,
  ReviewEligibility,
  ReviewListResponse,
} from "../../types/api";

const ratingLabels = ["Rất kém", "Chưa tốt", "Tạm ổn", "Tốt", "Rất tốt"];

export default function TourReviews({
  tourId,
  result,
  page,
  setPage,
}: {
  tourId: string;
  result: {
    data: ReviewListResponse | null;
    loading: boolean;
    error: string;
    retry: () => void;
  };
  page: number;
  setPage: (page: number) => void;
}) {
  const { user } = useAuth();
  const { isPreview } = usePreview();
  const [params] = useSearchParams();
  const requestedBooking = params.get("reviewBookingId");
  const eligibility = useApi<ReviewEligibility>(
    user ? API_PATHS.TOURS.REVIEW_ELIGIBILITY(tourId) : null,
    previewReviewEligibility,
  );
  const [editing, setEditing] = useState<OwnReview | null>(null);
  const [bookingId, setBookingId] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const sending = useRef(false);
  const scrolled = useRef(false);
  const eligibleBookings = eligibility.data?.eligibleBookings || [];
  const myReviews = eligibility.data?.myReviews || [];
  const selectedBooking =
    eligibleBookings.find((booking) => booking._id === bookingId) ||
    eligibleBookings.find((booking) => booking._id === requestedBooking) ||
    eligibleBookings[0];
  const summary = result.data?.summary;
  const returnTo =
    "/tours/" +
    tourId +
    (requestedBooking
      ? "?reviewBookingId=" + encodeURIComponent(requestedBooking)
      : "");

  useEffect(() => {
    if (
      requestedBooking &&
      !eligibility.loading &&
      !result.loading &&
      !scrolled.current
    ) {
      scrolled.current = true;
      document
        .getElementById("tour-reviews")
        ?.scrollIntoView({ block: "start" });
    }
  }, [requestedBooking, eligibility.loading, result.loading]);

  useEffect(() => {
    if (!result.loading && result.data) {
      const lastPage = Math.max(1, result.data.pagination.pages);
      if (page > lastPage) setPage(lastPage);
    }
  }, [result.loading, result.data, page, setPage]);

  function editReview(review: OwnReview) {
    setEditing(review);
    setRating(review.rating);
    setComment(review.comment);
    setDeletingId(null);
    setError("");
    setSuccess("");
  }

  function refreshReviews() {
    result.retry();
    eligibility.retry();
    setPage(1);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (
      sending.current ||
      isPreview ||
      !user ||
      !comment.trim() ||
      (!editing && !selectedBooking)
    )
      return;
    sending.current = true;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      if (editing)
        await api.patch(API_PATHS.REVIEWS.GET_BY_ID(editing._id), {
          rating,
          comment: comment.trim(),
        });
      else
        await api.post(API_PATHS.TOURS.REVIEWS(tourId), {
          bookingId: selectedBooking._id,
          rating,
          comment: comment.trim(),
        });
      setSuccess(
        editing
          ? "Đã cập nhật đánh giá của bạn."
          : "Cảm ơn bạn! Đánh giá đã được gửi.",
      );
      setEditing(null);
      setRating(5);
      setComment("");
      refreshReviews();
    } catch (error) {
      setError(errorMessage(error));
      if (axios.isAxiosError(error) && error.response?.status === 409)
        refreshReviews();
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  async function handleDelete(reviewId: string) {
    if (sending.current || isPreview) return;
    sending.current = true;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await api.delete(API_PATHS.REVIEWS.GET_BY_ID(reviewId));
      if (editing?._id === reviewId) {
        setEditing(null);
        setComment("");
        setRating(5);
      }
      setDeletingId(null);
      setSuccess("Đã xóa đánh giá.");
      refreshReviews();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="section detail-section tour-reviews" id="tour-reviews">
      <h2>
        <Icon name="star" size={20} />
        Đánh giá từ khách
      </h2>
      {isPreview && (
        <p className="review-preview-note">
          Nhận xét minh họa, không phải đánh giá từ khách thật.
        </p>
      )}
      {result.loading ? (
        <LoadingState />
      ) : result.error ? (
        <ErrorState message={result.error} retry={result.retry} />
      ) : (
        summary && (
          <>
            <div className="review-summary">
              <div className="review-summary-score">
                <strong>
                  {summary.averageRating == null
                    ? "—"
                    : summary.averageRating.toFixed(1)}
                  <small>/5</small>
                </strong>
                <RatingStars value={summary.averageRating || 0} size={18} />
                <span>{summary.reviewCount} đánh giá</span>
              </div>
              <div className="review-distribution">
                {[5, 4, 3, 2, 1].map((star) => (
                  <div key={star}>
                    <span>
                      {star}
                      <Icon name="star" size={11} />
                    </span>
                    <i>
                      <b
                        style={{
                          width:
                            (summary.reviewCount
                              ? ((summary.distribution[star] || 0) /
                                  summary.reviewCount) *
                                100
                              : 0) + "%",
                        }}
                      />
                    </i>
                    <small>{summary.distribution[star] || 0}</small>
                  </div>
                ))}
              </div>
            </div>
            {result.data?.data.length ? (
              <div className="review-list">
                {result.data.data.map((review) => (
                  <article className="review-card" key={review._id}>
                    <div className="review-author">
                      <span className="review-avatar">
                        {review.author.avatar ? (
                          <img src={review.author.avatar} alt="" />
                        ) : (
                          review.author.name.slice(0, 1).toUpperCase()
                        )}
                      </span>
                      <div>
                        <strong>{review.author.name}</strong>
                        <span>
                          {review.verifiedBooking && (
                            <>
                              <Icon name="shield" size={12} />
                              {isPreview ? "Chuyến đi mẫu" : "Đã tham gia tour"}
                            </>
                          )}
                        </span>
                      </div>
                      <time dateTime={review.createdAt}>
                        {dateTime(review.createdAt, false)}
                      </time>
                    </div>
                    <RatingStars value={review.rating} size={14} />
                    <p>{review.comment}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="review-empty">
                <Icon name="chat" size={26} />
                <p>
                  Tour chưa có đánh giá. Chia sẻ trải nghiệm sau khi chuyến đi
                  của bạn hoàn thành nhé.
                </p>
              </div>
            )}
            {result.data && result.data.pagination.pages > 1 && (
              <div className="pagination">
                <button
                  type="button"
                  className="button button-outline"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Trước
                </button>
                <span>
                  {page} / {result.data.pagination.pages}
                </span>
                <button
                  type="button"
                  className="button button-outline"
                  disabled={page >= result.data.pagination.pages}
                  onClick={() => setPage(page + 1)}
                >
                  Tiếp
                </button>
              </div>
            )}
          </>
        )
      )}

      <div className="review-write">
        <h3>
          {editing ? "Sửa đánh giá của bạn" : "Chia sẻ trải nghiệm của bạn"}
        </h3>
        {!user || isPreview ? (
          <div className="review-login">
            <p>
              Khách đã hoàn thành chuyến đi có thể đánh giá từ đơn của mình.
            </p>
            {isPreview ? (
              <a
                className="text-link"
                href={"/login?returnTo=" + encodeURIComponent(returnTo)}
              >
                Đăng nhập thử với API <Icon name="arrow" size={16} />
              </a>
            ) : (
              <AppLink
                className="text-link"
                to={"/login?returnTo=" + encodeURIComponent(returnTo)}
              >
                Đăng nhập để đánh giá <Icon name="arrow" size={16} />
              </AppLink>
            )}
          </div>
        ) : eligibility.loading ? (
          <LoadingState />
        ) : eligibility.error ? (
          <ErrorState message={eligibility.error} retry={eligibility.retry} />
        ) : (
          <>
            {myReviews.length > 0 && (
              <div className="my-reviews">
                <h4>Đánh giá đã gửi</h4>
                {myReviews.map((review) => (
                  <div className="my-review" key={review._id}>
                    <RatingStars value={review.rating} size={14} />
                    <p>{review.comment}</p>
                    <div className="review-owner-actions">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => editReview(review)}
                      >
                        Sửa đánh giá
                      </button>
                      <button
                        type="button"
                        className="danger"
                        disabled={busy}
                        onClick={() => setDeletingId(review._id)}
                      >
                        Xóa
                      </button>
                    </div>
                    {deletingId === review._id && (
                      <div className="delete-review-confirm">
                        <p>Xóa đánh giá này?</p>
                        <button
                          type="button"
                          className="button button-danger"
                          disabled={busy}
                          onClick={() => handleDelete(review._id)}
                        >
                          {busy ? "Đang xóa…" : "Xác nhận xóa"}
                        </button>
                        <button
                          type="button"
                          className="button button-outline"
                          disabled={busy}
                          onClick={() => setDeletingId(null)}
                        >
                          Giữ đánh giá
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {editing || eligibleBookings.length ? (
              <form className="review-form" onSubmit={handleSubmit}>
                <fieldset disabled={busy}>
                  {!editing && (
                    <label>
                      Chuyến đi đã hoàn thành
                      <select
                        name="reviewBookingId"
                        value={selectedBooking?._id || ""}
                        onChange={(event) => setBookingId(event.target.value)}
                      >
                        {eligibleBookings.map((booking) => (
                          <option value={booking._id} key={booking._id}>
                            {booking.code} ·{" "}
                            {dateTime(booking.departureAt, false)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <div
                    className="review-rating-picker"
                    role="radiogroup"
                    aria-label="Số sao đánh giá"
                  >
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        role="radio"
                        aria-label={star + " sao"}
                        aria-checked={rating === star}
                        tabIndex={rating === star ? 0 : -1}
                        className={star <= rating ? "selected" : ""}
                        key={star}
                        onClick={() => setRating(star)}
                        onKeyDown={(event) => {
                          if (
                            [
                              "ArrowLeft",
                              "ArrowDown",
                              "ArrowRight",
                              "ArrowUp",
                            ].includes(event.key)
                          ) {
                            event.preventDefault();
                            const next = Math.max(
                              1,
                              Math.min(
                                5,
                                rating +
                                  (["ArrowRight", "ArrowUp"].includes(event.key)
                                    ? 1
                                    : -1),
                              ),
                            );
                            setRating(next);
                            event.currentTarget.parentElement
                              ?.querySelectorAll<HTMLButtonElement>("button")
                              [next - 1]?.focus();
                          }
                        }}
                      >
                        <Icon name="star" size={30} />
                      </button>
                    ))}
                    <span>{ratingLabels[rating - 1]}</span>
                  </div>
                  <label htmlFor="review-comment">
                    Nhận xét của bạn
                    <textarea
                      id="review-comment"
                      name="comment"
                      rows={4}
                      required
                      maxLength={2000}
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      placeholder="Chia sẻ điều bạn thích hoặc điều VNA có thể cải thiện…"
                    />
                  </label>
                  <small className="review-character-count">
                    {comment.length}/2000 ký tự
                  </small>
                  <div className="review-form-actions">
                    <button
                      className="button button-primary"
                      type="submit"
                      disabled={busy || !comment.trim()}
                    >
                      {busy
                        ? "Đang gửi…"
                        : editing
                          ? "Lưu thay đổi"
                          : "Gửi đánh giá"}
                    </button>
                    {editing && (
                      <button
                        type="button"
                        className="button button-outline"
                        onClick={() => {
                          setEditing(null);
                          setComment("");
                          setRating(5);
                        }}
                      >
                        Hủy sửa
                      </button>
                    )}
                  </div>
                </fieldset>
              </form>
            ) : (
              <p className="review-eligibility-note">
                {myReviews.length
                  ? "Các chuyến đã hoàn thành của bạn đã được đánh giá."
                  : "Bạn chưa có đơn hoàn thành đủ điều kiện đánh giá tour này."}{" "}
                <AppLink className="text-link" to="/my-bookings">
                  Xem đơn của tôi <Icon name="chevron" size={14} />
                </AppLink>
              </p>
            )}
          </>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="review-success" role="status">
            {success}
          </p>
        )}
      </div>
    </section>
  );
}
