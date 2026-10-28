import * as React from "react";
import Link from "next/link";
import type { IAdminAnalyticsOverview } from "@/types";
import { StatusBadge, type TableColumn } from "@/widgets";

export const recentBookingColumns: TableColumn<IAdminAnalyticsOverview["recentBookings"][number]>[] = [
  {
    header: "REFERENCE",
    cell: (b) => (
      <span className="font-mono font-bold text-xs text-foreground">
        {b.reference}
      </span>
    )
  },
  {
    header: "PASSENGER",
    cell: (b) => (
      <span className="font-semibold text-xs text-foreground">
        {b.leadPassengerName}
      </span>
    )
  },
  {
    header: "ROUTE",
    cell: (b) => (
      <div className="text-xs">
        <p className="font-medium text-foreground truncate max-w-[180px]" title={b.route}>
          {b.route}
        </p>
        {b.vessel && (
          <p className="text-[11px] text-muted-foreground">{b.vessel}</p>
        )}
      </div>
    )
  },
  {
    header: "AMOUNT",
    cell: (b) => (
      <span className="font-bold text-xs text-foreground">
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
    cell: (b) => (
      <Link
        href={`/dashboard/admin/bookings?search=${encodeURIComponent(b.reference)}`}
        className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline"
      >
        View
      </Link>
    )
  }
];
