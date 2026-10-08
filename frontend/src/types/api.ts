export interface ImageAsset {
  url: string;
  alt?: string;
  credit?: string;
}
export type Theme = "nature" | "culture" | "food" | "history";
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}
export interface ListResponse<T> {
  data: T[];
  pagination: Pagination;
}
export interface ArticleSummary {
  _id: string;
  title: string;
  summary: string;
  category: "culture" | "food" | "travel_tips" | "story";
  images: ImageAsset[];
}
export interface Tour {
  _id: string;
  name: string;
  slug: string;
  summary: string;
  description?: string;
  durationHours: number;
  themes: Theme[];
  images: ImageAsset[];
  meetingPoint: string;
  itinerary: { title: string; description: string }[];
  includes: string[];
  excludes: string[];
  childPolicy: string;
  cancellationPolicy: string;
  priceFrom?: number | null;
  averageRating?: number | null;
  reviewCount?: number;
}
export interface Destination {
  _id: string;
  name: string;
  summary: string;
  description?: string;
  category: Theme;
  address: string;
  images: ImageAsset[];
  visitNotes?: string;
  sources?: { title?: string; url: string }[];
}
export interface Departure {
  _id: string;
  tourId: string;
  departureAt: string;
  bookingDeadline: string;
  adultPrice: number;
  childPrice: number | null;
  maxGuestsPerBooking: number;
  status: "open" | "closed";
}
export interface User {
  _id: string;
  name: string;
  avatar?: string;
  role: "user" | "admin";
  membershipTier: string;
  loyaltyPoints: number;
  savedTours: string[];
}
export interface Quote {
  departureId: string;
  adults: number;
  children: number;
  tourName: string;
  departureAt: string;
  meetingPoint: string;
  adultPrice: number;
  childPrice: number | null;
  subTotal: number;
  discountAmount: number;
  appliedCoupon: string | null;
  total: number;
  cancellationPolicy: string;
  childPolicy: string;
  durationHours: number;
  quoteToken: string;
  expiresAt: string;
  message: string;
}
export interface Booking {
  _id: string;
  code: string;
  tourId: string;
  departureId: string;
  adults: number;
  children: number;
  contact: { name: string; phone: string };
  note: string;
  snapshot: Omit<
    Quote,
    | "quoteToken"
    | "expiresAt"
    | "message"
    | "departureId"
    | "adults"
    | "children"
  >;
  status:
    | "pending_confirmation"
    | "confirmed"
    | "completed"
    | "cancelled"
    | "rejected";
  paymentStatus: "unpaid" | "paid" | "refund_pending" | "refunded";
  paymentMethod: "cash_on_arrival" | "qr_transfer" | "zalopay";
  history?: { status: string; at: string; reason?: string }[];
  createdAt?: string;
  updatedAt?: string;
}

export interface BookingPayment {
  appTransId: string;
  status: "pending" | "success" | "failed" | "refund_pending" | "refunded";
}
export interface BookingDetailResponse {
  data: Booking;
  payments?: BookingPayment[];
}

export interface TourReview {
  _id: string;
  rating: number;
  comment: string;
  author: { name: string; avatar: string };
  verifiedBooking: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface OwnReview extends TourReview {
  bookingId: string;
}
export interface ReviewSummary {
  averageRating: number | null;
  reviewCount: number;
  distribution: Record<string, number>;
}
export interface ReviewListResponse extends ListResponse<TourReview> {
  summary: ReviewSummary;
}
export interface ReviewEligibility {
  eligibleBookings: { _id: string; code: string; departureAt: string }[];
  myReviews: OwnReview[];
}
