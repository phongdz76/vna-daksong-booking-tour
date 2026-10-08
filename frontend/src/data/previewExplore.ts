import type { Destination } from "../types/api";
import wind from "../assets/stitch/explore-wind.jpg";
import clouds from "../assets/stitch/explore-clouds.jpg";
import pine from "../assets/stitch/explore-pine.jpg";
import waterfall from "../assets/stitch/explore-waterfall.jpg";
import farm from "../assets/stitch/explore-farm.jpg";
import flagpole from "../assets/stitch/explore-flagpole.jpg";
import guideClouds from "../assets/stitch/explore-guide-clouds.jpg";
import guideFood from "../assets/stitch/explore-guide-food.jpg";

// User-supplied Stitch content, used only in the explicitly labelled design preview.
export const previewExploreDestinations: (Destination & {
  distanceKm: number;
  group: string;
  featured?: boolean;
})[] = [
  {
    _id: "preview-explore-wind",
    name: "Cánh đồng quạt gió",
    category: "nature",
    distanceKm: 5.2,
    group: "wind-coffee",
    featured: true,
    images: [{ url: wind }],
  },
  {
    _id: "preview-explore-clouds",
    name: "Thung lũng mây ngàn",
    category: "nature",
    distanceKm: 8.5,
    group: "clouds-pine",
    images: [{ url: clouds }],
  },
  {
    _id: "preview-explore-pine",
    name: "Đồi thông Bonsai",
    category: "nature",
    distanceKm: 12,
    group: "clouds-pine",
    images: [{ url: pine }],
  },
  {
    _id: "preview-explore-waterfall",
    name: "Thác nước đại ngàn",
    category: "nature",
    distanceKm: 16.4,
    group: "",
    images: [{ url: waterfall }],
  },
  {
    _id: "preview-explore-farm",
    name: "Nông trường tiêu & cà phê",
    category: "food",
    distanceKm: 3.8,
    group: "wind-coffee",
    images: [{ url: farm }],
  },
  {
    _id: "preview-explore-flagpole",
    name: "Cột cờ Đắk Song",
    category: "history",
    distanceKm: 2.1,
    group: "",
    images: [{ url: flagpole }],
  },
].map((destination) => ({
  ...destination,
  category: destination.category as Destination["category"],
  address: "Đắk Song — địa điểm minh họa",
  summary: "Khám phá cảnh sắc cao nguyên Đắk Song.",
  description:
    "Tên, ảnh và khoảng cách minh họa theo bản thiết kế Stitch, chưa phải thông tin địa điểm đã xác minh.",
}));

export interface ExploreGuide {
  id: string;
  title: string;
  image?: string;
  category: string;
  description: string;
  readingMinutes?: number;
  href?: string;
}

export const previewExploreGuides: ExploreGuide[] = [
  {
    id: "preview-guide-1",
    title: "Chuẩn bị cho chuyến săn mây",
    image: guideClouds,
    category: "Cẩm nang minh họa",
    readingMinutes: 5,
    description:
      "Nội dung minh họa cho bản xem mẫu giao diện. Trước khi lên đường, hãy kiểm tra giờ tập trung, chuẩn bị áo khoác và giày phù hợp. Trao đổi với đơn vị tổ chức về thời tiết và điều kiện của cung đường. Trong ứng dụng dùng API, cẩm nang được tải từ các bài viết đã xuất bản trong database.",
  },
  {
    id: "preview-guide-2",
    title: "Trải nghiệm ẩm thực cùng chuyến đi",
    image: guideFood,
    category: "Ẩm thực minh họa",
    readingMinutes: 4,
    description:
      "Nội dung minh họa cho bản xem mẫu giao diện. Kiểm tra các bữa ăn được bao gồm trong lịch trình và báo trước nhu cầu ăn chay hoặc dị ứng thực phẩm. Bài viết và hình ảnh của các hoạt động thực tế được đơn vị quản lý cập nhật qua API.",
  },
];
