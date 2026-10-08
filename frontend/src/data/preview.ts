import type { Departure, Destination, ListResponse, Tour } from "../types/api";
const hero = "https://static.dggv.edu.vn/360/1730690452343_z5997324418175_b447115dd96ccd7f7bd7b83f95a27101.jpg";
import forest from "../assets/stitch/forest.jpg";
const waterfall = "https://static.dggv.edu.vn/360/1678326310525_daknong-thac-luu-ly.jpg";
import windHills from "../assets/stitch/wind-hills.jpg";
const trekking = "https://static.dggv.edu.vn/360/1678326424686_123201-nam-nung-4.jpg";
const coffee = "https://static.dggv.edu.vn/360/1672307656009_z3997641887437_72d09d5c883f6782cf010de95a02b508.jpg";
const camping = "https://static.dggv.edu.vn/360/1678284609637_1.jpg";
const culture = "https://static.dggv.edu.vn/360/1672307604677_z3997641506907_ff6e17b67121e6b6a218553db5c79124.jpg";
const cover = "https://static.dggv.edu.vn/360/1678326424686_123201-nam-nung-4.jpg";
const campfire = "https://static.dggv.edu.vn/360/1672307628550_z3997641691854_c1a54beb77e38d88c1da8ae3447b4f59.jpg";
const clouds = "https://static.dggv.edu.vn/360/1678326310525_daknong-thac-luu-ly.jpg";
const trail = "https://static.dggv.edu.vn/360/1730690452343_z5997324418175_b447115dd96ccd7f7bd7b83f95a27101.jpg";
const meal = "https://static.dggv.edu.vn/360/1672307656009_z3997641887437_72d09d5c883f6782cf010de95a02b508.jpg";
const reviewTour = "https://static.dggv.edu.vn/360/1678287988008_2.jpg";
import mapPreview from "../assets/stitch/map-preview.jpg";
const destinationWaterfall = "https://static.dggv.edu.vn/360/1678287988008_2.jpg";
const teaHills = "https://static.dggv.edu.vn/360/1678284609637_1.jpg";

export const previewImages = {
  hero,
  forest,
  waterfall,
  windHills,
  trekking,
  coffee,
  camping,
  culture,
  cover,
  campfire,
  clouds,
  trail,
  meal,
  reviewTour,
  mapPreview,
  destinationWaterfall,
  teaHills,
};
// Explicit design preview only. Never use this data to hide API errors or send its IDs to the backend.
export const previewTours: Tour[] = [
  {
    _id: "preview-trekking",
    slug: "trekking-doi-thong",
    name: "Trekking Đồi Thông Săn Mây & Cắm Trại Đại Ngàn Đắk Song",
    summary:
      "Chậm lại giữa rừng thông, đón bình minh và dành một đêm bên lửa trại.",
    description:
      "Đắk Song chào đón bạn bằng triền đồi thông ngút ngàn, làn sương mờ bảng lảng cùng bầu không khí se lạnh trong veo. Hành trình đưa bạn hòa mình vào đại ngàn đất đỏ bazan, ngắm cánh đồng điện gió, thưởng thức tiệc nướng bên ngọn lửa ấm và thức giấc cùng biển mây trước cửa lều. Nội dung minh họa theo thiết kế Stitch, chưa phải chương trình mở bán.",
    durationHours: 36,
    themes: ["nature"],
    images: [
      { url: cover, alt: "Ảnh minh họa cắm trại trên đồi thông từ Stitch" },
      { url: campfire },
      { url: clouds },
      { url: trail },
      { url: meal },
    ],
    meetingPoint: "TT. Đức An",
    itinerary: [
      {
        title: "07:30 · Đón khách & Ăn sáng đặc sản",
        description:
          "Xe và hướng dẫn viên đón đoàn tại điểm hẹn trung tâm TT. Đức An. Thưởng thức bữa sáng bún đỏ hoặc phở khô cao nguyên ấm nóng kèm cà phê rang mộc.",
      },
      {
        title: "09:30 · Trekking Rừng thông & Đồi quạt gió",
        description:
          "Bắt đầu cung đường trekking nhẹ xuyên qua các đồi thông nguyên sinh mát rượi, check-in gần những tuabin điện gió giữa nền trời cao nguyên lộng gió.",
      },
      {
        title: "15:00 · Hạ trại, BBQ Tây Nguyên & Đốt lửa trại",
        description:
          "Di chuyển về khu cắm trại, nhận lều glamping. Buổi tối quây quần thưởng thức gà nướng cơm lam và giao lưu bên lửa trại ấm cúng.",
      },
      {
        title: "05:30 · Săn biển mây & Thưởng thức cà phê",
        description:
          "Đón bình minh trên đỉnh đồi ngập tràn biển mây, thưởng thức cà phê Đắk Song trước khi thu dọn hành lý về lại điểm hẹn.",
      },
    ],
    includes: [
      "Hướng dẫn viên theo đoàn",
      "Lều và đồ dùng cắm trại",
      "Bữa ăn theo lịch trình",
    ],
    excludes: ["Chi phí cá nhân", "Dịch vụ ngoài lịch trình"],
    childPolicy:
      "Giá trẻ em theo chuyến được chọn. Vui lòng ghi chú độ tuổi để VNA tư vấn.",
    cancellationPolicy:
      "Điều kiện hủy được VNA xác nhận cùng yêu cầu. Đây là nội dung minh họa.",
    priceFrom: 1200000,
  },
  {
    _id: "preview-coffee",
    slug: "nong-trai-ca-phe",
    name: "Một ngày ở nông trại cà phê & thác giữa rừng",
    summary:
      "Ghé nông trại, tìm hiểu cà phê và nghe tiếng thác giữa thiên nhiên.",
    description:
      "Khám phá nhịp sống nông trại và thiên nhiên cao nguyên. Chương trình minh họa cho bản xem thử giao diện.",
    durationHours: 8,
    themes: ["nature", "food"],
    images: [
      { url: coffee, alt: "Ảnh minh họa nông trại cà phê từ Stitch" },
      { url: waterfall },
    ],
    meetingPoint: "Điểm hẹn tại Đắk Song — minh họa",
    itinerary: [
      {
        title: "Ghé nông trại cà phê",
        description: "Tìm hiểu hành trình từ trái cà phê đến tách cà phê.",
      },
      {
        title: "Dạo bước bên thác",
        description: "Nghỉ chân và khám phá thiên nhiên.",
      },
    ],
    includes: ["Hướng dẫn viên", "Trải nghiệm cà phê"],
    excludes: ["Chi phí cá nhân"],
    childPolicy: "Giá trẻ em theo chuyến.",
    cancellationPolicy: "Nội dung minh họa, cần VNA xác nhận.",
    priceFrom: 850000,
  },
  {
    _id: "preview-camping",
    slug: "cam-trai-san-may",
    name: "Cắm trại săn mây & bữa tối bên lửa trại",
    summary: "Một khoảng trời riêng, một đêm sao và một sáng trong lành.",
    description: "Hành trình minh họa dành cho bản xem thử giao diện.",
    durationHours: 30,
    themes: ["nature"],
    images: [
      { url: camping, alt: "Ảnh minh họa cắm trại từ Stitch" },
      { url: clouds },
    ],
    meetingPoint: "Điểm hẹn tại Đắk Song — minh họa",
    itinerary: [
      {
        title: "Chiều · Đến khu cắm trại",
        description: "Nhận lều và khám phá khu vực.",
      },
      { title: "Sáng · Đón mây sớm", description: "Dùng bữa sáng và trở về." },
    ],
    includes: ["Lều trại", "Bữa tối"],
    excludes: ["Chi phí cá nhân"],
    childPolicy: "",
    cancellationPolicy: "Nội dung minh họa, cần VNA xác nhận.",
    priceFrom: 1450000,
  },
  {
    _id: "preview-culture",
    slug: "van-hoa-ban-dia",
    name: "Hành trình văn hóa bản địa & không gian cồng chiêng",
    summary:
      "Lắng nghe câu chuyện cao nguyên qua con người, âm nhạc và ẩm thực.",
    description: "Hành trình minh họa dành cho bản xem thử giao diện.",
    durationHours: 8,
    themes: ["culture", "food"],
    images: [{ url: culture, alt: "Ảnh minh họa sinh hoạt văn hóa từ Stitch" }],
    meetingPoint: "Điểm hẹn tại Đắk Song — minh họa",
    itinerary: [
      {
        title: "Gặp gỡ người bản địa",
        description: "Tìm hiểu văn hóa qua những câu chuyện địa phương.",
      },
    ],
    includes: ["Hướng dẫn viên", "Trải nghiệm văn hóa"],
    excludes: ["Chi phí cá nhân"],
    childPolicy: "Giá trẻ em theo chuyến.",
    cancellationPolicy: "Nội dung minh họa, cần VNA xác nhận.",
    priceFrom: 690000,
  },
];
export const previewDestinations: Destination[] = [
  {
    _id: "preview-forest",
    name: "Rừng thông Đắk Song",
    category: "nature",
    summary: "Đi qua những tán thông, nghe đại ngàn thức giấc.",
    description:
      "Không gian và nội dung minh họa theo bản thiết kế Stitch. Thông tin địa điểm cần được xác nhận trước khi xuất bản.",
    address: "Đắk Song — địa điểm minh họa",
    images: [{ url: forest, alt: "Ảnh rừng thông minh họa từ Stitch" }],
  },
  {
    _id: "preview-waterfall",
    name: "Thác giữa đại ngàn",
    category: "nature",
    summary: "Một khoảng xanh mát giữa núi rừng cao nguyên.",
    description: "Hình ảnh và tên gọi minh họa cho bản xem thử.",
    address: "Đắk Song — địa điểm minh họa",
    images: [{ url: waterfall }],
  },
  {
    _id: "preview-wind-hills",
    name: "Những đồi điện gió",
    category: "nature",
    summary: "Theo gió lên những triền đồi xanh.",
    description: "Hình ảnh và tên gọi minh họa cho bản xem thử.",
    address: "Đắk Song — địa điểm minh họa",
    images: [{ url: windHills }],
  },
  {
    _id: "preview-culture",
    name: "Nhịp sống bản địa",
    category: "culture",
    summary: "Gặp gỡ, lắng nghe và tìm hiểu văn hóa cao nguyên.",
    description: "Nội dung minh họa cho bản xem thử.",
    address: "Đắk Song — địa điểm minh họa",
    images: [{ url: culture }],
  },
  {
    _id: "preview-coffee",
    name: "Câu chuyện cà phê",
    category: "food",
    summary: "Từ đất đỏ bazan đến một tách cà phê.",
    description: "Nội dung minh họa cho bản xem thử.",
    address: "Đắk Song — địa điểm minh họa",
    images: [{ url: coffee }],
  },
];
export const previewDepartures: Departure[] = previewTours.flatMap((tour) =>
  [7, 14, 21].map((days, index) => {
    const departure = new Date();
    departure.setDate(departure.getDate() + days);
    departure.setHours(7, 30, 0, 0);
    return {
      _id: `${tour._id}-departure-${index}`,
      tourId: tour._id,
      departureAt: departure.toISOString(),
      bookingDeadline: new Date(departure.getTime() - 86400000).toISOString(),
      adultPrice: tour.priceFrom ?? 0,
      childPrice: tour.childPolicy
        ? Math.round((tour.priceFrom ?? 0) * 0.7)
        : null,
      maxGuestsPerBooking: 12,
      status: "open" as const,
    };
  }),
);
export function previewList<T>(data: T[]): ListResponse<T> {
  return {
    data,
    pagination: {
      page: 1,
      limit: data.length || 12,
      total: data.length,
      pages: data.length ? 1 : 0,
    },
  };
}
export const previewHomeTours = previewList(previewTours);
export const previewHomeDestinations = previewList([
  previewDestinations[0],
  { ...previewDestinations[1], images: [{ url: destinationWaterfall }] },
  {
    ...previewDestinations[2],
    name: "Đồi chè Đắk Song",
    images: [{ url: teaHills }],
  },
]);
