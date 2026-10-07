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

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 180, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  summary: { type: String, required: true, maxlength: 1000 },
  content: { type: String, required: true, maxlength: 50_000 },
  category: { type: String, enum: ["culture", "food", "travel_tips", "story"], required: true, index: true },
  destinationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Destination" }],
  images: { type: [imageSchema], default: [] },
  sources: { type: [sourceSchema], default: [] },
  status: { type: String, enum: ["draft", "published", "archived"], default: "draft", index: true },
}, { timestamps: true, optimisticConcurrency: true });

const Article = mongoose.model("Article", articleSchema);

export default Article;
