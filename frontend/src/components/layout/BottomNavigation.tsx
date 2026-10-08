import { useLocation } from "react-router-dom";
import AppLink from "../common/AppLink";
import Icon from "../common/Icon";

export default function BottomNavigation() {
  const location = useLocation();
  const tabs = [
    { path: "/", label: "Trang chủ", icon: "home" },
    { path: "/explore", label: "Khám phá", icon: "compass" },
    { path: "/tours", label: "Tour", icon: "ticket" },
    { path: "/my-bookings", label: "Đơn hàng", icon: "orders" },
    { path: "/account", label: "Tài khoản", icon: "user" },
  ];
  return (
    <nav className="bottom-nav" aria-label="Điều hướng chính">
      {tabs.map((tab) => (
        <AppLink
          key={tab.path}
          to={tab.path}
          className={`nav-item ${location.pathname === tab.path ? "active" : ""}`}
          aria-current={location.pathname === tab.path ? "page" : undefined}
        >
          <Icon name={tab.icon} />
          <span>{tab.label}</span>
          <i />
        </AppLink>
      ))}
    </nav>
  );
}
