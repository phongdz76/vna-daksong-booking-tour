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

const sourceSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 300 },
  url: { type: String, required: true, validate: httpUrl, maxlength: 2000 },
  checkedAt: { type: Date, required: true },
}, { _id: false, strict: "throw" });

const destinationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 180, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  summary: { type: String, required: true, trim: true, maxlength: 1000 },
  description: { type: String, required: true, maxlength: 30_000 },
  category: { type: String, enum: ["nature", "culture", "food", "history"], required: true, index: true },
  address: { type: String, trim: true, maxlength: 500, default: "" },
  // Optional for existing records; adding this feature does not migrate old destinations.
  placeGroup: { type: String, enum: ["nature", "culture", "rest", "pickup"] },
  areaScope: { type: String, enum: ["daksong", "nearby", "unspecified"] },
  locality: { type: String, trim: true, maxlength: 200 },
  coordinates: { type: new mongoose.Schema({
    latitude: { type: Number, required: true, min: -90, max: 90, validate: Number.isFinite },
    longitude: { type: Number, required: true, min: -180, max: 180, validate: Number.isFinite },
  }, { _id: false, strict: "throw" }), default: undefined },
  images: { type: [imageSchema], default: [] },
  sources: { type: [sourceSchema], default: [] },
  visitNotes: { type: String, maxlength: 3000, default: "" },
  status: { type: String, enum: ["draft", "published", "archived"], default: "draft", index: true },
}, { timestamps: true, optimisticConcurrency: true });

// Text index cho tìm kiếm $text
destinationSchema.index({ name: "text", summary: "text", description: "text" });

const Destination = mongoose.model("Destination", destinationSchema);

export default Destination;

