import * as React from "react";

import { cn } from "@/lib/utils";
import { Card, CardContent, Skeleton } from "@/ui";

import { DataTableSkeleton } from "../data-table/DataTableSkeleton";

/** Mirrors `<StatCard>`: label, value, subtitle on the left and the icon tile on the right. */
export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("border-border/80 bg-card shadow-xs", className)} aria-hidden="true">
      <CardContent className="flex items-center justify-between p-5">
        <div className="min-w-0 flex-1 space-y-2.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="ml-3 h-11 w-11 shrink-0 rounded-xl" />
      </CardContent>
    </Card>
  );
}

/** A row of `StatCardSkeleton`s. Pass the same grid classes the real cards use. */
export function StatCardGridSkeleton({
  count = 4,
  className = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={className} role="status" aria-label="Loading statistics">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Small tinted metric tile used inside the overview cards (3 per row). */
export function MiniStatSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "border-border/40 flex h-24 flex-col justify-between rounded-xl border p-3.5",
        className
      )}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <Skeleton className="h-6 w-14" />
      <Skeleton className="h-2.5 w-20" />
    </div>
  );
}

/** Chart card placeholder: title row plus bar-shaped columns. */
export function ChartCardSkeleton({ title }: { title?: string }) {
  const bars = [45, 70, 55, 85, 60, 90, 50, 75, 65, 80, 40, 70];
  return (
    <div
      className="bg-card text-card-foreground border-border/80 flex min-h-[260px] flex-col rounded-xl border p-5 shadow-xs md:p-6"
      role="status"
      aria-label={title ? `Loading ${title}` : "Loading chart"}
    >
      {title ? (
        <h3 className="text-foreground text-base font-bold tracking-tight">{title}</h3>
      ) : (
        <Skeleton className="h-5 w-40" />
      )}
      <Skeleton className="mt-2 h-3 w-28" />
      <div className="mt-6 flex flex-1 items-end gap-2">
        {bars.map((h, i) => (
          <Skeleton key={i} className="flex-1 rounded-sm" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

/** Body rows for any shadcn `<Table>`; render inside `<TableBody>`. */
export function TableRowsSkeleton({
  rows = 5,
  columns,
  cellClassName = "px-4 py-3 md:px-6"
}: {
  rows?: number;
  columns: number;
  cellClassName?: string;
}) {
  const widths = ["w-24", "w-32", "w-20", "w-28", "w-16"];
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={`skeleton-${r}`} className="border-border/60 h-[54px] border-b" aria-hidden="true">
          {Array.from({ length: columns }).map((_, c) => (
            <td key={c} className={cellClassName}>
              <Skeleton className={cn("h-3.5 max-w-full", widths[(r + c) % widths.length])} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Stand-alone table card (header + rows) for when the real table isn't mounted yet. */
/** Table placeholder in the shadcn data-table shape (see DataTableSkeleton). */
export function TableCardSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return <DataTableSkeleton rows={rows} columns={Math.max(1, columns - 1)} />;
}

/** Full admin list page placeholder, used as a Suspense fallback. */
export function DashboardPageSkeleton({
  statCount = 3,
  statGridClassName = "grid grid-cols-1 gap-4 sm:grid-cols-3"
}: {
  statCount?: number;
  statGridClassName?: string;
}) {
  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8" role="status" aria-label="Loading page">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      {statCount > 0 && <StatCardGridSkeleton count={statCount} className={statGridClassName} />}
      <TableCardSkeleton />
    </div>
  );
}
