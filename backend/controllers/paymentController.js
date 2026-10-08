import axios from "axios";
import CryptoJS from "crypto-js";
import moment from "moment";
import Booking from "../models/Booking.js";
import Tour from "../models/Tour.js";
import PaymentTransaction from "../models/PaymentTransaction.js";

// Đọc cấu hình lazy — đảm bảo .env đã được nạp
function getConfig() {
  const cfg = {
    app_id: process.env.ZALOPAY_APP_ID,
    key1: process.env.ZALOPAY_KEY1,
    key2: process.env.ZALOPAY_KEY2,
    endpoint: process.env.ZALOPAY_ENDPOINT,
  };
  if (!cfg.app_id || !cfg.key1 || !cfg.key2 || !cfg.endpoint) {
    return null;
  }
  return cfg;
}

// @desc   Create ZaloPay Order
// @route  POST /api/payments/zalopay/create
// @access Private
export const createZaloPayOrder = async (req, res) => {
  try {
    const config = getConfig();
    if (!config) return res.status(503).json({ message: "Chưa cấu hình ZaloPay. Vui lòng liên hệ quản trị viên." });

    const { bookingId } = req.body;
    
    // 1. Validate Booking
    const booking = await Booking.findById(bookingId).populate("tourId");
    if (!booking) return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
    if (booking.userId.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Không có quyền thanh toán đơn này." });
    
    // Cho phép thanh toán nếu đơn chưa trả tiền (bất kể pending_confirmation hay confirmed)
    if (!["pending_confirmation", "confirmed"].includes(booking.status)) {
      return res.status(400).json({ message: "Đơn hàng không thể thanh toán ở trạng thái hiện tại." });
    }
    if (booking.paymentStatus === "paid") {
      return res.status(400).json({ message: "Đơn hàng đã được thanh toán." });
    }
    if (booking.status === "cancelled" || booking.status === "rejected") {
      return res.status(400).json({ message: "Đơn hàng đã bị hủy/từ chối, không thể thanh toán." });
    }

    // 2. Kiểm tra giao dịch đang chờ — tránh tạo trùng
    const pendingTx = await PaymentTransaction.findOne({ bookingId: booking._id, status: "pending" });
    if (pendingTx) {
      // Giao dịch đang chờ xử lý, trả lại thông tin cũ hoặc thông báo
      return res.status(409).json({ 
        message: "Đã có giao dịch thanh toán đang chờ. Vui lòng hoàn tất hoặc đợi hết hạn.",
        appTransId: pendingTx.appTransId,
      });
    }

    // 3. Prepare ZaloPay payload
    const embed_data = {
      redirecturl: `${process.env.CLIENT_URL}/booking/success/${bookingId}`,
    };

    const items = [
      {
        itemid: booking.tourId._id.toString(),
        itemname: booking.snapshot.tourName,
        itemprice: booking.snapshot.total,
        itemquantity: 1,
      }
    ];

    const transID = Math.floor(Math.random() * 1000000);
    const app_trans_id = `${moment().format('YYMMDD')}_${booking.code}_${transID}`;
    
    const order = {
      app_id: config.app_id,
      app_trans_id: app_trans_id,
      app_user: req.user.name || "user",
      app_time: Date.now(),
      item: JSON.stringify(items),
      embed_data: JSON.stringify(embed_data),
      amount: booking.snapshot.total,
      description: `Thanh toán Tour Đắk Song - Đơn hàng #${booking.code}`,
      bank_code: "",
    };

    // 4. Create Signature
    const data = config.app_id + "|" + order.app_trans_id + "|" + order.app_user + "|" + order.amount + "|" + order.app_time + "|" + order.embed_data + "|" + order.item;
    order.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

    // 5. Lưu bản ghi giao dịch trước khi gửi ZaloPay
    await PaymentTransaction.create({
      bookingId: booking._id,
      bookingCode: booking.code,
      appTransId: app_trans_id,
      amount: booking.snapshot.total,
      provider: "zalopay",
      status: "pending",
    });

    // 6. Send request to ZaloPay
    const result = await axios.post(config.endpoint, null, { params: order });
    
    if (result.data.return_code === 1) {
      res.json({
        order_url: result.data.order_url,
        zp_trans_token: result.data.zp_trans_token,
        appTransId: app_trans_id,
      });
    } else {
      // Giao dịch thất bại, cập nhật bản ghi
      await PaymentTransaction.findOneAndUpdate({ appTransId: app_trans_id }, { status: "failed", note: JSON.stringify(result.data) });
      res.status(400).json({ message: "Lỗi tạo giao dịch ZaloPay.", details: result.data });
    }
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ.", error: error.message });
  }
};

// @desc   ZaloPay Webhook (Server-to-Server)
// @route  POST /api/payments/zalopay/webhook
// @access Public
export const zaloPayWebhook = async (req, res) => {
  let result = {};
  
  try {
    const config = getConfig();
    if (!config) {
      result.return_code = 0;
      result.return_message = "Server chưa cấu hình ZaloPay.";
      return res.json(result);
    }

    const dataStr = req.body.data;
    const reqMac = req.body.mac;
    
    // Verify signature
    const mac = CryptoJS.HmacSHA256(dataStr, config.key2).toString();

    if (reqMac !== mac) {
      result.return_code = -1;
      result.return_message = "mac not equal";
    } else {
      // Parse data
      const dataJson = JSON.parse(dataStr);
      const app_trans_id = dataJson.app_trans_id;
      
      // Kiểm tra app_id
      if (String(dataJson.app_id) !== String(config.app_id)) {
        result.return_code = -1;
        result.return_message = "app_id không khớp";
        return res.json(result);
      }

      // Tìm bản ghi giao dịch đã tạo bởi backend
      const transaction = await PaymentTransaction.findOne({ appTransId: app_trans_id });
      if (!transaction) {
        // Giao dịch không được backend tạo → bỏ qua
        result.return_code = -1;
        result.return_message = "Giao dịch không tồn tại trong hệ thống.";
        return res.json(result);
      }

      // Đã xử lý rồi thì bỏ qua
      if (transaction.status === "success") {
        result.return_code = 1;
        result.return_message = "success";
        return res.json(result);
      }

      // Kiểm tra số tiền
      if (Number(dataJson.amount) !== transaction.amount) {
        transaction.status = "failed";
        transaction.note = `Số tiền không khớp: callback=${dataJson.amount}, expected=${transaction.amount}`;
        transaction.rawCallback = dataJson;
        await transaction.save();
        result.return_code = -1;
        result.return_message = "Số tiền không khớp.";
        return res.json(result);
      }

      const booking = await Booking.findById(transaction.bookingId);
      
      if (!booking) {
        transaction.status = "failed";
        transaction.note = "Đơn hàng không tồn tại.";
        transaction.rawCallback = dataJson;
        await transaction.save();
        result.return_code = 1;
        result.return_message = "success";
        return res.json(result);
      }

      // Cập nhật giao dịch thành công
      transaction.status = "success";
      transaction.paidAt = new Date();
      transaction.rawCallback = dataJson;
      await transaction.save();

      // Nếu đơn đã bị hủy/từ chối → ghi nhận tiền về muộn, cần hoàn tiền
      if (["cancelled", "rejected"].includes(booking.status)) {
        transaction.status = "refund_pending";
        transaction.note = "Tiền về muộn — đơn đã bị hủy/từ chối. Cần hoàn tiền.";
        await transaction.save();

        booking.paymentStatus = "refund_pending";
        booking.history.push({
          status: "refund_pending",
          actorId: booking.userId,
          reason: "Thanh toán thành công nhưng đơn đã hủy/từ chối. Cần xử lý hoàn tiền.",
          at: new Date(),
        });
        await booking.save();
      } else {
        // Cập nhật paymentStatus — KHÔNG thay đổi trạng thái booking
        booking.paymentStatus = "paid";
        booking.paymentMethod = "zalopay";
        booking.history.push({
          status: "payment_received",
          actorId: booking.userId,
          reason: "Thanh toán thành công qua ZaloPay.",
          at: new Date(),
        });
        await booking.save();

        // Cập nhật soldCount khi thanh toán thành công
        await Tour.findByIdAndUpdate(booking.tourId, { $inc: { soldCount: booking.adults + booking.children } });
      }

      result.return_code = 1;
      result.return_message = "success";
    }
  } catch (ex) {
    result.return_code = 0;
    result.return_message = ex.message;
  }
  
  res.json(result);
};
