import Destination from "../models/Destination.js";
import mongoose from "mongoose";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const ALLOWED_CATEGORIES = ["nature", "culture", "food", "history"];
const ALLOWED_STATUSES = ["draft", "published", "archived"];

// @desc   Get all destinations (Admin: all, User: only published)
// @route  GET /api/destinations
// @access Public/Private
export const getDestinations = async (req, res) => {
  try {
    const { q, status, category, page, limit } = req.query;
    
    let filter = {};

    // Search query
    if (q && typeof q === 'string') {
      filter.$text = { $search: q };
    }

    // Role-based status filter
    if (req.user?.role !== "admin") {
      filter.status = "published";
    } else if (status) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({ message: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(", ")}` });
      }
      filter.status = status;
    }

    // Category filter
    if (category) {
      if (!ALLOWED_CATEGORIES.includes(category)) {
        return res.status(400).json({ message: `Invalid category. Allowed: ${ALLOWED_CATEGORIES.join(", ")}` });
      }
      filter.category = category;
    }

    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const pageLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const skip = (currentPage - 1) * pageLimit;

    const destinations = await Destination.find(filter)
      .select("-description")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit)
      .lean();

    const total = await Destination.countDocuments(filter);

    res.json({
      data: destinations,
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

// @desc   Get destination by ID
// @route  GET /api/destinations/:id
// @access Public/Private
export const getDestinationById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid destination ID" });
    }

    const filter = { _id: req.params.id };
    if (req.user?.role !== "admin") {
      filter.status = "published";
    }

    const destination = await Destination.findOne(filter);
    if (!destination) {
      return res.status(404).json({ message: "Điểm đến không tồn tại." });
    }

    res.json(destination);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Create destination
// @route  POST /api/destinations
// @access Private (Admin)
export const createDestination = async (req, res) => {
  try {
    const { name, slug, summary, description, category, address, images, sources, visitNotes, status } = req.body;

    if (address !== undefined && typeof address !== "string") return res.status(400).json({ message: "Địa chỉ không hợp lệ." });
    if (visitNotes !== undefined && typeof visitNotes !== "string") return res.status(400).json({ message: "Ghi chú không hợp lệ." });

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ message: "Tên là bắt buộc." });
    }
    if (!slug || typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return res.status(400).json({ message: "Định dạng slug không hợp lệ." });
    }
    if (!summary || typeof summary !== "string" || !summary.trim()) {
      return res.status(400).json({ message: "Tóm tắt là bắt buộc." });
    }
    if (!description || typeof description !== "string" || !description.trim()) {
      return res.status(400).json({ message: "Mô tả là bắt buộc." });
    }
    if (!category || !ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: `Danh mục phải là một trong: ${ALLOWED_CATEGORIES.join(", ")}` });
    }
    
    const finalStatus = status || "draft";
    if (!ALLOWED_STATUSES.includes(finalStatus)) {
      return res.status(400).json({ message: "Trạng thái không hợp lệ." });
    }

    if (finalStatus === "published" && (!Array.isArray(sources) || sources.length === 0)) {
      return res.status(400).json({ message: "Nội dung xuất bản cần có ít nhất một nguồn." });
    }

    const destination = await Destination.create({
      name: name.trim(),
      slug: slug.trim(),
      summary: summary.trim(),
      description: description.trim(),
      category,
      address: address ? address.trim() : "",
      images: Array.isArray(images) ? images : [],
      sources: Array.isArray(sources) ? sources : [],
      visitNotes: visitNotes ? visitNotes.trim() : "",
      status: finalStatus
    });

    res.status(201).json(destination);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Slug đã tồn tại" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Update destination
// @route  PUT /api/destinations/:id
// @access Private (Admin)
export const updateDestination = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid destination ID" });
    }

    const destination = await Destination.findById(req.params.id);
    if (!destination) {
      return res.status(404).json({ message: "Điểm đến không tồn tại." });
    }

    const { name, slug, summary, description, category, address, images, sources, visitNotes, status } = req.body;

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) return res.status(400).json({ message: "Tên không hợp lệ." });
      destination.name = name.trim();
    }
    if (slug !== undefined) {
      if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return res.status(400).json({ message: "Định dạng slug không hợp lệ." });
      destination.slug = slug.trim();
    }
    if (summary !== undefined) {
      if (typeof summary !== "string") return res.status(400).json({ message: "Tóm tắt không hợp lệ." });
      destination.summary = summary.trim();
    }
    if (description !== undefined) {
      if (typeof description !== "string") return res.status(400).json({ message: "Mô tả không hợp lệ." });
      destination.description = description.trim();
    }
    if (category !== undefined) {
      if (!ALLOWED_CATEGORIES.includes(category)) return res.status(400).json({ message: "Danh mục không hợp lệ." });
      destination.category = category;
    }
    if (address !== undefined) {
      if (typeof address !== "string") return res.status(400).json({ message: "Địa chỉ không hợp lệ." });
      destination.address = address.trim();
    }
    if (images !== undefined) destination.images = Array.isArray(images) ? images : [];
    if (sources !== undefined) destination.sources = Array.isArray(sources) ? sources : [];
    if (visitNotes !== undefined) {
      if (typeof visitNotes !== "string") return res.status(400).json({ message: "Ghi chú không hợp lệ." });
      destination.visitNotes = visitNotes.trim();
    }
    
    if (status !== undefined) {
      if (!ALLOWED_STATUSES.includes(status)) return res.status(400).json({ message: "Trạng thái không hợp lệ." });
      destination.status = status;
    }

    if (destination.status === "published" && (!Array.isArray(destination.sources) || destination.sources.length === 0)) {
      return res.status(400).json({ message: "Nội dung xuất bản cần có ít nhất một nguồn." });
    }

    await destination.save();
    res.json(destination);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Slug đã tồn tại" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Delete destination
// @route  DELETE /api/destinations/:id
// @access Private (Admin)
export const deleteDestination = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid destination ID" });
    }

    const destination = await Destination.findById(req.params.id);
    if (!destination) {
      return res.status(404).json({ message: "Điểm đến không tồn tại." });
    }

    destination.status = "archived";
    await destination.save();

    res.json({ message: "Đã lưu trữ điểm đến.", data: destination });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
