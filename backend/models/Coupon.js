import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String, default: "" },
  discountType: { type: String, enum: ["percentage", "fixed"], required: true },
  discountValue: { type: Number, required: true, min: 0 }, // e.g. 10 (for 10%), or 200000 (for 200k VND)
  maxDiscount: { type: Number, default: null, min: 0 }, // Maximum discount amount for percentage
  minOrderValue: { type: Number, default: 0, min: 0 },
  validFrom: { type: Date, required: true, default: Date.now },
  validUntil: { type: Date, required: true },
  usageLimit: { type: Number, default: null, validate: { validator: v => v === null || (Number.isSafeInteger(v) && v >= 0), message: "usageLimit phải là số nguyên >= 0 hoặc null." } },
  usedCount: { type: Number, default: 0, min: 0, validate: { validator: Number.isSafeInteger, message: "usedCount phải là số nguyên." } },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Check if coupon is valid
couponSchema.methods.isValid = function () {
  const now = new Date();
  if (!this.isActive) return false;
  if (this.validFrom > now || this.validUntil < now) return false;
  if (this.usageLimit !== null && this.usedCount >= this.usageLimit) return false;
  return true;
};

// Calculate discount amount — luôn trả về số nguyên (VND không có lẻ)
couponSchema.methods.calculateDiscount = function (orderTotal) {
  if (orderTotal < this.minOrderValue) return 0;
  
  let discount = 0;
  if (this.discountType === "fixed") {
    discount = this.discountValue;
  } else if (this.discountType === "percentage") {
    discount = Math.floor(orderTotal * (this.discountValue / 100));
    if (this.maxDiscount !== null && this.maxDiscount !== undefined) {
      discount = Math.min(discount, this.maxDiscount);
    }
  }
  // Discount không vượt quá tổng đơn, và phải >= 0
  return Math.max(0, Math.min(Math.floor(discount), orderTotal));
};

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;
