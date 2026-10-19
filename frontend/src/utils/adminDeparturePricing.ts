import type { Departure, Tour } from "../types/admin";

// Keep both fares from the same departure; a cheaper child fare from another
// departure must not be combined with the tour's advertised adult fare.
export function suggestedDeparturePrices(
  tour: Tour | undefined,
  departures: Departure[],
  now = Date.now(),
) {
  let source: Departure | undefined;
  for (const departure of departures) {
    if (
      departure.tourId !== tour?._id ||
      departure.status !== "open" ||
      !(Date.parse(departure.departureAt) > now) ||
      !(Date.parse(departure.bookingDeadline) > now)
    ) continue;
    if (
      !source || departure.adultPrice < source.adultPrice ||
      (departure.adultPrice === source.adultPrice &&
        Date.parse(departure.departureAt) < Date.parse(source.departureAt))
    ) source = departure;
  }
  return {
    adultPrice: source?.adultPrice ?? tour?.referencePrice ?? null,
    childPrice: source?.childPrice ?? null,
    source,
  };
}
