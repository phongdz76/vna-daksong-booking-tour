import Tour from "../models/Tour.js";
import Destination from "../models/Destination.js";
import mongoose from "mongoose";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const ALLOWED_THEMES = ["nature", "culture", "food", "history"];
const ALLOWED_STATUSES = ["draft", "published", "archived"];
const ALLOWED_SORTS = ["newest", "duration", "price_asc", "price_desc"];

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
      filter.$text = { $search: q };
    }

    if (req.user?.role !== "admin") {
      filter.status = "published";
    } else if (status) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({ message: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(", ")}` });
      }
      filter.status = status;
    }

    if (destinationId) {
      if (!isValidObjectId(destinationId)) return res.status(400).json({ message: "Invalid destinationId" });
      filter.destinationIds = new mongoose.Types.ObjectId(destinationId);
    }
    
    if (theme) {
      if (!ALLOWED_THEMES.includes(theme)) return res.status(400).json({ message: "Invalid theme" });
      filter.themes = theme;
    }
    
    if (maxDurationHours !== undefined) {
      const maxDur = Number(maxDurationHours);
      if (isNaN(maxDur) || maxDur < 1 || maxDur > 720) return res.status(400).json({ message: "Invalid maxDurationHours" });
      filter.durationHours = { $lte: maxDur };
    }
    
    const now = new Date();
    const departuresFilter = { status: "open", bookingDeadline: { $gt: now }, departureAt: { $gt: now } };
    
    if (dateFrom) {
      const parsed = new Date(dateFrom);
      if (isNaN(parsed.getTime())) return res.status(400).json({ message: "Invalid dateFrom" });
      departuresFilter.departureAt = { ...departuresFilter.departureAt, $gte: parsed };
    }
    if (dateTo) {
      const parsed = new Date(dateTo);
      if (isNaN(parsed.getTime())) return res.status(400).json({ message: "Invalid dateTo" });
      departuresFilter.departureAt = { ...departuresFilter.departureAt, $lte: parsed };
    }
    
    let priceFilter = {};
    if (minPrice !== undefined) {
       const min = Number(minPrice);
       if (!Number.isSafeInteger(min)) return res.status(400).json({ message: "Invalid minPrice" });
       priceFilter.$gte = min;
    }
    if (maxPrice !== undefined) {
       const max = Number(maxPrice);
       if (!Number.isSafeInteger(max)) return res.status(400).json({ message: "Invalid maxPrice" });
       priceFilter.$lte = max;
    }
    if (priceFilter.$gte !== undefined && priceFilter.$lte !== undefined && priceFilter.$gte > priceFilter.$lte) {
       return res.status(400).json({ message: "minPrice must be <= maxPrice" });
    }
    if (Object.keys(priceFilter).length) {
       departuresFilter.adultPrice = priceFilter;
    }

    const sortBy = sort || "newest";
    if (!ALLOWED_SORTS.includes(sortBy)) return res.status(400).json({ message: "Invalid sort option" });
    
    const sortCriteria = sortBy === "duration" ? { durationHours: 1, _id: 1 }
      : sortBy === "price_asc" ? { priceFrom: 1, _id: 1 }
      : sortBy === "price_desc" ? { priceFrom: -1, _id: 1 } : { createdAt: -1, _id: 1 };
      
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const pageLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const skip = (currentPage - 1) * pageLimit;

    const pipeline = [
      { $match: filter },
      { $lookup: { from: "departures", localField: "_id", foreignField: "tourId", pipeline: [{ $match: departuresFilter }], as: "availableDepartures" } },
      { $set: { priceFrom: { $min: "$availableDepartures.adultPrice" }, hasUpcomingDeparture: { $gt: [{ $size: "$availableDepartures" }, 0] } } },
    ];
    
    if (Object.keys(priceFilter).length || dateFrom || dateTo) {
      pipeline.push({ $match: { hasUpcomingDeparture: true } });
    }
    
    pipeline.push({ $unset: ["availableDepartures", "description", "bookingRevision"] });
    pipeline.push({ $facet: { data: [{ $sort: sortCriteria }, { $skip: skip }, { $limit: pageLimit }], count: [{ $count: "total" }] } });
    
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
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Get tour by ID
// @route  GET /api/tours/:id
// @access Public/Private
export const getTourById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid tour ID" });
    }

    const filter = { _id: req.params.id };
    if (req.user?.role !== "admin") {
      filter.status = "published";
    }

    const tour = await Tour.findOne(filter);
    if (!tour) {
      return res.status(404).json({ message: "Tour không tồn tại." });
    }

    res.json(tour);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Create tour
// @route  POST /api/tours
// @access Private (Admin)
export const createTour = async (req, res) => {
  try {
    const { name, slug, summary, description, durationHours, themes, destinationIds, itinerary, images, meetingPoint, includes, excludes, childPolicy, cancellationPolicy, status } = req.body;

    if (!name || typeof name !== "string") return res.status(400).json({ message: "Name is required" });
    if (!slug || typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return res.status(400).json({ message: "Invalid slug format" });
    if (!summary || typeof summary !== "string") return res.status(400).json({ message: "Summary is required" });
    if (!description || typeof description !== "string") return res.status(400).json({ message: "Description is required" });
    if (typeof durationHours !== "number" || durationHours < 1 || durationHours > 720) return res.status(400).json({ message: "Invalid durationHours" });
    
    if (themes && Array.isArray(themes)) {
       for (const t of themes) {
           if (!ALLOWED_THEMES.includes(t)) return res.status(400).json({ message: "Invalid theme item" });
       }
    }
    
    if (destinationIds && !(await ensureDestinationsExist(destinationIds))) {
      return res.status(400).json({ message: "Có điểm đến không hợp lệ." });
    }
    
    if (itinerary && !Array.isArray(itinerary)) return res.status(400).json({ message: "itinerary must be an array" });
    
    if (!meetingPoint || typeof meetingPoint !== "string") return res.status(400).json({ message: "meetingPoint is required" });
    if (!cancellationPolicy || typeof cancellationPolicy !== "string") return res.status(400).json({ message: "cancellationPolicy is required" });
    
    const finalStatus = status || "draft";
    if (!ALLOWED_STATUSES.includes(finalStatus)) return res.status(400).json({ message: "Invalid status" });

    if (finalStatus === "published" && (!itinerary || itinerary.length === 0)) {
      return res.status(400).json({ message: "Tour xuất bản cần có lịch trình." });
    }
    
    const uniqueDestIds = destinationIds ? [...new Set(destinationIds)] : [];
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
      meetingPoint: meetingPoint.trim(),
      includes: Array.isArray(includes) ? includes : [],
      excludes: Array.isArray(excludes) ? excludes : [],
      childPolicy: childPolicy ? childPolicy.trim() : "",
      cancellationPolicy: cancellationPolicy.trim(),
      status: finalStatus
    });

    res.status(201).json(tour);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Slug đã tồn tại" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Update tour
// @route  PUT /api/tours/:id
// @access Private (Admin)
export const updateTour = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid tour ID" });
    }

    const tour = await Tour.findById(req.params.id);
    if (!tour) {
      return res.status(404).json({ message: "Tour không tồn tại." });
    }

    const { name, slug, summary, description, durationHours, themes, destinationIds, itinerary, images, meetingPoint, includes, excludes, childPolicy, cancellationPolicy, status } = req.body;

    if (name !== undefined) {
        if (typeof name !== "string" || !name.trim()) return res.status(400).json({ message: "Invalid name" });
        tour.name = name.trim();
    }
    if (slug !== undefined) {
      if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return res.status(400).json({ message: "Invalid slug format" });
      tour.slug = slug.trim();
    }
    if (summary !== undefined) tour.summary = summary.trim();
    if (description !== undefined) tour.description = description.trim();
    if (durationHours !== undefined) {
       if (typeof durationHours !== "number" || durationHours < 1 || durationHours > 720) return res.status(400).json({ message: "Invalid durationHours" });
       tour.durationHours = durationHours;
    }
    
    if (themes !== undefined) {
       if (!Array.isArray(themes)) return res.status(400).json({ message: "Themes must be array" });
       for (const t of themes) {
           if (!ALLOWED_THEMES.includes(t)) return res.status(400).json({ message: "Invalid theme item" });
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
       if (!Array.isArray(itinerary)) return res.status(400).json({ message: "itinerary must be an array" });
       tour.itinerary = itinerary;
    }
    
    if (images !== undefined) tour.images = Array.isArray(images) ? images : [];
    if (meetingPoint !== undefined) tour.meetingPoint = meetingPoint.trim();
    if (includes !== undefined) tour.includes = Array.isArray(includes) ? includes : [];
    if (excludes !== undefined) tour.excludes = Array.isArray(excludes) ? excludes : [];
    if (childPolicy !== undefined) tour.childPolicy = childPolicy.trim();
    if (cancellationPolicy !== undefined) tour.cancellationPolicy = cancellationPolicy.trim();
    
    if (status !== undefined) {
      if (!ALLOWED_STATUSES.includes(status)) return res.status(400).json({ message: "Invalid status" });
      tour.status = status;
    }

    if (tour.status === "published" && (!tour.itinerary || tour.itinerary.length === 0)) {
      return res.status(400).json({ message: "Tour xuất bản cần có lịch trình." });
    }
    
    const uniqueDestIds = tour.destinationIds.map(String);
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
    if (error.code === 11000) {
      return res.status(400).json({ message: "Slug đã tồn tại" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Delete tour
// @route  DELETE /api/tours/:id
// @access Private (Admin)
export const deleteTour = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid tour ID" });
    }

    const tour = await Tour.findById(req.params.id);
    if (!tour) {
      return res.status(404).json({ message: "Tour không tồn tại." });
    }

    tour.status = "archived";
    await tour.save();

    res.json({ message: "Đã lưu trữ tour.", data: tour });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
