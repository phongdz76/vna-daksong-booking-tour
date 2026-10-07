import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Verify the session, then load permissions from the database.
export const protect = async (req, res, next) => {
  try {
    const authorization = req.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Bạn cần đăng nhập để tiếp tục.", code: "AUTH_REQUIRED" });
    }
    const secret = process.env.JWT_SECRET || "";
    if (secret.length < 32) return res.status(503).json({ message: "Chưa cấu hình JWT_SECRET.", code: "AUTH_NOT_CONFIGURED" });

    let decoded;
    try {
      decoded = jwt.verify(authorization.slice(7), secret, {
        algorithms: ["HS256"], issuer: "vna-daksong-api", audience: "session",
      });
    } catch {
      return res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn.", code: "INVALID_TOKEN" });
    }
    if (typeof decoded !== "object" || typeof decoded.sub !== "string" || !/^[a-f0-9]{24}$/i.test(decoded.sub)) {
      return res.status(401).json({ message: "Phiên đăng nhập không hợp lệ.", code: "INVALID_TOKEN" });
    }
    const user = await User.findById(decoded.sub);
    if (!user?.active) return res.status(401).json({ message: "Tài khoản không còn hoạt động.", code: "INVALID_USER" });
    req.user = user;
    return next();
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Chỉ nhân viên quản trị được thực hiện thao tác này.", code: "ADMIN_REQUIRED" });
  }
  return next();
};

// Catalog browsing is public; a supplied token is always verified.
export const optionalProtect = (req, res, next) => {
  if (req.get("Authorization")) return protect(req, res, next);
  return next();
};
