import { randomBytes, createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Booking, { bookingStatuses } from "../models/Booking.js";
import Departure from "../models/Departure.js";
import Tour from "../models/Tour.js";
import Destination from "../models/Destination.js";
import Coupon from "../models/Coupon.js";
import User from "../models/User.js";
import PaymentTransaction from "../models/PaymentTransaction.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

function secret() {
  const s = process.env.JWT_SECRET || "";
  if (s.length < 32) throw new Error("Chưa cấu hình JWT_SECRET (ít nhất 32 ký tự).");
  return s;
}

function signToken(payload, audience = "session", expiresIn = "1d") {
  return jwt.sign(payload, secret(), { algorithm: "HS256", issuer: "vna-daksong-api", audience, expiresIn });
}

function verifyToken(token, audience = "session") {
  try {
    return jwt.verify(token, secret(), { algorithms: ["HS256"], issuer: "vna-daksong-api", audience });
  } catch {
    throw new Error("INVALID_TOKEN");
  }
}

// Chuẩn hóa object trước khi hash — sort keys để thứ tự không ảnh hưởng
function canonicalize(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(canonicalize);
  const sorted = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = canonicalize(obj[key]);
  }
  return sorted;
}

const fingerprint = value => createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");

function publicBooking(booking) {
  const value = booking.toObject ? booking.toObject() : { ...booking };
  delete value.idempotencyKey;
  delete value.requestHash;
  return value;
}

// @desc   Get a quote
// @route  POST /api/bookings/quote
// @access Public/Private
  export const getBookingQuote = async (req, res) => {
  try {
    const { departureId, adults, children, couponCode } = req.body;
    
    if (!departureId || !isValidObjectId(departureId)) return res.status(400).json({ message: "departureId không hợp lệ." });
    
    if (!Number.isSafeInteger(adults) || adults < 1 || adults > 100) return res.status(400).json({ message: "Số lượng người lớn không hợp lệ." });
    const c = children ?? 0;
    if (!Number.isSafeInteger(c) || c < 0 || c > 100) return res.status(400).json({ message: "Số lượng trẻ em không hợp lệ." });
    
    const departure = await Departure.findById(departureId);
    if (!departure) return res.status(404).json({ message: "Chuyến không tồn tại." });
    
    const tour = await Tour.findById(departure.tourId);
    if (!tour) return res.status(404).json({ message: "Tour không tồn tại." });
    
    const now = new Date();
    if (tour.status !== "published" || departure.status !== "open" || new Date(departure.bookingDeadline) <= now || new Date(departure.departureAt) <= now) {
      return res.status(409).json({ message: "Chuyến hiện không nhận yêu cầu đặt." });
    }
    
    if (adults + c > departure.maxGuestsPerBooking) {
      return res.status(400).json({ message: `Mỗi yêu cầu nhận tối đa ${departure.maxGuestsPerBooking} khách.` });
    }
    
    if (c > 0 && (departure.childPrice === null || departure.childPrice === undefined || !tour.childPolicy)) {
      return res.status(400).json({ message: "Chuyến chưa có chính sách/giá trẻ em. Vui lòng liên hệ VNA." });
    }
    
    let total = departure.adultPrice * adults + (departure.childPrice ?? 0) * c;
    let appliedCoupon = null;
    let discountAmount = 0;
    
    if (couponCode) {
      if (typeof couponCode !== "string") return res.status(400).json({ message: "Mã giảm giá không hợp lệ." });
      const coupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase() });
      if (!coupon) return res.status(400).json({ message: "Mã giảm giá không tồn tại." });
      if (!coupon.isValid()) return res.status(400).json({ message: "Mã giảm giá đã hết hạn hoặc hết lượt sử dụng." });
      discountAmount = coupon.calculateDiscount(total);
      if (discountAmount > 0) {
        total -= discountAmount;
        appliedCoupon = coupon.code;
      } else {
        return res.status(400).json({ message: "Đơn hàng chưa đạt điều kiện áp dụng mã giảm giá này." });
      }
    }
    
    const snapshot = {
      tourName: tour.name,
      departureAt: new Date(departure.departureAt).toISOString(),
      meetingPoint: tour.meetingPoint,
      childPolicy: tour.childPolicy || "",
      cancellationPolicy: tour.cancellationPolicy,
      adultPrice: departure.adultPrice,
      childPrice: departure.childPrice ?? null,
      subTotal: departure.adultPrice * adults + (departure.childPrice ?? 0) * c,
      discountAmount,
      appliedCoupon,
      total,
      currency: "VND",
      durationHours: tour.durationHours,
    };
    
    const hash = fingerprint({ departureId: String(departure._id), adults, children: c, ...snapshot });
    
    const expiresIn = Math.min(600, Math.floor((departure.bookingDeadline.getTime() - Date.now()) / 1000));
    if (expiresIn < 1) return res.status(409).json({ message: "Chuyến đã hết hạn nhận yêu cầu." });
    
    res.json({
      departureId, adults, children: c, ...snapshot,
      quoteToken: signToken({ departureId, adults, children: c, hash }, "quote", expiresIn),
      expiresAt: new Date(Date.now() + expiresIn * 1000),
      message: "Giá tham khảo để gửi yêu cầu; chỗ được VNA xác nhận sau.",
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ.", error: error.message });
  }
};

// @desc   Create booking
// @route  POST /api/bookings
// @access Private
export const createBooking = async (req, res) => {
  try {
    const { quoteToken, contact, note, couponCode, paymentMethod } = req.body;
    
    if (!quoteToken || typeof quoteToken !== "string") return res.status(400).json({ message: "quoteToken là bắt buộc." });
    if (!contact || typeof contact !== "object" || contact === null) {
      return res.status(400).json({ message: "Thông tin liên hệ là bắt buộc." });
    }
    if (typeof contact.name !== "string" || !contact.name.trim()) {
      return res.status(400).json({ message: "Tên liên hệ là bắt buộc." });
    }
    if (typeof contact.phone !== "string" || !contact.phone.trim()) {
      return res.status(400).json({ message: "Số điện thoại liên hệ là bắt buộc." });
    }
    
    const idempotencyKey = req.get("Idempotency-Key");
    if (!idempotencyKey || typeof idempotencyKey !== "string" || idempotencyKey.length < 8) {
       return res.status(400).json({ message: "Header Idempotency-Key là bắt buộc (ít nhất 8 ký tự)." });
    }
    
    // Chuẩn hóa contact trước khi hash — thứ tự key không ảnh hưởng
    const normalizedContact = { name: contact.name.trim(), phone: contact.phone.trim() };
    const normalizedNote = typeof note === "string" ? note.trim() : "";
    const requestHash = fingerprint({ quoteToken, contact: normalizedContact, note: normalizedNote, couponCode: couponCode || "", paymentMethod: paymentMethod || "" });
    const key = { userId: req.user._id, idempotencyKey };
    
    const existing = await Booking.findOne(key).select("+requestHash");
    if (existing) {
       if (existing.requestHash !== requestHash) return res.status(409).json({ message: "Idempotency-Key đã dùng cho một yêu cầu khác." });
       return res.status(200).json({ data: publicBooking(existing), replayed: true });
    }
    
    let claims;
    try { 
      claims = verifyToken(quoteToken, "quote"); 
    } catch (error) {
      return res.status(409).json({ message: "Báo giá không hợp lệ hoặc đã hết hạn. Vui lòng lấy báo giá mới." });
    }
    
    let booking;
    try {
      booking = await mongoose.connection.transaction(async session => {
        const firstDeparture = await Departure.findById(claims.departureId).session(session);
        if (!firstDeparture) throw new Error("DEPARTURE_NOT_FOUND");
        
        const tour = await Tour.findOneAndUpdate({ _id: firstDeparture.tourId, status: "published" },
          { $inc: { bookingRevision: 1, __v: 1 } }, { returnDocument: "after", session });
        if (!tour) throw new Error("TOUR_UNAVAILABLE");
        
        const now = new Date();
        const departure = await Departure.findOneAndUpdate({
          _id: claims.departureId, status: "open", bookingDeadline: { $gt: now }, departureAt: { $gt: now },
        }, { $inc: { bookingRevision: 1, __v: 1 } }, { returnDocument: "after", session });
        if (!departure) throw new Error("DEPARTURE_UNAVAILABLE");
        
        // Kiểm tra maxGuestsPerBooking — đảm bảo giới hạn chưa thay đổi
        if (claims.adults + claims.children > departure.maxGuestsPerBooking) {
          throw new Error("MAX_GUESTS_EXCEEDED");
        }
        
        let total = departure.adultPrice * claims.adults + (departure.childPrice ?? 0) * claims.children;
        let appliedCoupon = null;
        let appliedCouponId = null;
        let discountAmount = 0;
        
        if (couponCode) {
          if (typeof couponCode !== "string") throw new Error("INVALID_COUPON");
          const coupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase() }).session(session);
          if (!coupon) throw new Error("COUPON_NOT_FOUND");
          if (!coupon.isValid()) throw new Error("COUPON_EXPIRED");
          discountAmount = coupon.calculateDiscount(total);
          if (discountAmount > 0) {
            total -= discountAmount;
            appliedCoupon = coupon.code;
            appliedCouponId = coupon._id;
            coupon.usedCount += 1;
            await coupon.save({ session });
          } else {
            throw new Error("COUPON_NOT_APPLICABLE");
          }
        }

        const snapshot = {
          tourName: tour.name,
          departureAt: new Date(departure.departureAt).toISOString(),
          meetingPoint: tour.meetingPoint,
          childPolicy: tour.childPolicy || "",
          cancellationPolicy: tour.cancellationPolicy,
          adultPrice: departure.adultPrice,
          childPrice: departure.childPrice ?? null,
          subTotal: departure.adultPrice * claims.adults + (departure.childPrice ?? 0) * claims.children,
          discountAmount,
          appliedCoupon,
          total,
          currency: "VND",
          durationHours: tour.durationHours,
        };
        const currentHash = fingerprint({ departureId: String(departure._id), adults: claims.adults, children: claims.children, ...snapshot });
        if (currentHash !== claims.hash) throw new Error("QUOTE_CHANGED");
        
        const validPaymentMethods = ["qr_transfer", "cash_on_arrival", "zalopay"];
        const pMethod = validPaymentMethods.includes(paymentMethod) ? paymentMethod : "cash_on_arrival";

        const [created] = await Booking.create([{
          code: `VNA-${randomBytes(6).toString("hex").toUpperCase()}`,
          ...key, requestHash,
          tourId: tour._id, departureId: departure._id,
          adults: claims.adults, children: claims.children,
          contact: normalizedContact,
          note: normalizedNote,
          couponCode: appliedCoupon || "",
          couponId: appliedCouponId,
          paymentMethod: pMethod,
          paymentStatus: "unpaid",
          snapshot,
          status: "pending_confirmation",
          history: [{ status: "pending_confirmation", actorId: req.user._id, at: now }],
        }], { session });
        return created;
      });
    } catch (error) {
      if (error.code === 11000) {
        const duplicate = await Booking.findOne(key).select("+requestHash");
        if (duplicate) {
           if (duplicate.requestHash !== requestHash) return res.status(409).json({ message: "Idempotency-Key xung đột." });
           return res.status(200).json({ data: publicBooking(duplicate), replayed: true });
        }
      }
      if (error.message === "DEPARTURE_NOT_FOUND" || error.message === "DEPARTURE_UNAVAILABLE" || error.message === "TOUR_UNAVAILABLE") {
          return res.status(409).json({ message: "Chuyến không còn nhận yêu cầu." });
      }
      if (error.message === "QUOTE_CHANGED") {
          return res.status(409).json({ message: "Giá hoặc điều kiện chuyến đã thay đổi. Vui lòng kiểm tra báo giá mới." });
      }
      if (error.message === "MAX_GUESTS_EXCEEDED") {
          return res.status(400).json({ message: "Số khách vượt quá giới hạn cho phép của chuyến. Vui lòng lấy báo giá mới." });
      }
      if (error.message === "COUPON_NOT_FOUND") {
          return res.status(400).json({ message: "Mã giảm giá không tồn tại." });
      }
      if (error.message === "COUPON_EXPIRED") {
          return res.status(400).json({ message: "Mã giảm giá đã hết hạn hoặc hết lượt sử dụng." });
      }
      if (error.message === "COUPON_NOT_APPLICABLE") {
          return res.status(400).json({ message: "Đơn hàng chưa đạt điều kiện áp dụng mã giảm giá này." });
      }
      if (error.message === "INVALID_COUPON") {
          return res.status(400).json({ message: "Mã giảm giá không hợp lệ." });
      }
      throw error;
    }
    res.status(201).json({ data: publicBooking(booking), replayed: false });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ.", error: error.message });
  }
};

// @desc   Get my bookings
// @route  GET /api/bookings/mine
// @access Private
export const getMyBookings = async (req, res) => {
  try {
    let filter = { userId: req.user._id };
    if (req.query.status) {
       if (!bookingStatuses.includes(req.query.status)) return res.status(400).json({ message: "Trạng thái không hợp lệ." });
       filter.status = req.query.status;
    }
    
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const bookings = await Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
      
    const total = await Booking.countDocuments(filter);

    res.json({
      data: bookings,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ.", error: error.message });
  }
};

// @desc   Get booking by id
// @route  GET /api/bookings/:id
// @access Private
export const getBookingById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "ID không hợp lệ." });
    const filter = { _id: req.params.id };
    if (req.user.role !== "admin") filter.userId = req.user._id;
    
    const booking = await Booking.findOne(filter);
    if (!booking) return res.status(404).json({ message: "Đơn không tồn tại." });
    const payments = await PaymentTransaction.find({ bookingId: booking._id })
      .select("appTransId amount status paidAt refundRequestId providerRefundId refundState refundedAt createdAt")
      .sort({ createdAt: -1 }).lean();
    res.json({ data: booking, payments });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ.", error: error.message });
  }
};

// Dùng chung cho khách hủy đơn và admin cập nhật trạng thái.
async function changeStatus(req, res, admin) {
  const { status, reason } = req.body;
  let newStatus = "cancelled";
  if (admin) {
    newStatus = status;
  }

  // 1. Kiểm tra đầu vào trước khi mở transaction.
  if (admin && !bookingStatuses.includes(newStatus)) {
    return res.status(400).json({ message: "Trạng thái không hợp lệ." });
  }
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "ID không hợp lệ." });
  }
  if (reason !== undefined && (typeof reason !== "string" || reason.trim().length > 1000)) {
    return res.status(400).json({ message: "Lý do phải là chuỗi tối đa 1000 ký tự." });
  }

  let normalizedReason = "";
  if (typeof reason === "string") {
    normalizedReason = reason.trim();
  }

  const isClosingBooking = ["cancelled", "rejected"].includes(newStatus);
  if (isClosingBooking && !normalizedReason) {
    return res.status(400).json({ message: "Cần lý do hủy/từ chối đơn." });
  }

  const filter = { _id: req.params.id };
  if (!admin) {
    filter.userId = req.user._id;
  }

  let transitions = {
    pending_confirmation: ["cancelled"],
    confirmed: ["cancelled"],
  };
  if (admin) {
    transitions = {
      pending_confirmation: ["confirmed", "cancelled", "rejected"],
      confirmed: ["completed", "cancelled"],
    };
  }

  // Mọi cập nhật trạng thái, voucher, khách và điểm cùng commit hoặc cùng rollback.
  const updatedBooking = await mongoose.connection.transaction(async session => {
    // 2. Kiểm tra trạng thái hiện tại và giờ kết thúc tour.
    const currentBooking = await Booking.findOne(filter).session(session);
    if (!currentBooking) {
      throw new Error("BOOKING_NOT_FOUND");
    }
    if (!transitions[currentBooking.status]?.includes(newStatus)) {
      throw new Error("BOOKING_STATUS_CONFLICT");
    }

    if (newStatus === "completed") {
      const departureAt = new Date(currentBooking.snapshot.departureAt);
      const durationHours = currentBooking.snapshot.durationHours || 0;
      const tourEndTime = new Date(departureAt.getTime() + durationHours * 60 * 60 * 1000);
      if (tourEndTime > new Date()) {
        throw new Error("TOUR_NOT_FINISHED");
      }
    }

    // 3. Ghi đơn trước để request cạnh tranh không cùng hoàn quota hoặc cộng điểm.
    const previousStatus = currentBooking.status;
    currentBooking.status = newStatus;
    currentBooking.history.push({
      status: newStatus,
      actorId: req.user._id,
      reason: normalizedReason,
      at: new Date(),
    });
    if (isClosingBooking && currentBooking.paymentStatus === "paid") {
      currentBooking.paymentStatus = "refund_pending";
    }
    await currentBooking.save({ session });

    // 4. Hoàn lượt đúng voucher đã dùng và đồng bộ giao dịch cần hoàn tiền.
    if (isClosingBooking && currentBooking.couponCode) {
      const couponFilter = { usedCount: { $gt: 0 } };
      if (currentBooking.couponId) {
        couponFilter._id = currentBooking.couponId;
      } else {
        // Đơn cũ chưa lưu couponId: không trừ coupon mới được tạo lại cùng code.
        couponFilter.code = currentBooking.couponCode;
        couponFilter.createdAt = { $lte: currentBooking.createdAt };
      }

      await Coupon.findOneAndUpdate(
        couponFilter,
        { $inc: { usedCount: -1, __v: 1 } },
        { session, runValidators: true }
      );
    }
    if (isClosingBooking) {
      await PaymentTransaction.updateMany(
        { bookingId: currentBooking._id, status: "success" },
        {
          $set: { status: "refund_pending" },
          $inc: { __v: 1 },
        },
        { session }
      );
    }

    // 5. soldCount chỉ đếm khách confirmed/completed, không đếm callback thanh toán.
    const totalGuests = currentBooking.adults + currentBooking.children;
    if (newStatus === "confirmed") {
      const tour = await Tour.findByIdAndUpdate(
        currentBooking.tourId,
        { $inc: { soldCount: totalGuests, __v: 1 } },
        { session }
      );
      if (!tour) {
        throw new Error("BOOKING_TOUR_NOT_FOUND");
      }
    } else if (previousStatus === "confirmed" && newStatus === "cancelled") {
      await Tour.findByIdAndUpdate(
        currentBooking.tourId,
        [{
          $set: {
            soldCount: { $max: [0, { $subtract: ["$soldCount", totalGuests] }] },
            __v: { $add: ["$__v", 1] },
          },
        }],
        { session, updatePipeline: true }
      );
    }

    // 6. Hoàn thành đơn và cộng điểm trong cùng transaction.
    if (newStatus === "completed") {
      const pointsEarned = Math.floor(currentBooking.snapshot.total / 10000);
      if (pointsEarned > 0) {
        const user = await User.findById(currentBooking.userId).session(session);
        if (!user) {
          throw new Error("BOOKING_USER_NOT_FOUND");
        }

        user.loyaltyPoints += pointsEarned;
        if (user.loyaltyPoints >= 5000) {
          user.membershipTier = "Kim Cương";
        } else if (user.loyaltyPoints >= 1000) {
          user.membershipTier = "Vàng";
        } else {
          user.membershipTier = "Bạc";
        }

        await user.save({ session });
      }
    }

    return currentBooking;
  });

  res.json({ data: updatedBooking });
}

// @desc   Cancel booking (user)
// @route  PATCH /api/bookings/:id/cancel
// @access Private
export const cancelBooking = async (req, res, next) => {
  try {
    return await changeStatus(req, res, false);
  } catch (error) {
    if (error.message === "BOOKING_NOT_FOUND") {
      return res.status(404).json({ message: "Đơn không tồn tại." });
    }
    if (error.message === "BOOKING_STATUS_CONFLICT") {
      return res.status(409).json({ message: "Không thể chuyển trạng thái đơn theo yêu cầu." });
    }
    return next(error);
  }
};

// @desc   Update booking status (Admin)
// @route  PATCH /api/bookings/:id/status
// @access Private (Admin)
export const updateBookingStatus = async (req, res, next) => {
  try {
    return await changeStatus(req, res, true);
  } catch (error) {
    if (error.message === "BOOKING_NOT_FOUND") {
      return res.status(404).json({ message: "Đơn không tồn tại." });
    }
    if (error.message === "BOOKING_STATUS_CONFLICT") {
      return res.status(409).json({ message: "Không thể chuyển trạng thái đơn theo yêu cầu." });
    }
    if (error.message === "TOUR_NOT_FINISHED") {
      return res.status(409).json({ message: "Tour chưa kết thúc nên chưa thể hoàn thành." });
    }
    if (error.message === "BOOKING_TOUR_NOT_FOUND") {
      return res.status(409).json({ message: "Tour của đơn không còn tồn tại." });
    }
    if (error.message === "BOOKING_USER_NOT_FOUND") {
      return res.status(409).json({ message: "Tài khoản của đơn không còn tồn tại." });
    }
    return next(error);
  }
};

// @desc   Get all bookings (Admin)
// @route  GET /api/bookings
// @access Private (Admin)
export const getBookings = async (req, res) => {
  try {
    const filter = req.user.role === "admin" ? {} : { userId: req.user._id };
    if (req.query.status) {
        if (!bookingStatuses.includes(req.query.status)) return res.status(400).json({ message: "Trạng thái không hợp lệ." });
        filter.status = req.query.status;
    }
    if (req.query.departureId) {
        if (!isValidObjectId(req.query.departureId)) return res.status(400).json({ message: "departureId không hợp lệ." });
        filter.departureId = req.query.departureId;
    }
    if (req.query.code && typeof req.query.code === "string") {
        filter.code = req.query.code.trim().toUpperCase();
    }
    
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const bookings = await Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
      
    const total = await Booking.countDocuments(filter);

    res.json({
      data: bookings,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ.", error: error.message });
  }
};

// @desc   Get dashboard data (Admin)
// @route  GET /api/bookings/dashboard-data
// @access Private (Admin)
export const getDashboardData = async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Không có quyền truy cập." });
    
    const [bookings, tours, destinations, openDepartures, revenueAgg] = await Promise.all([
      Booking.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Tour.countDocuments({ status: "published" }),
      Destination.countDocuments({ status: "published" }),
      Departure.countDocuments({ status: "open", bookingDeadline: { $gt: new Date() } }),
      Booking.aggregate([
        { $match: { status: { $in: ["confirmed", "completed"] } } },
        { $group: { _id: null, totalRevenue: { $sum: "$snapshot.total" } } }
      ])
    ]);
    
    const bookingsData = {};
    for (const item of bookings) {
       bookingsData[item._id] = item.count;
    }
    
    const totalRevenue = revenueAgg[0]?.totalRevenue || 0;
    
    res.json({ bookings: bookingsData, tours, destinations, openDepartures, totalRevenue });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ.", error: error.message });
  }
};
