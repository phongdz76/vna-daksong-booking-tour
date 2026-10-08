import { useEffect, useRef } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import BottomNavigation from "./components/layout/BottomNavigation";
import LoginPage from "./pages/Auth/LoginPage";
import HomePage from "./pages/User/HomePage";
import ExplorePage from "./pages/User/ExplorePage";
import ToursPage from "./pages/User/tours/ToursPage";
import TourDetailPage from "./pages/User/tours/TourDetailPage";
import DestinationDetailPage from "./pages/User/destinations/DestinationDetailPage";
import SelectDeparturePage from "./pages/User/booking/SelectDeparturePage";
import ReviewBookingPage from "./pages/User/booking/ReviewBookingPage";
import BookingSuccessPage from "./pages/User/booking/BookingSuccessPage";
import MyBookingsPage from "./pages/User/booking/MyBookingsPage";
import BookingDetailPage from "./pages/User/booking/BookingDetailPage";
import AccountPage from "./pages/User/account/AccountPage";
import ArticleDetailPage from "./pages/User/ArticleDetailPage";
import { usePreview } from "./context/PreviewContext";
import Header from "./components/layout/Header";
import AppLink from "./components/common/AppLink";
import { EmptyState } from "./components/common/States";

export default function MainApp() {
  const location = useLocation();
  const { isPreview } = usePreview();
  const content = useRef<HTMLDivElement>(null);
  const showTabs = [
    "/",
    "/explore",
    "/tours",
    "/my-bookings",
    "/account",
  ].includes(location.pathname);
  useEffect(() => {
    content.current?.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <div className={`app-container ${isPreview ? "preview-mode" : ""}`}>
      {isPreview && (
        <div className="preview-banner">
          <span>Bản xem mẫu · Không gửi đơn thật</span>
          <a href="/">Dùng API thật ↗</a>
        </div>
      )}
      <div className="page-content" ref={content}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/articles/:id" element={<ArticleDetailPage />} />
          <Route path="/tours" element={<ToursPage />} />
          <Route path="/tours/:id" element={<TourDetailPage />} />
          <Route path="/destinations/:id" element={<DestinationDetailPage />} />
          <Route path="/booking/:id/select" element={<SelectDeparturePage />} />
          <Route path="/booking/:id/review" element={<ReviewBookingPage />} />
          <Route path="/booking/success/:id" element={<BookingSuccessPage />} />
          <Route path="/my-bookings" element={<MyBookingsPage />} />
          <Route path="/my-bookings/:id" element={<BookingDetailPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="*"
            element={
              <>
                <Header title="VNA Đắk Song" back />
                <EmptyState
                  title="Không tìm thấy trang"
                  description="Quay về trang chủ để tiếp tục khám phá."
                >
                  <AppLink to="/" className="button button-primary">
                    Về trang chủ
                  </AppLink>
                </EmptyState>
              </>
            }
          />
        </Routes>
      </div>
      {showTabs && <BottomNavigation />}
    </div>
  );
}
