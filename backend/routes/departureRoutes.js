import { validateBody } from "../middlewares/inputValidation.js";
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
router.post("/", protect, adminOnly, validateBody("departure"), createDeparture);
router.put("/:id", protect, adminOnly, validateBody("departure", true), updateDeparture);
router.patch("/:id", protect, adminOnly, validateBody("departure", true), updateDeparture);
router.delete("/:id", protect, adminOnly, deleteDeparture);

export default router;
