import { ExternalLink, Eye } from "lucide-react";

import { formatDollars } from "@/lib/payment";
import {
  StatusBadge,
  type TableColumn,
  DataTableRowActions
} from "@/widgets";
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
      sortValue: (item) => item.reference,
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
      sortValue: (item) => item.leadPassengerName,
      className: "min-w-[170px] whitespace-normal",
      cell: (b) => {
        const paxCount = b.paxCount ?? 1;
        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-foreground text-xs font-semibold">{b.leadPassengerName}</span>
              <span className="inline-flex items-center rounded bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {paxCount} {paxCount === 1 ? "Passenger" : "Passengers"}
              </span>
            </div>
            {b.leadPassengerEmail && (
              <span className="text-muted-foreground block break-all text-[11px] font-medium" title={b.leadPassengerEmail}>
                {b.leadPassengerEmail}
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: "ROUTE & SCHEDULE",
      className: "min-w-[180px] whitespace-normal",
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
      className: "min-w-[150px] whitespace-normal",
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
      sortValue: (item) => Number(item.totalAmount),
      cell: (b) => (
        <span className="text-foreground font-mono text-xs font-extrabold">
          {formatDollars(Number(b.totalAmount))}
        </span>
      )
    },
    {
      header: "STATUS",
      sortValue: (item) => item.status,
      cell: (b) => <StatusBadge status={b.status} />
    },
    {
      header: "ACTION",
      align: "right",
      headerClassName: "text-right",
      cell: (b) => (
        <DataTableRowActions
          actions={[
            onViewBooking
              ? { label: "View details", icon: Eye, onSelect: () => onViewBooking(b) }
              : {
                  label: "View details",
                  icon: Eye,
                  href: `/dashboard/admin/bookings?search=${encodeURIComponent(b.reference)}`
                },
            {
              label: "Open in bookings",
              icon: ExternalLink,
              href: `/dashboard/admin/bookings?search=${encodeURIComponent(b.reference)}`,
              separatorBefore: true
            }
          ]}
        />
      )
    }
  ];
}

export const recentBookingColumns: TableColumn<
  IAdminAnalyticsOverview["recent"]["bookings"][number]
>[] = getRecentBookingColumns();
