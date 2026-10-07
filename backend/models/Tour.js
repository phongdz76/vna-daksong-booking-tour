import mongoose from "mongoose";

const httpUrl = value => {
  if (!value) return true;
  try { return ["http:", "https:"].includes(new URL(value).protocol); }
  catch { return false; }
};

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true, validate: httpUrl, maxlength: 2000 },
  alt: { type: String, trim: true, maxlength: 300, default: "" },
  credit: { type: String, trim: true, maxlength: 300, default: "" },
}, { _id: false, strict: "throw" });

const itinerarySchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, required: true, maxlength: 3000 },
  destinationId: { type: mongoose.Schema.Types.ObjectId, ref: "Destination", default: null },
}, { _id: false, strict: "throw" });

const tourSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 180, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  summary: { type: String, required: true, maxlength: 1000 },
  description: { type: String, required: true, maxlength: 30_000 },
  durationHours: { type: Number, required: true, min: 1, max: 720 },
  themes: [{ type: String, enum: ["nature", "culture", "food", "history"] }],
  destinationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Destination" }],
  itinerary: { type: [itinerarySchema], default: [] },
  images: { type: [imageSchema], default: [] },
  meetingPoint: { type: String, required: true, maxlength: 1000 },
  includes: [{ type: String, maxlength: 500 }],
  excludes: [{ type: String, maxlength: 500 }],
  childPolicy: { type: String, maxlength: 3000, default: "" },
  cancellationPolicy: { type: String, required: true, maxlength: 3000 },
  status: { type: String, enum: ["draft", "published", "archived"], default: "draft", index: true },
  bookingRevision: { type: Number, default: 0, select: false },
}, { timestamps: true, optimisticConcurrency: true });

const Tour = mongoose.model("Tour", tourSchema);

export default Tour;
