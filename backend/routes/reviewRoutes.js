import { validateBody } from "../middlewares/inputValidation.js";
import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { updateReview, deleteReview } from "../controllers/reviewController.js";

const router = express.Router();
router.patch("/:id", protect, validateBody("review", true), updateReview);
router.delete("/:id", protect, deleteReview);
export default router;
