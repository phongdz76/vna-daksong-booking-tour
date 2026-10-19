import { api } from "./api";

// Initial checkout and retries both use the server's reconciled payment link.
export async function zaloPayCheckoutUrl(bookingId: string) {
  const { data } = await api.post<{ order_url?: string }>("/payments/zalopay/create", { bookingId });
  let url: URL;
  try { url = new URL(data.order_url || ""); }
  catch { throw new Error("ZaloPay chưa trả về liên kết thanh toán hợp lệ. Vui lòng kiểm tra lại trạng thái."); }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("Liên kết thanh toán ZaloPay không hợp lệ.");
  }
  return url.href;
}

export async function openZaloPayCheckout(bookingId: string, onOpened?: () => void) {
  const url = await zaloPayCheckoutUrl(bookingId);
  onOpened?.();
  // ZaloPay returns this tab to the booking through embed_data.redirecturl.
  window.location.assign(url);
}
