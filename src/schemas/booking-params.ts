import {
  createSearchParamsCache,
  parseAsString,
  parseAsStringEnum
} from "nuqs/server";

export const tripTypeValues = ["one-way", "round-trip", "same-day-return"] as const;
export type TripType = (typeof tripTypeValues)[number];

/** Trip types that need a return ferry. */
export const isReturnTripType = (tripType: string | null | undefined): boolean =>
  tripType === "round-trip" || tripType === "same-day-return";

export const TRIP_TYPE_LABELS: Record<TripType, string> = {
  "one-way": "One Way",
  "round-trip": "Round Trip",
  "same-day-return": "Same Day Return",
};

/** URL value -> booking API enum. */
export const toBookingTripType = (
  tripType: string | null | undefined
): "ONE_WAY" | "ROUND_TRIP" | "SAME_DAY_RETURN" =>
  tripType === "round-trip" ? "ROUND_TRIP" : tripType === "same-day-return" ? "SAME_DAY_RETURN" : "ONE_WAY";

/** Booking API enum -> label. */
export const bookingTripTypeLabel = (tripType: string | null | undefined): string =>
  tripType === "ROUND_TRIP" ? "Round Trip" : tripType === "SAME_DAY_RETURN" ? "Same Day Return" : "One Way";

export const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const bookingSearchParamsParsers = {
  tripType: parseAsStringEnum<TripType>([...tripTypeValues]).withDefault("one-way"),
  from: parseAsString.withDefault("Blowing Point, Anguilla"),
  to: parseAsString.withDefault("Marigot, Saint Martin"),
  departureDate: parseAsString.withDefault(getTodayDateString()),
  returnDate: parseAsString.withDefault(""),
  passengers: parseAsString.withDefault("1 Passenger"),
  adults: parseAsString.withDefault("1"),
  children: parseAsString.withDefault("0"),
  bookingRef: parseAsString.withDefault("")
};

export const bookingSearchParamsCache = createSearchParamsCache(bookingSearchParamsParsers);

/**
 * Helper to reliably parse numeric passenger count from strings like "1 Passenger", "2 Passengers", "4"
 */
export function extractPassengerCount(passengersStr: string | null | undefined): number {
  if (!passengersStr) return 1;
  const match = passengersStr.match(/\d+/);
  const count = match ? parseInt(match[0], 10) : 1;
  return isNaN(count) || count < 1 ? 1 : count;
}
