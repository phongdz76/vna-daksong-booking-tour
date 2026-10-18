import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { initializeZaloSdk, isZalo } from "./utils/zalo";

const UserApp = lazy(async () => {
  await initializeZaloSdk();
  return import("./UserApp");
});
const AdminApp = lazy(() => import("./pages/Admin/AdminApp"));
const isAdmin = !isZalo && /^\/admin(?:\/|$)/.test(window.location.pathname);
if (isZalo) document.documentElement.dataset.vnaZalo = "true";
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
