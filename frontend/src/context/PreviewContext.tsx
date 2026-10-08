import { createContext, useContext, useState, type ReactNode } from "react";
import type { Booking } from "../types/api";

const PreviewContext = createContext<{
  isPreview: boolean;
  previewBooking: Booking | null;
  setPreviewBooking: (booking: Booking) => void;
}>({ isPreview: false, previewBooking: null, setPreviewBooking: () => {} });

export const usePreview = () => useContext(PreviewContext);
export default function PreviewProvider({ children }: { children: ReactNode }) {
  const [isPreview] = useState(
    () =>
      import.meta.env.DEV &&
      new URLSearchParams(window.location.search).get("preview") === "1",
  );
  const [previewBooking, setPreviewBooking] = useState<Booking | null>(null);
  return (
    <PreviewContext.Provider
      value={{ isPreview, previewBooking, setPreviewBooking }}
    >
      {children}
    </PreviewContext.Provider>
  );
}
