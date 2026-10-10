import { validateBody } from "../middlewares/inputValidation.js";
import express from "express";
import { protect, adminOnly, optionalProtect } from "../middlewares/authMiddleware.js";
import {
  getDestinations,
  getDestinationById,
  createDestination,
  updateDestination,
  deleteDestination,
} from "../controllers/destinationController.js";

const router = express.Router();

router.get("/", optionalProtect, getDestinations);
router.get("/:id", optionalProtect, getDestinationById);
router.post("/", protect, adminOnly, validateBody("destination"), createDestination);
router.put("/:id", protect, adminOnly, validateBody("destination", true), updateDestination);
router.patch("/:id", protect, adminOnly, validateBody("destination", true), updateDestination);
router.delete("/:id", protect, adminOnly, deleteDestination);

export default router;
