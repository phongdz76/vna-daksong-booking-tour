import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { updateReview, deleteReview } from "../controllers/reviewController.js";

const router = express.Router();
router.patch("/:id", protect, updateReview);
router.delete("/:id", protect, deleteReview);
export default router;
