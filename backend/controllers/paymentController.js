import axios from "axios";
import CryptoJS from "crypto-js";
import { randomBytes, timingSafeEqual } from "node:crypto";
import mongoose from "mongoose";
import moment from "moment";
import Booking from "../models/Booking.js";
import PaymentTransaction from "../models/PaymentTransaction.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const ORDER_EXPIRY_MS = 15 * 60 * 1000;
const PAID_STATUSES = ["success", "refund_pending", "refunded"];

// Đọc cấu hình sau khi .env đã được nạp.
function getConfig() {
  const config = {
    app_id: process.env.ZALOPAY_APP_ID,
    key1: process.env.ZALOPAY_KEY1,
    key2: process.env.ZALOPAY_KEY2,
    endpoint: process.env.ZALOPAY_ENDPOINT,
  };

  if (!config.app_id || !config.key1 || !config.key2 || !config.endpoint) {
    return null;
  }

  return config;
}

// Dùng chung cho tạo giao dịch, đối soát và hoàn tiền.
// Timeout chưa chứng minh provider chưa thu/hoàn tiền.
export async function sendZaloPayRequest(url, payload, formBody = false) {
  try {
    const response = formBody
      ? await axios.post(url, new URLSearchParams(
          Object.entries(payload).map(([key, value]) => [key, String(value)]),
        ), {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 10000,
        })
      : await axios.post(url, null, { params: payload, timeout: 10000 });

    if (!response.data || ![1, 2, 3].includes(response.data.return_code)) {
      throw new Error("INVALID_PROVIDER_RESPONSE");
    }

    return response.data;
  } catch (error) {
    const unknown = new Error("PAYMENT_RESULT_UNKNOWN");
    unknown.providerHttpStatus = error.response?.status;
    throw unknown;
  }
}

// Callback và query cùng ghi nhận tiền qua hàm này.
// Chỉ lưu DB trong transaction; không gọi provider vì transaction có thể retry.
async function recordZaloPayPayment(appTransId, data) {
  return mongoose.connection.transaction(async session => {
    const transaction = await PaymentTransaction.findOne({ appTransId }).session(session);
    if (!transaction) {
      return false;
    }

    // 1. Kiểm tra số tiền trước khi xử lý callback lặp.
    const receivedAmount = Number(data.amount);
    if (!Number.isSafeInteger(receivedAmount) || receivedAmount !== transaction.amount) {
      if (!PAID_STATUSES.includes(transaction.status)) {
        transaction.status = "failed";
        transaction.note = "Số tiền callback không khớp. Cần đối soát ZaloPay.";
        transaction.rawCallback = data;
        await transaction.save({ session });
      }
      return false;
    }

    if (data.zp_trans_id) {
      transaction.zpTransId = String(data.zp_trans_id);
    }

    if (transaction.appliedAt || transaction.status === "refunded") {
      if (transaction.isModified()) {
        await transaction.save({ session });
      }
      return true;
    }

    // 2. Kiểm tra đơn đã hủy hoặc đã nhận tiền từ giao dịch khác.
    const booking = await Booking.findById(transaction.bookingId).session(session);
    if (!booking) {
      throw new Error("PAYMENT_BOOKING_NOT_FOUND");
    }

    const legacyRefundRecorded = transaction.status === "refund_pending" &&
      booking.paymentStatus === "refund_pending";
    const isClosedBooking = ["cancelled", "rejected"].includes(booking.status);

    let isDuplicatePayment = false;
    if (booking.paymentStatus === "paid") {
      if (booking.paidTransactionId) {
        isDuplicatePayment = String(booking.paidTransactionId) !== String(transaction._id);
      } else {
        isDuplicatePayment = transaction.status !== "success";
      }
    }

    const needsRefund = isClosedBooking || isDuplicatePayment ||
      ["refund_pending", "refunded"].includes(booking.paymentStatus);

    // 3. Ghi nhận giao dịch, giữ trạng thái xác nhận tour của booking.
    if (needsRefund) {
      transaction.status = "refund_pending";
    } else {
      transaction.status = "success";
    }

    if (!transaction.paidAt) {
      transaction.paidAt = new Date();
    }

    transaction.appliedAt = new Date();
    transaction.rawCallback = data;
    transaction.activeAttempt = false;

    if (needsRefund) {
      if (isDuplicatePayment) {
        transaction.note = "Thanh toán trùng; cần hoàn giao dịch này.";
      } else {
        transaction.note = "Đơn đã hủy/từ chối; cần hoàn tiền.";
      }

      if (!isDuplicatePayment) {
        booking.paymentStatus = "refund_pending";
      }

      if (!legacyRefundRecorded) {
        booking.history.push({
          status: "refund_pending",
          actorId: booking.userId,
          reason: transaction.note,
          at: new Date(),
        });
      }
    } else {
      const paymentAlreadyRecorded = booking.paymentStatus === "paid";
      booking.paymentStatus = "paid";
      booking.paymentMethod = "zalopay";
      booking.paidTransactionId = transaction._id;

      if (!paymentAlreadyRecorded) {
        booking.history.push({
          status: "payment_received",
          actorId: booking.userId,
          reason: "Thanh toán thành công qua ZaloPay.",
          at: new Date(),
        });
      }
    }

    // 4. Booking và giao dịch cùng commit hoặc cùng rollback.
    await booking.save({ session });
    await transaction.save({ session });
    return true;
  });
}

// Đối soát dùng chung cho API query và khi tạo lại thanh toán đã hết hạn.
// Tài liệu: https://docs.zalopay.vn/vi/docs/specs/order-query/
async function refreshZaloPayOrder(transaction, config) {
  const queryUrl = new URL("query", config.endpoint).toString();
  const signatureData = [
    config.app_id,
    transaction.appTransId,
    config.key1,
  ].join("|");

  const payload = {
    app_id: config.app_id,
    app_trans_id: transaction.appTransId,
    mac: CryptoJS.HmacSHA256(signatureData, config.key1).toString(),
  };
  const providerResult = await sendZaloPayRequest(queryUrl, payload);

  if (providerResult.return_code === 1) {
    const accepted = await recordZaloPayPayment(transaction.appTransId, providerResult);
    if (!accepted) {
      throw new Error("PAYMENT_AMOUNT_MISMATCH");
    }
  } else {
    let expiresAt = transaction.expiresAt;
    if (!expiresAt) {
      expiresAt = new Date(transaction.createdAt.getTime() + ORDER_EXPIRY_MS);
    }

    // Chỉ giải phóng giao dịch khi provider xác nhận hết hạn, không còn xử lý.
    // Lỗi MAC/cấu hình/hệ thống không chứng minh rằng chưa thu tiền.
    if (providerResult.return_code === 2 &&
        providerResult.is_processing === false &&
        [-101, -63].includes(providerResult.sub_return_code) &&
        expiresAt <= new Date()) {
      await PaymentTransaction.updateOne(
        {
          _id: transaction._id,
          appliedAt: null,
          status: { $in: ["pending", "failed"] },
        },
        {
          $set: {
            status: "failed",
            activeAttempt: false,
            note: "Đối soát: đơn hết hạn, không thanh toán.",
          },
          $inc: { __v: 1 },
        }
      );
    }
  }

  const updatedTransaction = await PaymentTransaction.findById(transaction._id);
  return {
    transaction: updatedTransaction,
    provider: providerResult,
  };
}

// @desc   Create ZaloPay order
// @route  POST /api/payments/zalopay/create
// @access Private
export const createZaloPayOrder = async (req, res, next) => {
  let transaction;

  try {
    const config = getConfig();
    if (!config) {
      return res.status(503).json({ message: "Chưa cấu hình ZaloPay. Vui lòng liên hệ quản trị viên." });
    }

    // 1. Kiểm tra đơn và quyền thanh toán.
    const { bookingId } = req.body;
    if (typeof bookingId !== "string" || !isValidObjectId(bookingId)) {
      return res.status(400).json({ message: "bookingId không hợp lệ." });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
    }
    if (String(booking.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Không có quyền thanh toán đơn này." });
    }
    if (!["pending_confirmation", "confirmed"].includes(booking.status)) {
      return res.status(400).json({ message: "Đơn hàng không thể thanh toán ở trạng thái hiện tại." });
    }
    if (booking.paymentStatus !== "unpaid") {
      return res.status(400).json({ message: "Đơn hàng đã được thanh toán hoặc đang hoàn tiền." });
    }
    if (!Number.isSafeInteger(booking.snapshot.total) || booking.snapshot.total <= 0) {
      return res.status(400).json({ message: "Đơn không có số tiền hợp lệ để thanh toán ZaloPay." });
    }

    // 2. Đối soát dữ liệu cũ hoặc giao dịch đang chờ đã hết hạn.
    const unsettledTransaction = await PaymentTransaction.findOne({
      bookingId,
      status: { $in: PAID_STATUSES },
      appliedAt: null,
    });
    if (unsettledTransaction) {
      await refreshZaloPayOrder(unsettledTransaction, config);
    }

    const previousTransaction = await PaymentTransaction.findOne({
      bookingId,
      $or: [{ status: "pending" }, { activeAttempt: true }],
    });
    if (previousTransaction) {
      let expiresAt = previousTransaction.expiresAt;
      if (!expiresAt) {
        expiresAt = new Date(previousTransaction.createdAt.getTime() + ORDER_EXPIRY_MS);
      }
      if (expiresAt <= new Date()) {
        await refreshZaloPayOrder(previousTransaction, config);
      }
    }

    // 3. Ghi trên Booking để các request đồng thời chỉ tạo một giao dịch.
    transaction = await mongoose.connection.transaction(async session => {
      const currentBooking = await Booking.findById(bookingId).session(session);
      if (!currentBooking) {
        throw new Error("BOOKING_NOT_FOUND");
      }
      if (String(currentBooking.userId) !== String(req.user._id)) {
        throw new Error("BOOKING_PAYMENT_FORBIDDEN");
      }
      if (!["pending_confirmation", "confirmed"].includes(currentBooking.status)) {
        throw new Error("BOOKING_NOT_PAYABLE");
      }
      if (currentBooking.paymentStatus !== "unpaid") {
        throw new Error("BOOKING_ALREADY_PAID");
      }
      if (!Number.isSafeInteger(currentBooking.snapshot.total) || currentBooking.snapshot.total <= 0) {
        throw new Error("BOOKING_AMOUNT_INVALID");
      }

      currentBooking.increment();
      await currentBooking.save({ session });

      const pendingTransaction = await PaymentTransaction.findOne({
        bookingId,
        $or: [
          { status: "pending" },
          { activeAttempt: true },
          { status: { $in: PAID_STATUSES } },
        ],
      }).session(session);
      if (pendingTransaction) {
        throw new Error("PAYMENT_PENDING");
      }

      const appTransId = moment().utcOffset(420).format("YYMMDD") +
        "_" + randomBytes(12).toString("hex");
      const [createdTransaction] = await PaymentTransaction.create([{
        bookingId,
        bookingCode: currentBooking.code,
        appTransId,
        amount: currentBooking.snapshot.total,
        provider: "zalopay",
        activeAttempt: true,
        expiresAt: new Date(Date.now() + ORDER_EXPIRY_MS),
      }], { session });

      return createdTransaction;
    });

    // 4. Chuẩn bị payload và chữ ký gửi ZaloPay.
    const paymentBooking = await Booking.findById(bookingId);
    const items = [{
      itemid: String(paymentBooking.tourId),
      itemname: paymentBooking.snapshot.tourName,
      itemprice: transaction.amount,
      itemquantity: 1,
    }];
    const embedData = {
      redirecturl: (process.env.CLIENT_URL || "") + "/booking/success/" + bookingId,
    };
    const order = {
      app_id: config.app_id,
      app_trans_id: transaction.appTransId,
      app_user: String(req.user._id),
      app_time: Date.now(),
      amount: transaction.amount,
      item: JSON.stringify(items),
      embed_data: JSON.stringify(embedData),
      description: "Thanh toán Tour Đắk Song - Đơn hàng #" + paymentBooking.code,
      bank_code: "",
    };
    const signatureData = [
      order.app_id,
      order.app_trans_id,
      order.app_user,
      order.amount,
      order.app_time,
      order.embed_data,
      order.item,
    ].join("|");
    order.mac = CryptoJS.HmacSHA256(signatureData, config.key1).toString();

    // 5. Gọi provider ngoài transaction MongoDB.
    const providerResult = await sendZaloPayRequest(config.endpoint, order);
    if (providerResult.return_code === 1) {
      return res.json({
        order_url: providerResult.order_url,
        zp_trans_token: providerResult.zp_trans_token,
        appTransId: transaction.appTransId,
      });
    }

    if (providerResult.return_code === 2 && ![-68, -500].includes(providerResult.sub_return_code)) {
      await PaymentTransaction.updateOne(
        { _id: transaction._id, status: "pending", appliedAt: null },
        {
          $set: {
            status: "failed",
            activeAttempt: false,
            note: "ZaloPay từ chối tạo giao dịch.",
          },
          $inc: { __v: 1 },
        }
      );
      return res.status(400).json({
        message: "Lỗi tạo giao dịch ZaloPay.",
        details: providerResult,
      });
    }

    return res.status(502).json({
      message: "ZaloPay chưa xác định kết quả tạo đơn. Hãy truy vấn giao dịch.",
      code: "PAYMENT_RESULT_UNKNOWN",
      appTransId: transaction.appTransId,
    });
  } catch (error) {
    if (error.message === "BOOKING_NOT_FOUND") {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
    }
    if (error.message === "BOOKING_PAYMENT_FORBIDDEN") {
      return res.status(403).json({ message: "Không có quyền thanh toán đơn này." });
    }
    if (error.message === "BOOKING_NOT_PAYABLE") {
      return res.status(400).json({ message: "Đơn hàng không thể thanh toán ở trạng thái hiện tại." });
    }
    if (error.message === "BOOKING_ALREADY_PAID") {
      return res.status(400).json({ message: "Đơn hàng đã được thanh toán hoặc đang hoàn tiền." });
    }
    if (error.message === "BOOKING_AMOUNT_INVALID") {
      return res.status(400).json({ message: "Đơn không có số tiền hợp lệ để thanh toán ZaloPay." });
    }
    if (error.message === "PAYMENT_PENDING") {
      const pendingTransaction = await PaymentTransaction.findOne({
        bookingId: req.body.bookingId,
        $or: [
          { status: "pending" },
          { activeAttempt: true },
          { status: { $in: PAID_STATUSES } },
        ],
      });

      let appTransId;
      if (pendingTransaction) {
        appTransId = pendingTransaction.appTransId;
      }
      return res.status(409).json({
        message: "Đã có giao dịch đang chờ. Hãy truy vấn trạng thái giao dịch.",
        code: "PAYMENT_PENDING",
        appTransId,
      });
    }
    if (error.message === "PAYMENT_RESULT_UNKNOWN") {
      let appTransId;
      if (transaction) {
        appTransId = transaction.appTransId;
      }
      return res.status(502).json({
        message: "Chưa xác định được kết quả ZaloPay. Vui lòng truy vấn trạng thái trước khi thử lại.",
        code: "PAYMENT_RESULT_UNKNOWN",
        appTransId,
      });
    }
    if (error.message === "PAYMENT_AMOUNT_MISMATCH") {
      return res.status(502).json({
        message: "Số tiền đối soát không khớp.",
        code: "PAYMENT_AMOUNT_MISMATCH",
      });
    }
    if (error.message === "PAYMENT_BOOKING_NOT_FOUND") {
      return res.status(409).json({ message: "Chưa tìm thấy đơn để ghi nhận tiền." });
    }

    // Giữ middleware chung để phân loại lỗi validation, xung đột DB và hạ tầng.
    return next(error);
  }
};

// @desc   Query ZaloPay order status
// @route  POST /api/payments/zalopay/:appTransId/query
// @access Private (Owner/Admin)
export const queryZaloPayOrder = async (req, res, next) => {
  try {
    // 1. Kiểm tra giao dịch và quyền xem đơn.
    const transaction = await PaymentTransaction.findOne({ appTransId: req.params.appTransId });
    if (!transaction) {
      return res.status(404).json({ message: "Không tìm thấy giao dịch." });
    }

    const booking = await Booking.findById(transaction.bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
    }
    if (req.user.role !== "admin" && String(booking.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Không có quyền xem giao dịch này." });
    }

    const config = getConfig();
    if (!config) {
      return res.status(503).json({ message: "Chưa cấu hình ZaloPay. Vui lòng liên hệ quản trị viên." });
    }

    // 2. Đối soát và trả trạng thái đã lưu.
    const result = await refreshZaloPayOrder(transaction, config);
    res.json({
      appTransId: transaction.appTransId,
      status: result.transaction.status,
      return_code: result.provider.return_code,
    });
  } catch (error) {
    if (error.message === "PAYMENT_RESULT_UNKNOWN") {
      return res.status(502).json({
        message: "Chưa xác định được kết quả ZaloPay. Vui lòng truy vấn trạng thái trước khi thử lại.",
        code: "PAYMENT_RESULT_UNKNOWN",
      });
    }
    if (error.message === "PAYMENT_AMOUNT_MISMATCH") {
      return res.status(502).json({
        message: "Số tiền đối soát không khớp.",
        code: "PAYMENT_AMOUNT_MISMATCH",
      });
    }
    if (error.message === "PAYMENT_BOOKING_NOT_FOUND") {
      return res.status(409).json({ message: "Chưa tìm thấy đơn để ghi nhận tiền." });
    }
    return next(error);
  }
};

// @desc   Handle ZaloPay payment callback
// @route  POST /api/payments/zalopay/webhook
// @access Public (Verified MAC)
export const zaloPayWebhook = async (req, res) => {
  try {
    const config = getConfig();
    if (!config) {
      return res.json({
        return_code: 0,
        return_message: "Chưa ghi nhận được thanh toán. Vui lòng thử lại.",
      });
    }

    // 1. Kiểm tra định dạng và chữ ký callback.
    const { data, mac } = req.body || {};
    if (typeof data !== "string" || typeof mac !== "string" || !/^[a-f0-9]{64}$/i.test(mac)) {
      return res.json({ return_code: -1, return_message: "Invalid callback" });
    }

    const expectedMac = CryptoJS.HmacSHA256(data, config.key2).toString();
    const receivedMacBuffer = Buffer.from(mac, "hex");
    const expectedMacBuffer = Buffer.from(expectedMac, "hex");
    if (!timingSafeEqual(receivedMacBuffer, expectedMacBuffer)) {
      return res.json({ return_code: -1, return_message: "mac not equal" });
    }

    // 2. Kiểm tra app_id và mã giao dịch trong dữ liệu đã ký.
    let callbackData;
    try {
      callbackData = JSON.parse(data);
    } catch (error) {
      return res.json({ return_code: -1, return_message: "Invalid callback JSON" });
    }

    if (!callbackData || Array.isArray(callbackData) ||
        String(callbackData.app_id) !== String(config.app_id) ||
        typeof callbackData.app_trans_id !== "string" || !/^[a-z0-9_-]{1,100}$/i.test(callbackData.app_trans_id) ||
        !Number.isSafeInteger(callbackData.amount) || callbackData.amount < 0) {
      return res.json({ return_code: -1, return_message: "Invalid app_id/app_trans_id" });
    }

    // 3. Cùng cập nhật booking và giao dịch; callback lặp không ghi nhận tiền lần nữa.
    const accepted = await recordZaloPayPayment(callbackData.app_trans_id, callbackData);
    if (!accepted) {
      return res.json({ return_code: -1, return_message: "Transaction/amount mismatch" });
    }

    res.json({ return_code: 1, return_message: "success" });
  } catch (error) {
    // Chưa commit DB: yêu cầu ZaloPay gửi lại callback.
    res.json({
      return_code: 0,
      return_message: "Chưa ghi nhận được thanh toán. Vui lòng thử lại.",
    });
  }
};

// @desc   Request a full ZaloPay refund
// @route  POST /api/payments/zalopay/:appTransId/refund
// @access Private (Admin)
// Tài liệu: https://docs.zalopay.vn/vi/docs/specs/order-refund/
export const refundZaloPayOrder = async (req, res, next) => {
  let refundTransaction;

  try {
    const config = getConfig();
    if (!config) {
      return res.status(503).json({ message: "Chưa cấu hình ZaloPay. Vui lòng liên hệ quản trị viên." });
    }

    // 1. Kiểm tra giao dịch và đơn cần hoàn tiền.
    const transaction = await PaymentTransaction.findOne({ appTransId: req.params.appTransId });
    if (!transaction) {
      return res.status(404).json({ message: "Không tìm thấy giao dịch." });
    }

    const booking = await Booking.findById(transaction.bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
    }
    if (req.user.role !== "admin" && String(booking.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Không có quyền xem giao dịch này." });
    }

    // 2. Lưu yêu cầu trước khi gọi provider để chặn hai lệnh hoàn tiền đồng thời.
    refundTransaction = await mongoose.connection.transaction(async session => {
      const currentTransaction = await PaymentTransaction.findById(transaction._id).session(session);
      if (currentTransaction.status !== "refund_pending") {
        throw new Error("PAYMENT_NOT_REFUNDABLE");
      }
      if (!currentTransaction.zpTransId) {
        throw new Error("ZALOPAY_TRANSACTION_ID_REQUIRED");
      }
      if (["pending", "success"].includes(currentTransaction.refundState)) {
        throw new Error("REFUND_PENDING");
      }

      currentTransaction.refundRequestId = moment().utcOffset(420).format("YYMMDD") +
        "_" + config.app_id + "_" + randomBytes(10).toString("hex");
      currentTransaction.refundState = "pending";
      currentTransaction.providerRefundId = "";
      currentTransaction.note = "Đã tạo yêu cầu hoàn tiền, đang chờ xác minh kết quả ZaloPay.";
      await currentTransaction.save({ session });

      return currentTransaction;
    });

    // 3. Ký payload hoàn toàn bộ số tiền của giao dịch.
    const timestamp = Date.now();
    const description = "Hoàn tiền đơn " + refundTransaction.bookingCode;
    const signatureData = [
      config.app_id,
      refundTransaction.zpTransId,
      refundTransaction.amount,
      description,
      timestamp,
    ].join("|");
    const payload = {
      app_id: config.app_id,
      m_refund_id: refundTransaction.refundRequestId,
      zp_trans_id: refundTransaction.zpTransId,
      amount: refundTransaction.amount,
      timestamp,
      description,
      mac: CryptoJS.HmacSHA256(signatureData, config.key1).toString(),
    };

    // 4. Gửi yêu cầu; chỉ API query refund mới xác nhận đã hoàn thành.
    const refundUrl = new URL("refund", config.endpoint).toString();
    const providerResult = await sendZaloPayRequest(refundUrl, payload, true);
    if (providerResult.refund_id) {
      await PaymentTransaction.updateOne(
        {
          _id: refundTransaction._id,
          refundRequestId: refundTransaction.refundRequestId,
        },
        {
          $set: { providerRefundId: String(providerResult.refund_id) },
          $inc: { __v: 1 },
        }
      );
    }

    // Lỗi hệ thống/trùng yêu cầu chưa xác định kết quả: giữ mã cũ để query.
    if (providerResult.return_code === 2 && ![-500, -23, -1].includes(providerResult.sub_return_code)) {
      await PaymentTransaction.updateOne(
        {
          _id: refundTransaction._id,
          refundRequestId: refundTransaction.refundRequestId,
          refundState: "pending",
        },
        {
          $set: {
            refundState: "failed",
            note: "ZaloPay từ chối hoàn tiền, mã lỗi: " + providerResult.sub_return_code,
          },
          $inc: { __v: 1 },
        }
      );
      return res.status(400).json({
        message: providerResult.sub_return_code === -401
          ? "ZaloPay từ chối hoàn tiền: dữ liệu yêu cầu không hợp lệ (mã -401)."
          : "ZaloPay từ chối hoàn tiền (mã " + providerResult.sub_return_code + ").",
        details: providerResult,
      });
    }

    res.status(202).json({
      appTransId: refundTransaction.appTransId,
      refundRequestId: refundTransaction.refundRequestId,
      status: "refund_pending",
    });
  } catch (error) {
    if (error.message === "PAYMENT_NOT_REFUNDABLE") {
      return res.status(409).json({ message: "Giao dịch chưa ở trạng thái cần hoàn tiền." });
    }
    if (error.message === "ZALOPAY_TRANSACTION_ID_REQUIRED") {
      return res.status(409).json({ message: "Cần truy vấn thanh toán để lấy zp_trans_id trước khi hoàn tiền." });
    }
    if (error.message === "REFUND_PENDING") {
      return res.status(409).json({
        message: "Đã gửi yêu cầu hoàn tiền. Hãy truy vấn kết quả.",
        code: "REFUND_PENDING",
      });
    }
    if (error.message === "PAYMENT_RESULT_UNKNOWN") {
      let appTransId;
      let refundRequestId;
      if (refundTransaction) {
        appTransId = refundTransaction.appTransId;
        refundRequestId = refundTransaction.refundRequestId;
      }
      return res.status(502).json({
        message: "Chưa xác định được kết quả ZaloPay. Vui lòng truy vấn trạng thái trước khi thử lại.",
        code: "PAYMENT_RESULT_UNKNOWN",
        appTransId,
        refundRequestId,
      });
    }
    return next(error);
  }
};

// @desc   Query ZaloPay refund status
// @route  POST /api/payments/zalopay/:appTransId/refund/query
// @access Private (Admin)
// Tài liệu: https://docs.zalopay.vn/vi/docs/specs/order-query-refund/
export const queryZaloPayRefund = async (req, res, next) => {
  try {
    // 1. Kiểm tra yêu cầu hoàn tiền đã lưu.
    const transaction = await PaymentTransaction.findOne({ appTransId: req.params.appTransId });
    if (!transaction) {
      return res.status(404).json({ message: "Không tìm thấy giao dịch." });
    }

    const booking = await Booking.findById(transaction.bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
    }
    if (req.user.role !== "admin" && String(booking.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Không có quyền xem giao dịch này." });
    }
    if (!transaction.refundRequestId) {
      return res.status(409).json({ message: "Chưa có yêu cầu hoàn tiền." });
    }
    if (transaction.status === "refunded") {
      return res.json({ appTransId: transaction.appTransId, status: transaction.status,
        refundRequestId: transaction.refundRequestId, refundState: "success",
        message: "ZaloPay đã xác nhận hoàn tiền thành công." });
    }

    const config = getConfig();
    if (!config) {
      return res.status(503).json({ message: "Chưa cấu hình ZaloPay. Vui lòng liên hệ quản trị viên." });
    }

    // 2. Truy vấn kết quả bằng đúng mã yêu cầu đã gửi.
    const timestamp = Date.now();
    const signatureData = [
      config.app_id,
      transaction.refundRequestId,
      timestamp,
    ].join("|");
    const payload = {
      app_id: config.app_id,
      m_refund_id: transaction.refundRequestId,
      timestamp,
      mac: CryptoJS.HmacSHA256(signatureData, config.key1).toString(),
    };
    const queryUrl = new URL("query_refund", config.endpoint).toString();
    const providerResult = await sendZaloPayRequest(queryUrl, payload, true);

    // Lỗi truy vấn/MAC/mạng không chứng minh yêu cầu hoàn tiền thất bại.
    // Chỉ các kết quả thất bại cuối cùng mới cho phép admin gửi lại.
    const refundFailed = providerResult.return_code === 2 &&
      [-2, -13, -14, -32].includes(providerResult.sub_return_code);
    if (refundFailed) {
      await PaymentTransaction.updateOne({
        _id: transaction._id, refundRequestId: transaction.refundRequestId,
        status: "refund_pending", refundState: "pending",
      }, { $set: { refundState: "failed",
        note: "ZaloPay xác nhận hoàn tiền không thành công, mã lỗi: " + providerResult.sub_return_code },
        $inc: { __v: 1 } });
    } else if (providerResult.return_code === 2 &&
        ![-1, -16].includes(providerResult.sub_return_code)) {
      return res.status(502).json({
        code: "REFUND_QUERY_UNVERIFIED",
        message: providerResult.sub_return_code === -101
          ? "ZaloPay chưa tìm thấy mã yêu cầu hoàn tiền. Cần đối soát mã này trước khi gửi yêu cầu mới."
          : "ZaloPay chưa xác minh được kết quả hoàn tiền (mã " + providerResult.sub_return_code + "). Hãy kiểm tra lại sau.",
      });
    }

    // 3. Provider xác nhận thành công mới ghi refunded, không lặp lịch sử khi query lại.
    if (providerResult.return_code === 1) {
      await mongoose.connection.transaction(async session => {
        const currentTransaction = await PaymentTransaction.findById(transaction._id).session(session);
        if (currentTransaction.status === "refunded") {
          return;
        }
        if (currentTransaction.refundRequestId !== transaction.refundRequestId ||
            currentTransaction.status !== "refund_pending") {
          throw new Error("REFUND_REQUEST_CHANGED");
        }

        currentTransaction.status = "refunded";
        currentTransaction.refundState = "success";
        currentTransaction.refundedAt = new Date();
        await currentTransaction.save({ session });

        const currentBooking = await Booking.findById(currentTransaction.bookingId).session(session);
        if (!currentBooking) {
          throw new Error("REFUND_BOOKING_NOT_FOUND");
        }

        const outstandingPayment = await PaymentTransaction.exists({
          bookingId: currentBooking._id,
          status: { $in: ["success", "refund_pending"] },
        }).session(session);
        if (["cancelled", "rejected"].includes(currentBooking.status) && !outstandingPayment) {
          currentBooking.paymentStatus = "refunded";
        }

        currentBooking.history.push({
          status: "refunded",
          actorId: req.user._id,
          reason: "ZaloPay xác nhận hoàn tiền: " + currentTransaction.refundRequestId,
          at: new Date(),
        });
        await currentBooking.save({ session });
      });
    }

    // 4. Trả trạng thái mới nhất, gồm cả trường hợp provider còn xử lý.
    const updatedTransaction = await PaymentTransaction.findById(transaction._id);
    res.json({
      appTransId: transaction.appTransId,
      status: updatedTransaction.status,
      refundRequestId: updatedTransaction.refundRequestId,
      refundState: updatedTransaction.refundState,
      return_code: providerResult.return_code,
      sub_return_code: providerResult.sub_return_code,
      message: updatedTransaction.status === "refunded"
        ? "ZaloPay đã xác nhận hoàn tiền thành công."
        : updatedTransaction.refundState === "failed"
          ? "ZaloPay xác nhận hoàn tiền không thành công. Kiểm tra nguyên nhân trước khi gửi lại yêu cầu."
          : "ZaloPay chưa hoàn tất hoàn tiền. Yêu cầu vẫn đang chờ xử lý hoặc phê duyệt; hãy kiểm tra lại sau.",
    });
  } catch (error) {
    if (error.message === "PAYMENT_RESULT_UNKNOWN") {
      return res.status(502).json({
        code: "REFUND_QUERY_UNVERIFIED",
        providerHttpStatus: error.providerHttpStatus,
        message: error.providerHttpStatus
          ? "Dịch vụ kiểm tra hoàn tiền ZaloPay đang lỗi (HTTP " + error.providerHttpStatus + "). Chưa xác minh được kết quả; hãy kiểm tra lại sau."
          : "Chưa kết nối được dịch vụ kiểm tra hoàn tiền ZaloPay. Chưa xác minh được kết quả; hãy kiểm tra lại sau.",
      });
    }
    if (error.message === "REFUND_REQUEST_CHANGED") {
      return res.status(409).json({ message: "Yêu cầu hoàn tiền đã thay đổi." });
    }
    if (error.message === "REFUND_BOOKING_NOT_FOUND") {
      return res.status(409).json({ message: "Đơn hàng không còn tồn tại." });
    }
    return next(error);
  }
};
