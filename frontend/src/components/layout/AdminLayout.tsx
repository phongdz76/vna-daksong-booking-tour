import logo from "../../assets/images/0bbfd724.png";
import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useOutletContext,
} from "react-router-dom";
import { useAuth } from "../../context/AdminAuthContext";
import { useQuery } from "../../hooks/useAdminQuery";
import type { Dashboard } from "../../types/admin";
import { changed } from "../../utils/adminApi";
import { date } from "../../utils/adminPresentation";
import Icon from "../admin/Icon";

const groups = [
  {
    title: "TỔNG QUAN",
    items: [{ to: "/", label: "Tổng quan", icon: "dashboard" }],
  },
  {
    title: "ĐƠN ĐẶT TOUR",
    items: [{ to: "/bookings", label: "Danh sách đơn đặt", icon: "booking" }],
  },
  {
    title: "TOUR & LỊCH KHỞI HÀNH",
    items: [
      { to: "/tours", label: "Quản lý tour", icon: "tour" },
      { to: "/departures", label: "Chuyến khởi hành", icon: "calendar" },
    ],
  },
  {
    title: "NỘI DUNG",
    items: [
      { to: "/destinations", label: "Điểm đến", icon: "pin" },
      { to: "/articles", label: "Cẩm nang", icon: "article" },
    ],
  },
  {
    title: "MÃ GIẢM GIÁ",
    items: [{ to: "/coupons", label: "Mã giảm giá", icon: "coupon" }],
  },
];
type Overview = ReturnType<typeof useQuery<Dashboard>>;
export function useOverview() {
  return useOutletContext<Overview>();
}
export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const overview = useQuery<Dashboard>("/bookings/dashboard-data");
  const current = groups
    .flatMap((g) => g.items)
    .find((i) =>
      i.to === "/"
        ? location.pathname === "/"
        : location.pathname.startsWith(i.to),
    );
  const pending = overview.data?.bookings.pending_confirmation || 0;
  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
    document.title = `${current?.label || "Quản trị"} · VNA Đắk Song`;
  }, [location.pathname, current?.label]);
  const initials = (user?.name || "VNA")
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
  return (
    <div className="admin-shell">
      {open && (
        <button
          className="sidebar-backdrop"
          aria-label="Đóng menu"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <Link className="brand" to="/">
          <img src={logo} alt="VNA Group" />
          <div>
            <strong>VNA ĐẮK SONG</strong>
            <span>QUẢN TRỊ VIÊN</span>
          </div>
        </Link>
        <nav aria-label="Điều hướng chính">
          {groups.map((group) => (
            <div className="nav-group" key={group.title}>
              <div className="nav-group-title">{group.title}</div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? "active" : ""}`
                  }
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                  {item.to === "/bookings" && pending > 0 && (
                    <span className="nav-count">{pending} chờ</span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <Icon name="leaf" size={18} />
          <span>
            VNA Đắk Song<small>Du lịch & trải nghiệm địa phương</small>
          </span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button menu-toggle"
              aria-label="Mở menu"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              <Icon name="menu" />
            </button>
            <Link to="/" aria-label="Trang chủ">
              <Icon name="home" size={17} />
            </Link>
            <span className="breadcrumb-root">Trang chủ</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{current?.label || "Quản trị"}</strong>
          </div>
          <div className="topbar-actions">
            <button
              className="refresh-control"
              onClick={changed}
              title="Làm mới dữ liệu"
            >
              <Icon name="refresh" size={16} />
              <span>
                {overview.loading
                  ? "Đang cập nhật…"
                  : overview.updatedAt
                    ? `Cập nhật ${date(overview.updatedAt, true)}`
                    : "Làm mới dữ liệu"}
              </span>
            </button>
            <div className="profile">
              <span className="avatar">{initials}</span>
              <div>
                <strong>{user?.name}</strong>
                <small>Quản trị viên</small>
              </div>
            </div>
            <button
              className="logout-button"
              type="button"
              aria-label="Đăng xuất"
              title="Đăng xuất"
              onClick={logout}
            >
              <Icon name="logout" size={17} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </header>
        <main className="main-content">
          <Outlet context={overview} />
          <footer className="page-footer">
            <span>VNA Đắk Song · Cổng quản trị</span>
            <span>Thời gian hiển thị theo giờ Việt Nam</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
