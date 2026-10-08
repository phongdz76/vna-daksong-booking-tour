import type { Booking } from "../types/api";
import { previewTours } from "./preview";

const createdAt = new Date(Date.now() - 86400000).toISOString();
export const previewBookingDetail: Booking = {
  _id: "preview-order",
  code: "VNA-DS8829",
  tourId: "preview-trekking",
  departureId: "preview-departure-1",
  adults: 2,
  children: 1,
  contact: { name: "Nguyễn Văn An", phone: "0900000000" },
  note: "",
  status: "pending_confirmation",
  paymentStatus: "unpaid",
  paymentMethod: "cash_on_arrival",
  createdAt,
  snapshot: {
    tourName: "Trekking Đồi Thông Săn Mây & Cắm Trại Đại Ngàn",
    departureAt: new Date(Date.now() + 86400000 * 7).toISOString(),
    durationHours: 48,
    meetingPoint: "Văn phòng VNA Đắk Song, TT. Đức An",
    adultPrice: 1500000,
    childPrice: 750000,
    subTotal: 3750000,
    discountAmount: 0,
    appliedCoupon: null,
    total: 3750000,
    childPolicy: previewTours[0].childPolicy,
    cancellationPolicy: previewTours[0].cancellationPolicy,
  },
  history: [{ status: "pending_confirmation", at: createdAt }],
};
