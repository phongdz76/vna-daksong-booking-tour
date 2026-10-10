import { validateBody } from "../middlewares/inputValidation.js";
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
router.post("/", protect, adminOnly, validateBody("article"), createArticle);
router.put("/:id", protect, adminOnly, validateBody("article", true), updateArticle);
router.patch("/:id", protect, adminOnly, validateBody("article", true), updateArticle);
router.delete("/:id", protect, adminOnly, deleteArticle);

export default router;
