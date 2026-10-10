import { validateBody } from "../middlewares/inputValidation.js";
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
router.post("/:id/reviews", protect, validateBody("review"), createReview);
router.get("/:id/departures", optionalProtect, getTourDepartures);
router.get("/:id", optionalProtect, getTourById);
router.post("/:id/save", protect, validateBody("empty"), toggleSavedTour);

router.post("/", protect, adminOnly, validateBody("tour"), createTour);
router.put("/:id", protect, adminOnly, validateBody("tour", true), updateTour);
router.patch("/:id", protect, adminOnly, validateBody("tour", true), updateTour);
router.delete("/:id", protect, adminOnly, validateBody("empty"), deleteTour);

export default router;
