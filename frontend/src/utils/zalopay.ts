import { api, API_PATHS, errorMessage } from "./api";
import { isZalo } from "./zalo";
import type { BookingDetailResponse } from "../types/api";

// Both first payment and retry use the server's reconciled checkout link.
async function createCheckout(bookingId: string) {
  const { data } = await api.post<{ order_url?: string; appTransId?: string }>("/payments/zalopay/create", { bookingId });
  let url: URL;
  try { url = new URL(data.order_url || ""); }
  catch { throw new Error("ZaloPay chưa trả về liên kết thanh toán hợp lệ. Vui lòng kiểm tra lại trạng thái."); }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("Liên kết thanh toán ZaloPay không hợp lệ.");
  }
  return { url: url.href, appTransId: data.appTransId };
}

export async function zaloPayCheckoutUrl(bookingId: string) {
  return (await createCheckout(bookingId)).url;
}

// Reserve synchronously in the click handler, before booking/API requests.
// Retain the app and its session while the bank redirects through external sites.
export function reserveZaloPayWindow(): Window | null {
  if (isZalo) return null;
  try {
    const popup = window.open("about:blank", "_blank", "popup,width=480,height=780");
    if (popup) {
      popup.document.title = "Thanh toán ZaloPay";
      popup.document.body.textContent = "Đang mở cổng thanh toán ZaloPay…";
    }
    return popup;
  } catch { return null; }
}

class CheckoutError extends Error {}
export function zaloPayErrorMessage(error: unknown) {
  return error instanceof CheckoutError ? error.message : errorMessage(error);
}

function returnToBooking(popup: Window, path: string) {
  popup.close();
  // Some browsers keep a window open after bank navigation. Return that window too.
  if (!popup.closed) {
    try { popup.location.replace(new URL(path, window.location.origin).href); } catch { /* It may have just closed. */ }
  }
  window.location.replace(path);
}

export async function openZaloPayCheckout(bookingId: string, popup: Window | null, onOpened?: () => void) {
  let opened = false;
  try {
    const checkout = await createCheckout(bookingId);
    // Same-tab fallback retains the provider's configured return URL (including Zalo).
    if (!popup || popup.closed || !checkout.appTransId) {
      popup?.close();
      onOpened?.();
      window.location.assign(checkout.url);
      return;
    }
    popup.location.replace(checkout.url);
    opened = true;
    onOpened?.();
    const deadline = Date.now() + 15 * 60 * 1000;
    while (Date.now() < deadline) {
      let query: { status?: string; message?: string } | undefined;
      try {
        query = (await api.post(API_PATHS.PAYMENTS.ZALOPAY_QUERY(checkout.appTransId), {})).data;
      } catch { /* A callback may still have recorded payment. Read the booking as well. */ }
      try {
        const { data } = await api.get<BookingDetailResponse>(API_PATHS.BOOKINGS.GET_BY_ID(bookingId));
        if (data.data.paymentStatus === "paid") {
          returnToBooking(popup, "/booking/success/" + encodeURIComponent(bookingId));
          return;
        }
        if (["refund_pending", "refunded"].includes(data.data.paymentStatus)) {
          returnToBooking(popup, "/my-bookings/" + encodeURIComponent(bookingId));
          return;
        }
      } catch { /* Preserve an unknown payment until the next reconciliation. */ }
      if (query?.status === "failed") {
        throw new CheckoutError(query.message || "Lần thanh toán chưa thành công. Bạn có thể thanh toán lại.");
      }
      if (popup.closed) throw new CheckoutError("Bạn đã đóng trang thanh toán. Hãy kiểm tra lại trạng thái đơn trước khi thanh toán lại.");
      await new Promise(resolve => window.setTimeout(resolve, 3000));
    }
    throw new CheckoutError("Chưa xác định được kết quả thanh toán. Hãy kiểm tra lại trạng thái đơn.");
  } catch (error) {
    if (!opened) popup?.close();
    throw error;
  }
}
