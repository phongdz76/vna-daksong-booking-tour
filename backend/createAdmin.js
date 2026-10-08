import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "./models/User.js";

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {});
    
    const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || "";
    const name = (process.env.ADMIN_NAME || "VNA Admin").trim();
    
    if (!email || !password) {
      console.error("LỖI: Vui lòng cấu hình ADMIN_EMAIL và ADMIN_PASSWORD trong file .env");
      process.exit(1);
    }
    
    // bcrypt chỉ xử lý tối đa 72 byte — kiểm tra trước khi hash
    if (Buffer.byteLength(password) > 72) {
      console.error("LỖI: Mật khẩu vượt quá 72 byte. bcrypt sẽ cắt bớt, gây lỗi đăng nhập.");
      process.exit(1);
    }

    if (password.length < 8) {
      console.error("LỖI: Mật khẩu cần ít nhất 8 ký tự.");
      process.exit(1);
    }
    
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.error(`LỖI: Tài khoản admin với email ${email} đã tồn tại trong hệ thống!`);
      process.exit(1);
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    await User.create({
      name,
      email,
      password: hashedPassword,
      role: "admin",
      active: true
    });
    
    console.log(`✅ Thành công! Đã tạo tài khoản Admin: ${email}`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi khi tạo admin:", error.message);
    process.exit(1);
  }
};

createAdmin();
