import { App, ZMPRouter, SnackbarProvider } from "zmp-ui";
import { BrowserRouter } from "react-router-dom";
import "zmp-ui/zaui.css";
import "./assets/fonts/inter.css";
import "./index.css";
import "./styles/stitch.css";
import "./styles/account.css";
import "./styles/reviews.css";
import "./styles/booking-detail.css";
import "./styles/booking-success.css";
import "./styles/explore.css";
import "./styles/notifications.css";
import "./styles/coupons.css";
import "./styles/zalo-layout.css";
import "./styles/gallery.css";
import NotificationProvider from "./context/NotificationContext";
import MainApp from "./App";
import AuthProvider from "./context/AuthContext";
import PreviewProvider from "./context/PreviewContext";
import BookingDraftProvider from "./context/BookingDraftContext";
import { isZalo } from "./utils/zalo";

// ZMPRouter supplies the /zapps/:id base inside Zalo. A browser preview has no app ID.
const Router = isZalo ? ZMPRouter : BrowserRouter;

export default function UserApp() {
  return (
    <App>
      <SnackbarProvider>
        <PreviewProvider>
          <AuthProvider>
            <BookingDraftProvider>
              <NotificationProvider>
                <Router>
                  <MainApp />
                </Router>
              </NotificationProvider>
            </BookingDraftProvider>
          </AuthProvider>
        </PreviewProvider>
      </SnackbarProvider>
    </App>
  );
}
