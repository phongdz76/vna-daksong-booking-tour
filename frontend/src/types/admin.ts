export type ContentStatus = "draft" | "published" | "archived";
export type Theme = "nature" | "culture" | "food" | "history";
export type BookingStatus =
  "pending_confirmation" | "confirmed" | "completed" | "cancelled" | "rejected";
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
export interface User {
  _id: string;
  name: string;
  email?: string;
  avatar?: string;
  role: "admin" | "user";
}
export interface ImageAsset {
  url: string;
  alt: string;
  credit: string;
}
export interface Source {
  title: string;
  url: string;
  checkedAt: string;
}
export interface BaseContent {
  _id: string;
  slug: string;
  summary: string;
  status: ContentStatus;
  images: ImageAsset[];
  createdAt?: string;
  updatedAt?: string;
}
export interface Destination extends BaseContent {
  name: string;
  description: string;
  category: Theme;
  address: string;
  visitNotes: string;
  sources: Source[];
}
export interface Article extends BaseContent {
  title: string;
  content: string;
  category: "culture" | "food" | "travel_tips" | "story";
  destinationIds: string[];
  sources: Source[];
  publishedAt?: string;
}
export interface Itinerary {
  title: string;
  description: string;
  destinationId: string | null;
}
export interface Tour extends BaseContent {
  name: string;
  description: string;
  durationHours: number;
  themes: Theme[];
  destinationIds: string[];
  itinerary: Itinerary[];
  meetingPoint: string;
  includes: string[];
  excludes: string[];
  childPolicy: string;
  cancellationPolicy: string;
  soldCount: number;
  priceFrom?: number | null;
  averageRating?: number | null;
  reviewCount?: number;
}
export interface Departure {
  _id: string;
  tourId: string;
  departureAt: string;
  bookingDeadline: string;
  adultPrice: number;
  childPrice: number | null;
  maxGuestsPerBooking: number;
  maxCapacity?: number;
  status: "open" | "closed";
}
export interface Coupon {
  _id: string;
  code: string;
  description: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxDiscount: number | null;
  minOrderValue: number;
  validFrom: string;
  validUntil: string;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
}
export interface Booking {
  _id: string;
  code: string;
  userId: string;
  tourId: string;
  departureId: string;
  adults: number;
  children: number;
  contact: { name: string; phone: string; email?: string };
  note: string;
  status: BookingStatus;
  paymentStatus: "unpaid" | "paid" | "refund_pending" | "refunded";
  paymentMethod: "cash_on_arrival" | "qr_transfer" | "zalopay";
  snapshot: {
    tourName: string;
    departureAt: string;
    meetingPoint: string;
    adultPrice: number;
    childPrice: number | null;
    subTotal?: number;
    total: number;
    discountAmount: number;
    appliedCoupon: string | null;
    cancellationPolicy: string;
    childPolicy: string;
    durationHours?: number;
  };
  history: { status: string; actorId: string; at: string; reason?: string }[];
  createdAt: string;
}
export interface Payment {
  _id: string;
  appTransId: string;
  amount: number;
  status: "pending" | "success" | "failed" | "refund_pending" | "refunded";
  paidAt?: string;
  refundRequestId?: string;
  refundState?: "none" | "pending" | "failed" | "success";
  refundedAt?: string;
  createdAt: string;
}
export interface BookingDetail {
  data: Booking;
  payments: Payment[];
}
export interface Dashboard {
  bookings: Partial<Record<BookingStatus, number>>;
  tours: number;
  destinations: number;
  openDepartures: number;
  totalRevenue: number;
}
export interface Review {
  _id: string;
  rating: number;
  comment: string;
  author: { name: string; avatar: string };
  createdAt: string;
}
export interface ReviewList extends ListResponse<Review> {
  summary: {
    averageRating: number | null;
    reviewCount: number;
    distribution: Record<string, number>;
  };
}
