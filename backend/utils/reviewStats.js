import mongoose from "mongoose";
import Review from "../models/Review.js";

export async function getReviewSummary(tourId) {
  const rows = await Review.aggregate([
    { $match: { tourId: new mongoose.Types.ObjectId(tourId) } },
    { $group: { _id: "$rating", count: { $sum: 1 } } },
  ]);
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let reviewCount = 0;
  let totalRating = 0;
  for (const row of rows) {
    distribution[row._id] = row.count;
    reviewCount += row.count;
    totalRating += row._id * row.count;
  }
  return {
    averageRating: reviewCount ? totalRating / reviewCount : null,
    reviewCount,
    distribution,
  };
}
