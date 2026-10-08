import mongoose from "mongoose";
import Review from "../models/Review.js";
import Tour from "../models/Tour.js";
import Booking from "../models/Booking.js";
import { getReviewSummary } from "../utils/reviewStats.js";

const isValidObjectId = id => typeof id === "string" && mongoose.Types.ObjectId.isValid(id);
const publicReview = review => ({
  _id: String(review._id),
  rating: review.rating,
  comment: review.comment,
  author: { name: review.userId?.name || "Khách du lịch", avatar: review.userId?.avatar || "" },
  verifiedBooking: true,
  createdAt: review.createdAt,
  updatedAt: review.updatedAt,
});

// @route GET /api/tours/:id/reviews
// @access Public; admin can also read reviews for unpublished tours.
export const getTourReviews = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "ID tour không hợp lệ." });
    const page = Number(req.query.page ?? 1);
    const requestedLimit = Number(req.query.limit ?? 6);
    const limit = Math.min(requestedLimit, 100);
    if (!Number.isSafeInteger(page) || page < 1 || page > 1000000 || !Number.isSafeInteger(requestedLimit) || requestedLimit < 1 ||
      req.query.page !== undefined && typeof req.query.page !== "string" || req.query.limit !== undefined && typeof req.query.limit !== "string") {
      return res.status(400).json({ message: "Phân trang không hợp lệ." });
    }
    const filter = { _id: req.params.id };
    if (req.user?.role !== "admin") filter.status = "published";
    if (!await Tour.exists(filter)) return res.status(404).json({ message: "Tour không tồn tại." });
    const [reviews, summary] = await Promise.all([
      Review.find({ tourId: req.params.id }).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).populate("userId", "name avatar").lean(),
      getReviewSummary(req.params.id),
    ]);
    res.json({ data: reviews.map(publicReview), summary, pagination: { page, limit, total: summary.reviewCount, pages: Math.ceil(summary.reviewCount / limit) } });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ.", error: error.message });
  }
};

// @route GET /api/tours/:id/reviews/eligibility
// @access Private; only the current user's bookings and reviews.
export const getReviewEligibility = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "ID tour không hợp lệ." });
    if (!await Tour.exists({ _id: req.params.id, status: "published" })) return res.status(404).json({ message: "Tour không tồn tại." });
    const [bookings, reviews] = await Promise.all([
      Booking.find({ userId: req.user._id, tourId: req.params.id, status: "completed" }).select("code snapshot.departureAt").sort({ "snapshot.departureAt": -1 }).lean(),
      Review.find({ userId: req.user._id, tourId: req.params.id }).sort({ createdAt: -1, _id: -1 }).populate("userId", "name avatar").lean(),
    ]);
    const reviewedBookings = new Set(reviews.map(review => String(review.bookingId)));
    res.json({
      eligibleBookings: bookings.filter(booking => !reviewedBookings.has(String(booking._id))).map(booking => ({ _id: String(booking._id), code: booking.code, departureAt: booking.snapshot.departureAt })),
      myReviews: reviews.map(review => ({ ...publicReview(review), bookingId: String(review.bookingId) })),
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ.", error: error.message });
  }
};

// @route POST /api/tours/:id/reviews
// @access Private; one review per completed booking owned by the current user.
export const createReview = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "ID tour không hợp lệ." });
    const { bookingId, rating, comment } = req.body || {};
    if (Object.keys(req.body || {}).some(key => !["bookingId", "rating", "comment"].includes(key))) return res.status(400).json({ message: "Chỉ gửi bookingId, rating và comment." });
    if (!isValidObjectId(bookingId)) return res.status(400).json({ message: "ID đơn đặt tour không hợp lệ." });
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ message: "Số sao phải là số nguyên từ 1 đến 5." });
    if (typeof comment !== "string" || !comment.trim() || comment.trim().length > 2000) return res.status(400).json({ message: "Nhận xét cần từ 1 đến 2000 ký tự." });
    if (!await Tour.exists({ _id: req.params.id, status: "published" })) return res.status(404).json({ message: "Tour không tồn tại." });
    const booking = await Booking.findOne({ _id: bookingId, userId: req.user._id, tourId: req.params.id, status: "completed" });
    if (!booking) return res.status(403).json({ message: "Chỉ được đánh giá tour từ đơn đã hoàn thành của chính bạn." });
    const review = await Review.create({ tourId: booking.tourId, bookingId: booking._id, userId: req.user._id, rating, comment: comment.trim() });
    await review.populate("userId", "name avatar");
    res.status(201).json({ message: "Đã gửi đánh giá.", data: { ...publicReview(review), bookingId: String(review.bookingId) } });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Đơn này đã được đánh giá. Bạn có thể sửa đánh giá đã gửi." });
    res.status(500).json({ message: "Lỗi máy chủ.", error: error.message });
  }
};

// @route PATCH /api/reviews/:id
// @access Private; author only, including when the caller is an admin.
export const updateReview = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "ID đánh giá không hợp lệ." });
    const fields = Object.keys(req.body || {});
    if (!fields.length || fields.some(key => !["rating", "comment"].includes(key))) return res.status(400).json({ message: "Chỉ được sửa số sao và nhận xét." });
    const { rating, comment } = req.body;
    if (rating !== undefined && (!Number.isInteger(rating) || rating < 1 || rating > 5)) return res.status(400).json({ message: "Số sao phải là số nguyên từ 1 đến 5." });
    if (comment !== undefined && (typeof comment !== "string" || !comment.trim() || comment.trim().length > 2000)) return res.status(400).json({ message: "Nhận xét cần từ 1 đến 2000 ký tự." });
    const review = await Review.findOne({ _id: req.params.id, userId: req.user._id });
    if (!review) return res.status(404).json({ message: "Không tìm thấy đánh giá của bạn." });
    if (rating !== undefined) review.rating = rating;
    if (comment !== undefined) review.comment = comment.trim();
    await review.save();
    await review.populate("userId", "name avatar");
    res.json({ message: "Đã cập nhật đánh giá.", data: { ...publicReview(review), bookingId: String(review.bookingId) } });
  } catch (error) {
    if (error.name === "VersionError") return res.status(409).json({ message: "Đánh giá đã thay đổi. Tải lại trước khi sửa tiếp." });
    res.status(500).json({ message: "Lỗi máy chủ.", error: error.message });
  }
};

// @route DELETE /api/reviews/:id
// @access Private; author or admin moderation.
export const deleteReview = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "ID đánh giá không hợp lệ." });
    const filter = { _id: req.params.id };
    if (req.user.role !== "admin") filter.userId = req.user._id;
    const review = await Review.findOneAndDelete(filter);
    if (!review) return res.status(404).json({ message: "Không tìm thấy đánh giá hoặc bạn không có quyền xóa." });
    res.json({ message: "Đã xóa đánh giá." });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ.", error: error.message });
  }
};
