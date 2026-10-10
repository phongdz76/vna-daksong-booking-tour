import express from "express";
import { validateBody } from '../middlewares/inputValidation.js';
import { optionalProtect, protect } from "../middlewares/authMiddleware.js";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "../controllers/notificationController.js";

const router = express.Router();
router.get("/", optionalProtect, getNotifications);
router.patch("/read-all", protect, validateBody('empty'), markAllNotificationsRead);
router.patch("/:id/read", protect, validateBody('empty'), markNotificationRead);
export default router;
