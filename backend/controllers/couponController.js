import Coupon from "../models/Coupon.js";
import mongoose from "mongoose";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// @desc   Get all coupons
// @route  GET /api/coupons
// @access Private (Admin)
export const getCoupons = async (req, res) => {
  try {
    const { isActive, sort = "newest", page = 1, limit = 20 } = req.query;
    
    let filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const sortCriteria = sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };
    
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const pageLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (currentPage - 1) * pageLimit;

    const coupons = await Coupon.find(filter)
      .sort(sortCriteria)
      .skip(skip)
      .limit(pageLimit)
      .lean();

    const total = await Coupon.countDocuments(filter);

    res.json({
      data: coupons,
      pagination: {
        page: currentPage,
        limit: pageLimit,
        total,
        pages: Math.ceil(total / pageLimit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ.", error: error.message });
  }
};

// @desc   Create a coupon
// @route  POST /api/coupons
// @access Private (Admin)
export const createCoupon = async (req, res) => {
  try {
    const { code, description, discountType, discountValue, maxDiscount, minOrderValue, validFrom, validUntil, usageLimit, isActive } = req.body;

    if (!code || typeof code !== "string" || !code.trim()) {
      return res.status(400).json({ message: "Mã giảm giá là bắt buộc." });
    }
    if (!["percentage", "fixed"].includes(discountType)) {
      return res.status(400).json({ message: "Loại giảm giá không hợp lệ." });
    }
    if (typeof discountValue !== "number" || discountValue < 0) {
      return res.status(400).json({ message: "Giá trị giảm giá không hợp lệ (phải >= 0)." });
    }
    if (discountType === "percentage" && discountValue > 100) {
      return res.status(400).json({ message: "Phần trăm giảm không được vượt quá 100%." });
    }
    if (!validUntil || isNaN(new Date(validUntil).getTime())) {
      return res.status(400).json({ message: "Thời hạn không hợp lệ." });
    }

    const newCoupon = await Coupon.create({
      code: code.trim().toUpperCase(),
      description: description ? String(description).trim() : "",
      discountType,
      discountValue,
      maxDiscount: maxDiscount >= 0 ? maxDiscount : null,
      minOrderValue: minOrderValue >= 0 ? minOrderValue : 0,
      validFrom: validFrom ? new Date(validFrom) : Date.now(),
      validUntil: new Date(validUntil),
      usageLimit: (Number.isSafeInteger(usageLimit) && usageLimit >= 0) ? usageLimit : null,
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({ data: newCoupon });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Mã giảm giá đã tồn tại." });
    }
    res.status(500).json({ message: "Lỗi máy chủ.", error: error.message });
  }
};

// @desc   Update a coupon
// @route  PUT /api/coupons/:id
// @access Private (Admin)
export const updateCoupon = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "ID không hợp lệ." });

    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: "Không tìm thấy mã giảm giá." });

    const { description, discountType, discountValue, maxDiscount, minOrderValue, validFrom, validUntil, usageLimit, isActive } = req.body;

    if (description !== undefined) coupon.description = String(description).trim();
    if (discountType !== undefined) {
      if (!["percentage", "fixed"].includes(discountType)) return res.status(400).json({ message: "Loại giảm giá không hợp lệ." });
      coupon.discountType = discountType;
    }
    if (discountValue !== undefined) {
      if (typeof discountValue !== "number" || discountValue < 0) return res.status(400).json({ message: "Giá trị giảm giá không hợp lệ." });
      coupon.discountValue = discountValue;
    }
    
    // Check percentage limit if either type or value is being updated
    if (coupon.discountType === "percentage" && coupon.discountValue > 100) {
      return res.status(400).json({ message: "Phần trăm giảm không được vượt quá 100%." });
    }

    if (maxDiscount !== undefined) coupon.maxDiscount = maxDiscount >= 0 ? maxDiscount : null;
    if (minOrderValue !== undefined) coupon.minOrderValue = minOrderValue >= 0 ? minOrderValue : 0;
    if (validFrom !== undefined) coupon.validFrom = new Date(validFrom);
    if (validUntil !== undefined) coupon.validUntil = new Date(validUntil);
    if (usageLimit !== undefined) coupon.usageLimit = (Number.isSafeInteger(usageLimit) && usageLimit >= 0) ? usageLimit : null;
    if (isActive !== undefined) coupon.isActive = Boolean(isActive);

    await coupon.save();
    res.json({ data: coupon });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ.", error: error.message });
  }
};

// @desc   Delete a coupon
// @route  DELETE /api/coupons/:id
// @access Private (Admin)
export const deleteCoupon = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "ID không hợp lệ." });

    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ message: "Không tìm thấy mã giảm giá." });

    res.json({ message: "Đã xóa mã giảm giá." });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ.", error: error.message });
  }
};
