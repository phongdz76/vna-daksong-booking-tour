import type { Booking } from "../types/api";
import { previewTours } from "./preview";

const createdAt = new Date(Date.now() - 86400000).toISOString();
const tour = previewTours[0];
const adultPrice = tour.priceFrom ?? 0;
export const previewBookingDetail: Booking = {
  _id: "preview-order",
  code: "VNA-DS8829",
  tourId: "preview-trekking",
  departureId: "preview-departure-1",
  adults: 2,
  children: 0,
  contact: { name: "Nguyễn Văn An", phone: "0900000000", email: "an.nguyen@example.com" },
  note: "",
  status: "pending_confirmation",
  paymentStatus: "unpaid",
  paymentMethod: "cash_on_arrival",
  createdAt,
  snapshot: {
    tourName: tour.name,
    departureAt: new Date(Date.now() + 86400000 * 7).toISOString(),
    durationHours: tour.durationHours,
    meetingPoint: tour.meetingPoint,
    adultPrice,
    childPrice: null,
    subTotal: adultPrice * 2,
    discountAmount: 0,
    appliedCoupon: null,
    total: adultPrice * 2,
    childPolicy: previewTours[0].childPolicy,
    cancellationPolicy: previewTours[0].cancellationPolicy,
  },
  history: [{ status: "pending_confirmation", at: createdAt }],
};
