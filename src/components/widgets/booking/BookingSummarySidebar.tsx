"use client";

import { formatCalendarDate } from "@/lib/port-time";
import type { ReactNode } from "react";
import { Ship } from "lucide-react";
import { Card, CardContent } from "@/ui";

interface TripSummaryData {
  price?: number;
  adultFare?: number;
  totalPrice?: number;
  departurePort?: string;
  arrivalPort?: string;
  destinationPort?: string;
  departureTime?: string;
  duration?: string;
  operator?: string;
  [key: string]: any;
}

interface BookingSummarySidebarProps {
  trip: TripSummaryData;
  passengerCount: number;
  departureDate?: string;
  actionButton?: ReactNode;
  secondaryButton?: ReactNode;
  title?: string;
  /** e.g. "Round Trip"; shown with the fare. */
  tripTypeLabel?: string;
  /** Return ferry of a round trip / same day return. */
  returnLeg?: { route: string; date: string; departureTime: string } | null;
}

export function BookingSummarySidebar({
  trip,
  passengerCount,
  departureDate = "Sat, 24 May 2026",
  actionButton,
  secondaryButton,
  title = "Your booking",
  tripTypeLabel,
  returnLeg
}: BookingSummarySidebarProps) {
  const farePerPassenger = trip.price ?? trip.adultFare ?? 25;
  // Rounded to cents: fares like $191.38 x 3 must not show float noise.
  const totalPrice =
    trip.totalPrice ?? Math.round(farePerPassenger * passengerCount * 100) / 100;
  const depPort = trip.departurePort || "Departure Port";
  const arrPort = trip.arrivalPort || trip.destinationPort || "Destination Port";

  // departureDate is a port local calendar day (YYYY-MM-DD); show it without a day shift (spec 0003).
  let displayDate = departureDate;
  try {
    if (/^d{4}-d{2}-d{2}$/.test(departureDate)) {
      displayDate = formatCalendarDate(departureDate, "EEE, d MMM yyyy");
    }
  } catch {
    displayDate = departureDate;
  }

  return (
    <Card className="border-border/80 bg-card rounded-2xl border p-6 shadow-sm">
      <CardContent className="space-y-6 p-0">
        <h3 className="text-foreground text-lg font-bold tracking-tight">{title}</h3>

        {/* Route Details */}
        <div className="space-y-3 text-xs sm:text-sm">
          <div className="flex items-start justify-between gap-2">
            <span className="text-muted-foreground font-medium">Route</span>
            <div className="text-foreground flex items-center gap-1.5 font-bold">
              <Ship className="h-3.5 w-3.5 shrink-0 text-[#003B95]" />
              <span>
                {depPort} &rarr; {arrPort}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground font-medium">Date</span>
            <span className="text-foreground font-semibold">{displayDate}</span>
          </div>

          {trip.departureTime && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground font-medium">Departure</span>
              <span className="text-foreground font-semibold">{trip.departureTime}</span>
            </div>
          )}

          {tripTypeLabel && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground font-medium">Trip type</span>
              <span className="text-foreground font-semibold">{tripTypeLabel}</span>
            </div>
          )}

          {returnLeg && (
            <div className="border-border/60 space-y-1.5 rounded-xl border p-3">
              <div className="text-muted-foreground text-[10px] font-extrabold tracking-wider uppercase">
                Return
              </div>
              <div className="text-foreground font-bold">{returnLeg.route}</div>
              <div className="text-muted-foreground text-xs">
                {returnLeg.date} · {returnLeg.departureTime}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground font-medium">Passengers</span>
            <span className="text-foreground font-semibold">
              {passengerCount} {passengerCount === 1 ? "Passenger" : "Passengers"}
            </span>
          </div>
        </div>

        <div className="bg-border/60 h-[1px] w-full" />

        {/* Pricing Breakdown */}
        <div className="space-y-2">
          <div className="text-muted-foreground flex items-center justify-between text-xs">
            <span>
              {tripTypeLabel ? `${tripTypeLabel} fare` : "Tickets"} (${farePerPassenger} &times; {passengerCount})
            </span>
            <span className="text-foreground font-medium">${totalPrice}</span>
          </div>

          <div className="flex items-baseline justify-between pt-2">
            <span className="text-foreground text-sm font-bold">Total</span>
            <span className="text-foreground text-3xl font-black tracking-tight sm:text-4xl">
              ${totalPrice}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        {(actionButton || secondaryButton) && (
          <div className="space-y-2.5 pt-2">
            {actionButton}
            {secondaryButton}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
