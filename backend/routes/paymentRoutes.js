import express from "express";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";
import { createZaloPayOrder, zaloPayWebhook, queryZaloPayOrder, refundZaloPayOrder, queryZaloPayRefund } from "../controllers/paymentController.js";

const router = express.Router();

router.post("/zalopay/create", protect, createZaloPayOrder);
router.post("/zalopay/webhook", zaloPayWebhook);
router.post("/zalopay/:appTransId/query", protect, queryZaloPayOrder);
router.post("/zalopay/:appTransId/refund", protect, adminOnly, refundZaloPayOrder);
router.post("/zalopay/:appTransId/refund/query", protect, adminOnly, queryZaloPayRefund);

export default router;
