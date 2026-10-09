import test from "node:test";
import assert from "node:assert/strict";
import nodemailer from "nodemailer";
import { fileURLToPath } from "node:url";
import { buildBookingConfirmation } from "../utils/email.js";

const booking = {
  _id: "000000000000000000000001", code: "VNA-DEMO1260000", adults: 2, children: 1,
  contact: { name: "Nguyễn Văn An", phone: "0900000000", email: "customer@example.test" }, note: "Hỗ trợ điểm đón.",
  status: "pending_confirmation", paymentStatus: "unpaid", paymentMethod: "cash_on_arrival",
  snapshot: { tourName: "Khám phá thác Lưu Ly & rừng nguyên sinh", departureAt: "2026-10-11T01:30:00.000Z", meetingPoint: "Văn phòng VNA Đắk Song",
    adultPrice: 550000, childPrice: 200000, subTotal: 1300000, discountAmount: 40000, appliedCoupon: "VNA-DEMO", total: 1260000, durationHours: 8,
    cancellationPolicy: "Liên hệ VNA để được hỗ trợ thay đổi hoặc hủy yêu cầu.", childPolicy: "Trẻ em đi cùng người giám hộ." },
};

test("email uses saved prices and separates trip confirmation from payment", () => {
  const mail = buildBookingConfirmation(booking);
  assert.match(mail.html, /1\.260\.000 đ/);
  assert.match(mail.html, /−40\.000 đ/);
  assert.match(mail.html, /Đang chờ VNA xác nhận/);
  assert.match(mail.html, /Chưa thanh toán/);
  assert.match(mail.html, /2 người lớn × 550\.000 đ/);
  assert.match(mail.html, /1 trẻ em × 200\.000 đ/);
  assert.doesNotMatch(mail.html, /Đã thanh toán|Chuyến đi đã được xác nhận/);
  assert.match(mail.text, /Tổng tiền: 1\.260\.000 đ/);
  // Respect the snapshot even when the recorded total differs from a new calculation.
  assert.match(buildBookingConfirmation({ ...booking, snapshot: { ...booking.snapshot, total: 1200000 } }).html, /1\.200\.000 đ/);
});

test("departure always uses Vietnamese timezone", () => {
  const mail = buildBookingConfirmation(booking);
  assert.match(mail.text, /08:30/);
  assert.match(mail.text, /11\/10\/2026/);
});

test("customer input is escaped in HTML and unsafe image URLs are omitted", () => {
  const mail = buildBookingConfirmation({ ...booking, contact: { ...booking.contact, name: '<img src=x onerror="alert(1)">' }, note: "<script>alert('note')</script>",
    snapshot: { ...booking.snapshot, tourName: '<b>Tour & "title"</b>', meetingPoint: "<iframe>" } }, { tourImage: "javascript:alert(1)", appUrl: "https://booking.example.test/mini?token=secret#anchor" });
  assert.match(mail.html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.match(mail.html, /&lt;script&gt;/);
  assert.match(mail.html, /&lt;b&gt;Tour &amp; &quot;title&quot;&lt;\/b&gt;/);
  assert.doesNotMatch(mail.html, /<script|<iframe|javascript:|token=secret|#anchor/);
  assert.match(mail.html, /https:\/\/booking\.example\.test\/mini\/my-bookings\/000000000000000000000001/);
});

test("confirmed, paid, and refund states retain their distinct meaning", () => {
  const paid = buildBookingConfirmation({ ...booking, paymentStatus: "paid" });
  assert.match(paid.html, /Đã thanh toán/); assert.match(paid.html, /Đang chờ VNA xác nhận/);
  const confirmed = buildBookingConfirmation({ ...booking, status: "confirmed" });
  assert.match(confirmed.html, /Chuyến đi đã được xác nhận/); assert.match(confirmed.html, /Chưa thanh toán/);
  const refund = buildBookingConfirmation({ ...booking, status: "cancelled", paymentStatus: "refund_pending" });
  assert.match(refund.html, /Yêu cầu đã hủy/); assert.match(refund.html, /Đang hoàn tiền/);
  assert.doesNotMatch(refund.html, /Đã hoàn tiền/);
});

test("missing or unsafe app URLs never produce a broken action link", () => {
  for (const appUrl of [undefined, "javascript:alert(1)", "https://user:password@example.test", "not-a-url"]) {
    const mail = buildBookingConfirmation(booking, { appUrl });
    assert.doesNotMatch(mail.html, /<a /);
    assert.match(mail.html, /Mở Mini App VNA Đắk Song/);
  }
});

test("HTML, plaintext and inline logo compile into a MIME email without SMTP", async () => {
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "unix" });
  const mail = buildBookingConfirmation(booking);
  const result = await transport.sendMail({ from: "sender@example.test", to: "customer@example.test", ...mail,
    attachments: [{ filename: "vna-logo.png", path: fileURLToPath(new URL("../assets/email/vna-logo.png", import.meta.url)), cid: "vna-logo" }] });
  const mime = result.message.toString();
  assert.match(mime, /Content-Type: text\/plain/);
  assert.match(mime, /Content-Type: text\/html/);
  assert.match(mime, /Content-ID: <vna-logo>/);
  assert.match(mime, /Content-Disposition: inline/);
});
