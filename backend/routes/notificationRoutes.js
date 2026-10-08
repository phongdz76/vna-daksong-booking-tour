import express from "express";
import { optionalProtect, protect } from "../middlewares/authMiddleware.js";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "../controllers/notificationController.js";

const router = express.Router();
router.get("/", optionalProtect, getNotifications);
router.patch("/read-all", protect, markAllNotificationsRead);
router.patch("/:id/read", protect, markNotificationRead);
export default router;
