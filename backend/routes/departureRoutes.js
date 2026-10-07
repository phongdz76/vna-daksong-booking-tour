import express from "express";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";
import {
  getDepartures,
  getDepartureById,
  createDeparture,
  updateDeparture,
  deleteDeparture,
} from "../controllers/departureController.js";

const router = express.Router();

router.get("/", protect, adminOnly, getDepartures);
router.get("/:id", protect, adminOnly, getDepartureById);
router.post("/", protect, adminOnly, createDeparture);
router.put("/:id", protect, adminOnly, updateDeparture);
router.patch("/:id", protect, adminOnly, updateDeparture);
router.delete("/:id", protect, adminOnly, deleteDeparture);

export default router;
