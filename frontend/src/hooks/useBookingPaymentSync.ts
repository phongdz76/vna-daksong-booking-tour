import { useCallback, useEffect, useRef, useState } from "react";
import { usePreview } from "../context/PreviewContext";
import { api, API_PATHS, errorMessage } from "../utils/api";
import type { Booking, BookingDetailResponse } from "../types/api";

// Only server-verified Booking.paymentStatus changes the UI. Redirect query parameters are ignored.
export default function useBookingPaymentSync(
  bookings: Booking[] | undefined,
  onUpdate: () => Promise<unknown>,
) {
  const { isPreview } = usePreview();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const latestBookings = useRef(bookings);
  const refreshPage = useRef(onUpdate);
  const checker = useRef<() => Promise<void>>(async () => {});
  latestBookings.current = bookings;
  refreshPage.current = onUpdate;
  const pendingKey = (bookings || [])
    .filter(
      (booking) =>
        booking.paymentMethod === "zalopay" &&
        booking.paymentStatus === "unpaid",
    )
    .map((booking) => booking._id + ":" + booking.status)
    .sort()
    .join("|");
  const checkNow = useCallback(() => checker.current(), []);

  useEffect(() => {
    setError("");
    setChecking(false);
    checker.current = async () => {};
    if (isPreview || !pendingKey) return;
    const controller = new AbortController();
    let running: Promise<void> | null = null;

    function check(): Promise<void> {
      if (running) return running;
      if (controller.signal.aborted || document.visibilityState === "hidden")
        return Promise.resolve();
      setChecking(true);
      const seeds = (latestBookings.current || []).filter(
        (booking) =>
          booking.paymentMethod === "zalopay" &&
          booking.paymentStatus === "unpaid",
      );
      running = (async () => {
        const results = await Promise.allSettled(
          seeds.map(async (seed) => {
            const path = API_PATHS.BOOKINGS.GET_BY_ID(seed._id);
            let detail = (
              await api.get<BookingDetailResponse>(path, {
                signal: controller.signal,
              })
            ).data;
            const transaction = detail.payments?.find((payment) =>
              ["pending", "success"].includes(payment.status),
            );
            let queryError: unknown;
            if (detail.data.paymentStatus === "unpaid" && transaction) {
              try {
                await api.post(
                  API_PATHS.PAYMENTS.ZALOPAY_QUERY(transaction.appTransId),
                  {},
                  { signal: controller.signal },
                );
              } catch (error) {
                queryError = error;
              }
              // A webhook can complete even if querying the provider failed. Always read the saved state.
              detail = (
                await api.get<BookingDetailResponse>(path, {
                  signal: controller.signal,
                })
              ).data;
            }
            const changed =
              detail.data.paymentStatus !== seed.paymentStatus ||
              detail.data.status !== seed.status;
            if (queryError && !changed) throw queryError;
            return changed;
          }),
        );
        if (controller.signal.aborted) return;
        if (
          results.some(
            (result) => result.status === "fulfilled" && result.value,
          )
        ) {
          await refreshPage.current();
          window.dispatchEvent(new Event("vna-booking-updated"));
        }
        if (controller.signal.aborted) return;
        const failure = results.find((result) => result.status === "rejected");
        setError(
          failure?.status === "rejected" ? errorMessage(failure.reason) : "",
        );
      })().finally(() => {
        running = null;
        if (!controller.signal.aborted) setChecking(false);
      });
      return running;
    }

    checker.current = check;
    void check();
    const interval = window.setInterval(() => {
      void check();
    }, 5000);
    const resume = () => {
      if (document.visibilityState !== "hidden") void check();
    };
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [isPreview, pendingKey]);

  return { checking, error, checkNow };
}
