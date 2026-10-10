import { validateBody } from "../middlewares/inputValidation.js";
import express from "express";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";
import { createZaloPayOrder, zaloPayWebhook, queryZaloPayOrder, refundZaloPayOrder, queryZaloPayRefund } from "../controllers/paymentController.js";

const router = express.Router();

router.post("/zalopay/create", protect, validateBody("payment"), createZaloPayOrder);
router.post("/zalopay/webhook", zaloPayWebhook);
router.post("/zalopay/:appTransId/query", protect, validateBody("empty"), queryZaloPayOrder);
router.post("/zalopay/:appTransId/refund", protect, adminOnly, validateBody("empty"), refundZaloPayOrder);
router.post("/zalopay/:appTransId/refund/query", protect, adminOnly, validateBody("empty"), queryZaloPayRefund);

export default router;
