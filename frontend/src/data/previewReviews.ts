import type {
  ReviewEligibility,
  ReviewListResponse,
  TourReview,
} from "../types/api";

const reviews: TourReview[] = [
  [
    5,
    "Khách mẫu 1",
    "Cung đường đẹp, lịch trình rõ ràng. Nội dung đánh giá minh họa theo thiết kế.",
  ],
  [
    5,
    "Khách mẫu 2",
    "Trải nghiệm cắm trại và ngắm bình minh rất thú vị. Đây là nhận xét mẫu.",
  ],
  [
    4,
    "Khách mẫu 3",
    "Không gian yên tĩnh, nên chuẩn bị áo ấm cho buổi sáng. Đây là nhận xét mẫu.",
  ],
  [
    5,
    "Khách mẫu 4",
    "Thích nhất phần đi bộ giữa rừng thông. Nội dung minh họa.",
  ],
  [
    5,
    "Khách mẫu 5",
    "Một hành trình gần gũi với thiên nhiên. Đây là nhận xét mẫu.",
  ],
].map(([rating, name, comment], index) => ({
  _id: "preview-review-" + index,
  rating: Number(rating),
  comment: String(comment),
  author: { name: String(name), avatar: "" },
  verifiedBooking: true,
  createdAt: new Date(Date.now() - (index + 1) * 86400000).toISOString(),
  updatedAt: new Date(Date.now() - (index + 1) * 86400000).toISOString(),
}));

export function getPreviewReviews(
  tourId: string,
  page: number,
): ReviewListResponse {
  const data = tourId === "preview-trekking" ? reviews : [];
  return {
    data: data.slice((page - 1) * 6, page * 6),
    summary: {
      averageRating: data.length ? 4.8 : null,
      reviewCount: data.length,
      distribution: {
        1: 0,
        2: 0,
        3: 0,
        4: data.length ? 1 : 0,
        5: data.length ? 4 : 0,
      },
    },
    pagination: {
      page,
      limit: 6,
      total: data.length,
      pages: data.length ? 1 : 0,
    },
  };
}
export const previewReviewEligibility: ReviewEligibility = {
  eligibleBookings: [],
  myReviews: [],
};
