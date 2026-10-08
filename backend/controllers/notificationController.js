import Article from "../models/Article.js";
import Booking from "../models/Booking.js";
import NotificationRead from "../models/NotificationRead.js";

const events = {
  pending_confirmation: { type: "trip", title: "Đã nhận yêu cầu đặt tour" },
  confirmed: { type: "trip", title: "Chuyến đi đã được xác nhận" },
  cancelled: { type: "trip", title: "Đơn đặt tour đã hủy" },
  rejected: { type: "trip", title: "VNA chưa thể nhận chuyến đi" },
  completed: { type: "trip", title: "Chuyến đi đã hoàn thành" },
  payment_received: { type: "payment", title: "Thanh toán thành công" },
  refund_pending: { type: "payment", title: "Khoản thanh toán đang chờ hoàn tiền" },
  refunded: { type: "payment", title: "Đã hoàn tiền" },
};

// Read the original events, so callback retries cannot create duplicate notifications.
// Only published articles are public; booking events always match the session owner.
export const getNotifications = async (req, res, next) => {
  try {
    const page = req.query.page === undefined ? 1 : Number(req.query.page);
    const limit = req.query.limit === undefined ? 20 : Number(req.query.limit);
    const type = req.query.type || "all";
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100 ||
        !["all", "article", "trip", "payment"].includes(type)) {
      return res.status(400).json({ message: "Bộ lọc thông báo không hợp lệ." });
    }
    const pipeline = [
      { $match: { status: "published" } },
      { $project: {
        _id: 0, id: { $concat: ["article:", { $toString: "$_id" }] },
        type: { $literal: "article" }, title: { $concat: ["Bài viết mới: ", "$title"] },
        message: "$summary", createdAt: { $ifNull: ["$publishedAt", "$createdAt"] },
        href: { $concat: ["/articles/", { $toString: "$_id" }] },
      } },
    ];
    if (req.user) {
      pipeline.push({ $unionWith: { coll: Booking.collection.name, pipeline: [
        { $match: { userId: req.user._id } },
        { $unwind: { path: "$history", includeArrayIndex: "eventIndex" } },
        { $match: { "history.status": { $in: Object.keys(events) } } },
        { $project: {
          _id: 0, id: { $concat: ["booking:", { $toString: "$_id" }, ":", { $toString: "$eventIndex" }] },
          type: { $switch: { branches: Object.entries(events).map(([status, event]) => ({ case: { $eq: ["$history.status", status] }, then: event.type })), default: "trip" } },
          title: { $switch: { branches: Object.entries(events).map(([status, event]) => ({ case: { $eq: ["$history.status", status] }, then: event.title })), default: "Cập nhật chuyến đi" } },
          message: { $concat: ["$code", " · ", "$snapshot.tourName", { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ["$history.reason", ""] } }, 0] }, { $concat: [". ", "$history.reason"] }, ""] }] },
          createdAt: "$history.at", href: { $concat: ["/my-bookings/", { $toString: "$_id" }] },
        } },
      ] } });
      const readAll = await NotificationRead.findOne({ userId: req.user._id, notificationId: "__all__" }).lean();
      pipeline.push(
        { $lookup: { from: NotificationRead.collection.name, let: { notificationId: "$id" }, pipeline: [
          { $match: { userId: req.user._id, $expr: { $eq: ["$notificationId", "$$notificationId"] } } },
          { $project: { readAt: 1, _id: 0 } },
        ], as: "receipt" } },
        { $set: { readAt: { $cond: [
          { $lte: ["$createdAt", readAll?.readAt || new Date(0)] },
          readAll?.readAt || new Date(0),
          { $ifNull: [{ $first: "$receipt.readAt" }, null] },
        ] } } },
        { $unset: "receipt" },
      );
    } else pipeline.push({ $set: { readAt: null } });
    const typeFilter = type === "all" ? [] : [{ $match: { type } }];
    pipeline.push({ $facet: {
      data: [...typeFilter, { $sort: { createdAt: -1, id: -1 } }, { $skip: (page - 1) * limit }, { $limit: limit }],
      count: [...typeFilter, { $count: "total" }],
      unread: [{ $match: { readAt: null } }, { $count: "total" }],
    } });
    const [result] = await Article.aggregate(pipeline);
    const total = result.count[0]?.total || 0;
    res.set("Cache-Control", "private, no-store");
    return res.json({ data: result.data, unreadCount: result.unread[0]?.total || 0,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { return next(error); }
};

async function saveRead(userId, notificationId) {
  const filter = { userId, notificationId };
  const update = { $max: { readAt: new Date() } };
  try { await NotificationRead.updateOne(filter, update, { upsert: true, runValidators: true }); }
  catch (error) {
    if (error.code !== 11000) throw error;
    await NotificationRead.updateOne(filter, update, { runValidators: true });
  }
}

export const markNotificationRead = async (req, res, next) => {
  try {
    const id = req.params.id;
    const article = /^article:([a-f0-9]{24})$/i.exec(id);
    const booking = /^booking:([a-f0-9]{24}):(\d{1,6})$/i.exec(id);
    let allowed = false;
    if (article) allowed = Boolean(await Article.exists({ _id: article[1], status: "published" }));
    if (booking) {
      const ownBooking = await Booking.findOne({ _id: booking[1], userId: req.user._id }).select("history").lean();
      allowed = Object.hasOwn(events, ownBooking?.history[Number(booking[2])]?.status || "");
    }
    if (!allowed) return res.status(404).json({ message: "Không tìm thấy thông báo." });
    const canonicalId = article ? "article:" + article[1].toLowerCase()
      : "booking:" + booking[1].toLowerCase() + ":" + Number(booking[2]);
    await saveRead(req.user._id, canonicalId);
    return res.json({ message: "Đã đọc thông báo." });
  } catch (error) { return next(error); }
};

export const markAllNotificationsRead = async (req, res, next) => {
  try {
    await saveRead(req.user._id, "__all__");
    return res.json({ message: "Đã đọc tất cả thông báo hiện có." });
  } catch (error) { return next(error); }
};
