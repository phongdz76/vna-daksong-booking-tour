import Coupon from "../models/Coupon.js";
import mongoose from "mongoose";
import { randomBytes } from "node:crypto";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Only customer-facing fields of currently usable offers are public.
export const getAvailableCoupons = async (req, res, next) => {
  try {
    const now = new Date();
    const filter = {
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
      $or: [
        { usageLimit: null },
        { $expr: { $lt: ["$usedCount", "$usageLimit"] } },
      ],
    };
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100,
    );
    const [data, total] = await Promise.all([
      Coupon.find(filter)
        .select(
          "code description discountType discountValue maxDiscount minOrderValue validUntil -_id",
        )
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Coupon.countDocuments(filter),
    ]);
    res.json({
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

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

    const sortCriteria =
      sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };

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
        pages: Math.ceil(total / pageLimit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ.", error: error.message });
  }
};

// @desc   Create a coupon
// @route  POST /api/coupons
// @access Private (Admin)
export const createCoupon = async (req, res, next) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      maxDiscount,
      minOrderValue,
      validFrom,
      validUntil,
      usageLimit,
      isActive,
    } = req.body;

    // 1. Kiểm tra các trường bắt buộc và kiểu dữ liệu.
    if (code !== undefined && (typeof code !== "string" || !code.trim())) {
      return res.status(400).json({ message: "Mã giảm giá không hợp lệ." });
    }
    if (!["percentage", "fixed"].includes(discountType)) {
      return res.status(400).json({ message: "Loại giảm giá không hợp lệ." });
    }
    if (
      typeof discountValue !== "number" ||
      !Number.isFinite(discountValue) ||
      discountValue < 0
    ) {
      return res
        .status(400)
        .json({ message: "Giá trị giảm giá không hợp lệ (phải >= 0)." });
    }
    if (discountType === "percentage" && discountValue > 100) {
      return res
        .status(400)
        .json({ message: "Phần trăm giảm không được vượt quá 100%." });
    }
    if (validUntil === undefined) {
      return res.status(400).json({ message: "Thời hạn không hợp lệ." });
    }
    if (description !== undefined && typeof description !== "string") {
      return res.status(400).json({ message: "Mô tả phải là chuỗi." });
    }
    if (
      maxDiscount !== undefined &&
      maxDiscount !== null &&
      (typeof maxDiscount !== "number" ||
        !Number.isFinite(maxDiscount) ||
        maxDiscount < 0)
    ) {
      return res.status(400).json({ message: "maxDiscount không hợp lệ." });
    }
    if (
      minOrderValue !== undefined &&
      (typeof minOrderValue !== "number" ||
        !Number.isFinite(minOrderValue) ||
        minOrderValue < 0)
    ) {
      return res.status(400).json({ message: "minOrderValue không hợp lệ." });
    }
    if (
      usageLimit !== undefined &&
      usageLimit !== null &&
      (!Number.isSafeInteger(usageLimit) || usageLimit < 0)
    ) {
      return res.status(400).json({ message: "usageLimit không hợp lệ." });
    }
    if (isActive !== undefined && typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive phải là boolean." });
    }
    if (
      validFrom !== undefined &&
      (typeof validFrom !== "string" ||
        !validFrom.trim() ||
        !Number.isFinite(new Date(validFrom).getTime()))
    ) {
      return res.status(400).json({ message: "validFrom không hợp lệ." });
    }
    if (
      validUntil !== undefined &&
      (typeof validUntil !== "string" ||
        !validUntil.trim() ||
        !Number.isFinite(new Date(validUntil).getTime()))
    ) {
      return res.status(400).json({ message: "validUntil không hợp lệ." });
    }

    // 2. Chuẩn hóa và lưu; model kiểm tra khoảng ngày hiệu lực.
    const fields = {
      description: description ? description.trim() : "",
      discountType,
      discountValue,
      maxDiscount: maxDiscount ?? null,
      minOrderValue: minOrderValue ?? 0,
      validFrom: validFrom ? new Date(validFrom) : Date.now(),
      validUntil: new Date(validUntil),
      usageLimit: usageLimit ?? null,
      isActive: isActive !== undefined ? isActive : true,
    };
    // Existing API clients may supply a custom code. Admin UI omits it.
    // The unique index is authoritative; retry a generated-code collision.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const newCoupon = await Coupon.create({
          ...fields,
          code:
            code === undefined
              ? `VNA-${randomBytes(5).toString("hex").toUpperCase()}`
              : code.trim().toUpperCase(),
        });
        return res.status(201).json({ data: newCoupon });
      } catch (error) {
        if (code !== undefined || error.code !== 11000 || attempt === 4)
          throw error;
      }
    }
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Mã giảm giá đã tồn tại." });
    }
    return next(error);
  }
};

// @desc   Update a coupon
// @route  PUT /api/coupons/:id
// @access Private (Admin)
export const updateCoupon = async (req, res, next) => {
  try {
    const {
      description,
      discountType,
      discountValue,
      maxDiscount,
      minOrderValue,
      validFrom,
      validUntil,
      usageLimit,
      isActive,
    } = req.body;

    // 1. Kiểm tra dữ liệu gửi lên, không ép chuỗi thành số hoặc boolean.
    if (
      discountValue !== undefined &&
      (typeof discountValue !== "number" ||
        !Number.isFinite(discountValue) ||
        discountValue < 0)
    ) {
      return res
        .status(400)
        .json({ message: "Giá trị giảm giá không hợp lệ." });
    }
    if (description !== undefined && typeof description !== "string") {
      return res.status(400).json({ message: "Mô tả phải là chuỗi." });
    }
    if (
      maxDiscount !== undefined &&
      maxDiscount !== null &&
      (typeof maxDiscount !== "number" ||
        !Number.isFinite(maxDiscount) ||
        maxDiscount < 0)
    ) {
      return res.status(400).json({ message: "maxDiscount không hợp lệ." });
    }
    if (
      minOrderValue !== undefined &&
      (typeof minOrderValue !== "number" ||
        !Number.isFinite(minOrderValue) ||
        minOrderValue < 0)
    ) {
      return res.status(400).json({ message: "minOrderValue không hợp lệ." });
    }
    if (
      usageLimit !== undefined &&
      usageLimit !== null &&
      (!Number.isSafeInteger(usageLimit) || usageLimit < 0)
    ) {
      return res.status(400).json({ message: "usageLimit không hợp lệ." });
    }
    if (isActive !== undefined && typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive phải là boolean." });
    }
    if (
      validFrom !== undefined &&
      (typeof validFrom !== "string" ||
        !validFrom.trim() ||
        !Number.isFinite(new Date(validFrom).getTime()))
    ) {
      return res.status(400).json({ message: "validFrom không hợp lệ." });
    }
    if (
      validUntil !== undefined &&
      (typeof validUntil !== "string" ||
        !validUntil.trim() ||
        !Number.isFinite(new Date(validUntil).getTime()))
    ) {
      return res.status(400).json({ message: "validUntil không hợp lệ." });
    }

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "ID không hợp lệ." });
    }

    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: "Không tìm thấy mã giảm giá." });
    }

    // 2. Chỉ cập nhật các trường được gửi lên.
    if (description !== undefined) {
      coupon.description = description.trim();
    }
    if (discountType !== undefined) {
      if (!["percentage", "fixed"].includes(discountType)) {
        return res.status(400).json({ message: "Loại giảm giá không hợp lệ." });
      }
      coupon.discountType = discountType;
    }
    if (discountValue !== undefined) {
      coupon.discountValue = discountValue;
    }
    if (coupon.discountType === "percentage" && coupon.discountValue > 100) {
      return res
        .status(400)
        .json({ message: "Phần trăm giảm không được vượt quá 100%." });
    }

    if (maxDiscount !== undefined) {
      coupon.maxDiscount = maxDiscount;
    }
    if (minOrderValue !== undefined) {
      coupon.minOrderValue = minOrderValue;
    }
    if (validFrom !== undefined) {
      coupon.validFrom = new Date(validFrom);
    }
    if (validUntil !== undefined) {
      coupon.validUntil = new Date(validUntil);
    }
    if (usageLimit !== undefined) {
      coupon.usageLimit = usageLimit;
    }
    if (isActive !== undefined) {
      coupon.isActive = isActive;
    }

    // 3. Model kiểm tra khoảng ngày và version trước khi lưu.
    await coupon.save();
    res.json({ data: coupon });
  } catch (error) {
    return next(error);
  }
};

// @desc   Delete a coupon
// @route  DELETE /api/coupons/:id
// @access Private (Admin)
export const deleteCoupon = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return res.status(400).json({ message: "ID không hợp lệ." });

    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon)
      return res.status(404).json({ message: "Không tìm thấy mã giảm giá." });

    res.json({ message: "Đã xóa mã giảm giá." });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ.", error: error.message });
  }
};
