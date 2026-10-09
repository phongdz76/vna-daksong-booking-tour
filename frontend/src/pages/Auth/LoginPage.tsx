import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import AppLink, { useAppNavigate } from "../../components/common/AppLink";
import Icon from "../../components/common/Icon";
import { useAuth } from "../../context/AuthContext";
import { usePreview } from "../../context/PreviewContext";
import { previewImages } from "../../data/preview";
import { api, API_PATHS, errorMessage } from "../../utils/api";
import { isZalo, zaloLoginCredentials } from "../../utils/zalo";
import logo from "../../assets/images/0bbfd724.png";
import type { User } from "../../types/api";

export default function LoginPage() {
  const [params] = useSearchParams();
  const navigate = useAppNavigate();
  const { user, login } = useAuth();
  const { isPreview } = usePreview();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showMockForm, setShowMockForm] = useState(!isZalo);
  const [name, setName] = useState("Khách thử nghiệm");
  const [phone, setPhone] = useState("");
  const requestedPath = params.get("returnTo") || "/account";
  const returnTo =
    requestedPath.startsWith("/") && !requestedPath.startsWith("//")
      ? requestedPath
      : "/account";

  async function handleZaloLogin() {
    if (busy) return;
    if (user) {
      navigate(returnTo, true);
      return;
    }
    if (isPreview) {
      setError("Bản xem mẫu không tạo phiên đăng nhập. Chuyển sang chế độ API để đăng nhập.");
      return;
    }
    if (!isZalo) {
      setError("Mở Mini App trong Zalo để tự động đăng nhập Zalo 1-touch. Hoặc dùng form Đăng nhập thử nghiệm bên dưới.");
      setShowMockForm(true);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await api.post<{ token: string; user: User }>(
        API_PATHS.AUTH.LOGIN,
        await zaloLoginCredentials(),
      );
      login(response.data.token, response.data.user);
      navigate(returnTo, true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleMockLogin(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (user) {
      navigate(returnTo, true);
      return;
    }
    if (isPreview) {
      setError("Bản xem mẫu không tạo phiên đăng nhập. Chuyển sang chế độ API để đăng nhập thử nghiệm.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await api.post<{ token: string; user: User }>(
        API_PATHS.AUTH.MOCK_LOGIN,
        { name: name.trim() || "Khách thử nghiệm", phone: phone.trim() },
      );
      login(response.data.token, response.data.user);
      navigate(returnTo, true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page stitch-login stitch-login-dev">
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

        <div className="login-actions-group">
          {/* Main Zalo Login Button */}
          <button
            className="button button-wide zalo-login-button"
            type="button"
            onClick={handleZaloLogin}
            disabled={busy}
          >
            <span>Z</span>
            {busy ? "Đang đăng nhập…" : user ? "Tiếp tục với tài khoản Zalo" : "Đăng nhập nhanh với Zalo"}
          </button>

          {/* Dedicated Mock/Test Login Section for Web */}
          <div className="login-mock-section" style={{ marginTop: "16px" }}>
            {!showMockForm ? (
              <button
                type="button"
                className="button button-outline button-wide"
                style={{ background: "#fff", color: "#04432f", borderColor: "#04432f44" }}
                onClick={() => setShowMockForm(true)}
              >
                <Icon name="user" size={17} />
                Đăng nhập (Trình duyệt Web)
              </button>
            ) : (
              <form className="login-form" onSubmit={handleMockLogin} style={{ background: "#f3fcf5", padding: "16px", borderRadius: "12px", border: "1px solid #e4ece5" }}>
                <div className="login-dev-fields">
                  <p className="login-dev-label" style={{ fontWeight: 650, color: "#04432f", marginBottom: "4px" }}>
                    <Icon name="info" size={16} />
                    Đăng nhập nhanh trên Web
                  </p>
                  <p className="login-dev-description" style={{ fontSize: "12px", color: "#6c7770", marginBottom: "12px" }}>
                    Nhập tên và số điện thoại của bạn để đăng nhập trên trình duyệt.
                  </p>
                  <fieldset disabled={busy} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <label htmlFor="login-name" style={{ fontSize: "13px" }}>
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
                    <label htmlFor="login-phone" style={{ fontSize: "13px" }}>
                      Số điện thoại
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
                </div>
                <button
                  className="button button-wide button-primary"
                  type="submit"
                  disabled={busy}
                  style={{ marginTop: "12px" }}
                >
                  <Icon name="user" size={16} />
                  {busy ? "Đang xử lý…" : "Xác nhận Đăng nhập"}
                </button>
              </form>
            )}
          </div>
        </div>
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
