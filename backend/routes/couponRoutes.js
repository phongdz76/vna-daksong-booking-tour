import express from "express";
import { validateBody } from '../middlewares/inputValidation.js';
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

router.route("/").get(getCoupons).post(validateBody('coupon'), createCoupon);

router.route("/:id").put(validateBody('coupon', true), updateCoupon).delete(validateBody("empty"), deleteCoupon);

export default router;
