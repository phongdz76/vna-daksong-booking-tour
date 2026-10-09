import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Booking, Departure, Quote } from "../types/api";

export interface BookingPayload {
  quoteToken: string;
  contact: { name: string; phone: string; email: string };
  note: string;
  couponCode: string;
  paymentMethod: Booking["paymentMethod"];
}
export interface BookingDraft {
  tourId: string;
  departure: Departure;
  adults: number;
  children: number;
  quote: Quote;
  contact: { name: string; phone: string; email: string };
  note: string;
}
const BookingDraftContext = createContext<{
  draft: BookingDraft | null;
  setDraft: Dispatch<SetStateAction<BookingDraft | null>>;
  attempt: { key: string; payload: BookingPayload } | null;
  setAttempt: (
    attempt: { key: string; payload: BookingPayload } | null,
  ) => void;
}>({ draft: null, setDraft: () => {}, attempt: null, setAttempt: () => {} });

export const useBookingDraft = () => useContext(BookingDraftContext);
export default function BookingDraftProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [attempt, setAttempt] = useState<{
    key: string;
    payload: BookingPayload;
  } | null>(null);
  return (
    <BookingDraftContext.Provider
      value={{ draft, setDraft, attempt, setAttempt }}
    >
      {children}
    </BookingDraftContext.Provider>
  );
}
