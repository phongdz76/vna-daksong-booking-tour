import "dotenv/config";
import mongoose from "mongoose";
import connectDB, { disconnectDB } from "../config/db.js";
import Destination from "../models/Destination.js";
import Article from "../models/Article.js";
import Tour from "../models/Tour.js";
import Departure from "../models/Departure.js";

async function seedData() {
  try {
    if (!await connectDB()) {
      throw new Error("Configure MONGO_URI before seeding data.");
    }

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
      images: [{ url: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg" }],
      address: "Xã Nâm N'Jang, huyện Đắk Song",
      status: "published"
    });

    const dest2 = await Destination.create({
      name: "Thiền viện Trúc Lâm Đạo Nguyên",
      slug: "thien-vien-truc-lam-dao-nguyen",
      summary: "Nằm ẩn mình trong khu bảo tồn thiên nhiên Nam Nung, thiền viện mang đậm nét văn hóa Phật giáo.",
      description: "Nằm ẩn mình trong khu bảo tồn thiên nhiên Nam Nung, thiền viện mang đậm nét văn hóa Phật giáo, không gian thanh tịnh và kiến trúc độc đáo.",
      category: "culture",
      images: [{ url: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg" }],
      address: "Xã Nâm N'Jang, huyện Đắk Song",
      status: "published"
    });

    const dest3 = await Destination.create({
      name: "Đồi Điện Gió Đắk Song",
      slug: "doi-dien-gio-dak-song",
      summary: "Điểm check-in tuyệt đẹp với những tuabin gió khổng lồ.",
      description: "Điểm check-in tuyệt đẹp với những tuabin gió khổng lồ trên nền trời xanh và những đồi chè xanh mướt trải dài.",
      category: "nature",
      images: [{ url: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg" }],
      address: "Huyện Đắk Song",
      status: "published"
    });

    console.log("Thêm Bài viết...");
    await Article.create({
      title: "Khám phá vẻ đẹp hoang sơ của Thác Lưu Ly",
      slug: "kham-pha-ve-dep-hoang-so-cua-thac-luu-ly",
      summary: "Thác Lưu Ly là một trong những ngọn thác đẹp nhất Đắk Nông...",
      content: "Thác Lưu Ly là một trong những ngọn thác đẹp nhất Đắk Nông...",
      category: "story",
      images: [{ url: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg" }],
      status: "published"
    });

    await Article.create({
      title: "Thưởng thức cà phê đặc sản Đắk Song",
      slug: "thuong-thuc-ca-phe-dac-san-dak-song",
      summary: "Đắk Song không chỉ có cảnh đẹp mà còn nổi tiếng với những rẫy cà phê bạt ngàn...",
      content: "Đắk Song không chỉ có cảnh đẹp mà còn nổi tiếng với những rẫy cà phê bạt ngàn...",
      category: "food",
      images: [{ url: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg" }],
      status: "published"
    });

    console.log("Thêm Tour...");
    const tour1 = await Tour.create({
      name: "Hành trình M'nông - Thác Lưu Ly & Thiền Viện",
      slug: "hanh-trinh-m-nong-thac-luu-ly-thien-vien",
      summary: "Khám phá vẻ đẹp hoang sơ của thác Lưu Ly và tìm sự bình yên tại Thiền viện Trúc Lâm.",
      description: "Khám phá vẻ đẹp hoang sơ của thác Lưu Ly và tìm sự bình yên tại Thiền viện Trúc Lâm Đạo Nguyên. Chuyến đi 1 ngày phù hợp cho mọi lứa tuổi.",
      durationHours: 8,
      themes: ["nature", "culture"],
      destinationIds: [dest1._id, dest2._id],
      itinerary: [
        { title: "Sáng: Đón khách và tham quan Thiền Viện", description: "08:00 Xe đón khách. 09:00 Đến Thiền viện Trúc Lâm Đạo Nguyên." },
        { title: "Trưa: Ăn trưa dã ngoại tại Thác Lưu Ly", description: "12:00 Thưởng thức đặc sản địa phương." },
        { title: "Chiều: Tự do khám phá, tắm suối và về lại", description: "15:00 Khởi hành về điểm đón ban đầu." }
      ],
      images: [{ url: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg" }],
      meetingPoint: "VP VNA Đắk Song",
      includes: ["Xe đưa đón", "Ăn trưa", "Vé tham quan", "Nước suối", "Hướng dẫn viên"],
      excludes: ["Chi phí cá nhân", "VAT"],
      cancellationPolicy: "Miễn phí hủy trước 48h.",
      status: "published"
    });

    const tour2 = await Tour.create({
      name: "Check-in Đồi Điện Gió & Trải nghiệm Cà Phê",
      slug: "check-in-doi-dien-gio-trai-nghiem-ca-phe",
      summary: "Tour đưa bạn đến đồi điện gió lớn nhất Đắk Song và tham quan vườn cà phê.",
      description: "Tour nửa ngày đưa bạn đến đồi điện gió lớn nhất Đắk Song và tham quan vườn cà phê, thưởng thức cà phê nguyên chất.",
      durationHours: 4,
      themes: ["nature"],
      destinationIds: [dest3._id],
      itinerary: [
        { title: "Sáng: Đồi Điện Gió", description: "Săn mây và chụp ảnh tại Đồi Điện Gió." },
        { title: "Trưa: Nông trại Cà Phê", description: "Tìm hiểu quy trình trồng và chế biến cà phê. Thưởng thức cà phê." }
      ],
      images: [{ url: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg" }],
      meetingPoint: "Trung tâm thị trấn Đắk Mâm",
      includes: ["Xe máy hoặc ô tô đưa đón", "1 ly cà phê", "Hướng dẫn viên bản địa"],
      excludes: ["Ăn trưa", "Chi phí cá nhân"],
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
      adultPrice: 350000,
      childPrice: 150000,
      status: "open"
    });

    await Departure.create({
      tourId: tour2._id,
      departureAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // In 7 days
      bookingDeadline: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000),
      adultPrice: 350000,
      childPrice: 150000,
      status: "open"
    });

    console.log("Thêm dữ liệu mẫu thành công!");
  } catch (error) {
    console.error("Lỗi:", error.message);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

seedData();
