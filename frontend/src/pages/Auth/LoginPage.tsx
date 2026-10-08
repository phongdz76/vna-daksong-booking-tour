import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import AppLink, { useAppNavigate } from "../../components/common/AppLink";
import Icon from "../../components/common/Icon";
import { useAuth } from "../../context/AuthContext";
import { usePreview } from "../../context/PreviewContext";
import { previewImages } from "../../data/preview";
import { api, API_PATHS, errorMessage } from "../../utils/api";
import { isZalo, zaloAccessToken } from "../../utils/zalo";
import logo from "../../assets/images/0bbfd724.png";
import type { User } from "../../types/api";

export default function LoginPage() {
  const [params] = useSearchParams();
  const navigate = useAppNavigate();
  const { user, login } = useAuth();
  const { isPreview } = usePreview();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("Khách thử nghiệm");
  const [phone, setPhone] = useState("");
  const devLogin = import.meta.env.DEV && !isZalo;
  const requestedPath = params.get("returnTo") || "/account";
  const returnTo =
    requestedPath.startsWith("/") && !requestedPath.startsWith("//")
      ? requestedPath
      : "/account";

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (user) {
      navigate(returnTo, true);
      return;
    }
    if (isPreview) {
      setError(
        "Bản xem mẫu không tạo phiên đăng nhập. Chuyển sang chế độ API để đăng nhập thử trên trình duyệt.",
      );
      return;
    }
    if (!devLogin && !isZalo) {
      setError("Mở Mini App trong Zalo để đăng nhập tài khoản của bạn.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = devLogin
        ? await api.post<{ token: string; user: User }>(
            API_PATHS.AUTH.MOCK_LOGIN,
            { name: name.trim(), phone: phone.trim() },
          )
        : await api.post<{ token: string; user: User }>(API_PATHS.AUTH.LOGIN, {
            accessToken: await zaloAccessToken(),
          });
      login(response.data.token, response.data.user);
      navigate(returnTo, true);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={"page stitch-login" + (devLogin ? " stitch-login-dev" : "")}
    >
      <div
        className="login-landscape"
        style={{ backgroundImage: "url(" + previewImages.hero + ")" }}
      >
        <span>
          <Icon name="mountain" size={16} />
          CỔNG DU LỊCH SINH THÁI
        </span>
      </div>
      <div className="login-brand">
        <img src={logo} alt="VNA Group" />
        <h1>VNA ĐẮK SONG</h1>
        <p>Trải Nghiệm Du Lịch Sinh Thái & Văn Hóa Đại Ngàn</p>
      </div>
      <div className="login-content">
        <section className="card login-welcome">
          <div className="login-features">
            <div>
              <Icon name="leaf" size={22} />
              <div>
                <strong>Khám phá Đắk Song dễ dàng cùng Zalo</strong>
                <p>Đồng hành cùng thiên nhiên, đồi thông và văn hóa bản địa.</p>
              </div>
            </div>
            <div>
              <Icon name="mountain" size={22} />
              <div>
                <strong>Đặt tour trekking & cắm trại</strong>
                <p>Xem lịch trình, chọn chuyến và số khách.</p>
              </div>
            </div>
            <div>
              <Icon name="ticket" size={22} />
              <div>
                <strong>Theo dõi yêu cầu đặt tour</strong>
                <p>Thông tin chuyến đi và trạng thái đơn trong tài khoản.</p>
              </div>
            </div>
            <div>
              <Icon name="user" size={22} />
              <div>
                <strong>Kết nối cùng VNA Đắk Song</strong>
                <p>VNA liên hệ tư vấn và xác nhận yêu cầu của bạn.</p>
              </div>
            </div>
          </div>
        </section>
        <form className="login-form" onSubmit={handleLogin}>
          {devLogin && !user && (
            <div className="login-dev-fields">
              <p className="login-dev-label">
                <Icon name="info" size={16} />
                Chế độ phát triển · Chưa kết nối Zalo
              </p>
              <p className="login-dev-description">
                Dùng tên và số điện thoại thử để kiểm tra tài khoản, đặt tour
                trên trình duyệt.
              </p>
              {!isPreview && (
                <fieldset disabled={busy}>
                  <label htmlFor="login-name">
                    Tên hiển thị
                    <input
                      id="login-name"
                      name="name"
                      autoComplete="name"
                      required
                      maxLength={200}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Nhập tên của bạn"
                    />
                  </label>
                  <label htmlFor="login-phone">
                    Số điện thoại thử nghiệm
                    <input
                      id="login-phone"
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      required
                      minLength={7}
                      maxLength={20}
                      pattern="(0|\+84)[3|5|7|8|9][0-9]{8}"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="Ví dụ: 0900000000"
                    />
                  </label>
                </fieldset>
              )}
            </div>
          )}
          <button
            className="button button-wide zalo-login-button"
            type="submit"
            disabled={busy}
          >
            <span>{devLogin ? <Icon name="user" size={17} /> : "Z"}</span>
            {busy
              ? "Đang đăng nhập…"
              : user
                ? "Tiếp tục với tài khoản của bạn"
                : devLogin
                  ? "Đăng nhập thử nghiệm"
                  : "Đăng nhập nhanh với Zalo"}
          </button>
          {isPreview && devLogin && (
            <a
              className="login-api-link"
              href={"/login?returnTo=" + encodeURIComponent(returnTo)}
            >
              Mở đăng nhập thử với API <Icon name="arrow" size={15} />
            </a>
          )}
        </form>
        <AppLink className="login-guest" to="/">
          Tiếp tục khám phá không đăng nhập
          <Icon name="arrow" size={16} />
        </AppLink>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <p className="login-privacy">
          <Icon name="shield" size={16} />
          Đăng nhập để quản lý đơn. Thông tin liên hệ được nhập khi bạn gửi yêu
          cầu đặt tour.
        </p>
        <div className="login-eco">
          <Icon name="leaf" size={20} />
          Cùng khám phá và tôn trọng môi trường rừng & văn hóa bản địa.
        </div>
        <p className="login-footer">VNA Group · Du lịch Đắk Song</p>
      </div>
    </div>
  );
}
