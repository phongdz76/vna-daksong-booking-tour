import mongoose from "mongoose";
import { isPhone, isEmail } from '../utils/inputValidation.js';

export const bookingStatuses = ["pending_confirmation", "confirmed", "completed", "cancelled", "rejected"];
export const paymentStatuses = ["unpaid", "paid", "refund_pending", "refunded"];

const bookingSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true, immutable: true },
  tourId: { type: mongoose.Schema.Types.ObjectId, ref: "Tour", required: true, immutable: true },
  departureId: { type: mongoose.Schema.Types.ObjectId, ref: "Departure", required: true, index: true, immutable: true },
  adults: { type: Number, required: true, min: 1, max: 100, validate: Number.isSafeInteger },
  children: { type: Number, required: true, min: 0, max: 100, validate: Number.isSafeInteger },
  contact: {
    name: { type: String, required: true, maxlength: 200 },
    phone: { type: String, required: true, trim: true, maxlength: 20, validate: isPhone },
    email: { type: String, maxlength: 254, lowercase: true, trim: true, validate: value => !value || isEmail(value) },
  },
  note: { type: String, maxlength: 2000, default: "" },
  snapshot: {
    tourName: { type: String, required: true },
    departureAt: { type: Date, required: true },
    meetingPoint: { type: String, required: true },
    childPolicy: { type: String, default: "" },
    cancellationPolicy: { type: String, required: true },
    adultPrice: { type: Number, required: true },
    childPrice: { type: Number, default: null },
    subTotal: { type: Number },
    discountAmount: { type: Number, default: 0 },
    appliedCoupon: { type: String, default: null },
    total: { type: Number, required: true },
    currency: { type: String, enum: ["VND"], default: "VND" },
    durationHours: { type: Number, default: null },
  },
  status: { type: String, enum: bookingStatuses, default: "pending_confirmation", index: true },
  paymentStatus: { type: String, enum: paymentStatuses, default: "unpaid", index: true },
  paymentMethod: { type: String, enum: ["qr_transfer", "cash_on_arrival", "zalopay"], default: "cash_on_arrival" },
  paidTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentTransaction", default: null },
  couponCode: { type: String, maxlength: 50, default: "" },
  couponId: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", default: null, immutable: true },
  history: [{
    _id: false,
    status: { type: String, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, maxlength: 1000, default: "" },
    at: { type: Date, default: Date.now },
  }],
  idempotencyKey: { type: String, required: true, select: false },
  requestHash: { type: String, required: true, select: false },
}, { timestamps: true, optimisticConcurrency: true });

bookingSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
bookingSchema.index({ userId: 1, createdAt: -1 });
const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
