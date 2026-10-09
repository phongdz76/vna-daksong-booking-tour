import avatar from "../assets/stitch/account-avatar.jpg";
import upcomingPhoto from "../assets/stitch/account-upcoming.jpg";
import { previewDepartures, previewList, previewTours } from "./preview";
import type { Booking, User } from "../types/api";

// Only shown in the labelled development preview. Never used as a live API fallback.
export const previewAccountUser: User = {
  _id: "preview-traveler",
  name: "Nguyễn Văn An",
  avatar,
  role: "user",
  membershipTier: "Bạc",
  loyaltyPoints: 350,
  savedTours: previewTours.map((tour) => tour._id),
};

const tour = previewTours[0];
const departure = previewDepartures[0];
export const previewAccountBooking: Booking = {
  _id: "preview-upcoming",
  code: "VNA-DS-8821",
  tourId: tour._id,
  departureId: departure._id,
  adults: 1,
  children: 0,
  contact: { name: previewAccountUser.name, phone: "0900000000", email: "an.nguyen@example.com" },
  note: "Đơn minh họa theo thiết kế Stitch.",
  status: "confirmed",
  paymentStatus: "unpaid",
  paymentMethod: "cash_on_arrival",
  snapshot: {
    tourName: "Trekking Đồi Thông Săn Mây",
    departureAt: departure.departureAt,
    meetingPoint: tour.meetingPoint,
    adultPrice: departure.adultPrice,
    childPrice: departure.childPrice,
    subTotal: departure.adultPrice,
    total: departure.adultPrice,
    discountAmount: 0,
    appliedCoupon: null,
    durationHours: tour.durationHours,
    cancellationPolicy: tour.cancellationPolicy,
    childPolicy: tour.childPolicy,
  },
};

export const previewConfirmedBookings = previewList([previewAccountBooking]);
export const previewCompletedBookings = {
  data: [] as Booking[],
  pagination: { page: 1, limit: 1, total: 2, pages: 2 },
};
export const previewSavedTours = { data: previewTours };
export const previewAccountImages = { avatar, upcoming: upcomingPhoto };
