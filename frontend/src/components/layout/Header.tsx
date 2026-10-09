import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/images/0bbfd724.png";
import AppLink, { useAppNavigate } from "../common/AppLink";
import Icon from "../common/Icon";
import AccountAvatar from "../common/AccountAvatar";
import NotificationBell from "./NotificationBell";

export default function Header({
  title,
  back = false,
  fallback = "/",
}: {
  title?: string;
  back?: boolean;
  fallback?: string;
}) {
  const navigate = useAppNavigate();
  const { user } = useAuth();
  const [message, setMessage] = useState("");

  async function handleShare() {
    try {
      if (navigator.share)
        await navigator.share({
          title: document.title,
          url: window.location.href,
        });
      else {
        await navigator.clipboard.writeText(window.location.href);
        setMessage("Đã sao chép liên kết.");
      }
    } catch {
      setMessage("Bạn có thể sao chép liên kết trên thanh địa chỉ để chia sẻ.");
    }
  }
  return (
    <header className="app-header">
      {back && (
        <button
          className="icon-button"
          aria-label="Quay lại"
          onClick={() =>
            window.history.state?.idx > 0 ? navigate(-1) : navigate(fallback)
          }
        >
          <Icon name="back" />
        </button>
      )}
      <img className="brand-logo" src={logo} alt="VNA Group" />
      <div className="header-title">
        {title ? <span>{title}</span> : <span>Trang chủ</span>}
      </div>
      {back ? (
        <button
          className="icon-button header-action"
          aria-label="Chia sẻ"
          onClick={handleShare}
        >
          <Icon name="share" size={20} />
        </button>
      ) : (
        <NotificationBell />
      )}
      <AppLink to="/account" className="avatar-button" aria-label="Tài khoản">
        <AccountAvatar src={user?.avatar} />
      </AppLink>
      {message && (
        <button className="header-message" onClick={() => setMessage("")}>
          {message}
        </button>
      )}
    </header>
  );
}
