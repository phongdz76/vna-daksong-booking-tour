export const MEMBERSHIP_TIERS = Object.freeze(["Bạc", "Vàng", "Kim Cương"]);
export const COUPON_TIERS = Object.freeze(["all", ...MEMBERSHIP_TIERS]);

// Legacy coupons without a tier remain available to everyone, including guests.
export function couponAppliesToTier(coupon, tier) {
  return coupon.applicableTier === undefined || coupon.applicableTier === "all" ||
    (MEMBERSHIP_TIERS.includes(tier) && coupon.applicableTier === tier);
}
