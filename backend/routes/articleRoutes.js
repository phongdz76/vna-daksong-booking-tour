import express from "express";
import { protect, adminOnly, optionalProtect } from "../middlewares/authMiddleware.js";
import {
  getArticles,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
} from "../controllers/articleController.js";

const router = express.Router();

router.get("/", optionalProtect, getArticles);
router.get("/:id", optionalProtect, getArticleById);
router.post("/", protect, adminOnly, createArticle);
router.put("/:id", protect, adminOnly, updateArticle);
router.patch("/:id", protect, adminOnly, updateArticle);
router.delete("/:id", protect, adminOnly, deleteArticle);

export default router;
