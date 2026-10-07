import express from "express";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";
import {
  getBookingQuote, createBooking, getBookings, getMyBookings, getBookingById,
  cancelBooking, updateBookingStatus, getDashboardData,
} from "../controllers/bookingController.js";

const router = express.Router();
router.post("/quote", getBookingQuote);
router.get("/dashboard-data", protect, adminOnly, getDashboardData);
router.get("/mine", protect, getMyBookings);
router.get("/", protect, getBookings);
router.get("/:id", protect, getBookingById);
router.post("/", protect, createBooking);
router.patch("/:id/cancel", protect, cancelBooking);
router.patch("/:id/status", protect, adminOnly, updateBookingStatus);
export default router;
