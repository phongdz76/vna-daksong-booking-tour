import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { createZaloPayOrder, zaloPayWebhook } from "../controllers/paymentController.js";

const router = express.Router();

router.post("/zalopay/create", protect, createZaloPayOrder);
router.post("/zalopay/webhook", zaloPayWebhook);

export default router;
