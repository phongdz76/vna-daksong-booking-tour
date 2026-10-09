import { useEffect, useRef, useState } from "react";
import Header from "../../../components/layout/Header";
import AppLink, { useAppNavigate } from "../../../components/common/AppLink";
import Icon from "../../../components/common/Icon";
import Photo from "../../../components/common/Photo";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../../components/common/States";
import AccountMenuItem from "../../../components/account/AccountMenuItem";
import TourCard from "../../../components/tour/TourCard";
import { useAuth } from "../../../context/AuthContext";
import { useBookingDraft } from "../../../context/BookingDraftContext";
import { usePreview } from "../../../context/PreviewContext";
import useApi from "../../../hooks/useApi";
import {
  previewAccountUser,
  previewCompletedBookings,
  previewConfirmedBookings,
  previewSavedTours,
  previewAccountImages,
} from "../../../data/previewAccount";
import { previewTours } from "../../../data/preview";
import { API_PATHS } from "../../../utils/api";
import { dateTime } from "../../../utils/format";
import { isZalo } from "../../../utils/zalo";
import type { Booking, ListResponse, Tour } from "../../../types/api";

const panelTitles: Record<string, string> = {
  saved: "Tour đã lưu",
  gallery: "Kho ảnh kỷ niệm chuyến đi",
  passengers: "Thông tin hành khách",
  payments: "Ví & Phương thức thanh toán",
  notifications: "Thông báo hành trình ZNS",
  support: "Liên hệ VNA Đắk Song",
  policy: "Chính sách hoàn hủy & Bảo mật",
  faq: "Câu hỏi thường gặp",
  coupons: "Mã ưu đãi",
  membership: "Thông tin hội viên",
  ticket: "Thông tin vé mẫu",
};

function getTierProgressInfo(points: number = 0, currentTier: string = "Bạc") {
  if (currentTier === "Kim Cương" || points >= 5000) {
    return {
      currentTierLabel: "Hạng Kim Cương",
      nextTierLabel: "Đã đạt hạng cao nhất",
      targetPoints: 5000,
      percentage: 100,
    };
  }
  if (currentTier === "Vàng" || points >= 1000) {
    const targetPoints = 5000;
    const percentage = Math.min(100, Math.round((points / targetPoints) * 100));
    return {
      currentTierLabel: "Hạng Vàng",
      nextTierLabel: "Còn 5.000 điểm để lên Kim Cương",
      targetPoints,
      percentage,
    };
  }
  const targetPoints = points <= 500 ? 500 : 1000;
  const percentage = Math.min(100, Math.round((points / targetPoints) * 100));
  return {
    currentTierLabel: "Hạng Bạc",
    nextTierLabel: "Còn 1.000 điểm để lên Vàng",
    targetPoints,
    percentage,
  };
}

export default function AccountPage() {
  const { user, loading, logout } = useAuth();
  const { setDraft, setAttempt } = useBookingDraft();
  const { isPreview } = usePreview();
  const navigate = useAppNavigate();
  const [panel, setPanel] = useState<string | null>(null);
  const [previewNotifications, setPreviewNotifications] = useState(true);
  const dialog = useRef<HTMLDialogElement>(null);
  const profile = isPreview ? previewAccountUser : user;
  const tierInfo = getTierProgressInfo(profile?.loyaltyPoints ?? 0, profile?.membershipTier ?? "Bạc");
  const confirmed = useApi<ListResponse<Booking>>(
    user ? API_PATHS.BOOKINGS.GET_MINE + "?status=confirmed&limit=100" : null,
    previewConfirmedBookings,
  );
  const completed = useApi<ListResponse<Booking>>(
    user ? API_PATHS.BOOKINGS.GET_MINE + "?status=completed&limit=1" : null,
    previewCompletedBookings,
  );
  const saved = useApi<{ data: Tour[] }>(
    user ? API_PATHS.TOURS.GET_ALL + "/saved" : null,
    previewSavedTours,
  );
  const upcoming = confirmed.data?.data
    .filter(
      (booking) =>
        booking.status === "confirmed" &&
        new Date(booking.snapshot.departureAt).getTime() > Date.now(),
    )
    .sort(
      (a, b) =>
        new Date(a.snapshot.departureAt).getTime() -
        new Date(b.snapshot.departureAt).getTime(),
    )[0];
  const upcomingTour = useApi<Tour>(
    user && upcoming ? API_PATHS.TOURS.GET_BY_ID(upcoming.tourId) : null,
    previewTours[0],
  );
  const tripCount =
    confirmed.data && completed.data
      ? confirmed.data.pagination.total + completed.data.pagination.total
      : null;
  const savedCount = saved.data?.data.length;
  const completedCount = completed.data?.pagination.total;
  const hotline = String(import.meta.env.VITE_SUPPORT_PHONE || "").trim();
  const phoneNumber = hotline.replace(/[ .()-]/g, "");
  const hasHotline = /^\+?\d{7,15}$/.test(phoneNumber);
  const oaId = String(import.meta.env.VITE_ZALO_OA_ID || "").trim();
  const oaUrl = /^\d+$/.test(oaId) ? "https://zalo.me/" + oaId : "";

  useEffect(() => {
    if (panel && dialog.current && !dialog.current.open)
      dialog.current.showModal();
    if (!panel && dialog.current?.open) dialog.current.close();
  }, [panel]);

  function openPanel(name: string) {
    if (!profile && ["saved", "passengers", "membership"].includes(name)) {
      navigate("/login?returnTo=%2Faccount");
      return;
    }
    setPanel(name);
  }

  function handleLogout() {
    logout();
    setDraft(null);
    setAttempt(null);
    navigate("/login", true);
  }

  return (
    <div className="page stitch-account">
      <Header title="Tài Khoản" />
      {loading ? (
        <LoadingState />
      ) : (
        <div className="account-body">
          <section className="profile-card account-profile">
            <div className="account-profile-top">
              <div className="account-avatar-wrap">
                <div className="account-avatar">
                  {profile?.avatar ? (
                    <img
                      src={profile.avatar}
                      alt={profile.name}
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <Icon name="user" size={32} />
                  )}
                </div>
                {profile && (
                  <span className="account-avatar-badge">
                    <Icon name="compass" size={13} />
                  </span>
                )}
              </div>
              <div className="account-profile-info">
                <h1>
                  <span>{profile?.name || "Khách tham quan"}</span>
                </h1>
                <div className="account-identity">
                  <span>{isPreview ? "0967 *** 321" : profile?.phone || "Vui lòng đăng nhập"}</span>
                  <span className={`account-session-label ${profile ? "verified" : "unverified"}`}>
                    <Icon name={profile ? "check" : "user"} size={12} />
                    {isPreview
                      ? "Zalo Verified"
                      : profile
                        ? isZalo
                          ? "Zalo Verified"
                          : "Đã xác thực"
                        : "Chưa đăng nhập"}
                  </span>
                </div>
                {profile ? (
                  <button
                    className="account-tier"
                    onClick={() => openPanel("membership")}
                  >
                    <i />
                    Hạng {profile.membershipTier} • Khám phá Đại Ngàn
                  </button>
                ) : (
                  <AppLink
                    className="account-tier"
                    to="/login?returnTo=%2Faccount"
                  >
                    Đăng nhập để lưu hành trình <Icon name="arrow" size={14} />
                  </AppLink>
                )}
              </div>
            </div>
            <div className="account-loyalty">
              <div className="account-loyalty-header">
                <span className="account-loyalty-title">
                  Tiến trình nâng hạng
                </span>
                <strong className="account-loyalty-points">
                  {(profile?.loyaltyPoints ?? 0).toLocaleString("vi-VN")} / {tierInfo.targetPoints} điểm
                </strong>
              </div>
              <div
                className="account-progress"
                role="progressbar"
                aria-label="Tiến trình nâng hạng"
                aria-valuemin={0}
                aria-valuemax={tierInfo.targetPoints}
                aria-valuenow={profile?.loyaltyPoints ?? 0}
              >
                <span style={{ width: profile ? `${tierInfo.percentage}%` : "0%" }} />
              </div>
              <p className="account-loyalty-footer">
                <span>{profile ? tierInfo.currentTierLabel : "Hạng Thường"}</span>
                <span className="next-tier-highlight">
                  {profile ? tierInfo.nextTierLabel : "Đăng nhập để tích điểm nâng hạng"}
                </span>
              </p>
            </div>
          </section>

          <div className="account-stats">
            <AppLink to="/my-bookings" className="account-stat">
              <span className="account-stat-icon">
                <Icon name="compass" size={20} />
              </span>
              <strong>{tripCount ?? "—"}</strong>
              <small>Chuyến đi</small>
            </AppLink>
            <button
              className="account-stat clay"
              onClick={() => openPanel("saved")}
            >
              <span className="account-stat-icon">
                <Icon name="heart" size={20} />
              </span>
              <strong>{savedCount ?? "—"}</strong>
              <small>Tour đã lưu</small>
            </button>
            <button
              className="account-stat red"
              onClick={() => openPanel("coupons")}
            >
              <span className="account-stat-icon">
                <Icon name="ticket" size={20} />
              </span>
              <strong>{isPreview ? 2 : "—"}</strong>
              <small>Mã ưu đãi</small>
            </button>
          </div>

          <section className="account-upcoming">
            <div className="account-section-heading">
              <h2>
                <i />
                Chuyến đi sắp khởi hành
              </h2>
              <AppLink
                to={
                  upcoming && !isPreview
                    ? "/my-bookings/" + upcoming._id
                    : "/my-bookings"
                }
              >
                Chi tiết {isPreview ? "vé" : "đơn"}
              </AppLink>
            </div>
            {confirmed.loading ? (
              <LoadingState />
            ) : confirmed.error ? (
              <ErrorState message={confirmed.error} retry={confirmed.retry} />
            ) : upcoming ? (
              <div className="account-trip-card">
                <div className="account-trip-main">
                  <div className="account-trip-photo">
                    <Photo
                      src={
                        isPreview
                          ? previewAccountImages.upcoming
                          : upcomingTour.data?.images?.[0]?.url
                      }
                      alt={upcoming.snapshot.tourName}
                    />
                    <span>Sắp đi</span>
                  </div>
                  <div>
                    <h3>{upcoming.snapshot.tourName}</h3>
                    <p>
                      <Icon name="calendar" size={16} />
                      {dateTime(upcoming.snapshot.departureAt)}
                    </p>
                    <p>
                      <Icon name="pin" size={16} />
                      {isPreview
                        ? "Đắk Song, Đắk Nông"
                        : upcoming.snapshot.meetingPoint}
                    </p>
                  </div>
                </div>
                <div className="account-trip-footer">
                  <span>
                    <Icon name={isPreview ? "qr" : "ticket"} size={18} />
                    Mã: #{upcoming.code}
                  </span>
                  {isPreview ? (
                    <button onClick={() => setPanel("ticket")}>
                      Xem vé QR <Icon name="arrow" size={16} />
                    </button>
                  ) : (
                    <AppLink to={"/my-bookings/" + upcoming._id}>
                      Chi tiết đơn <Icon name="arrow" size={16} />
                    </AppLink>
                  )}
                </div>
              </div>
            ) : (
              <div className="account-empty-trip">
                <Icon name="calendar" size={24} />
                <div>
                  <strong>
                    {profile
                      ? "Chưa có chuyến đã xác nhận sắp tới"
                      : "Đăng nhập để xem chuyến đi"}
                  </strong>
                  <p>
                    {profile
                      ? "Yêu cầu chờ xác nhận nằm trong Đơn hàng."
                      : "Theo dõi yêu cầu và lịch trình trong tài khoản."}
                  </p>
                </div>
                <AppLink to={profile ? "/tours" : "/login?returnTo=%2Faccount"}>
                  <Icon name="chevron" size={20} />
                </AppLink>
              </div>
            )}
          </section>

          <section className="account-group">
            <h2>Chuyến đi & Hoạt động</h2>
            <div className="account-menu-group">
              <AccountMenuItem
                icon="history"
                title="Lịch sử chuyến đi"
                description={
                  completedCount == null
                    ? "Xem lại các hành trình của bạn"
                    : completedCount +
                      " tour đã hoàn thành" +
                      (completedCount > 0 ? " • Viết đánh giá" : "")
                }
                to="/my-bookings?status=completed"
              />
              <AccountMenuItem
                icon="heart"
                tone="clay"
                title={isPreview ? "Tour & Điểm đến đã lưu" : "Tour đã lưu"}
                description={
                  savedCount == null
                    ? "Những hành trình bạn yêu thích"
                    : savedCount + " tour sinh thái yêu thích"
                }
                onClick={() => openPanel("saved")}
              />
              <AccountMenuItem
                icon="camera"
                title="Kho ảnh kỷ niệm chuyến đi"
                description={
                  isPreview
                    ? "Ảnh HD từ hướng dẫn viên VNA"
                    : "Lưu giữ khoảnh khắc trong hành trình"
                }
                onClick={() => openPanel("gallery")}
              />
            </div>
          </section>

          <section className="account-group">
            <h2>Cài đặt & Quản lý</h2>
            <div className="account-menu-group">
              <AccountMenuItem
                icon="badge"
                tone="neutral"
                title="Thông tin hành khách"
                description={
                  isPreview
                    ? "CCCD, ngày sinh, liên hệ khẩn cấp"
                    : "Thông tin liên hệ trong đơn đặt tour"
                }
                onClick={() => openPanel("passengers")}
              />
              <AccountMenuItem
                icon="wallet"
                tone="neutral"
                title="Ví & Phương thức thanh toán"
                description={
                  isPreview
                    ? "VietQR, ZaloPay, Thẻ ngân hàng"
                    : "Xem phương thức thanh toán của chuyến"
                }
                onClick={() => openPanel("payments")}
              />
              <AccountMenuItem
                icon="chat"
                tone="neutral"
                title="Thông báo hành trình ZNS"
                description={
                  isPreview
                    ? "Cập nhật qua Zalo Mini App"
                    : "Chưa kích hoạt thông báo ZNS"
                }
                pressed={isPreview ? previewNotifications : undefined}
                onClick={() =>
                  isPreview
                    ? setPreviewNotifications((value) => !value)
                    : openPanel("notifications")
                }
                trailing={
                  <span
                    className={
                      "account-switch " +
                      (isPreview && previewNotifications ? "checked" : "")
                    }
                    aria-hidden="true"
                  >
                    <i />
                  </span>
                }
              />
            </div>
          </section>

          <section className="account-group">
            <h2>
              {isPreview ? "Chăm sóc khách hàng 24/7" : "Chăm sóc khách hàng"}
            </h2>
            <div className="account-hotline">
              <div>
                <p>
                  <i />
                  TỔNG ĐÀI VNA ĐẮK SONG
                </p>
                <strong>
                  {isPreview
                    ? "0912.345.678"
                    : hasHotline
                      ? hotline
                      : "Liên hệ VNA Đắk Song"}
                </strong>
                <small>
                  {isPreview
                    ? "Hỗ trợ khẩn cấp, đặt xe & đổi tour"
                    : hasHotline
                      ? "Hỗ trợ thông tin chuyến đi và đặt tour"
                      : "Kênh hỗ trợ đang được cập nhật"}
                </small>
              </div>
              {hasHotline && !isPreview ? (
                <a href={"tel:" + phoneNumber} aria-label="Gọi hỗ trợ VNA">
                  <Icon name="phone" size={22} />
                </a>
              ) : (
                <button
                  aria-label="Thông tin hỗ trợ VNA"
                  onClick={() => setPanel("support")}
                >
                  <Icon name="phone" size={22} />
                </button>
              )}
            </div>
            <div className="account-menu-group">
              <AccountMenuItem
                icon="support"
                title="Nhắn tin Zalo OA VNA Đắk Song"
                description={
                  isPreview
                    ? "Phản hồi nhanh trong vòng 3 phút"
                    : oaUrl
                      ? "Mở kênh Zalo của VNA"
                      : "Kênh Zalo OA đang được cập nhật"
                }
                onClick={() => setPanel("support")}
                trailing={
                  <Icon
                    name="external"
                    size={20}
                    className="account-menu-chevron"
                  />
                }
              />
              <AccountMenuItem
                icon="shield"
                tone="neutral"
                title="Chính sách hoàn hủy & Bảo mật"
                description="Quy định đổi trả và an toàn dữ liệu"
                onClick={() => setPanel("policy")}
              />
              <AccountMenuItem
                icon="help"
                tone="neutral"
                title="Câu hỏi thường gặp"
                description={
                  isPreview
                    ? "Cẩm nang chuẩn bị đồ trekking Đắk Song"
                    : "Hướng dẫn đặt tour và theo dõi yêu cầu"
                }
                onClick={() => setPanel("faq")}
              />
            </div>
          </section>

          <div className="account-brand-footer">
            <p>
              <Icon name="leaf" size={14} />
              VNA Đắk Song • Đồng hành cùng thiên nhiên
            </p>
            <p>
              {isPreview ? "Giao diện minh họa theo Stitch • " : ""}Phát triển
              bởi VNA Group
            </p>
          </div>
          <button
            className="account-logout"
            onClick={
              profile
                ? handleLogout
                : () => navigate("/login?returnTo=%2Faccount")
            }
          >
            <Icon name={profile ? "logout" : "user"} size={18} />
            {profile ? "Chuyển tài khoản / Đăng xuất" : "Đăng nhập thử nghiệm"}
          </button>
        </div>
      )}

      <dialog
        className="account-dialog"
        aria-labelledby="account-panel-title"
        ref={dialog}
        onClose={() => setPanel(null)}
        onCancel={() => setPanel(null)}
        onClick={(event) => {
          if (event.target === dialog.current) setPanel(null);
        }}
      >
        <div className="account-dialog-header">
          <h2 id="account-panel-title">{panel ? panelTitles[panel] : ""}</h2>
          <button
            className="icon-button"
            aria-label="Đóng"
            onClick={() => setPanel(null)}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="account-dialog-content">
          {panel === "saved" &&
            (saved.loading ? (
              <LoadingState />
            ) : saved.error ? (
              <ErrorState message={saved.error} retry={saved.retry} />
            ) : saved.data?.data.length ? (
              <div className="tour-list">
                {saved.data.data.map((tour) => (
                  <TourCard compact tour={tour} key={tour._id} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="Chưa lưu tour nào"
                description="Nhấn biểu tượng trái tim trong chi tiết tour để lưu hành trình."
              >
                <AppLink className="button button-primary" to="/tours">
                  Khám phá tour
                </AppLink>
              </EmptyState>
            ))}
          {panel === "membership" && (
            <>
              <p>
                Hạng hiện tại: <strong>{profile?.membershipTier}</strong>.
              </p>
              <p>
                Điểm tích lũy:{" "}
                <strong>
                  {profile?.loyaltyPoints.toLocaleString("vi-VN")}
                </strong>
                .
              </p>
              <p>
                {isPreview
                  ? "Tiến trình điểm trong bản xem mẫu chỉ là dữ liệu minh họa."
                  : "Hạng và điểm hiển thị theo tài khoản. Hiện chưa có giảm giá tự động theo hạng; mã giảm giá hợp lệ sẽ được kiểm tra khi lấy báo giá."}
              </p>
            </>
          )}
          {panel === "passengers" && (
            <>
              <p>
                Người liên hệ: <strong>{profile?.name}</strong>.
              </p>
              <p>
                Bạn nhập tên và số điện thoại tại bước xác nhận đặt tour. Thông
                tin đã gửi được lưu trong từng đơn.
              </p>
              <p>Chưa hỗ trợ hồ sơ CCCD, ngày sinh và liên hệ khẩn cấp.</p>
              <AppLink className="button button-primary" to="/my-bookings">
                Xem đơn của tôi
              </AppLink>
            </>
          )}
          {panel === "payments" && (
            <>
              <p>
                Luồng hiện tại dùng thanh toán tại điểm hẹn. Gửi yêu cầu đặt
                tour chưa thu tiền; VNA xác nhận chuyến và trao đổi cách thanh
                toán.
              </p>
              <p>Ví, VietQR, ZaloPay và liên kết thẻ chưa được tích hợp.</p>
            </>
          )}
          {panel === "gallery" && (
            <>
              <p>
                Kho ảnh từ hướng dẫn viên đang được chuẩn bị. Hiện chưa có album
                chuyến đi trong tài khoản.
              </p>
              <AppLink
                className="button button-primary"
                to="/my-bookings?status=completed"
              >
                Xem chuyến đã hoàn thành
              </AppLink>
            </>
          )}
          {panel === "notifications" && (
            <>
              <p>
                Dự án chưa kết nối ZNS. Hiện bạn theo dõi trạng thái trong mục
                Đơn hàng.
              </p>
              <AppLink className="button button-primary" to="/my-bookings">
                Xem cập nhật đơn hàng
              </AppLink>
            </>
          )}
          {panel === "coupons" && (
            <>
              <p>
                {isPreview
                  ? "Số mã ưu đãi trên màn mẫu lấy từ thiết kế Stitch."
                  : "Hiện chưa có mã ưu đãi dành riêng cho tài khoản. Vui lòng theo dõi các chương trình khuyến mãi từ VNA Đắk Song."}
              </p>
              <AppLink className="button button-primary" to="/tours">
                Chọn tour
              </AppLink>
            </>
          )}
          {panel === "ticket" && (
            <>
              <p>
                Đây là thẻ chuyến đi mẫu theo Stitch. Hệ thống chưa phát hành vé
                QR để soát vé.
              </p>
              <p>
                Với đơn thật, xem mã đơn và trạng thái xác nhận trong mục Đơn
                hàng.
              </p>
            </>
          )}
          {panel === "support" && (
            <>
              <p>
                {isPreview
                  ? "Số điện thoại và thời gian phản hồi trên màn mẫu là nội dung minh họa từ Stitch."
                  : "Dùng kênh liên hệ VNA đã được cấu hình cho ứng dụng."}
              </p>
              {hasHotline && !isPreview && (
                <a
                  className="button button-primary"
                  href={"tel:" + phoneNumber}
                >
                  Gọi {hotline}
                </a>
              )}
              {oaUrl && !isPreview && (
                <a
                  className="button button-outline"
                  href={oaUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Mở Zalo OA VNA <Icon name="external" size={16} />
                </a>
              )}
              {((!hasHotline && !oaUrl) || isPreview) && (
                <p>
                  Thông tin tổng đài và Zalo OA chính thức đang được cập nhật.
                </p>
              )}
            </>
          )}
          {panel === "policy" && (
            <>
              <h3>Điều kiện hủy chuyến</h3>
              <p>
                Chính sách áp dụng nằm trong chi tiết tour, báo giá và bản chụp
                thông tin của đơn bạn đã gửi. Đơn đã thanh toán có thể cần VNA
                xử lý hoàn tiền khi hủy.
              </p>
              <h3>Thông tin liên hệ</h3>
              <p>
                Tên và số điện thoại quý khách cung cấp sẽ được VNA sử dụng để xử lý đơn hàng và liên hệ hỗ trợ. Chúng tôi cam kết bảo mật tuyệt đối thông tin cá nhân của bạn.
              </p>
              <AppLink className="button button-primary" to="/my-bookings">
                Xem điều kiện trong đơn
              </AppLink>
            </>
          )}
          {panel === "faq" && (
            <>
              <details open>
                <summary>Làm sao để đăng nhập nếu không dùng Zalo?</summary>
                <p>
                  Bạn có thể chọn "Mở đăng nhập thử với API" ở trang Đăng nhập để sử dụng tên và số điện thoại thay thế nhé.
                </p>
              </details>
              <details>
                <summary>Gửi yêu cầu là đã có chỗ chưa?</summary>
                <p>
                  Đơn mới ở trạng thái chờ VNA xác nhận. Theo dõi kết quả trong
                  mục Đơn hàng.
                </p>
              </details>
              <details>
                <summary>Giá tour được tính như thế nào?</summary>
                <p>
                  Hệ thống sẽ tự động tính toán giá dựa trên chuyến đi, số lượng khách và mã ưu đãi. Bạn có thể xem chi tiết giá ở bước xác nhận.
                </p>
              </details>
              <details>
                <summary>Tôi hủy yêu cầu thế nào?</summary>
                <p>
                  Mở chi tiết đơn và xem điều kiện hủy. Nút hủy chỉ xuất hiện
                  với trạng thái được phép.
                </p>
              </details>
            </>
          )}
        </div>
      </dialog>
    </div>
  );
}
