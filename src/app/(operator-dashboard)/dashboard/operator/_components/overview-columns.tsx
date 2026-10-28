import React from "react";
import Link from "next/link";
import { format, isValid, parseISO } from "date-fns";
import { MapPin, Ship } from "lucide-react";

import type { IOperatorOverviewBooking, IOperatorOverviewDeparture } from "@/types";
import { Button } from "@/ui";
import { StatusBadge, type TableColumn } from "@/widgets";

// Safe Departure Time Formatter
export const formatDepartureTime = (timeValue?: string | Date) => {
  if (!timeValue) return "N/A";
  try {
    const parsed = typeof timeValue === "string" ? parseISO(timeValue) : new Date(timeValue);
    if (isValid(parsed)) {
      return format(parsed, "hh:mm a");
    }
    return String(timeValue);
  } catch {
    return String(timeValue);
  }
};

// Safe Status Formatter
export const formatStatusName = (status?: string, fallback = "Confirmed") => {
  if (!status) return fallback;
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

// Today's Ferry Trips Columns
export const scheduleColumns: TableColumn<IOperatorOverviewDeparture>[] = [
  {
    header: "FERRY",
    cell: (item) => (
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Ship className="h-4 w-4" />
        </div>
        <div>
          <div className="text-foreground text-sm font-semibold">
            {item.ferry?.name || "Ferry"}
          </div>
          {item.ferry?.registration && (
            <div className="text-muted-foreground font-mono text-[11px]">
              {item.ferry.registration}
            </div>
          )}
        </div>
      </div>
    )
  },
  {
    header: "ROUTE",
    cell: (item) => {
      const depPort = item.route?.departurePort?.name || "Origin";
      const destPort = item.route?.destinationPort?.name || "Destination";
      return (
        <div className="text-foreground flex items-center gap-1.5 text-xs font-medium">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>
            {depPort} <span className="text-muted-foreground">→</span> {destPort}
          </span>
        </div>
      );
    }
  },
  {
    header: "SCHEDULED TIME",
    cell: (item) => (
      <div>
        <div className="text-foreground font-mono text-xs font-bold">
          {formatDepartureTime(item.departureTime)}
        </div>
        {item.arrivalTime && (
          <div className="text-muted-foreground text-[11px]">
            Arrival: <span className="font-mono font-medium">{formatDepartureTime(item.arrivalTime)}</span>
          </div>
        )}
      </div>
    )
  },
  {
    header: "CAPACITY",
    className: "text-xs",
    cell: (item) => {
      const capacity = item.capacity ?? item.ferry?.capacity ?? 0;
      const booked = item.bookedSeats ?? 0;
      const pct = capacity > 0 ? Math.min(Math.round((booked / capacity) * 100), 100) : 0;
      return (
        <div className="flex min-w-[100px] flex-col gap-1">
          <div className="flex justify-between font-mono text-[11px]">
            <span className="text-foreground font-semibold">
              {booked}/{capacity > 0 ? capacity : "—"}
            </span>
            <span className="text-muted-foreground">{pct}%</span>
          </div>
          <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      );
    }
  },
  {
    header: "STATUS",
    cell: (item) => <StatusBadge status={formatStatusName(item.status, "On Time")} />
  },
  {
    header: "ACTION",
    align: "right",
    headerClassName: "text-right",
    cell: (item) => (
      <Button
        variant="outline"
        size="sm"
        className="h-8 border-emerald-200 px-3 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
        asChild
      >
        <Link
          href={
            item.id
              ? `/dashboard/operator/manifest?tripId=${item.id}`
              : "/dashboard/operator/manifest"
          }
        >
          Manifest
        </Link>
      </Button>
    )
  }
];

// Recent Bookings Columns
export const bookingColumns: TableColumn<IOperatorOverviewBooking>[] = [
  {
    header: "REFERENCE",
    cell: (item) => (
      <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
        {item.bookingReference || "N/A"}
      </span>
    )
  },
  {
    header: "PASSENGER",
    cell: (item) => (
      <div>
        <div className="text-foreground text-sm font-semibold">{item.passenger || "Guest"}</div>
        {item.email && (
          <div className="text-muted-foreground font-mono text-[10px]">{item.email}</div>
        )}
      </div>
    )
  },
  {
    header: "ROUTE",
    cell: (item) => (
      <span className="text-muted-foreground text-xs font-medium">
        {item.route || "Maritime Route"}
      </span>
    )
  },
  {
    header: "DEPARTURE",
    cell: (item) => (
      <span className="text-muted-foreground font-mono text-[11px]">
        {formatDepartureTime(item.departureTime)}
      </span>
    )
  },
  {
    header: "PAX",
    align: "center",
    cell: (item) => (
      <span className="text-foreground text-center text-xs font-semibold">{item.pax ?? 1}</span>
    )
  },
  {
    header: "AMOUNT",
    cell: (item) => (
      <span className="text-foreground font-bold">${(item.amount ?? 0).toFixed(2)}</span>
    )
  },
  {
    header: "STATUS",
    cell: (item) => <StatusBadge status={formatStatusName(item.status, "Confirmed")} />
  }
];
