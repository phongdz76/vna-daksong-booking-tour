import express from "express";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";
import {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from "../controllers/couponController.js";

const router = express.Router();

router.use(protect, adminOnly);

router.route("/")
  .get(getCoupons)
  .post(createCoupon);

router.route("/:id")
  .put(updateCoupon)
  .delete(deleteCoupon);

export default router;
