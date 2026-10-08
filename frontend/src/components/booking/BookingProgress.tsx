import Icon from "../common/Icon";
import { dateTime } from "../../utils/format";
import type { Booking } from "../../types/api";

export default function BookingProgress({ booking }: { booking: Booking }) {
  const confirmed = ["confirmed", "completed"].includes(booking.status);
  const closed = ["cancelled", "rejected"].includes(booking.status);
  const eventTime = (status: string) =>
    booking.history?.find((entry) => entry.status === status)?.at;
  const wasConfirmed = confirmed || Boolean(eventTime("confirmed"));
  const submittedAt = eventTime("pending_confirmation") || booking.createdAt;
  const steps = [
    {
      title: "Đã gửi yêu cầu đặt tour",
      description: submittedAt ? dateTime(submittedAt) : "Đơn đã được ghi nhận",
      state: "done",
      badge: "Thành công",
    },
    {
      title: wasConfirmed
        ? "VNA đã kiểm tra chuyến"
        : closed
          ? "Tiến trình xử lý đã dừng"
          : "Chờ VNA xác nhận chuyến",
      description: wasConfirmed
        ? "Yêu cầu đã được VNA tiếp nhận và xác nhận."
        : closed
          ? "Đơn không tiếp tục sang bước xác nhận chuyến."
          : "Kiểm tra lịch và khả năng tổ chức chuyến đi",
      state: wasConfirmed ? "done" : closed ? "stopped" : "current",
    },
    ...(closed
      ? [
          {
            title:
              booking.status === "cancelled"
                ? "Đơn đặt tour đã hủy"
                : "VNA không thể nhận đơn",
            description:
              [...(booking.history || [])]
                .reverse()
                .find((entry) => entry.status === booking.status)?.reason ||
              "Xem chính sách và tình trạng thanh toán bên dưới.",
            state: "closed",
          },
        ]
      : [
          {
            title: confirmed
              ? "Đã xác nhận chuyến đi"
              : "VNA xác nhận chuyến đi",
            description: eventTime("confirmed")
              ? dateTime(eventTime("confirmed")!)
              : "VNA xác nhận nhận đơn và lịch tổ chức",
            state: confirmed ? "done" : "upcoming",
          },
          {
            title:
              booking.status === "completed"
                ? "Đã hoàn thành chuyến đi"
                : "Khởi hành chuyến đi",
            description:
              booking.status === "completed" && eventTime("completed")
                ? dateTime(eventTime("completed")!)
                : "Gặp mặt tại điểm đón theo lịch bên dưới",
            state: booking.status === "completed" ? "done" : "upcoming",
          },
        ]),
  ];
  return (
    <section className="booking-panel booking-progress">
      <h2>
        <Icon name="history" size={20} />
        Tiến trình đơn tour
      </h2>
      <ol>
        {steps.map((step, index) => (
          <li
            key={index}
            className={step.state}
            aria-current={step.state === "current" ? "step" : undefined}
          >
            <span className="booking-step-marker">
              {step.state === "done" ? (
                <Icon name="check" size={16} />
              ) : step.state === "current" ? (
                <Icon name="clock" size={16} />
              ) : step.state === "closed" ? (
                <Icon name="close" size={16} />
              ) : (
                <i />
              )}
            </span>
            <div>
              <strong>{step.title}</strong>
              {"badge" in step && (
                <small className="booking-step-badge">{step.badge}</small>
              )}
              <p>{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
