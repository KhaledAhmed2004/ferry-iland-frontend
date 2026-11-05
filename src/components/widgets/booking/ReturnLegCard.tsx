import { Ship } from "lucide-react";

import { formatTripDate, formatTripTime } from "@/hooks/use-trip-legs";
import { bookingTripTypeLabel } from "@/schemas/booking-params";
import type { IBookingReturnSchedule } from "@/types";

interface ReturnLegCardProps {
  tripType?: string | null;
  returnSchedule?: IBookingReturnSchedule | null;
}

/** Return ferry of a Round Trip / Same Day Return booking. Renders nothing for one way. */
export function ReturnLegCard({ tripType, returnSchedule }: ReturnLegCardProps) {
  if (!returnSchedule) return null;

  return (
    <div className="bg-muted/40 space-y-2 rounded-xl p-4">
      <div className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-extrabold tracking-wider uppercase">
        <Ship className="h-3.5 w-3.5 text-[#003B95]" aria-hidden="true" />
        <span>Return · {bookingTripTypeLabel(tripType)}</span>
      </div>
      <div className="text-foreground text-base font-bold">
        {returnSchedule.route.departurePort.name} &rarr; {returnSchedule.route.destinationPort.name}
      </div>
      <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium">
        <span>{formatTripDate(returnSchedule.departureTime, returnSchedule.route.departurePort.timeZone)}</span>
        <span>
          {formatTripTime(returnSchedule.departureTime, returnSchedule.route.departurePort.timeZone)} &rarr; {formatTripTime(returnSchedule.arrivalTime, returnSchedule.route.destinationPort.timeZone)}
        </span>
        <span>{returnSchedule.ferry.name}</span>
        {returnSchedule.gate && <span>Gate {returnSchedule.gate}</span>}
      </div>
    </div>
  );
}
