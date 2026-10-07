import Departure from "../models/Departure.js";
import Tour from "../models/Tour.js";
import Booking from "../models/Booking.js";
import mongoose from "mongoose";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const ALLOWED_STATUSES = ["open", "closed"];

// @desc   Get departures by tour ID
// @route  GET /api/departures/tour/:id
// @access Public/Private
export const getTourDepartures = async (req, res) => {
  try {
    const tourId = req.params.id;
    if (!isValidObjectId(tourId)) {
        return res.status(400).json({ message: "Invalid tour ID" });
    }
    const tourFilter = { _id: tourId };
    if (req.user?.role !== "admin") {
        tourFilter.status = "published";
    }
    
    const tour = await Tour.findOne(tourFilter);
    if (!tour) {
        return res.status(404).json({ message: "Tour không tồn tại." });
    }
    
    const now = new Date();
    let filter = { tourId };
    
    if (req.user?.role !== "admin") {
        filter.status = "open";
        filter.bookingDeadline = { $gt: now };
        filter.departureAt = { $gt: now };
    }
    
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const departures = await Departure.find(filter)
      .sort({ departureAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();
      
    const total = await Departure.countDocuments(filter);

    res.json({
      data: departures,
      pagination: {
        page, limit, total, pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Get departures list
// @route  GET /api/departures
// @access Private (Admin)
export const getDepartures = async (req, res) => {
  try {
    let filter = {};
    if (req.query.tourId) {
        if (!isValidObjectId(req.query.tourId)) return res.status(400).json({ message: "Invalid tourId" });
        filter.tourId = req.query.tourId;
    }
    if (req.query.status) {
        if (!ALLOWED_STATUSES.includes(req.query.status)) return res.status(400).json({ message: "Invalid status" });
        filter.status = req.query.status;
    }
    
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const departures = await Departure.find(filter)
      .sort({ departureAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();
      
    const total = await Departure.countDocuments(filter);

    res.json({
      data: departures,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Get departure by ID
// @route  GET /api/departures/:id
// @access Public/Private
export const getDepartureById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid ID" });
    const departure = await Departure.findById(req.params.id);
    if (!departure) return res.status(404).json({ message: "Chuyến không tồn tại" });
    res.json(departure);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Create departure
// @route  POST /api/departures
// @access Private (Admin)
export const createDeparture = async (req, res) => {
  try {
    const { tourId, departureAt, bookingDeadline, adultPrice, childPrice, maxGuestsPerBooking, status } = req.body;
    
    if (!tourId || !isValidObjectId(tourId)) return res.status(400).json({ message: "Invalid tourId" });
    if (!departureAt || isNaN(Date.parse(departureAt))) return res.status(400).json({ message: "Invalid departureAt" });
    if (!bookingDeadline || isNaN(Date.parse(bookingDeadline))) return res.status(400).json({ message: "Invalid bookingDeadline" });
    if (!Number.isSafeInteger(adultPrice) || adultPrice < 0) return res.status(400).json({ message: "Invalid adultPrice" });
    
    let finalChildPrice = null;
    if (childPrice !== undefined && childPrice !== null) {
        if (!Number.isSafeInteger(childPrice) || childPrice < 0) return res.status(400).json({ message: "Invalid childPrice" });
        finalChildPrice = childPrice;
    }
    
    let finalMaxGuests = 20;
    if (maxGuestsPerBooking !== undefined) {
        if (!Number.isSafeInteger(maxGuestsPerBooking) || maxGuestsPerBooking < 1 || maxGuestsPerBooking > 100) return res.status(400).json({ message: "Invalid maxGuests" });
        finalMaxGuests = maxGuestsPerBooking;
    }
    
    const finalStatus = status || "open";
    if (!ALLOWED_STATUSES.includes(finalStatus)) return res.status(400).json({ message: "Invalid status" });

    const tour = await Tour.findOne({ _id: tourId, status: { $ne: "archived" } });
    if (!tour) return res.status(404).json({ message: "Tour không tồn tại hoặc đã bị lưu trữ." });
    
    const depAtDate = new Date(departureAt);
    const deadlineDate = new Date(bookingDeadline);
    if (deadlineDate >= depAtDate) {
        return res.status(400).json({ message: "Hạn đặt phải trước thời điểm khởi hành." });
    }

    const departure = await Departure.create({
      tourId,
      departureAt: depAtDate,
      bookingDeadline: deadlineDate,
      adultPrice,
      childPrice: finalChildPrice,
      maxGuestsPerBooking: finalMaxGuests,
      status: finalStatus
    });

    res.status(201).json(departure);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Update departure
// @route  PUT /api/departures/:id
// @access Private (Admin)
export const updateDeparture = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid ID" });
    const departure = await Departure.findById(req.params.id);
    if (!departure) return res.status(404).json({ message: "Chuyến không tồn tại" });
    
    const { departureAt, bookingDeadline, adultPrice, childPrice, maxGuestsPerBooking, status } = req.body;
    
    if (departureAt !== undefined) {
       if (isNaN(Date.parse(departureAt))) return res.status(400).json({ message: "Invalid departureAt" });
       const newDepAt = new Date(departureAt);
       if (newDepAt.getTime() !== departure.departureAt.getTime()) {
           const hasBookings = await Booking.exists({ departureId: departure._id, status: { $in: ["pending_confirmation", "confirmed"] } });
           if (hasBookings) {
               return res.status(409).json({ message: "Chuyến đã có yêu cầu đặt. Hãy tạo chuyến mới và xử lý với khách trước khi đổi lịch." });
           }
       }
       departure.departureAt = newDepAt;
    }
    
    if (bookingDeadline !== undefined) {
       if (isNaN(Date.parse(bookingDeadline))) return res.status(400).json({ message: "Invalid bookingDeadline" });
       departure.bookingDeadline = new Date(bookingDeadline);
    }
    
    if (adultPrice !== undefined) {
       if (!Number.isSafeInteger(adultPrice) || adultPrice < 0) return res.status(400).json({ message: "Invalid adultPrice" });
       departure.adultPrice = adultPrice;
    }
    
    if (childPrice !== undefined) {
        if (childPrice === null) {
            departure.childPrice = null;
        } else {
            if (!Number.isSafeInteger(childPrice) || childPrice < 0) return res.status(400).json({ message: "Invalid childPrice" });
            departure.childPrice = childPrice;
        }
    }
    
    if (maxGuestsPerBooking !== undefined) {
        if (!Number.isSafeInteger(maxGuestsPerBooking) || maxGuestsPerBooking < 1 || maxGuestsPerBooking > 100) return res.status(400).json({ message: "Invalid maxGuests" });
        departure.maxGuestsPerBooking = maxGuestsPerBooking;
    }
    
    if (status !== undefined) {
        if (!ALLOWED_STATUSES.includes(status)) return res.status(400).json({ message: "Invalid status" });
        departure.status = status;
    }
    
    if (departure.bookingDeadline >= departure.departureAt) {
        return res.status(400).json({ message: "Hạn đặt phải trước thời điểm khởi hành." });
    }

    await departure.save();
    res.json(departure);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Delete departure
// @route  DELETE /api/departures/:id
// @access Private (Admin)
export const deleteDeparture = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid ID" });
    const departure = await Departure.findById(req.params.id);
    if (!departure) return res.status(404).json({ message: "Chuyến không tồn tại" });
    
    departure.status = "closed";
    await departure.save();
    
    res.json({ message: "Đã đóng nhận yêu cầu cho chuyến.", data: departure });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
