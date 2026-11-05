"use client";

import { parseAsString, useQueryState } from "nuqs";

import { useTripDetailsQuery } from "@/hooks/use-trips";
import { formatCalendarDate, formatPortDate, formatPortTime, portLocalDate } from "@/lib/port-time";
import {
  TRIP_TYPE_LABELS,
  isReturnTripType,
  toBookingTripType,
  type TripType,
} from "@/schemas/booking-params";
import type { IFarePerPassenger, ITripDetail } from "@/types";

/**
 * Booking wizard: trip type and return ferry from the URL (`tripType`, `returnTripId`),
 * the return trip details, and the per passenger fare for this trip type.
 */
export function useTripLegs(outboundTrip: ITripDetail | null | undefined) {
  const [tripTypeParam] = useQueryState("tripType", parseAsString.withDefault("one-way"));
  const [returnTripId] = useQueryState("returnTripId", parseAsString.withDefault(""));

  // A return trip type without a chosen return ferry is treated as one way.
  const isReturn = isReturnTripType(tripTypeParam) && Boolean(returnTripId);
  const tripType: TripType = isReturn ? (tripTypeParam as TripType) : "one-way";
  const bookingTripType = toBookingTripType(tripType);

  const { data: returnTrip, isLoading: isReturnLoading } = useTripDetailsQuery(
    isReturn ? returnTripId : ""
  );

  // Round trip / same day: the bundle fare of the outbound route. null = not offered.
  const fare: IFarePerPassenger | null = !outboundTrip
    ? null
    : isReturn
      ? (outboundTrip.fares?.[bookingTripType] ?? null)
      : { adultFare: outboundTrip.adultFare, childFare: outboundTrip.childFare };

  /** Query string part that every wizard link carries forward. */
  const legQuery = `tripType=${tripType}${isReturn ? `&returnTripId=${encodeURIComponent(returnTripId)}` : ""}`;

  return {
    tripType,
    bookingTripType,
    tripTypeLabel: TRIP_TYPE_LABELS[tripType],
    isReturn,
    returnTripId: isReturn ? returnTripId : null,
    returnTrip: returnTrip ?? null,
    isReturnLoading: isReturn && isReturnLoading,
    fare,
    legQuery,
  };
}

/** "8:30 AM" at the port (spec 0003). */
export const formatTripTime = (iso: string | null | undefined, timeZone: string) =>
  iso ? formatPortTime(iso, timeZone) : "TBD";

/** "Tue, 10 Nov 2026" at the port (spec 0003). */
export const formatTripDate = (iso: string | null | undefined, timeZone: string) =>
  iso ? formatPortDate(iso, timeZone, "EEE, d MMM yyyy") : "";

/**
 * Wizard header date and times for the outbound trip, all at the trip's own ports (spec 0003).
 * Before the trip loads, the searched date (a calendar day) is shown without a day shift.
 */
export function tripDateDisplay(trip: ITripDetail | null | undefined, searchedDate: string) {
  if (trip?.departureTime) {
    return {
      effectiveDate: portLocalDate(trip.departureTime, trip.departureTimeZone),
      formattedDate: formatTripDate(trip.departureTime, trip.departureTimeZone),
      depTimeDisplay: formatTripTime(trip.departureTime, trip.departureTimeZone),
      arrTimeDisplay: formatTripTime(trip.arrivalTime, trip.arrivalTimeZone),
    };
  }
  let formattedDate = searchedDate;
  try {
    if (searchedDate) formattedDate = formatCalendarDate(searchedDate, "EEE, d MMM yyyy");
  } catch {
    formattedDate = searchedDate;
  }
  return { effectiveDate: searchedDate, formattedDate, depTimeDisplay: "TBD", arrTimeDisplay: "TBD" };
}
