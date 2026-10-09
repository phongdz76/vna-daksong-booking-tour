import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "../../context/AdminAuthContext";
import { ToastProvider } from "../../context/AdminToastContext";
import "../../assets/fonts/inter.css";
import "../../styles/admin.css";
import AdminLayout from "../../components/layout/AdminLayout";
import { Button, Empty, Loading, Notice } from "../../components/admin/ui";
import LoginPage from "./LoginPage";
import DashboardPage from "./DashboardPage";
import BookingsPage from "./BookingsPage";
import ContentPage from "./ContentPage";
import DeparturesPage from "./DeparturesPage";
import CouponsPage from "./CouponsPage";

function RequireAdmin() {
  const auth = useAuth();
  const location = useLocation();
  if (auth.checking)
    return (
      <div className="full-page">
        <Loading />
      </div>
    );
  if (auth.error && !auth.user && sessionStorage.getItem("vna-admin-session"))
    return (
      <div className="full-page">
        <Notice error>{auth.error}</Notice>
        <div className="actions">
          <Button onClick={auth.retry}>Thử lại</Button>
          <Button variant="secondary" onClick={auth.logout}>
            Về đăng nhập
          </Button>
        </div>
      </div>
    );
  if (!auth.user)
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  return <Outlet />;
}
export default function AdminApp() {
  return (
    <div className="vna-admin">
      <BrowserRouter basename="/admin">
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<RequireAdmin />}>
                <Route element={<AdminLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="bookings" element={<BookingsPage />} />
                  <Route path="bookings/:id" element={<BookingsPage />} />
                  {(["tours", "destinations", "articles"] as const).map(
                    (resource) => (
                      <Route key={resource} path={resource}>
                        <Route
                          index
                          element={
                            <ContentPage key={resource} resource={resource} />
                          }
                        />
                        <Route
                          path="new"
                          element={
                            <ContentPage key={resource} resource={resource} />
                          }
                        />
                        <Route
                          path=":id/edit"
                          element={
                            <ContentPage key={resource} resource={resource} />
                          }
                        />
                      </Route>
                    ),
                  )}
                  <Route path="departures" element={<DeparturesPage />} />
                  <Route path="coupons" element={<CouponsPage />} />
                  <Route
                    path="*"
                    element={
                      <Empty
                        title="Không tìm thấy trang"
                        description="Chọn một mục trong menu để tiếp tục công việc."
                      />
                    }
                  />
                </Route>
              </Route>
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}
