import Icon from "../common/Icon";

// The Stitch QR illustration is only used in the labelled design preview.
export default function BookingTicketCode({
  code,
  preview,
}: {
  code: string;
  preview: boolean;
}) {
  return (
    <div className="booking-ticket-code">
      <div
        className={"booking-code-square " + (preview ? "is-illustration" : "")}
      >
        {preview ? (
          <svg
            viewBox="0 0 120 120"
            fill="currentColor"
            role="img"
            aria-label="QR minh họa, không dùng để check-in"
          >
            {[
              [10, 10],
              [80, 10],
              [10, 80],
            ].map(([x, y]) => (
              <g key={x + "-" + y}>
                <rect
                  x={x}
                  y={y}
                  width="30"
                  height="30"
                  rx="3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                />
                <rect x={x + 10} y={y + 10} width="10" height="10" rx="1.5" />
              </g>
            ))}
            {[
              [48, 12, 6, 6],
              [62, 12, 6, 14],
              [48, 26, 10, 6],
              [12, 48, 8, 6],
              [28, 48, 6, 14],
              [12, 62, 12, 6],
              [44, 44, 8, 8],
              [56, 44, 8, 8],
              [68, 44, 8, 8],
              [44, 56, 12, 8],
              [64, 56, 12, 8],
              [44, 68, 8, 12],
              [60, 68, 16, 8],
              [84, 48, 8, 12],
              [100, 48, 8, 8],
              [92, 64, 16, 8],
              [48, 88, 10, 8],
              [64, 84, 8, 12],
              [48, 102, 24, 6],
              [84, 84, 12, 8],
              [102, 84, 6, 22],
              [84, 98, 12, 10],
            ].map(([x, y, w, h]) => (
              <rect key={x + "-" + y} x={x} y={y} width={w} height={h} />
            ))}
          </svg>
        ) : (
          <>
            <Icon name="ticket" size={46} />
            <strong>{code}</strong>
            <span>Mã đơn đặt tour</span>
          </>
        )}
      </div>
      <p>
        {preview
          ? "QR minh họa • Không dùng để check-in"
          : "Cung cấp mã đơn này khi liên hệ VNA để tra cứu chuyến đi."}
      </p>
    </div>
  );
}
