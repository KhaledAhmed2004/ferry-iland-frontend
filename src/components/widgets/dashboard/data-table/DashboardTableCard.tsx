import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui";

export type StatusType =
  | "Confirmed"
  | "Cancelled"
  | "Active"
  | "Suspended"
  | "Completed"
  | "Pending"
  | "Failed"
  | (string & {});

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const normalizedStatus = (status || "").toLowerCase().replace(/_/g, " ");

  let colorClasses = "bg-muted text-muted-foreground border-border/80";

  if (
    normalizedStatus === "confirmed" ||
    normalizedStatus === "active" ||
    normalizedStatus === "completed" ||
    normalizedStatus === "arrived" ||
    normalizedStatus === "success" ||
    normalizedStatus === "on schedule" ||
    normalizedStatus === "on time" ||
    normalizedStatus === "scheduled" ||
    normalizedStatus === "in service" ||
    normalizedStatus === "in_service" ||
    normalizedStatus === "boarded"
  ) {
    colorClasses =
      "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60";
  } else if (
    normalizedStatus === "cancelled" ||
    normalizedStatus === "canceled" ||
    normalizedStatus === "expired" ||
    normalizedStatus === "failed" ||
    normalizedStatus === "rejected" ||
    normalizedStatus === "out of service" ||
    normalizedStatus === "out_of_service"
  ) {
    colorClasses =
      "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60";
  } else if (
    normalizedStatus === "suspended" ||
    normalizedStatus === "pending" ||
    normalizedStatus === "unpaid" ||
    normalizedStatus === "awaiting payment" ||
    normalizedStatus === "partially refunded" ||
    normalizedStatus === "warning" ||
    normalizedStatus === "delayed" ||
    normalizedStatus === "almost full" ||
    normalizedStatus === "filling fast" ||
    normalizedStatus === "tentative" ||
    normalizedStatus === "maintenance"
  ) {
    colorClasses =
      "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60";
  } else if (
    normalizedStatus === "boarding" ||
    normalizedStatus === "preparing" ||
    normalizedStatus === "open" ||
    normalizedStatus === "refunded" ||
    normalizedStatus === "checked in"
  ) {
    colorClasses =
      "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60";
  } else if (
    normalizedStatus === "departed" ||
    normalizedStatus === "in transit" ||
    normalizedStatus === "in_transit"
  ) {
    colorClasses =
      "bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/60";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md border px-2.5 py-0.5 text-[11px] leading-tight font-semibold whitespace-nowrap transition-colors",
        colorClasses,
        className
      )}
      {...props}
    >
      {status}
    </span>
  );
}

export interface TableColumn<T> {
  header: React.ReactNode;
  accessorKey?: keyof T;
  headerClassName?: string;
  className?: string;
  align?: "left" | "center" | "right";
  cell?: (item: T, index: number) => React.ReactNode;
}

export interface DashboardTableCardProps<T> {
  title: string | React.ReactNode;
  viewAllHref?: string;
  viewAllLabel?: string;
  onViewAll?: () => void;
  headerRight?: React.ReactNode;
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor?: (item: T, index: number) => string | number;
  emptyMessage?: string;
  className?: string;
  rowClassName?: (item: T, index: number) => string | undefined;
}

export function DashboardTableCard<T>({
  title,
  viewAllHref,
  viewAllLabel = "View all",
  onViewAll,
  headerRight,
  columns,
  data,
  keyExtractor,
  emptyMessage = "No data available.",
  className,
  rowClassName
}: DashboardTableCardProps<T>) {
  return (
    <div
      className={cn(
        "bg-card text-card-foreground border-border/80 flex flex-col justify-between overflow-hidden rounded-xl border shadow-xs transition-all",
        className
      )}
    >
      {/* Header inside the Card with uniform height */}
      <div className="border-border/40 flex min-h-[58px] items-center justify-between gap-3 border-b px-5 py-4 md:px-6">
        {typeof title === "string" ? (
          <h3 className="text-foreground text-base font-bold tracking-tight">{title}</h3>
        ) : (
          title
        )}
        {headerRight ? (
          headerRight
        ) : viewAllHref ? (
          <Link
            href={viewAllHref}
            className="text-primary hover:text-primary/80 text-xs font-semibold transition-colors hover:underline"
          >
            {viewAllLabel}
          </Link>
        ) : onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="text-primary hover:text-primary/80 cursor-pointer text-xs font-semibold transition-colors hover:underline"
          >
            {viewAllLabel}
          </button>
        ) : null}
      </div>

      {/* Table with Header and Rows */}
      <div className="flex-1 overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/40 border-border/80 border-b">
            <TableRow className="h-10 border-none hover:bg-transparent">
              {columns.map((col, idx) => (
                <TableHead
                  key={idx}
                  className={cn(
                    "text-muted-foreground h-10 px-4 text-[10px] font-extrabold tracking-wider whitespace-nowrap uppercase md:px-6 md:text-[11px]",
                    col.align === "center" && "text-center",
                    col.align === "right" && "text-right",
                    col.headerClassName
                  )}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground h-24 text-center text-xs font-medium"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, rowIdx) => {
                const key = keyExtractor ? keyExtractor(item, rowIdx) : rowIdx;

                return (
                  <TableRow
                    key={key}
                    className={cn(
                      "border-border/60 hover:bg-muted/30 h-[54px] transition-colors",
                      rowClassName?.(item, rowIdx)
                    )}
                  >
                    {columns.map((col, colIdx) => (
                      <TableCell
                        key={colIdx}
                        className={cn(
                          "text-foreground px-4 py-3 align-middle text-xs font-normal whitespace-nowrap md:px-6",
                          col.align === "center" && "text-center",
                          col.align === "right" && "text-right",
                          col.className
                        )}
                      >
                        {col.cell
                          ? col.cell(item, rowIdx)
                          : col.accessorKey
                            ? (item[col.accessorKey] as React.ReactNode)
                            : null}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
