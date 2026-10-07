import jwt from "jsonwebtoken";
import { createHmac } from "node:crypto";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

function generateToken(userId) {
  const secret = process.env.JWT_SECRET || "";
  if (secret.length < 32) throw new Error("Chưa cấu hình JWT_SECRET.");
  return jwt.sign({ sub: String(userId) }, secret, { algorithm: "HS256", issuer: "vna-daksong-api", audience: "session", expiresIn: "1d" });
}

const sessionResponse = user => ({ user: user.toJSON(), token: generateToken(user._id), tokenType: "Bearer", expiresIn: 86400 });

// @desc   Login with Zalo
// @route  POST /api/auth/zalo
// @access Public
export const loginWithZalo = async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken || typeof accessToken !== "string") {
      return res.status(400).json({ message: "accessToken is required" });
    }
    if (/[\r\n]/.test(accessToken)) {
      return res.status(400).json({ message: "accessToken không hợp lệ." });
    }
    if (!process.env.ZALO_APP_SECRET) {
      return res.status(503).json({ message: "Chưa cấu hình ZALO_APP_SECRET." });
    }
    if ((process.env.JWT_SECRET || "").length < 32) {
      return res.status(503).json({ message: "Chưa cấu hình JWT_SECRET." });
    }
    
    let response;
    let profile;
    try {
      response = await fetch("https://graph.zalo.me/v2.0/me?fields=id,name,picture", {
        headers: {
          access_token: accessToken,
          appsecret_proof: createHmac("sha256", process.env.ZALO_APP_SECRET).update(accessToken).digest("hex"),
        },
        signal: AbortSignal.timeout(8000),
      });
      profile = await response.json();
    } catch {
      return res.status(502).json({ message: "Chưa liên lạc được với Zalo. Vui lòng thử lại." });
    }
    
    if (!response.ok || profile?.error !== 0 || typeof profile.id !== "string" || !/^\d{1,40}$/.test(profile.id)) {
      return res.status(401).json({ message: "Zalo không xác nhận được phiên đăng nhập." });
    }
    
    const name = typeof profile.name === "string" && profile.name.trim() ? profile.name.trim().slice(0, 200) : "Khách Zalo";
    const avatar = typeof profile.picture?.data?.url === "string" && /^https:\/\//.test(profile.picture.data.url) ? profile.picture.data.url.slice(0, 2000) : "";
    
    let user;
    try {
      user = await User.findOneAndUpdate({ zaloId: profile.id }, {
        $set: { name, avatar },
        $setOnInsert: { role: "user", active: true },
      }, { upsert: true, returnDocument: "after", runValidators: true });
    } catch (error) {
      if (error.code !== 11000) throw error;
      user = await User.findOne({ zaloId: profile.id });
    }
    
    if (!user?.active) {
      return res.status(403).json({ message: "Tài khoản đã bị khóa." });
    }
    
    res.json(sessionResponse(user));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Mock Login for dev
// @route  POST /api/auth/mock
// @access Public
export const loginMock = async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ message: "Mock login không được phép trên production." });
    }
    
    const { name, phone } = req.body;
    const finalName = typeof name === "string" ? name.trim().slice(0, 200) || "Khách Zalo" : "Khách Zalo";
    
    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return res.status(400).json({ message: "Số điện thoại không hợp lệ." });
    }
    const finalPhone = phone.trim().slice(0, 20);

    const mockZaloId = "mock_" + finalPhone;
    let user;
    try {
      user = await User.findOneAndUpdate({ zaloId: mockZaloId }, {
        $set: { name: finalName },
        $setOnInsert: { role: "user", active: true },
      }, { upsert: true, returnDocument: "after", runValidators: true });
    } catch (error) {
      if (error.code !== 11000) throw error;
      user = await User.findOne({ zaloId: mockZaloId });
    }
    
    if (!user?.active) {
      return res.status(403).json({ message: "Tài khoản đã bị khóa." });
    }
    
    res.json(sessionResponse(user));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Admin login
// @route  POST /api/auth/admin/login
// @access Public
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "Email is required" });
    }
    
    if (!password || typeof password !== "string" || !password.length || Buffer.byteLength(password) > 72) {
      return res.status(400).json({ message: "Mật khẩu không hợp lệ." });
    }
    
    const finalEmail = email.trim().toLowerCase();
    
    const user = await User.findOne({ email: finalEmail, role: "admin", active: true }).select("+password");
    if (!user?.password || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng." });
    }
    
    res.json(sessionResponse(user));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Get user profile
// @route  GET /api/auth/me
// @access Private
export const getProfile = (req, res) => res.json({ user: req.user.toJSON() });
