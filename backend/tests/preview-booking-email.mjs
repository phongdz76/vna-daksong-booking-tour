// Local HTML preview only. This script never sends mail.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { buildBookingConfirmation } from "../utils/email.js";

const booking = {
  _id: "000000000000000000000001", code: "VNA-MAU1260000", adults: 2, children: 1,
  contact: { name: "Nguyễn Văn An", phone: "0900000000", email: "customer@example.test" },
  note: "Dữ liệu minh họa để xem giao diện email. Không phải yêu cầu đặt tour thật.",
  status: "pending_confirmation", paymentStatus: "unpaid", paymentMethod: "cash_on_arrival",
  snapshot: { tourName: "Khám phá thác Lưu Ly & rừng nguyên sinh", departureAt: "2026-10-11T01:30:00.000Z", meetingPoint: "Văn phòng VNA Đắk Song",
    adultPrice: 550000, childPrice: 200000, subTotal: 1300000, discountAmount: 40000, appliedCoupon: "VNA-MAU", total: 1260000, durationHours: 8,
    cancellationPolicy: "Chính sách minh họa: liên hệ VNA để được hỗ trợ thay đổi hoặc hủy yêu cầu.", childPolicy: "Trẻ em đi cùng người giám hộ." },
};
const logo = await readFile(new URL("../assets/email/vna-logo.png", import.meta.url));
const cover = await readFile(new URL("../../frontend/src/assets/stitch/forest.jpg", import.meta.url));
const content = buildBookingConfirmation(booking, {
  appUrl: "https://booking.example.test", supportEmail: "support@example.test",
  logoSrc: `data:image/png;base64,${logo.toString("base64")}`,
  tourImage: "https://preview.example.test/cover.jpg",
});
const folder = new URL("../test-results/", import.meta.url);
await mkdir(folder, { recursive: true });
await writeFile(new URL("booking-email-preview.html", folder), content.html.replace("https://preview.example.test/cover.jpg", `data:image/jpeg;base64,${cover.toString("base64")}`));
await writeFile(new URL("booking-email-preview.txt", folder), content.text);
console.log("Preview: backend/test-results/booking-email-preview.html (sample data, no email sent)");
