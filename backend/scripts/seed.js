import "dotenv/config";
import mongoose from "mongoose";
import connectDB, { disconnectDB } from "../config/db.js";
import Destination from "../models/Destination.js";
import Article from "../models/Article.js";
import Tour from "../models/Tour.js";
import Departure from "../models/Departure.js";

async function seedData() {
  if (process.env.NODE_ENV === "production") {
    console.error("LỖI: Không được chạy script seed trên môi trường production!");
    process.exit(1);
  }

  try {
    if (!process.env.MONGO_URI) {
      throw new Error("Vui lòng cấu hình MONGO_URI trong file .env trước khi chạy seed.");
    }
    await connectDB();

    console.log("Xóa dữ liệu cũ...");
    await Departure.deleteMany({});
    await Tour.deleteMany({});
    await Article.deleteMany({});
    await Destination.deleteMany({});

    console.log("Thêm Điểm đến...");
    const dest1 = await Destination.create({
      name: "Thác Lưu Ly",
      slug: "thac-luu-ly",
      summary: "Thác Lưu Ly mang vẻ đẹp hoang sơ, tĩnh lặng giữa rừng nguyên sinh Nam Nung.",
      description: "Thác Lưu Ly mang vẻ đẹp hoang sơ, tĩnh lặng giữa rừng nguyên sinh Nam Nung. Nơi đây phù hợp cho các chuyến dã ngoại, cắm trại và khám phá thiên nhiên.",
      category: "nature",
      images: [{ url: "https://static.dggv.edu.vn/360/1678326310525_daknong-thac-luu-ly.jpg" }],
      address: "Xã Nâm N'Jang, huyện Đắk Song",
      status: "published"
    });

    const dest2 = await Destination.create({
      name: "Thiền viện Trúc Lâm Đạo Nguyên",
      slug: "thien-vien-truc-lam-dao-nguyen",
      summary: "Nằm ẩn mình trong khu bảo tồn thiên nhiên Nam Nung, thiền viện mang đậm nét văn hóa Phật giáo.",
      description: "Nằm ẩn mình trong khu bảo tồn thiên nhiên Nam Nung, thiền viện mang đậm nét văn hóa Phật giáo, không gian thanh tịnh và kiến trúc độc đáo.",
      category: "culture",
      images: [{ url: "https://static.dggv.edu.vn/360/1678284609637_1.jpg" }],
      address: "Xã Nâm N'Jang, huyện Đắk Song",
      status: "published"
    });

    const dest3 = await Destination.create({
      name: "Đồi Điện Gió Đắk Song",
      slug: "doi-dien-gio-dak-song",
      summary: "Điểm check-in tuyệt đẹp với những tuabin gió khổng lồ.",
      description: "Điểm check-in tuyệt đẹp với những tuabin gió khổng lồ trên nền trời xanh và những đồi chè xanh mướt trải dài.",
      category: "nature",
      images: [{ url: "https://static.dggv.edu.vn/360/1672307604677_z3997641506907_ff6e17b67121e6b6a218553db5c79124.jpg" }],
      address: "Huyện Đắk Song",
      status: "published"
    });

    console.log("Thêm Bài viết...");
    await Article.create({
      title: "Lễ hội cúng bến nước của người M'Nông",
      slug: "le-hoi-cung-ben-nuoc-cua-nguoi-mnong",
      summary: "Một trong những nghi lễ nông nghiệp quan trọng nhất của đồng bào M'Nông tại Đắk Song...",
      content: "Lễ hội cúng bến nước thường được tổ chức vào tháng 3 hàng năm để tạ ơn thần nước đã mang lại nguồn nước mát lành cho buôn làng...",
      category: "story",
      images: [{ url: "https://static.dggv.edu.vn/360/1672307604677_z3997641506907_ff6e17b67121e6b6a218553db5c79124.jpg" }],
      status: "published"
    });

    await Article.create({
      title: "Đặc sắc Lễ mừng lúa mới tại Đắk Nông",
      slug: "dac-sac-le-mung-lua-moi-tai-dak-nong",
      summary: "Sau mùa gặt, các buôn làng lại rộn ràng tiếng cồng chiêng mở hội mừng lúa mới...",
      content: "Lễ hội mừng lúa mới là dịp để bà con buôn làng tạ ơn Yang (trời đất) đã cho một mùa màng bội thu...",
      category: "story",
      images: [{ url: "https://static.dggv.edu.vn/360/1735610798058_le-hoi.png" }],
      status: "published"
    });

    await Article.create({
      title: "Liên hoan văn hóa cồng chiêng Tây Nguyên",
      slug: "lien-hoan-van-hoa-cong-chieng-tay-nguyen",
      summary: "Tiếng cồng chiêng vang vọng giữa đại ngàn mang theo hồn thiêng sông núi...",
      content: "Sự kiện được tổ chức quy tụ hàng trăm nghệ nhân từ các buôn làng về trình diễn cồng chiêng, múa xoang...",
      category: "culture",
      images: [{ url: "https://static.dggv.edu.vn/360/1672307656009_z3997641887437_72d09d5c883f6782cf010de95a02b508.jpg" }],
      status: "published"
    });

    await Article.create({
      title: "Lễ hội đâm trâu truyền thống của người bản địa",
      slug: "le-hoi-dam-trau-truyen-thong-cua-nguoi-ban-dia",
      summary: "Lễ hội thể hiện tinh thần thượng võ và sự đoàn kết của cộng đồng buôn làng...",
      content: "Lễ hội đâm trâu (ăn trâu) thường được tổ chức trong các dịp lễ lớn như khánh thành nhà rông, mừng chiến thắng...",
      category: "culture",
      images: [{ url: "https://static.dggv.edu.vn/360/1672307628550_z3997641691854_c1a54beb77e38d88c1da8ae3447b4f59.jpg" }],
      status: "published"
    });

    console.log("Thêm Tour...");
    const tour1 = await Tour.create({
      name: "Khám phá thác Lưu Ly",
      slug: "kham-pha-thac-luu-ly",
      summary: "Khám phá vẻ đẹp hoang sơ của thác Lưu Ly trong 1 ngày.",
      description: "Khám phá vẻ đẹp hoang sơ của thác Lưu Ly và tìm sự bình yên tại Thiền viện Trúc Lâm Đạo Nguyên. Chuyến đi 1 ngày phù hợp cho mọi lứa tuổi.",
      durationHours: 8,
      themes: ["nature", "culture"],
      destinationIds: [dest1._id, dest2._id],
      itinerary: [
        { title: "Sáng: Đón khách và tham quan", description: "08:00 Xe đón khách." },
        { title: "Trưa: Ăn trưa", description: "12:00 Thưởng thức đặc sản." },
        { title: "Chiều: Tự do khám phá", description: "15:00 Khởi hành về điểm đón." }
      ],
      images: [{ url: "https://static.dggv.edu.vn/360/1678326310525_daknong-thac-luu-ly.jpg" }],
      meetingPoint: "VP VNA Đắk Song",
      includes: ["Xe đưa đón", "Ăn trưa", "Vé tham quan", "Nước suối", "Hướng dẫn viên"],
      excludes: ["Chi phí cá nhân", "VAT"],
      cancellationPolicy: "Miễn phí hủy trước 48h.",
      status: "published"
    });

    const tour2 = await Tour.create({
      name: "Tour tham quan các bản làng đồng bào (2 ngày - 1 đêm)",
      slug: "tour-tham-quan-cac-ban-lang-dong-bao",
      summary: "Trải nghiệm văn hóa đặc sắc tại các bản làng đồng bào M'Nông.",
      description: "Hành trình 2 ngày 1 đêm đưa bạn hòa mình vào đời sống, văn hóa và phong tục độc đáo của người đồng bào M'Nông tại Đắk Song.",
      durationHours: 32,
      themes: ["culture", "food"],
      destinationIds: [dest3._id],
      itinerary: [
        { title: "Ngày 1: Đón khách & Tham quan bản làng", description: "Giao lưu văn hóa, uống rượu cần." },
        { title: "Ngày 2: Trải nghiệm đời sống thường nhật", description: "Cùng người dân làm nông, dệt vải." }
      ],
      images: [{ url: "https://static.dggv.edu.vn/360/1672307604677_z3997641506907_ff6e17b67121e6b6a218553db5c79124.jpg" }],
      meetingPoint: "Trung tâm thị trấn Đắk Mâm",
      includes: ["Xe đưa đón", "Ăn uống 4 bữa", "Chỗ ở homestay", "Hướng dẫn viên bản địa"],
      excludes: ["Chi phí cá nhân"],
      cancellationPolicy: "Miễn phí hủy trước 24h.",
      status: "published"
    });

    const tour3 = await Tour.create({
      name: "Tour tham quan trải nghiệm dãy Nam Nung (2 ngày - 1 đêm)",
      slug: "tour-tham-quan-trai-nghiem-day-nam-nung",
      summary: "Khám phá vẻ đẹp hùng vĩ của dãy Nam Nung và cắm trại qua đêm.",
      description: "Chuyến trekking xuyên rừng tuyệt đẹp qua dãy Nam Nung, cắm trại, nướng thịt và ngắm bình minh trên núi.",
      durationHours: 32,
      themes: ["nature"],
      destinationIds: [dest1._id, dest2._id],
      itinerary: [
        { title: "Ngày 1: Trekking xuyên rừng", description: "Vượt qua các con suối, đến bãi cắm trại và tiệc BBQ." },
        { title: "Ngày 2: Ngắm bình minh", description: "Đón bình minh rực rỡ và quay trở về." }
      ],
      images: [{ url: "https://static.dggv.edu.vn/360/1678326424686_123201-nam-nung-4.jpg" }],
      meetingPoint: "Khu bảo tồn Nam Nung",
      includes: ["Xe trung chuyển", "Lều trại", "Tiệc BBQ", "Hướng dẫn viên"],
      excludes: ["Chi phí cá nhân"],
      cancellationPolicy: "Miễn phí hủy trước 48h.",
      status: "published"
    });

    const tour4 = await Tour.create({
      name: "Khám phá thiền viện Trúc Lâm Đạo Nguyên",
      slug: "kham-pha-thien-vien-truc-lam-dao-nguyen",
      summary: "Tìm sự tĩnh lặng và khám phá văn hóa Phật giáo giữa rừng Nam Nung.",
      description: "Chuyến tham quan đặc biệt đến Thiền viện Trúc Lâm Đạo Nguyên, một trong những điểm tâm linh nổi tiếng của Đắk Nông.",
      durationHours: 4,
      themes: ["culture", "history"],
      destinationIds: [dest2._id],
      itinerary: [
        { title: "Sáng: Viếng thăm Thiền viện", description: "Lễ Phật, tìm hiểu kiến trúc và văn hóa thiền phái Trúc Lâm." },
        { title: "Trưa: Cơm chay", description: "Thưởng thức bữa cơm chay thanh đạm tại chùa." }
      ],
      images: [{ url: "https://static.dggv.edu.vn/360/1678287988008_2.jpg" }],
      meetingPoint: "Thiền viện Trúc Lâm",
      includes: ["Cơm chay", "Hướng dẫn viên", "Nước suối"],
      excludes: ["Chi phí cá nhân", "Xe đưa đón"],
      cancellationPolicy: "Miễn phí hủy trước 24h.",
      status: "published"
    });

    console.log("Thêm Chuyến khởi hành...");
    const now = new Date();
    
    // Tour 1 departures
    await Departure.create({
      tourId: tour1._id,
      departureAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // In 2 days
      bookingDeadline: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), // In 1 day
      adultPrice: 550000,
      childPrice: 275000,
      status: "open"
    });
    
    await Departure.create({
      tourId: tour1._id,
      departureAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // In 5 days
      bookingDeadline: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000), // In 4 days
      adultPrice: 550000,
      childPrice: 275000,
      status: "open"
    });

    await Departure.create({
      tourId: tour1._id,
      departureAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      bookingDeadline: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      adultPrice: 550000,
      childPrice: 275000,
      status: "closed" // Already passed
    });

    // Tour 2 departures
    await Departure.create({
      tourId: tour2._id,
      departureAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // Tomorrow
      bookingDeadline: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
      adultPrice: 850000,
      childPrice: 425000,
      status: "open"
    });

    await Departure.create({
      tourId: tour2._id,
      departureAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // In 7 days
      bookingDeadline: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000),
      adultPrice: 850000,
      childPrice: 425000,
      status: "open"
    });

    // Tour 3 departures
    await Departure.create({
      tourId: tour3._id,
      departureAt: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000), // In 4 days
      bookingDeadline: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // In 2 days
      adultPrice: 1250000,
      childPrice: 625000,
      status: "open"
    });

    // Tour 4 departures
    await Departure.create({
      tourId: tour4._id,
      departureAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // In 3 days
      bookingDeadline: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // In 2 days
      adultPrice: 150000,
      childPrice: 75000,
      status: "open"
    });

    console.log("Thêm dữ liệu mẫu thành công!");
  } catch (error) {
    console.error("Lỗi:", error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await disconnectDB();
    }
  }
}

seedData();

