import express from "express";
import { protect, adminOnly, optionalProtect } from "../middlewares/authMiddleware.js";
import {
  getTours,
  getTourById,
  createTour,
  updateTour,
  deleteTour,
  getSavedTours,
  toggleSavedTour,
} from "../controllers/tourController.js";
import { getTourDepartures } from "../controllers/departureController.js";
import { getTourReviews, getReviewEligibility, createReview } from "../controllers/reviewController.js";

const router = express.Router();

router.get("/saved", protect, getSavedTours); // ⬆ Note: Specific route MUST be placed before /:id route

router.get("/", optionalProtect, getTours);
router.get("/:id/reviews/eligibility", protect, getReviewEligibility);
router.get("/:id/reviews", optionalProtect, getTourReviews);
router.post("/:id/reviews", protect, createReview);
router.get("/:id/departures", optionalProtect, getTourDepartures);
router.get("/:id", optionalProtect, getTourById);
router.post("/:id/save", protect, toggleSavedTour);

router.post("/", protect, adminOnly, createTour);
router.put("/:id", protect, adminOnly, updateTour);
router.patch("/:id", protect, adminOnly, updateTour);
router.delete("/:id", protect, adminOnly, deleteTour);

export default router;
