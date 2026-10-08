import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  tourId: { type: mongoose.Schema.Types.ObjectId, ref: "Tour", required: true, immutable: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, immutable: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, immutable: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
  comment: { type: String, required: true, trim: true, minlength: 1, maxlength: 2000 },
}, { timestamps: true, optimisticConcurrency: true, strict: "throw" });

reviewSchema.index({ tourId: 1, createdAt: -1, _id: -1 });
const Review = mongoose.model("Review", reviewSchema);

export default Review;
