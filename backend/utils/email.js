import { mailer, mailFrom } from "../config/mailer.js";
import { fileURLToPath } from "node:url";
import Tour from "../models/Tour.js";

const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );
const money = (value) =>
  Number.isFinite(value)
    ? `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value)} đ`
    : "Chưa có thông tin";
const date = (value) => {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime())
    ? new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(parsed)
    : "Chưa có thông tin";
};
const duration = (value) =>
  !Number.isFinite(value)
    ? ""
    : value < 24
      ? `${value} giờ`
      : value % 24 === 0
        ? `${value / 24} ngày`
        : `${Math.floor(value / 24)} ngày ${value % 24} giờ`;

function httpUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url
      : null;
  } catch {
    return null;
  }
}

const bookingStates = {
  pending_confirmation: {
    label: "Đang chờ VNA xác nhận",
    color: "#9b6215",
    background: "#fff7e7",
    border: "#f2deb4",
    description:
      "VNA đã nhận yêu cầu. Chuyến đi chỉ được xác nhận sau khi VNA kiểm tra và liên hệ với bạn.",
  },
  confirmed: {
    label: "Chuyến đi đã được xác nhận",
    color: "#16614b",
    background: "#edf8f2",
    border: "#c9e5d7",
    description:
      "VNA đã xác nhận chuyến đi của bạn. Vui lòng kiểm tra lịch khởi hành và điểm tập trung bên dưới.",
  },
  completed: {
    label: "Chuyến đi đã hoàn thành",
    color: "#16614b",
    background: "#edf8f2",
    border: "#c9e5d7",
    description:
      "Cảm ơn bạn đã đồng hành cùng VNA Đắk Song. Bạn có thể xem lại thông tin chuyến đi trong Mini App.",
  },
  cancelled: {
    label: "Yêu cầu đã hủy",
    color: "#a14444",
    background: "#fff1f1",
    border: "#f1d0d0",
    description:
      "Yêu cầu này đã được hủy. Nếu cần hỗ trợ về thanh toán hoặc hoàn tiền, vui lòng liên hệ VNA.",
  },
  rejected: {
    label: "VNA chưa thể đáp ứng yêu cầu",
    color: "#a14444",
    background: "#fff1f1",
    border: "#f1d0d0",
    description:
      "VNA chưa thể tổ chức chuyến theo yêu cầu này. Vui lòng xem chi tiết đơn hoặc liên hệ để được hỗ trợ.",
  },
};
const paymentStates = {
  unpaid: "Chưa thanh toán",
  paid: "Đã thanh toán",
  refund_pending: "Đang hoàn tiền",
  refunded: "Đã hoàn tiền",
};
const paymentMethods = {
  cash_on_arrival: "Tiền mặt khi tham gia tour",
  qr_transfer: "Chuyển khoản",
  zalopay: "ZaloPay",
};

const detailRow = (label, value, labelWidth = "35%") =>
  `<tr><td style="padding:8px 0;color:#788799;font-size:12px;vertical-align:top;width:${labelWidth};">${escapeHtml(label)}</td><td align="right" style="padding:8px 0;color:#23394e;font-size:13px;font-weight:600;line-height:1.6;overflow-wrap:anywhere;word-break:break-word;">${escapeHtml(value)}</td></tr>`;
const heading = (label, right = "") =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:11px;font-weight:700;letter-spacing:1px;color:#17649d;padding-bottom:14px;">${escapeHtml(label)}</td><td align="right" style="font-size:10px;color:#8997a7;padding-bottom:14px;">${escapeHtml(right)}</td></tr></table>`;
const box = (content) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f9fc;border:1px solid #e4ebf2;border-radius:10px;"><tr><td style="padding:20px;">${content}</td></tr></table>`;

/** Pure renderer: financial values come from the saved booking snapshot. */
export function buildBookingConfirmation(booking, options = {}) {
  const snapshot = booking.snapshot;
  const state = bookingStates[booking.status] || {
    label: "Xem trạng thái trong Mini App",
    color: "#17649d",
    background: "#eef6ff",
    border: "#cfe3f8",
    description:
      "Vui lòng mở chi tiết yêu cầu để kiểm tra trạng thái hiện tại.",
  };
  const payment =
    paymentStates[booking.paymentStatus] || "Xem trạng thái trong Mini App";
  const method =
    paymentMethods[booking.paymentMethod] || "Xem trong chi tiết yêu cầu";
  const appUrl = httpUrl(options.appUrl);
  if (appUrl) {
    appUrl.search = "";
    appUrl.hash = "";
  }
  const detailUrl = appUrl && booking._id ? new URL(appUrl.href) : null;
  if (detailUrl)
    detailUrl.pathname = `${detailUrl.pathname.replace(/\/$/, "")}/my-bookings/${encodeURIComponent(String(booking._id))}`;
  const image = httpUrl(options.tourImage);
  const phone = String(options.supportPhone || "").replace(/[\s().-]/g, "");
  const supportPhone = /^\+?\d{8,15}$/.test(phone) ? phone : "";
  const supportEmail = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(
    options.supportEmail || "",
  )
    ? options.supportEmail
    : "";
  const subtotal =
    snapshot.subTotal ??
    snapshot.adultPrice * booking.adults +
      (snapshot.childPrice ?? 0) * booking.children;
  const discount = snapshot.discountAmount ?? 0;
  const guests = `${booking.adults} người lớn${booking.children > 0 ? `, ${booking.children} trẻ em` : ""}`;
  const when = date(snapshot.departureAt);
  const tourDuration = duration(snapshot.durationHours);
  const subject = `Xác nhận yêu cầu đặt tour ${booking.code}`;
  const note = booking.note
    ? `<div style="border-top:1px solid #e2e9f0;margin-top:12px;padding-top:12px;"><div style="font-size:11px;color:#788799;margin-bottom:6px;">Ghi chú của bạn</div><div style="font-size:12px;line-height:1.7;color:#334c63;white-space:pre-line;overflow-wrap:anywhere;">${escapeHtml(booking.note)}</div></div>`
    : "";
  const prices = [
    detailRow(
      `${booking.adults} người lớn × ${money(snapshot.adultPrice)}`,
      money(snapshot.adultPrice * booking.adults),
      "60%",
    ),
  ];
  if (booking.children > 0)
    prices.push(
      detailRow(
        `${booking.children} trẻ em × ${money(snapshot.childPrice)}`,
        money((snapshot.childPrice ?? 0) * booking.children),
        "60%",
      ),
    );
  prices.push(detailRow("Tạm tính", money(subtotal), "60%"));
  if (discount > 0)
    prices.push(
      detailRow(
        `Ưu đãi${snapshot.appliedCoupon ? ` (${snapshot.appliedCoupon})` : ""}`,
        `−${money(discount)}`,
        "60%",
      ),
    );
  const contacts = [
    supportPhone
      ? `<a href="tel:${escapeHtml(supportPhone)}" style="color:#17649d;text-decoration:none;">${escapeHtml(options.supportPhone)}</a>`
      : "",
    supportEmail
      ? `<a href="mailto:${escapeHtml(supportEmail)}" style="color:#17649d;text-decoration:none;">${escapeHtml(supportEmail)}</a>`
      : "",
  ]
    .filter(Boolean)
    .join(" &nbsp;·&nbsp; ");
  const text = [
    `Xin chào ${booking.contact.name},`,
    "",
    `VNA Đắk Song đã nhận yêu cầu đặt tour ${booking.code}.`,
    `Trạng thái chuyến: ${state.label}`,
    state.description,
    "",
    `Tour: ${snapshot.tourName}`,
    `Khởi hành: ${when} (giờ Việt Nam)`,
    tourDuration ? `Thời lượng: ${tourDuration}` : "",
    `Điểm tập trung: ${snapshot.meetingPoint}`,
    `Số khách: ${guests}`,
    "",
    `Người liên hệ: ${booking.contact.name}`,
    `Điện thoại: ${booking.contact.phone}`,
    `Email: ${booking.contact.email}`,
    booking.note ? `Ghi chú: ${booking.note}` : "",
    "",
    `Tạm tính: ${money(subtotal)}`,
    discount > 0
      ? `Ưu đãi ${snapshot.appliedCoupon || ""}: −${money(discount)}`
      : "",
    `Tổng tiền: ${money(snapshot.total)}`,
    `Thanh toán: ${payment}`,
    `Phương thức: ${method}`,
    "",
    "Xác nhận chuyến và thanh toán là hai trạng thái riêng. Email này không thay thế thông báo xác nhận thanh toán.",
    snapshot.cancellationPolicy
      ? `Chính sách hủy: ${snapshot.cancellationPolicy}`
      : "",
    detailUrl
      ? `Xem chi tiết yêu cầu: ${detailUrl.href}`
      : "Mở Mini App VNA Đắk Song, vào Đơn hàng để theo dõi yêu cầu.",
    "",
    "VNA Đắk Song",
    supportPhone ? `Hỗ trợ: ${options.supportPhone}` : "",
    supportEmail ? `Email hỗ trợ: ${supportEmail}` : "",
  ].join("\n");
  const html = `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(subject)}</title>
<style>@media only screen and (max-width:600px){.email-shell{width:100%!important}.email-padding{padding:24px 18px!important}.email-column{display:block!important;width:100%!important;padding:0!important}.email-column-spacer{padding-top:12px!important}.email-title{font-size:24px!important}.email-brand-tag{display:none!important}.email-background{padding:0!important}}</style></head>
<body style="margin:0;padding:0;background:#edf2f6;font-family:Arial,Helvetica,sans-serif;color:#253c52;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">VNA đã nhận yêu cầu ${escapeHtml(booking.code)}. ${escapeHtml(state.label)}. Khởi hành ${escapeHtml(when)}.</div>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" class="email-background" style="background:#edf2f6;padding:28px 12px;"><tr><td align="center">
<!--[if mso]><table role="presentation" width="640"><tr><td><![endif]-->
<table role="presentation" cellpadding="0" cellspacing="0" width="640" class="email-shell" style="width:100%;max-width:640px;background:#ffffff;border:1px solid #dce6ee;border-radius:14px;overflow:hidden;">
<tr><td style="background:#0865a8;padding:22px 26px;border-radius:14px 14px 0 0;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td width="48" valign="middle"><img src="${escapeHtml(options.logoSrc || "cid:vna-logo")}" width="38" height="38" alt="VNA" style="display:block;border:0;border-radius:10px;"></td><td valign="middle"><div style="color:#ffffff;font-size:17px;font-weight:700;">VNA Đắk Song</div><div style="color:#d1e7f7;font-size:10px;margin-top:5px;">Hành trình khám phá cao nguyên</div></td><td align="right" class="email-brand-tag"><span style="font-size:9px;letter-spacing:1px;color:#ffffff;border:1px solid #73a9d0;border-radius:5px;padding:7px 9px;white-space:nowrap;">ĐẶT TOUR TRỰC TUYẾN</span></td></tr></table></td></tr>
<tr><td class="email-padding" style="padding:30px 28px;">
<h1 class="email-title" style="margin:0 0 8px;font-size:28px;line-height:1.3;color:#153e60;">Xác nhận yêu cầu đặt tour</h1>
<p style="margin:0 0 24px;color:#8392a2;font-size:12px;line-height:1.7;">Thông tin cho chuyến đi sắp tới của bạn.</p>
<p style="font-size:14px;line-height:1.8;margin:0 0 8px;">Xin chào <strong style="color:#17649d;">${escapeHtml(booking.contact.name)}</strong>,</p>
<p style="font-size:13px;line-height:1.8;color:#60768b;margin:0 0 22px;">Cảm ơn bạn đã lựa chọn VNA Đắk Song. Chúng tôi đã nhận yêu cầu đặt tour của bạn. Thông tin chi tiết được lưu bên dưới để bạn dễ theo dõi.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${state.background};border:1px solid ${state.border};border-radius:8px;margin-bottom:22px;"><tr><td style="padding:16px 18px;"><div style="color:${state.color};font-weight:700;font-size:12px;margin-bottom:8px;">${escapeHtml(state.label)}</div><div style="color:${state.color};font-size:12px;line-height:1.7;">${escapeHtml(state.description)}</div></td></tr></table>
${image ? `<img src="${escapeHtml(image.href)}" alt="${escapeHtml(snapshot.tourName)}" width="582" style="width:100%;height:auto;max-height:260px;object-fit:cover;display:block;border:0;border-radius:10px 10px 0 0;">` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#174e78;border-radius:${image ? "0 0 10px 10px" : "10px"};margin-bottom:22px;"><tr><td style="padding:20px 22px;"><div style="color:#9acbef;font-size:10px;letter-spacing:1.2px;font-weight:700;margin-bottom:8px;">HÀNH TRÌNH CỦA BẠN</div><div style="color:#ffffff;font-size:19px;font-weight:700;line-height:1.5;">${escapeHtml(snapshot.tourName)}</div><div style="color:#c1daed;font-size:12px;line-height:1.6;margin-top:8px;">${escapeHtml(when)}${tourDuration ? ` &nbsp;·&nbsp; ${escapeHtml(tourDuration)}` : ""}</div></td></tr></table>
${box(`${heading("THÔNG TIN TOUR", "MÃ YÊU CẦU")}
<div style="font-size:13px;font-weight:700;color:#17649d;padding-bottom:12px;word-break:break-word;">${escapeHtml(booking.code)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${detailRow("Tên hành trình", snapshot.tourName)}${detailRow("Ngày khởi hành", when)}${tourDuration ? detailRow("Thời lượng", tourDuration) : ""}${detailRow("Điểm tập trung", snapshot.meetingPoint)}</table>
<div style="font-size:10px;color:#8b99a8;margin-top:8px;">Ngày giờ hiển thị theo giờ Việt Nam.</div>`)}
<div style="height:14px;line-height:14px;">&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td width="50%" valign="top" class="email-column" style="padding-right:7px;">${box(`${heading("NGƯỜI LIÊN HỆ")}<div style="font-size:13px;color:#234d70;font-weight:700;line-height:1.6;">${escapeHtml(booking.contact.name)}</div><div style="font-size:12px;color:#60768b;line-height:1.8;margin-top:8px;word-break:break-word;">${escapeHtml(booking.contact.phone)}<br>${escapeHtml(booking.contact.email)}</div>${note}`)}</td><td class="email-column email-column-spacer" width="50%" valign="top" style="padding-left:7px;">${box(`${heading("THÀNH VIÊN THAM GIA")}<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:8px 4px;border-right:1px solid #e0e8f0;"><div style="font-size:24px;font-weight:700;color:#17649d;">${escapeHtml(booking.adults)}</div><div style="font-size:10px;color:#7b8b9b;margin-top:5px;">Người lớn</div></td><td align="center" style="padding:8px 4px;border-right:1px solid #e0e8f0;"><div style="font-size:24px;font-weight:700;color:#17649d;">${escapeHtml(booking.children)}</div><div style="font-size:10px;color:#7b8b9b;margin-top:5px;">Trẻ em</div></td><td align="center" style="padding:8px 4px;"><div style="font-size:24px;font-weight:700;color:#17649d;">${escapeHtml(booking.adults + booking.children)}</div><div style="font-size:10px;color:#7b8b9b;margin-top:5px;">Tổng khách</div></td></tr></table><p style="font-size:11px;color:#8392a2;line-height:1.7;margin:14px 0 0;">Số khách theo yêu cầu đã gửi.</p>`)}</td></tr></table>
<div style="height:14px;line-height:14px;">&nbsp;</div>
${box(`${heading("CHI TIẾT CHI PHÍ", "VND")}<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${prices.join("")}</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eaf4fe;border-radius:7px;margin-top:12px;"><tr><td style="padding:16px 12px;font-size:12px;font-weight:700;color:#214f76;">Tổng tiền yêu cầu</td><td align="right" style="padding:16px 12px;font-size:22px;font-weight:700;color:#0865a8;white-space:nowrap;">${escapeHtml(money(snapshot.total))}</td></tr></table>
<div style="font-size:12px;color:#425d75;line-height:1.8;margin-top:12px;"><strong>Thanh toán:</strong> ${escapeHtml(payment)}<br><strong>Phương thức:</strong> ${escapeHtml(method)}</div>
<div style="font-size:11px;color:#8392a2;line-height:1.7;margin-top:10px;">Trạng thái thanh toán được cập nhật riêng. Email ghi nhận yêu cầu không đồng nghĩa với việc đã thu tiền.</div>`)}
<div style="height:14px;line-height:14px;">&nbsp;</div>
${snapshot.cancellationPolicy ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef7ff;border-radius:8px;"><tr><td style="padding:18px 20px;">${heading("ĐIỀU KIỆN & HỖ TRỢ")}<div style="font-size:12px;color:#56728b;line-height:1.8;white-space:pre-line;overflow-wrap:anywhere;">${escapeHtml(snapshot.cancellationPolicy)}</div>${booking.children > 0 && snapshot.childPolicy ? `<div style="font-size:12px;color:#56728b;line-height:1.8;margin-top:10px;white-space:pre-line;">${escapeHtml(snapshot.childPolicy)}</div>` : ""}</td></tr></table>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:26px 0 12px;">${detailUrl ? `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#0865a8" style="border-radius:8px;mso-padding-alt:14px 24px;"><a href="${escapeHtml(detailUrl.href)}" style="display:inline-block;padding:14px 24px;font-size:13px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">Xem chi tiết yêu cầu</a></td></tr></table>` : `<div style="font-size:13px;font-weight:700;color:#17649d;">Mở Mini App VNA Đắk Song → Đơn hàng</div>`}</td></tr></table>
<p style="text-align:center;color:#8392a2;font-size:11px;line-height:1.8;margin:0 0 24px;">Bạn có thể theo dõi trạng thái chuyến và thanh toán trong chi tiết yêu cầu.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5ecf3;"><tr><td align="center" style="padding:22px 0 0;"><div style="font-size:11px;font-weight:700;letter-spacing:1.1px;color:#17649d;margin-bottom:10px;">CẦN HỖ TRỢ?</div><div style="font-size:12px;line-height:1.8;">${contacts || "Liên hệ VNA qua mục hỗ trợ trong Mini App."}</div></td></tr></table>
</td></tr><tr><td align="center" style="background:#f7f9fc;border-top:1px solid #e5ecf3;padding:20px 28px;border-radius:0 0 14px 14px;"><div style="font-size:13px;color:#416889;font-weight:700;">VNA Đắk Song</div><div style="font-size:10px;color:#91a0af;line-height:1.8;margin-top:7px;">Email tự động gửi sau khi hệ thống nhận yêu cầu đặt tour.<br>Vui lòng giữ mã yêu cầu để thuận tiện khi cần hỗ trợ.</div></td></tr>
</table><!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
  return { subject, text, html };
}

export async function sendBookingConfirmation(booking) {
  if (!mailer) {
    console.warn(
      "[email] Bỏ qua email xác nhận: chưa cấu hình EMAIL_USER/EMAIL_PASS.",
    );
    return false;
  }
  if (!booking.contact?.email) {
    console.warn(`[email] Booking ${booking.code} không có email người nhận.`);
    return false;
  }

  let tourImage;
  try {
    const tour = await Tour.findById(booking.tourId).select("images").lean();
    tourImage = tour?.images?.[0]?.url;
  } catch {
    // The booking snapshot remains sufficient if the optional cover cannot be read.
    console.warn(
      "[email] Không tải được ảnh tour; gửi thông tin đã lưu trong booking.",
    );
  }
  const content = buildBookingConfirmation(booking, {
    appUrl: process.env.EMAIL_APP_URL,
    supportPhone: process.env.EMAIL_SUPPORT_PHONE,
    supportEmail: process.env.EMAIL_SUPPORT_ADDRESS,
    tourImage,
  });
  await mailer.sendMail({
    from: mailFrom,
    to: booking.contact.email,
    ...content,
    attachments: [
      {
        filename: "vna-logo.png",
        path: fileURLToPath(
          new URL("../assets/email/vna-logo.png", import.meta.url),
        ),
        cid: "vna-logo",
      },
    ],
  });
  return true;
}
