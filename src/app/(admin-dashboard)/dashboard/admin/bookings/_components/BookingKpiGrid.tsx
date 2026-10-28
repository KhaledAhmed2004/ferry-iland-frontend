import * as React from "react";
import { AlertCircle, CalendarCheck, CheckCircle2, Ticket } from "lucide-react";
import { StatCard } from "@/widgets";

interface BookingKpiGridProps {
  totalCount: number;
  confirmedCount: number;
  checkedInCount: number;
  cancelledCount: number;
  isLoading: boolean;
}

export function BookingKpiGrid({
  totalCount,
  confirmedCount,
  checkedInCount,
  cancelledCount,
  isLoading
}: BookingKpiGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="border-border/60 bg-muted/20 h-28 animate-pulse rounded-xl border p-4"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Bookings"
        value={totalCount}
        description="Platform recorded"
        icon={CalendarCheck}
        variant="blue"
      />

      <StatCard
        title="Confirmed"
        value={`${confirmedCount} Active`}
        description="Tickets confirmed"
        icon={CheckCircle2}
        variant="emerald"
        colorValue
      />

      <StatCard
        title="Checked In"
        value={`${checkedInCount} Boarded`}
        description="Boarding passes scanned"
        icon={Ticket}
        variant="indigo"
        colorValue
      />

      <StatCard
        title="Cancelled"
        value={`${cancelledCount} Cancelled`}
        description="Released seats"
        icon={AlertCircle}
        variant="rose"
        colorValue
      />
    </div>
  );
}
