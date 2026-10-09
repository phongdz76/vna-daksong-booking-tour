import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";

const UserApp = lazy(() => import("./UserApp"));
const AdminApp = lazy(() => import("./pages/Admin/AdminApp"));
const isAdmin =
  !(window as Window & { APP_ID?: string }).APP_ID &&
  /^\/admin(?:\/|$)/.test(window.location.pathname);
if (isAdmin) document.documentElement.dataset.vnaAdmin = "true";

createRoot(document.getElementById("app")!).render(
  <React.StrictMode>
    <Suspense
      fallback={
        <div role="status" style={{ padding: 32, fontFamily: "system-ui" }}>
          Đang mở VNA Đắk Song…
        </div>
      }
    >
      {isAdmin ? <AdminApp /> : <UserApp />}
    </Suspense>
  </React.StrictMode>,
);
