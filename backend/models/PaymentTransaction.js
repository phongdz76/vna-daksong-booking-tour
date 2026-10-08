import mongoose from "mongoose";

const paymentTransactionSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
  bookingCode: { type: String, required: true },
  appTransId: { type: String, required: true, unique: true },
  amount: { type: Number, required: true, min: 0 },
  provider: { type: String, enum: ["zalopay"], required: true },
  status: { type: String, enum: ["pending", "success", "failed", "refund_pending", "refunded"], default: "pending", index: true },
  rawCallback: { type: mongoose.Schema.Types.Mixed, default: null },
  paidAt: { type: Date, default: null },
  appliedAt: { type: Date, default: null },
  zpTransId: { type: String, default: "" },
  activeAttempt: { type: Boolean, default: false },
  expiresAt: { type: Date, default: null },
  refundRequestId: { type: String, default: "" },
  providerRefundId: { type: String, default: "" },
  refundState: { type: String, enum: ["none", "pending", "failed", "success"], default: "none" },
  refundedAt: { type: Date, default: null },
  note: { type: String, maxlength: 1000, default: "" },
}, { timestamps: true, optimisticConcurrency: true });

paymentTransactionSchema.index({ bookingId: 1, status: 1 });
paymentTransactionSchema.index({ bookingId: 1, provider: 1 }, {
  unique: true, partialFilterExpression: { activeAttempt: true },
});

const PaymentTransaction = mongoose.model("PaymentTransaction", paymentTransactionSchema);

export default PaymentTransaction;
