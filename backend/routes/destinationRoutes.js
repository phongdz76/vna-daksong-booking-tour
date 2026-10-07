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
router.post("/", protect, adminOnly, createDestination);
router.put("/:id", protect, adminOnly, updateDestination);
router.patch("/:id", protect, adminOnly, updateDestination);
router.delete("/:id", protect, adminOnly, deleteDestination);

export default router;
