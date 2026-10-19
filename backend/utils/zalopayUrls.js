function absoluteUrl(value, allowLocalHttp = false) {
  try {
    const url = new URL(value);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (!local && !url.hostname.includes(".")) return null;
    if (url.username || url.password || (url.protocol !== "https:" && !(allowLocalHttp && local && url.protocol === "http:"))) return null;
    return url;
  } catch { return null; }
}

export function paymentReturnUrl(bookingId) {
  const base = absoluteUrl(process.env.CLIENT_URL, true);
  if (!base || base.search || base.hash) throw new Error("PAYMENT_URL_NOT_CONFIGURED");
  base.pathname = base.pathname.replace(/\/$/, "") + "/";
  return new URL("booking/success/" + encodeURIComponent(bookingId), base).href;
}

export function paymentCallbackUrl() {
  if (!process.env.ZALOPAY_CALLBACK_URL) return undefined;
  const url = absoluteUrl(process.env.ZALOPAY_CALLBACK_URL);
  if (!url) throw new Error("PAYMENT_URL_NOT_CONFIGURED");
  return url.href;
}

export function validCheckoutUrl(value) {
  return typeof value === "string" && Boolean(absoluteUrl(value));
}
