import express from "express";
import {
  protect,
  adminOnly,
  optionalProtect,
} from "../middlewares/authMiddleware.js";
import {
  getCoupons,
  getAvailableCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from "../controllers/couponController.js";

const router = express.Router();

router.get("/available", optionalProtect, getAvailableCoupons);

router.use(protect, adminOnly);

router.route("/").get(getCoupons).post(createCoupon);

router.route("/:id").put(updateCoupon).delete(deleteCoupon);

export default router;
