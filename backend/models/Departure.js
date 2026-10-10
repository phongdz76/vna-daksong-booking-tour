import mongoose from "mongoose";

const departureSchema = new mongoose.Schema({
  tourId: { type: mongoose.Schema.Types.ObjectId, ref: "Tour", required: true, index: true, immutable: true },
  departureAt: { type: Date, required: true, index: true },
  bookingDeadline: { type: Date, required: true },
  adultPrice: { type: Number, required: true, min: 0, max: 1_000_000_000, validate: Number.isSafeInteger },
  childPrice: { type: Number, min: 0, max: 1_000_000_000, default: null, validate: value => value === null || Number.isSafeInteger(value) },
  maxGuestsPerBooking: { type: Number, default: 20, min: 1, max: 100, validate: Number.isSafeInteger },
  maxCapacity: { type: Number, default: 50, min: 1, max: 200, validate: Number.isSafeInteger },
  status: { type: String, enum: ["open", "closed"], default: "open", index: true },
  bookingRevision: { type: Number, default: 0, select: false },
}, { timestamps: true, optimisticConcurrency: true });

departureSchema.pre("validate", function () {
  if (this.maxGuestsPerBooking > this.maxCapacity) this.invalidate('maxGuestsPerBooking', 'Giới hạn mỗi yêu cầu không được vượt sức chứa của chuyến.');
  if (this.bookingDeadline >= this.departureAt) this.invalidate("bookingDeadline", "H\u1EA1n \u0111\u1EB7t ph\u1EA3i tr\u01B0\u1EDBc th\u1EDDi \u0111i\u1EC3m kh\u1EDFi h\u00E0nh.");
});

const Departure = mongoose.model("Departure", departureSchema);

export default Departure;
