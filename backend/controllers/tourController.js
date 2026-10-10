import { respondInputError } from "../middlewares/inputValidation.js";
import Tour from "../models/Tour.js";
import Destination from "../models/Destination.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import { getReviewSummary } from "../utils/reviewStats.js";
import { getTourLocations, getMeetingDestination } from "../utils/tourLocations.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const ALLOWED_THEMES = ["nature", "culture", "food", "history"];
const ALLOWED_STATUSES = ["draft", "published", "archived"];
const ALLOWED_SORTS = ["newest", "duration", "price_asc", "price_desc", "most_bought"];
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const ensureDestinationsExist = async (ids) => {
  if (!Array.isArray(ids)) return false;
  const uniqueIds = [...new Set(ids)];
  for (let id of uniqueIds) {
    if (!isValidObjectId(id)) return false;
  }
  
  if (uniqueIds.length > 0) {
    const count = await Destination.countDocuments({ _id: { $in: uniqueIds }, status: { $ne: "archived" } });
    if (count !== uniqueIds.length) return false;
  }
  return true;
};

// @desc   Get all tours
// @route  GET /api/tours
// @access Public/Private
export const getTours = async (req, res) => {
  try {
    const { q, status, destinationId, theme, maxDurationHours, dateFrom, dateTo, minPrice, maxPrice, sort, page, limit } = req.query;
    
    let filter = {};

    if (q && typeof q === 'string') {
      const search = q.trim();
      if (search) {
        const pattern = new RegExp(escapeRegex(search), "i");
        filter.$or = [
          { name: pattern },
          { summary: pattern },
          { description: pattern },
        ];
      }
    }

    if (req.user?.role !== "admin") {
      filter.status = "published";
    } else if (status) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({ message: `Trạng thái không hợp lệ. Cho phép: ${ALLOWED_STATUSES.join(", ")}` });
      }
      filter.status = status;
    }

    if (destinationId) {
      if (!isValidObjectId(destinationId)) return res.status(400).json({ message: "destinationId không hợp lệ." });
      filter.destinationIds = new mongoose.Types.ObjectId(destinationId);
    }
    
    if (theme) {
      if (!ALLOWED_THEMES.includes(theme)) return res.status(400).json({ message: "Chủ đề không hợp lệ." });
      filter.themes = theme;
    }
    
    if (maxDurationHours !== undefined) {
      const maxDur = Number(maxDurationHours);
      if (isNaN(maxDur) || maxDur < 1 || maxDur > 720) return res.status(400).json({ message: "maxDurationHours không hợp lệ." });
      filter.durationHours = { $lte: maxDur };
    }
    
    const now = new Date();
    const departuresFilter = { status: "open", bookingDeadline: { $gt: now }, departureAt: { $gt: now } };
    
    if (dateFrom) {
      const parsed = new Date(dateFrom);
      if (isNaN(parsed.getTime())) return res.status(400).json({ message: "dateFrom không hợp lệ." });
      departuresFilter.departureAt = { ...departuresFilter.departureAt, $gte: parsed };
    }
    if (dateTo) {
      const parsed = new Date(dateTo);
      if (isNaN(parsed.getTime())) return res.status(400).json({ message: "dateTo không hợp lệ." });
      departuresFilter.departureAt = { ...departuresFilter.departureAt, $lte: parsed };
    }
    
    let priceFilter = {};
    if (minPrice !== undefined) {
       const min = Number(minPrice);
       if (!Number.isSafeInteger(min)) return res.status(400).json({ message: "minPrice không hợp lệ." });
       priceFilter.$gte = min;
    }
    if (maxPrice !== undefined) {
       const max = Number(maxPrice);
       if (!Number.isSafeInteger(max)) return res.status(400).json({ message: "maxPrice không hợp lệ." });
       priceFilter.$lte = max;
    }
    if (priceFilter.$gte !== undefined && priceFilter.$lte !== undefined && priceFilter.$gte > priceFilter.$lte) {
       return res.status(400).json({ message: "minPrice phải nhỏ hơn hoặc bằng maxPrice." });
    }
    if (Object.keys(priceFilter).length) {
       departuresFilter.adultPrice = priceFilter;
    }

    const sortBy = sort || "newest";
    if (!ALLOWED_SORTS.includes(sortBy)) return res.status(400).json({ message: "Tùy chọn sắp xếp không hợp lệ." });
    
    const sortCriteria = sortBy === "duration" ? { durationHours: 1, _id: 1 }
      : sortBy === "price_asc" ? { displayPrice: 1, _id: 1 }
      : sortBy === "price_desc" ? { displayPrice: -1, _id: 1 }
      : sortBy === "most_bought" ? { soldCount: -1, _id: 1 } : { createdAt: -1, _id: 1 };
      
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const pageLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const skip = (currentPage - 1) * pageLimit;

    const pipeline = [
      { $match: filter },
      { $lookup: { from: "departures", localField: "_id", foreignField: "tourId", pipeline: [{ $match: departuresFilter }], as: "availableDepartures" } },
      { $set: { priceFrom: { $min: "$availableDepartures.adultPrice" }, hasUpcomingDeparture: { $gt: [{ $size: "$availableDepartures" }, 0] } } },
      { $set: { displayPrice: { $ifNull: ["$priceFrom", "$referencePrice"] } } },
    ];
    
    if (Object.keys(priceFilter).length || dateFrom || dateTo) {
      pipeline.push({ $match: { hasUpcomingDeparture: true } });
    }
    
    pipeline.push({ $unset: ["availableDepartures", "description", "bookingRevision"] });
    pipeline.push({ $facet: { data: [
      { $sort: sortCriteria }, { $skip: skip }, { $limit: pageLimit },
      { $lookup: { from: "reviews", localField: "_id", foreignField: "tourId", pipeline: [{ $group: { _id: null, averageRating: { $avg: "$rating" }, reviewCount: { $sum: 1 } } }], as: "reviewSummary" } },
      { $set: { averageRating: { $ifNull: [{ $first: "$reviewSummary.averageRating" }, null] }, reviewCount: { $ifNull: [{ $first: "$reviewSummary.reviewCount" }, 0] } } },
      { $unset: ["reviewSummary", "displayPrice"] },
    ], count: [{ $count: "total" }] } });
    
    const [result] = await Tour.aggregate(pipeline);
    const total = result.count[0]?.total || 0;
    
    res.json({
      data: result.data,
      pagination: {
        page: currentPage,
        limit: pageLimit,
        total,
        pages: Math.ceil(total / pageLimit)
      }
    });
  } catch (error) {
    if (respondInputError(error, res)) return;
    res.status(500).json({ message: "Lỗi máy chủ.", error: error.message });
  }
};

// @desc   Get tour by ID
// @route  GET /api/tours/:id
// @access Public/Private
export const getTourById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "ID tour không hợp lệ." });
    }

    const filter = { _id: req.params.id };
    if (req.user?.role !== "admin") {
      filter.status = "published";
    }

    const tour = await Tour.findOne(filter);
    if (!tour) {
      return res.status(404).json({ message: "Tour không tồn tại." });
    }

    const [summary, locations] = await Promise.all([
      getReviewSummary(tour._id), getTourLocations(tour, req.user?.role === "admin"),
    ]);
    res.json({ ...tour.toObject(), ...locations, averageRating: summary.averageRating, reviewCount: summary.reviewCount });
  } catch (error) {
    if (respondInputError(error, res)) return;
    res.status(500).json({ message: "Lỗi máy chủ.", error: error.message });
  }
};

// @desc   Create tour
// @route  POST /api/tours
// @access Private (Admin)
export const createTour = async (req, res) => {
  try {
    const { name, slug, summary, description, durationHours, themes, destinationIds, itinerary, images, sources, meetingPoint, meetingDestinationId, includes, excludes, childPolicy, cancellationPolicy, status } = req.body;

    if (childPolicy !== undefined && typeof childPolicy !== "string") return res.status(400).json({ message: "Chính sách trẻ em không hợp lệ." });

    if (!name || typeof name !== "string") return res.status(400).json({ message: "Tên là bắt buộc." });
    if (!slug || typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return res.status(400).json({ message: "Định dạng slug không hợp lệ." });
    if (!summary || typeof summary !== "string") return res.status(400).json({ message: "Tóm tắt là bắt buộc." });
    if (!description || typeof description !== "string") return res.status(400).json({ message: "Mô tả là bắt buộc." });
    if (typeof durationHours !== "number" || durationHours < 1 || durationHours > 720) return res.status(400).json({ message: "Thời lượng (giờ) không hợp lệ." });
    
    if (themes && Array.isArray(themes)) {
       for (const t of themes) {
           if (!ALLOWED_THEMES.includes(t)) return res.status(400).json({ message: "Invalid theme item" });
       }
    }
    
    if (destinationIds && !(await ensureDestinationsExist(destinationIds))) {
      return res.status(400).json({ message: "Có điểm đến không hợp lệ." });
    }
    
    if (itinerary && !Array.isArray(itinerary)) return res.status(400).json({ message: "Lịch trình phải là mảng." });
    
    if (!meetingPoint || typeof meetingPoint !== "string") return res.status(400).json({ message: "Điểm hẹn là bắt buộc." });
    if (!cancellationPolicy || typeof cancellationPolicy !== "string") return res.status(400).json({ message: "Chính sách hủy là bắt buộc." });
    
    const finalStatus = status || "draft";
    if (!ALLOWED_STATUSES.includes(finalStatus)) return res.status(400).json({ message: "Trạng thái không hợp lệ." });

    if (finalStatus === "published" && (!itinerary || itinerary.length === 0)) {
      return res.status(400).json({ message: "Tour xuất bản cần có lịch trình." });
    }
    
    const uniqueDestIds = destinationIds ? [...new Set(destinationIds)] : [];
    const meetingDestination = await getMeetingDestination(meetingDestinationId, uniqueDestIds, finalStatus);
    if (meetingDestinationId && !meetingDestination) {
      return res.status(400).json({ message: "Điểm tập trung phải thuộc các điểm đã chọn và còn khả dụng; tour xuất bản cần điểm tập trung đã xuất bản." });
    }
    if (itinerary) {
        for (const stop of itinerary) {
           if (stop.destinationId && !uniqueDestIds.includes(String(stop.destinationId))) {
               return res.status(400).json({ message: "Điểm dừng phải thuộc destinationIds của tour." });
           }
        }
    }

    const tour = await Tour.create({
      name: name.trim(),
      slug: slug.trim(),
      summary: summary.trim(),
      description: description.trim(),
      durationHours,
      themes: Array.isArray(themes) ? themes : [],
      destinationIds: uniqueDestIds,
      itinerary: Array.isArray(itinerary) ? itinerary : [],
      images: Array.isArray(images) ? images : [],
      sources: sources ?? [],
      meetingPoint: meetingDestination ? [meetingDestination.name, meetingDestination.address].filter(Boolean).join(", ") : meetingPoint.trim(),
      meetingDestinationId: meetingDestinationId || null,
      includes: Array.isArray(includes) ? includes : [],
      excludes: Array.isArray(excludes) ? excludes : [],
      childPolicy: childPolicy ? childPolicy.trim() : "",
      cancellationPolicy: cancellationPolicy.trim(),
      status: finalStatus
    });

    res.status(201).json(tour);
  } catch (error) {
    if (respondInputError(error, res)) return;
    if (error.code === 11000) {
      return res.status(400).json({ message: "Slug đã tồn tại" });
    }
    res.status(500).json({ message: "Lỗi máy chủ.", error: error.message });
  }
};

// @desc   Update tour
// @route  PUT /api/tours/:id
// @access Private (Admin)
export const updateTour = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "ID tour không hợp lệ." });
    }

    const tour = await Tour.findById(req.params.id);
    if (!tour) {
      return res.status(404).json({ message: "Tour không tồn tại." });
    }

    const { name, slug, summary, description, durationHours, themes, destinationIds, itinerary, images, sources, meetingPoint, meetingDestinationId, includes, excludes, childPolicy, cancellationPolicy, status } = req.body;
    if (meetingDestinationId !== undefined) tour.meetingDestinationId = meetingDestinationId;

    if (name !== undefined) {
        if (typeof name !== "string" || !name.trim()) return res.status(400).json({ message: "Tên không hợp lệ." });
        tour.name = name.trim();
    }
    if (slug !== undefined) {
      if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return res.status(400).json({ message: "Định dạng slug không hợp lệ." });
      tour.slug = slug.trim();
    }
    if (summary !== undefined) {
      if (typeof summary !== "string") return res.status(400).json({ message: "Tóm tắt không hợp lệ." });
      tour.summary = summary.trim();
    }
    if (description !== undefined) {
      if (typeof description !== "string") return res.status(400).json({ message: "Mô tả không hợp lệ." });
      tour.description = description.trim();
    }
    if (durationHours !== undefined) {
       if (typeof durationHours !== "number" || durationHours < 1 || durationHours > 720) return res.status(400).json({ message: "Thời lượng (giờ) không hợp lệ." });
       tour.durationHours = durationHours;
    }
    
    if (themes !== undefined) {
       if (!Array.isArray(themes)) return res.status(400).json({ message: "Chủ đề phải là mảng." });
       for (const t of themes) {
           if (!ALLOWED_THEMES.includes(t)) return res.status(400).json({ message: "Chủ đề không hợp lệ." });
       }
       tour.themes = themes;
    }
    
    if (destinationIds !== undefined) {
       if (!(await ensureDestinationsExist(destinationIds))) {
         return res.status(400).json({ message: "Có điểm đến không hợp lệ." });
       }
       tour.destinationIds = [...new Set(destinationIds)];
    }
    
    if (itinerary !== undefined) {
       if (!Array.isArray(itinerary)) return res.status(400).json({ message: "Lịch trình phải là mảng." });
       tour.itinerary = itinerary;
    }
    
    if (images !== undefined) tour.images = Array.isArray(images) ? images : [];
    if (sources !== undefined) tour.sources = sources;
    if (meetingPoint !== undefined) {
      if (typeof meetingPoint !== "string") return res.status(400).json({ message: "Điểm hẹn không hợp lệ." });
      tour.meetingPoint = meetingPoint.trim();
    }
    if (includes !== undefined) tour.includes = Array.isArray(includes) ? includes : [];
    if (excludes !== undefined) tour.excludes = Array.isArray(excludes) ? excludes : [];
    if (childPolicy !== undefined) {
      if (typeof childPolicy !== "string") return res.status(400).json({ message: "Chính sách trẻ em không hợp lệ." });
      tour.childPolicy = childPolicy.trim();
    }
    if (cancellationPolicy !== undefined) {
      if (typeof cancellationPolicy !== "string") return res.status(400).json({ message: "Chính sách hủy không hợp lệ." });
      tour.cancellationPolicy = cancellationPolicy.trim();
    }
    
    if (status !== undefined) {
      if (!ALLOWED_STATUSES.includes(status)) return res.status(400).json({ message: "Trạng thái không hợp lệ." });
      tour.status = status;
    }

    if (tour.status === "published" && (!tour.itinerary || tour.itinerary.length === 0)) {
      return res.status(400).json({ message: "Tour xuất bản cần có lịch trình." });
    }
    
    const uniqueDestIds = tour.destinationIds.map(String);
    if (tour.meetingDestinationId) {
      const meetingDestination = await getMeetingDestination(tour.meetingDestinationId, uniqueDestIds, tour.status);
      if (!meetingDestination) {
        return res.status(400).json({ message: "Điểm tập trung phải thuộc các điểm đã chọn và còn khả dụng; tour xuất bản cần điểm tập trung đã xuất bản." });
      }
      if (meetingDestinationId !== undefined) {
        tour.meetingPoint = [meetingDestination.name, meetingDestination.address].filter(Boolean).join(", ");
      }
    }
    if (tour.itinerary) {
        for (const stop of tour.itinerary) {
           if (stop.destinationId && !uniqueDestIds.includes(String(stop.destinationId))) {
               return res.status(400).json({ message: "Điểm dừng phải thuộc destinationIds của tour." });
           }
        }
    }

    await tour.save();
    res.json(tour);
  } catch (error) {
    if (respondInputError(error, res)) return;
    if (error.code === 11000) {
      return res.status(400).json({ message: "Slug đã tồn tại" });
    }
    res.status(500).json({ message: "Lỗi máy chủ.", error: error.message });
  }
};

// @desc   Delete tour
// @route  DELETE /api/tours/:id
// @access Private (Admin)
export const deleteTour = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "ID tour không hợp lệ." });
    }

    const tour = await Tour.findById(req.params.id);
    if (!tour) {
      return res.status(404).json({ message: "Tour không tồn tại." });
    }

    tour.status = "archived";
    await tour.save();

    res.json({ message: "Đã lưu trữ tour.", data: tour });
  } catch (error) {
    if (respondInputError(error, res)) return;
    res.status(500).json({ message: "Lỗi máy chủ.", error: error.message });
  }
};

// @desc   Get saved tours for current user
// @route  GET /api/tours/saved
// @access Private
export const getSavedTours = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: "savedTours",
      match: { status: "published" }
    });
    
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng." });

    res.json({ data: user.savedTours || [] });
  } catch (error) {
    if (respondInputError(error, res)) return;
    res.status(500).json({ message: "Lỗi máy chủ.", error: error.message });
  }
};

// @desc   Toggle save/unsave tour
// @route  POST /api/tours/:id/save
// @access Private
export const toggleSavedTour = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "ID tour không hợp lệ." });
    }

    const tour = await Tour.findById(req.params.id);
    if (!tour || tour.status !== "published") {
      return res.status(404).json({ message: "Tour không tồn tại hoặc chưa xuất bản." });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng." });

    const tourIndex = user.savedTours.indexOf(tour._id);
    let isSaved = false;

    if (tourIndex > -1) {
      // Đã lưu -> bỏ lưu
      user.savedTours.splice(tourIndex, 1);
    } else {
      // Chưa lưu -> lưu
      user.savedTours.push(tour._id);
      isSaved = true;
    }

    await user.save();
    res.json({ message: isSaved ? "Đã lưu tour." : "Đã bỏ lưu tour.", isSaved });
  } catch (error) {
    if (respondInputError(error, res)) return;
    res.status(500).json({ message: "Lỗi máy chủ.", error: error.message });
  }
};
