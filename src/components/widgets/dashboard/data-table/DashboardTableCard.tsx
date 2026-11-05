import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { DataTable, type DataTableColumn, type DataTablePagination } from "./DataTable";

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
  /** Value used for header-menu sorting when the column renders a custom cell. */
  sortValue?: (item: T) => string | number | Date | null | undefined;
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
  /** Show skeleton rows in place of data / the empty message. */
  isLoading?: boolean;
  /** @deprecated Skeleton rows follow the shared DataTable default. */
  skeletonRows?: number;
  /** Show the shadcn "View" menu for hiding columns. */
  enableColumnVisibility?: boolean;
  /** Background refetch: dims rows and shows a thin progress bar. */
  isFetching?: boolean;
  /** Filter row above the table (replaces the title, like the shadcn demo). */
  toolbar?: React.ReactNode;
  /** Shown between the toolbar and the table, e.g. a bulk-action bar. */
  bulkActions?: React.ReactNode;
  /** Footer with "x–y of n" and Previous / Next. */
  pagination?: DataTablePagination;
  /** Noun used in the footer, e.g. "ports" in "1–6 of 6 ports." */
  itemName?: string;
}

/** "BOOKING REFERENCE" -> "Booking Reference" so card headers read like shadcn's data table. */
function toHeaderCase(header: React.ReactNode): React.ReactNode {
  if (typeof header !== "string" || header !== header.toUpperCase()) return header;
  return header
    .toLowerCase()
    .replace(/(^|[\s/&(-])([a-z])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

function isSortableValue(value: unknown) {
  return typeof value === "string" || typeof value === "number" || value instanceof Date;
}

/**
 * Card-style table built on the shared shadcn `DataTable` (TanStack Table).
 * Columns with an `accessorKey` holding plain text, numbers or dates sort from the header menu.
 */
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
  rowClassName,
  isLoading = false,
  isFetching = false,
  enableColumnVisibility = false,
  toolbar,
  bulkActions,
  pagination,
  itemName
}: DashboardTableCardProps<T>) {
  const columnDefs = React.useMemo<DataTableColumn<T>[]>(
    () =>
      columns.map((col, colIdx) => {
        const key = col.accessorKey;
        const getValue: ((item: T) => unknown) | undefined =
          col.sortValue ?? (key !== undefined ? (item: T) => item[key] : undefined);
        const isSelectColumn = typeof col.header !== "string";
        const sortable = getValue !== undefined && data.some((item) => isSortableValue(getValue(item)));
        return {
          id: key ? String(key) : `col_${colIdx}`,
          ...(getValue ? { accessorFn: getValue } : {}),
          header: () => toHeaderCase(col.header),
          cell: ({ row }) =>
            col.cell
              ? col.cell(row.original, row.index)
              : key
                ? (row.original[key] as React.ReactNode)
                : null,
          enableSorting: sortable,
          // Like the shadcn demo, the actions / select columns can't be hidden.
          enableHiding: !(
            typeof col.header !== "string" || /^actions?$/i.test(col.header.trim())
          ),
          sortUndefined: "last",
          meta: {
            align: col.align,
            // Select columns use the table's own checkbox spacing so every table lines up.
            className: isSelectColumn ? "w-10" : col.className,
            headerClassName: isSelectColumn ? "w-10" : col.headerClassName,
            label: typeof col.header === "string" ? col.header : key ? String(key) : undefined,
            // A non-text header here is the page's own select-all checkbox.
            skeleton:
              typeof col.header !== "string"
                ? "select"
                : /^actions?$/i.test(col.header.trim())
                  ? "actions"
                  : "text"
          }
        } satisfies DataTableColumn<T>;
      }),
    [columns, data]
  );

  const viewAll = headerRight ?? (viewAllHref ? (
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
  ) : null);

  // Index-based ids keep keys stable when no keyExtractor is given.
  const indexOf = React.useMemo(() => new Map(data.map((item, idx) => [item, idx])), [data]);

  return (
    <DataTable
      className={className}
      title={title}
      headerRight={viewAll}
      columns={columnDefs}
      data={data}
      getRowId={(item) => {
        const idx = indexOf.get(item) ?? 0;
        return String(keyExtractor ? keyExtractor(item, idx) : idx);
      }}
      rowClassName={rowClassName ? (item) => rowClassName(item, indexOf.get(item) ?? 0) : undefined}
      emptyMessage={emptyMessage}
      isLoading={isLoading}
      isFetching={isFetching}
      enableColumnVisibility={enableColumnVisibility}
      toolbar={toolbar}
      bulkActions={bulkActions}
      pagination={pagination}
      itemName={itemName}
    />
  );
}
