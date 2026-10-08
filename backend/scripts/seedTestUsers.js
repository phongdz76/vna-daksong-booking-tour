import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";

const testUsers = [
  {
    name: process.env.TEST_USER_BAC_NAME || "Nguyễn Minh Anh",
    email: process.env.TEST_USER_BAC_EMAIL || "test.bac@vna.local",
    zaloId: process.env.TEST_USER_BAC_ZALO_ID || "mock_test_bac",
    membershipTier: "Bạc",
    loyaltyPoints: Number(process.env.TEST_USER_BAC_POINTS || 0),
  },
  {
    name: process.env.TEST_USER_VANG_NAME || "Trần Quốc Bảo",
    email: process.env.TEST_USER_VANG_EMAIL || "test.vang@vna.local",
    zaloId: process.env.TEST_USER_VANG_ZALO_ID || "mock_test_vang",
    membershipTier: "Vàng",
    loyaltyPoints: Number(process.env.TEST_USER_VANG_POINTS || 1000),
  },
  {
    name: process.env.TEST_USER_KIM_CUONG_NAME || "Lê Hoàng Nam",
    email: process.env.TEST_USER_KIM_CUONG_EMAIL || "test.kimcuong@vna.local",
    zaloId: process.env.TEST_USER_KIM_CUONG_ZALO_ID || "mock_test_kimcuong",
    membershipTier: "Kim Cương",
    loyaltyPoints: Number(process.env.TEST_USER_KIM_CUONG_POINTS || 5000),
  },
];

const seedTestUsers = async () => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Không được tạo user test trên môi trường production.");
  }

  if (!process.env.MONGO_URI) {
    throw new Error("Vui lòng cấu hình MONGO_URI trong file .env.");
  }

  await mongoose.connect(process.env.MONGO_URI);

  for (const testUser of testUsers) {
    await User.findOneAndUpdate(
      { zaloId: testUser.zaloId },
      {
        $set: {
          name: testUser.name,
          email: testUser.email,
          membershipTier: testUser.membershipTier,
          loyaltyPoints: testUser.loyaltyPoints,
          role: "user",
          active: true,
        },
        $setOnInsert: {
          zaloId: testUser.zaloId,
        },
      },
      { upsert: true, returnDocument: "after", runValidators: true },
    );

    console.log(`Đã sẵn sàng user test ${testUser.membershipTier}: ${testUser.zaloId}`);
  }
};

try {
  await seedTestUsers();
  console.log("Hoàn tất tạo/cập nhật 3 user test.");
} catch (error) {
  console.error("Lỗi khi tạo user test:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
