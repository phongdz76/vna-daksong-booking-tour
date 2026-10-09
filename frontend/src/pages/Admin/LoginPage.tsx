import logo from "../../assets/images/0bbfd724.png";
import heroImage from "../../assets/stitch/explore-waterfall.jpg";
import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AdminAuthContext";
import { errorMessage } from "../../utils/adminApi";
import { Button, Field, Notice } from "../../components/admin/ui";
import Icon from "../../components/admin/Icon";

export default function LoginPage() {
  const auth = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);
  const requested = (location.state as { from?: string } | null)?.from;
  const destination =
    requested?.startsWith("/") &&
    !requested.startsWith("//") &&
    !requested.startsWith("/login")
      ? requested
      : "/";
  if (auth.user) return <Navigate to={destination} replace />;
  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await auth.login(email, password);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <div
        className="login-story"
        style={{
          backgroundImage: `linear-gradient(90deg, #012d22f5 0%, #04432fde 55%, #04432fa8 100%), url(${heroImage})`,
        }}
      >
        <LinkBrand />
        <div className="login-intro">
          <span className="eyebrow">CỔNG QUẢN TRỊ VNA ĐẮK SONG</span>
          <h1>
            Chăm chút từng
            <br />
            hành trình.
          </h1>
          <p>
            Quản lý tour, kết nối trải nghiệm và đồng hành cùng khách hàng khám
            phá Đắk Song.
          </p>
          <div className="login-features">
            <span>
              <Icon name="tour" />
              Tour & lịch khởi hành
            </span>
            <span>
              <Icon name="booking" />
              Đơn đặt & khách hàng
            </span>
            <span>
              <Icon name="leaf" />
              Nội dung địa phương
            </span>
          </div>
        </div>
        <small>VNA Group · Du lịch & trải nghiệm địa phương</small>
      </div>
      <div className="login-form-side">
        <form className="login-form" onSubmit={handleLogin}>
          <span className="eyebrow">CHÀO MỪNG TRỞ LẠI</span>
          <h2>Đăng nhập quản trị</h2>
          <p>Sử dụng tài khoản được cấp để bắt đầu công việc.</p>
          {(error || auth.error) && (
            <Notice error>{error || auth.error}</Notice>
          )}
          <Field label="Email">
            <input
              aria-label="Email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              placeholder="Email của bạn"
            />
          </Field>
          <Field label="Mật khẩu">
            <div className="password-field">
              {" "}
              <input
                aria-label="Mật khẩu"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                placeholder="Nhập mật khẩu"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                title={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                <Icon name={show ? "eyeOff" : "eye"} size={17} />
              </button>
            </div>
          </Field>
          <Button className="login-submit" type="submit" busy={busy}>
            Đăng nhập
          </Button>
          <div className="login-help">
            <Icon name="info" size={17} />
            <span>
              Liên hệ người quản lý hệ thống nếu bạn cần cấp lại tài khoản.
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
function LinkBrand() {
  return (
    <div className="brand">
      <img src={logo} alt="VNA Group" />
      <div>
        <strong>VNA ĐẮK SONG</strong>
        <span>QUẢN TRỊ VIÊN</span>
      </div>
    </div>
  );
}
