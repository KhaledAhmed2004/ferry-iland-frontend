import Link from "next/link";

import { StatusBadge, type TableColumn } from "@/widgets";
import type { IAdminAnalyticsOverview } from "@/types";

function formatBookingDate(dateInput: string | Date | undefined): string {
  if (!dateInput) return "";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "";
  }
}

export function getRecentBookingColumns(
  onViewBooking?: (b: IAdminAnalyticsOverview["recent"]["bookings"][number]) => void
): TableColumn<IAdminAnalyticsOverview["recent"]["bookings"][number]>[] {
  return [
    {
      header: "REFERENCE",
      cell: (b) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-foreground block font-mono text-xs font-bold tracking-tight">
            {b.reference}
          </span>
          {b.createdAt && (
            <span className="text-muted-foreground block text-[11px] font-medium">
              Booked {formatBookingDate(b.createdAt)}
            </span>
          )}
        </div>
      )
    },
    {
      header: "PASSENGER",
      cell: (b) => {
        const paxCount = b.paxCount ?? 1;
        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-foreground text-xs font-semibold">{b.leadPassengerName}</span>
              <span className="inline-flex items-center rounded bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {paxCount} {paxCount === 1 ? "Passenger" : "Passengers"}
              </span>
            </div>
            {b.leadPassengerEmail && (
              <span className="text-muted-foreground block text-[11px] font-medium" title={b.leadPassengerEmail}>
                {b.leadPassengerEmail}
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: "ROUTE & SCHEDULE",
      cell: (b) => {
        const isPast = b.departureTime ? new Date(b.departureTime).getTime() <= Date.now() : false;
        return (
          <div className="flex flex-col gap-0.5 text-xs">
            <span className="text-foreground font-medium leading-snug" title={b.route}>
              {b.route}
            </span>
            {b.departureTime && (
              <span
                className={`text-[11px] font-medium ${
                  isPast
                    ? "text-muted-foreground"
                    : "text-blue-600 dark:text-blue-400"
                }`}
              >
                Schedule: {formatBookingDate(b.departureTime)}
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: "OPERATOR & VESSEL",
      cell: (b) => (
        <div className="flex flex-col gap-0.5 text-xs">
          <span className="text-foreground font-semibold leading-snug" title={b.operatorName}>
            {b.operatorName || "Ferry Operator"}
          </span>
          {b.vessel && (
            <span className="text-muted-foreground text-[11px] font-medium">
              {b.vessel}
            </span>
          )}
        </div>
      )
    },
    {
      header: "AMOUNT",
      cell: (b) => (
        <span className="text-foreground font-mono text-xs font-extrabold">
          ${Number(b.totalAmount).toFixed(2)}
        </span>
      )
    },
    {
      header: "STATUS",
      cell: (b) => <StatusBadge status={b.status} />
    },
    {
      header: "ACTION",
      align: "right",
      headerClassName: "text-right",
      cell: (b) => {
        if (onViewBooking) {
          return (
            <button
              type="button"
              onClick={() => onViewBooking(b)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 cursor-pointer"
            >
              View
            </button>
          );
        }
        return (
          <Link
            href={`/dashboard/admin/bookings?search=${encodeURIComponent(b.reference)}`}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400"
          >
            View
          </Link>
        );
      }
    }
  ];
}

export const recentBookingColumns: TableColumn<
  IAdminAnalyticsOverview["recent"]["bookings"][number]
>[] = getRecentBookingColumns();
