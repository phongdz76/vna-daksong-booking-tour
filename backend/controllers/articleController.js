import Article from "../models/Article.js";
import Destination from "../models/Destination.js";
import mongoose from "mongoose";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const ALLOWED_CATEGORIES = ["culture", "food", "travel_tips", "story"];
const ALLOWED_STATUSES = ["draft", "published", "archived"];

const ensureDestinationsExist = async (ids) => {
  if (!Array.isArray(ids)) return false;
  const uniqueIds = [...new Set(ids)];
  for (let id of uniqueIds) {
    if (!isValidObjectId(id)) return false;
  }
  
  if (uniqueIds.length > 0) {
    const count = await Destination.countDocuments({ _id: { $in: uniqueIds }, status: { $ne: "archived" } });
    if (count !== uniqueIds.length) return false;
  }
  return true;
};

// @desc   Get all articles
// @route  GET /api/articles
// @access Public/Private
export const getArticles = async (req, res) => {
  try {
    const { q, status, category, destinationId, page, limit } = req.query;
    
    let filter = {};

    if (q && typeof q === 'string') {
      filter.$text = { $search: q };
    }

    if (req.user?.role !== "admin") {
      filter.status = "published";
    } else if (status) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({ message: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(", ")}` });
      }
      filter.status = status;
    }

    if (category) {
      if (!ALLOWED_CATEGORIES.includes(category)) {
        return res.status(400).json({ message: `Invalid category.` });
      }
      filter.category = category;
    }
    
    if (destinationId) {
      if (!isValidObjectId(destinationId)) return res.status(400).json({ message: "Invalid destinationId" });
      filter.destinationIds = destinationId;
    }

    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const pageLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const skip = (currentPage - 1) * pageLimit;

    const articles = await Article.find(filter)
      .select("-content")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit)
      .lean();

    const total = await Article.countDocuments(filter);

    res.json({
      data: articles,
      pagination: {
        page: currentPage,
        limit: pageLimit,
        total,
        pages: Math.ceil(total / pageLimit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Get article by ID
// @route  GET /api/articles/:id
// @access Public/Private
export const getArticleById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid article ID" });
    }

    const filter = { _id: req.params.id };
    if (req.user?.role !== "admin") {
      filter.status = "published";
    }

    const article = await Article.findOne(filter);
    if (!article) {
      return res.status(404).json({ message: "Bài viết không tồn tại." });
    }

    res.json(article);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Create article
// @route  POST /api/articles
// @access Private (Admin)
export const createArticle = async (req, res) => {
  try {
    const { title, slug, summary, content, category, destinationIds, images, sources, status } = req.body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({ message: "Tiêu đề là bắt buộc." });
    }
    if (!slug || typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return res.status(400).json({ message: "Định dạng slug không hợp lệ." });
    }
    if (!summary || typeof summary !== "string" || !summary.trim()) {
      return res.status(400).json({ message: "Tóm tắt là bắt buộc." });
    }
    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ message: "Nội dung là bắt buộc." });
    }
    if (!category || !ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: `Danh mục phải là một trong: ${ALLOWED_CATEGORIES.join(", ")}` });
    }
    
    if (destinationIds && !(await ensureDestinationsExist(destinationIds))) {
      return res.status(400).json({ message: "Có điểm đến không tồn tại hoặc đã lưu trữ." });
    }
    
    const finalStatus = status || "draft";
    if (!ALLOWED_STATUSES.includes(finalStatus)) {
      return res.status(400).json({ message: "Trạng thái không hợp lệ." });
    }

    if (finalStatus === "published" && (!Array.isArray(sources) || sources.length === 0)) {
      return res.status(400).json({ message: "Nội dung xuất bản cần có ít nhất một nguồn." });
    }

    const article = await Article.create({
      title: title.trim(),
      slug: slug.trim(),
      summary: summary.trim(),
      content: content.trim(),
      category,
      destinationIds: Array.isArray(destinationIds) ? [...new Set(destinationIds)] : [],
      images: Array.isArray(images) ? images : [],
      sources: Array.isArray(sources) ? sources : [],
      status: finalStatus
    });

    res.status(201).json(article);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Slug đã tồn tại" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Update article
// @route  PUT /api/articles/:id
// @access Private (Admin)
export const updateArticle = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid article ID" });
    }

    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ message: "Bài viết không tồn tại." });
    }

    const { title, slug, summary, content, category, destinationIds, images, sources, status } = req.body;

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length === 0) return res.status(400).json({ message: "Tiêu đề không hợp lệ." });
      article.title = title.trim();
    }
    if (slug !== undefined) {
      if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return res.status(400).json({ message: "Định dạng slug không hợp lệ." });
      article.slug = slug.trim();
    }
    if (summary !== undefined) {
      if (typeof summary !== "string") return res.status(400).json({ message: "Tóm tắt không hợp lệ." });
      article.summary = summary.trim();
    }
    if (content !== undefined) {
      if (typeof content !== "string") return res.status(400).json({ message: "Nội dung không hợp lệ." });
      article.content = content.trim();
    }
    if (category !== undefined) {
      if (!ALLOWED_CATEGORIES.includes(category)) return res.status(400).json({ message: "Danh mục không hợp lệ." });
      article.category = category;
    }
    if (destinationIds !== undefined) {
       if (!(await ensureDestinationsExist(destinationIds))) {
         return res.status(400).json({ message: "Có điểm đến không tồn tại hoặc đã lưu trữ." });
       }
       article.destinationIds = [...new Set(destinationIds)];
    }
    if (images !== undefined) article.images = Array.isArray(images) ? images : [];
    if (sources !== undefined) article.sources = Array.isArray(sources) ? sources : [];
    
    if (status !== undefined) {
      if (!ALLOWED_STATUSES.includes(status)) return res.status(400).json({ message: "Trạng thái không hợp lệ." });
      article.status = status;
    }

    if (article.status === "published" && (!Array.isArray(article.sources) || article.sources.length === 0)) {
      return res.status(400).json({ message: "Nội dung xuất bản cần có ít nhất một nguồn." });
    }

    await article.save();
    res.json(article);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Slug đã tồn tại" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Delete article
// @route  DELETE /api/articles/:id
// @access Private (Admin)
export const deleteArticle = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid article ID" });
    }

    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ message: "Bài viết không tồn tại." });
    }

    article.status = "archived";
    await article.save();

    res.json({ message: "Đã lưu trữ bài viết.", data: article });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
