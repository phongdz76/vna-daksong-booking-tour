import express from "express";
import { loginWithZalo, loginAdmin, getProfile, loginMock } from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/zalo", loginWithZalo);
router.post("/admin/login", loginAdmin);
router.post("/mock", loginMock);
router.get("/me", protect, getProfile);

export default router;
